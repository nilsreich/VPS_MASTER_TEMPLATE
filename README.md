# Rust + Svelte SPA — Scratch Container Template

Ein minimalistisches, produktionsreifes Template für Single Page Applications ohne Kompromisse bei Performance und Ressourcenverbrauch. Ziel ist ein einziges statisch gelinktes Binary in einem Scratch-Container — kein Node, kein npm, kein Alpine, kein OS. Nur die App.

---

## Warum dieser Stack?

Wer eine einfache SPA auf einem kleinen VPS betreiben will, steht vor einer unschönen Wahl: nginx oder Caddy als Fileserver sind komfortabel, aber auf einem Server mit 512 MB RAM, auf dem fünf bis sechs Services laufen, zählt jedes Megabyte. Ein typischer Caddy-Container verbraucht idle ~20 MB RAM, Alpine-basierte Node-Images deutlich mehr.

Dieser Stack löst das Problem anders: Svelte wird zur Build-Zeit mit Vite kompiliert, das resultierende `dist/`-Verzeichnis wird via `rust-embed` zur Compile-Zeit direkt in ein statisch gelinktes Rust-Binary eingebettet. Das fertige Image basiert auf `scratch` — es enthält buchstäblich nur das Binary. Kein Shell, kein Paketmanager, keine Angriffsfläche.

**Ergebnis:**
- Image-Größe: ~6–12 MB
- RAM idle: ~2–4 MB
- CPU idle: ~0%
- Startup: <50ms

---

## Was kann das Template?

- **SPA-Routing** — alle Pfade die keine bekannte Datei treffen liefern `index.html`, damit clientseitiges Routing (z.B. SvelteKit, TanStack Router) funktioniert
- **Brotli + Gzip Kompression** — automatisch nach `Accept-Encoding` des Browsers, Brotli bevorzugt
- **Immutable Asset Caching** — Vite-gehashte Assets (`/assets/index-[hash].js`) erhalten `Cache-Control: public, max-age=31536000, immutable`, `index.html` bekommt `no-cache`
- **Rate Limiting** — per IP via `SmartIpKeyExtractor`, funktioniert hinter Reverse Proxies (`X-Forwarded-For`) und direkt
- **Request Body Limit** — schützt gegen überdimensionierte Requests
- **Graceful Shutdown** — SIGINT/SIGTERM werden sauber behandelt, laufende Requests werden abgeschlossen
- **Scratch Container** — minimale Angriffsfläche, kein OS, kein Shell
- **BuildKit Cache Mounts** — Cargo-Deps und Bun-Packages werden zwischen Builds gecacht, nur geänderte Teile werden neu gebaut

---

## Projektstruktur

```
spa-rust/
├── Cargo.toml          ← Rust-Abhängigkeiten + Release-Profil
├── Cargo.lock          ← via `cargo generate-lockfile` erzeugen
├── Dockerfile          ← Multi-Stage: Bun → Rust musl → Scratch
├── src/
│   └── main.rs         ← Axum-Server: Embed, Routing, Middleware
└── frontend/           ← Svelte/Vite-Projekt hier rein
    ├── package.json
    ├── bun.lock
    ├── vite.config.ts
    └── src/
```

---

## Svelte-Projekt einrichten

```bash
# Im Repo-Root:
bunx create-vite frontend --template svelte-ts
cd frontend && bun install
```

`frontend/vite.config.ts` — optimiert für Vite 8 mit Rolldown:

```ts
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  build: {
    target: 'esnext',           // kein Transpiling, nur Oxc-Minification
    reportCompressedSize: false, // schnellerer Build (Axum komprimiert on-the-fly)
    assetsDir: 'assets',
    outDir: 'dist',
  },
})
```

`assetsDir: 'assets'` ist entscheidend — der Server erkennt daran gehashte Assets und setzt `immutable` Cache-Header.

---

## Cargo.lock erzeugen

Vor dem ersten Docker-Build einmalig lokal ausführen:

```bash
cargo generate-lockfile
```

Das `Cargo.lock` committen. Ohne Lock-File muss Docker beim Build den Crates.io-Index neu laden.

---

## Docker bauen & starten

