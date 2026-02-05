# @repo/db

Dieses Paket verwaltet den Datenbankzugriff und das Schema für die gesamte Anwendung unter Verwendung von [Drizzle ORM](https://orm.drizzle.team/).

## Inhalt

- **Schema-Definitionen**: In `schema/` befinden sich die Definitionen für `todo.ts` und `user.ts`.
- **Drizzle Config**: Konfiguration für Migrationen und Studio.
- **Datenbank-Client**: Exportiert eine vorkonfigurierte `db` Instanz (SQLite).

## Entwicklung

### Migrationen verwalten

Erstellen einer neuen Migration nach Schema-Änderungen:

```bash
bunx drizzle-kit generate
```

Migrationen auf die Datenbank anwenden:

```bash
bunx drizzle-kit migrate
```

### Drizzle Studio

Um die Daten direkt im Browser anzusehen und zu bearbeiten:

```bash
bunx drizzle-kit studio
```

## Verwendung

```typescript
import { db, todos } from "@repo/db";
import { eq } from "drizzle-orm";

const allTodos = await db.select().from(todos).all();
```
