# @repo/backend

Dies ist der Backend-Service für die Todo-App, basierend auf [Hono](https://hono.dev/) und [Bun](https://bun.sh/).

## Features

- **Authentifizierung**: Session-basierte Authentifizierung mit Registrierung, Login und Logout.
- **Todo API**: CRUD-Operationen für Todos (unter Verwendung von `@repo/db` und `@repo/shared`).
- **Dateiverwaltung**: Unterstützung für Datei-Uploads und statisches Serving von Anhängen.
- **Middleware**: Logging, Gzip-Komprimierung und CORS-Unterstützung.
- **Typensicherheit**: Durchgängige TypeScript-Unterstützung und Zod-Validierung.

## API-Struktur

### Auth-Endpunkte
- `POST /auth/register`: Benutzer registrieren.
- `POST /auth/login`: Benutzer anmelden.
- `POST /auth/logout`: Abmelden.
- `GET /auth/me`: Informationen zum aktuellen Benutzer (erfordert Auth).

### Todo-Endpunkte
Die Todo-API ist unter `/todo` (bzw. über den Dispatcher) gemountet und erfordert Authentifizierung:
- `GET /`: Alle Todos abrufen.
- `POST /`: Ein neues Todo erstellen.
- `PATCH /:id`: Ein Todo aktualisieren.
- `DELETE /:id`: Ein Todo löschen.
- `POST /upload/:id`: Eine Datei an ein Todo anhängen.

## Entwicklung

### Installation

```bash
bun install
```

### Server starten

```bash
bun run dev
```
Der Server läuft standardmäßig mit Hot-Reloading über Bun.

## Technologien

- **Runtime**: Bun
- **Framework**: Hono
- **ORM**: Drizzle ORM (via `@repo/db`)
- **Validierung**: Zod (via `@repo/shared`)