```bash
# Bauen (BuildKit ist Standard ab Docker 23)
docker build -t my-spa .

# Starten
docker run -p 8080:8080 --name my-spa-container my-spa

# Test
curl -sI localhost:8080
curl -sI --compressed -H "Accept-Encoding: br" localhost:8080/assets/ | grep content-encoding
# → content-encoding: br
```

---

## Monitoring

```bash
# Image-Größe
docker images my-spa

# RAM + CPU (einmalig)
docker stats my-spa-container --no-stream

# RAM + CPU (live)
docker stats my-spa-container
```

Erwartete Werte:

| Metrik | Wert |
|---|---|
| Image-Größe | ~6–12 MB |
| RAM idle | ~2–4 MB |
| CPU idle | 0.00% |

---

## Rate Limiter konfigurieren

In `src/main.rs`:

```rust
GovernorConfigBuilder::default()
    .key_extractor(SmartIpKeyExtractor)
    .per_second(160)   // Dauerrate pro IP
    .burst_size(320)   // initialer Burst-Puffer
    .finish()
```

`per_second` ist die nachgefüllte Token-Rate — nach dem Burst-Puffer werden Requests auf diesen Wert gedrosselt. Bei einer SPA zählt jeder Asset-Request einzeln (JS, CSS, Fonts), daher großzügig einstellen:

| Szenario | per_second | burst_size |
|---|---|---|
| Öffentliche SPA | 100–160 | 200–320 |
| Schutz vor Scrapern | 5–10 | 10–20 |
| Internes Tool | 500 | 1000 |

`SmartIpKeyExtractor` liest `X-Forwarded-For` und `X-Real-IP` aus Request-Headern — funktioniert direkt und hinter Proxies wie Caddy oder nginx.

---

## Lokale Entwicklung

Rust-Server und Svelte Dev-Server laufen getrennt — für Entwicklung wird nur der Vite Dev-Server genutzt (HMR, schnelles Feedback). Der Rust-Server wird nur für Prod-Tests gebaut.

```bash
# Svelte Dev-Server (HMR, kein Rust nötig)
cd frontend && bun run dev

# Für Prod-Test: erst Svelte bauen, dann Rust
cd frontend && bun run build && cd ..
cargo run --release
```

---

## VPS Deployment

### Option A — Image direkt übertragen (kein Registry nötig)

```bash
# Lokal:
docker save my-spa | gzip > my-spa.tar.gz
scp my-spa.tar.gz user@vps:~

# Auf dem VPS:
docker load < my-spa.tar.gz
docker run -d --restart unless-stopped -p 8080:8080 --name my-spa-container my-spa
```

### Option B — docker compose

```yaml
services:
  spa:
    image: my-spa
    restart: unless-stopped
    ports:
      - "8080:8080"
```

```bash
docker compose up -d
```

### TLS

Caddy als Reverse Proxy davor — automatisches Let's Encrypt, minimale Config:

```
example.com {
    reverse_proxy localhost:8080
}
```

---

## Warum `Box::leak` für den Rate Limiter?

`GovernorConfig` implementiert kein `Clone`, Axum verlangt aber `Layer: Clone`. Die übliche Lösung wäre `Arc<GovernorConfig>`, aber `GovernorLayer` erwartet eine `&'static`-Referenz. `Box::leak` gibt genau das: die Config wird einmal alloziert und lebt für die gesamte Prozesslaufzeit. Das ist kein Memory-Leak im klassischen Sinne — ein Server-Prozess gibt seinen Speicher beim Beenden ohnehin komplett frei, und die Config wird nie neu erstellt oder verworfen.

---

## Technologie-Entscheidungen

| Entscheidung | Warum |
|---|---|
| Rust + Axum statt Caddy | ~10× weniger RAM idle, scratch-fähig |
| musl statt glibc | statisches Linking, kein dynamischer Linker nötig |
| scratch statt alpine | minimale Image-Größe, keine Angriffsfläche |
| rust-embed statt Volumen | ein Binary, kein Dateisystem-State, einfaches Rollback |
| Bun statt Node/npm | schnellerer Install und Build-Schritt im Dockerfile |
| Vite 8 + Rolldown | bis zu 10× schnellere Builds gegenüber Vite 6/7 |
| SmartIpKeyExtractor | funktioniert mit und ohne Reverse Proxy |
| lto = "fat" | aggressives cross-crate LTO, bis zu 18% mehr Throughput |
| panic = "abort" | kein Unwinding-Code, kleineres Binary |