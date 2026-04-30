# Rust + Svelte SPA — Scratch Container

## Projektstruktur

```
spa-rust/
├── Cargo.toml
├── Cargo.lock
├── Dockerfile
├── src/
│   └── main.rs
└── frontend/          ← Svelte-Projekt hier rein
    ├── package.json
    ├── vite.config.ts
    ├── src/
    └── ...
```

---
# Image-Größe
docker image inspect my-spa --format='{{.Size}}' | numfmt --to=iec

# oder übersichtlicher
docker images my-spa

# RAM + CPU live (einmalig)
docker stats my-spa --no-stream

# RAM + CPU live (kontinuierlich)
docker stats my-spa
---

## Docker bauen & starten

```bash
# Im Repo-Root (wo das Dockerfile liegt):
docker build -t my-spa .

docker run -p 8080:8080 my-spa
```

Fertig. `curl localhost:8080` liefert `index.html`, alle `/assets/*` mit immutable cache.

---

---

## VPS Deployment

```bash
# Image exportieren (kein Registry nötig)
docker save my-spa | gzip > my-spa.tar.gz
scp my-spa.tar.gz user@vps:~

# Auf dem VPS:
docker load < my-spa.tar.gz
docker run -d --restart unless-stopped -p 8080:8080 --name my-spa my-spa
```

Oder direkt mit `docker compose`:

```yaml
services:
  spa:
    image: my-spa
    restart: unless-stopped
    ports:
      - "8080:8080"
```

Caddy/nginx davor als Reverse Proxy für TLS — oder Axum direkt auf 443 mit
`rustls` erweitern, dann wirklich zero dependencies.

---

## Image-Größe

- Node-Stage wird verworfen
- Rust musl-Binary: ~5–8 MB
- Svelte-Bundle: ~0.5–2 MB (gzip)
- **Scratch-Image gesamt: ~7–12 MB**

RAM idle: ~3–6 MB RSS
