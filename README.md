# Fullstack Todo Monorepo

Ein moderner Fullstack-Monorepo-Ansatz für eine Todo-Anwendung, die [Bun](https://bun.sh/) als Runtime und Package Manager nutzt.

## Projektstruktur

Dieses Repository ist in Apps und gemeinsam genutzte Pakete unterteilt:

### Apps
- **[apps/backend](apps/backend)**: Hono-basiertes Backend mit Authentifizierung, Todo-API und Datei-Handling.
- **[apps/todo](apps/todo)**: Preact-Frontend mit Vite und Tailwind CSS.

### Pakete (Packages)
- **[packages/shared](packages/shared)**: Gemeinsame Zod-Schemas und TypeScript-Typdefinitionen.
- **[packages/db](packages/db)**: Datenbank-Setup mit [Drizzle ORM](https://orm.drizzle.team/) und SQLite.
- **[packages/auth](packages/auth)**: Gemeinsame Authentifizierungslogik und Middlewares für Hono.

## Erste Schritte

### Vorraussetzungen

- [Bun](https://bun.sh/) (installiert auf dem System)

### Installation

Installiere alle Abhängigkeiten für das gesamte Monorepo vom Root-Verzeichnis aus:

```bash
bun install
```

### Entwicklung

Starte das Backend und das Frontend gleichzeitig (aus dem Root):

```bash
# Backend starten
bun run dev:backend

# Frontend starten
bun run dev:todo
```

*(Hinweis: Die entsprechenden Scripts müssen in der Root-package.json definiert sein.)*

## Technologien

- **Runtime**: Bun
- **Frontend**: Preact, Vite, Tailwind CSS
- **Backend**: Hono
- **Datenbank**: Drizzle ORM, SQLite
- **Validierung**: Zod
- **Monorepo-Tooling**: Bun Workspaces
