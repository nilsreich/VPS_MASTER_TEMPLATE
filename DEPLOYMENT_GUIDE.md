# Lean Deployment Guide: Local Build zu VPS (Vollständig)

Diese Anleitung führt dich durch den gesamten Prozess, um dein Monorepo (Bun, Hono, React, SQLite) auf einen 1GB RAM VPS zu bringen. Wir folgen der Strategie: **Lokal bauen, Artefakte synchronisieren, auf dem Server nur ausführen.**

## 1. DNS & Domain Setup

Damit deine Apps unter verschiedenen Subdomains (z.B. `todo.deinedomain.de`) erreichbar sind, musst du beim Domain-Provider (z.B. Cloudflare, Hetzner DNS) zwei Einträge setzen:

* **A-Record (@):** Name: `@`, Wert: `DEINE_VPS_IP`
* **A-Record (*):** Name: `*`, Wert: `DEINE_VPS_IP` (Wildcard für alle Subdomains)

---

## 2. VPS Vorbereitung (Einmalig)

Verbinde dich per SSH mit deinem Server: `ssh root@DEINE_VPS_IP`.

```bash
# System Update & Basis-Tools
apt update && apt upgrade -y
apt install -y curl git rsync caddy

# Bun Runtime installieren
curl -fsSL [https://bun.sh/install](https://bun.sh/install) | bash
source /root/.bashrc

# Zielverzeichnis für die App erstellen
mkdir -p /var/www/lean-app
```

## 3. SSH-Key Setup (Für automatisiertes Deploy)

Damit du beim Deployment kein Passwort eingeben musst, kopiere deinen lokalen Key auf den Server.
Auf deinem lokalen Rechner:

```bash
# Falls noch kein Key existiert: ssh-keygen -t ed25519
ssh-copy-id root@DEINE_VPS_IP
```

## 4. Lokale Anpassung: Backend-Produktionsmodus

Stelle sicher, dass dein Backend (`apps/backend/src/index.ts`) in Produktion die lokal gebauten Frontend-Dateien serviert.

```typescript
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import { todoApi } from "./routes/todo";

const app = new Hono();
app.use("*", logger());

app.use("*", async (c, next) => {
  const host = c.req.header("host") || "";
  
  // Hostname-Routing für die Todo-App
  if (host.startsWith("todo.")) {
    // API-Requests an Hono RPC weiterleiten
    if (c.req.path.startsWith("/api")) {
      return todoApi.fetch(c.req.raw, c.env);
    }
    
    // Statische Dateien aus dem (lokal gebauten) dist-Ordner servieren
    return serveStatic({ 
      root: "../../apps/todo/dist", // Relativer Pfad im Monorepo
      path: c.req.path === "/" ? "index.html" : c.req.path 
    })(c, next);
  }
  await next();
});

export default { port: 3000, fetch: app.fetch };
```

## 5. Das ultimative Deployment-Skript (deploy.sh)

Erstelle diese Datei im Wurzelverzeichnis (Root) deines lokalen Projekts.

```bash
#!/bin/bash

# --- KONFIGURATION ---
SERVER_USER="root"
SERVER_IP="DEINE_VPS_IP" # <--- DEINE IP EINTRAGEN
DEST_PATH="/var/www/lean-app"

echo "🚀 Starte Lean Deployment..."

# 1. Lokaler Build (schont VPS-Ressourcen)
echo "📦 Baue App-Artefakte lokal..."
bun run build

# 2. Synchronisation via rsync
echo "📤 Synchronisiere Dateien (rsync)..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'data.db*' \
  ./ $SERVER_USER@$SERVER_IP:$DEST_PATH

# 3. Remote Befehle (via SSH)
echo "⚙️  Finalisiere auf dem Server..."
ssh $SERVER_USER@$SERVER_IP << EOF
  cd $DEST_PATH
  # Nur produktionsrelevante Pakete installieren
  bun install --production
  # Datenbank-Migration
  bun run db:push
  # Backend-Prozess neu starten
  systemctl restart lean-app
EOF

echo "✅ Deployment erfolgreich abgeschlossen!"
```

Ausführbar machen: `chmod +x deploy.sh`

## 6. Systemd Service (Auf dem VPS)

Damit Bun im Hintergrund läuft und nach Fehlern neu startet.
Datei erstellen: `nano /etc/systemd/system/lean-app.service`

```ini
[Unit]
Description=Lean Monorepo Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/lean-app
ExecStart=/root/.bun/bin/bun run apps/backend/src/index.ts
Restart=always
Environment=NODE_ENV=production
# Speicherlimit für 1GB RAM Target
MemoryLimit=400M

[Install]
WantedBy=multi-user.target
```

Service aktivieren:

```bash
systemctl daemon-reload
systemctl enable lean-app
systemctl start lean-app
```

## 7. Caddy Reverse Proxy (Auf dem VPS)

Caddy übernimmt TLS (HTTPS) automatisch für alle Subdomains.
Datei bearbeiten: `nano /etc/caddy/Caddyfile`

```caddyfile
*.deinedomain.de, deinedomain.de {
    reverse_proxy localhost:3000
}
```

Caddy neu starten:

```bash
systemctl restart caddy
```

## 8. Laufender Betrieb

Für jedes Update führst du nun lokal einfach nur aus:

```bash
./deploy.sh
```

Nützliche Befehle auf dem VPS:

```bash
# Logs ansehen
journalctl -u lean-app -f

# Status prüfen
systemctl status lean-app

# Caddy Logs
journalctl -u caddy -f
```