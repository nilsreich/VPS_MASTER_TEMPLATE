# @repo/shared

Dieses Paket enthält gemeinsam genutzte Zod-Schemas und TypeScript-Typdefinitionen für die gesamte Monorepo (Frontend und Backend).

## Inhalt

Das Paket stellt Validierungsschemas und Typen für die zentrale Geschäftslogik bereit:

- **TodoSchema**: Validiert ein vollständiges Todo-Objekt.
- **CreateTodoSchema**: Validiert Daten für die Erstellung eines neuen Todos.
- **Typen**: Exportiert `Todo` und `CreateTodo` Typen, die aus den Zod-Schemas abgeleitet sind.

## Verwendung

### Installation

Da es sich um ein internes Paket handelt, wird es in anderen Paketen über den Workspace-Namen eingebunden:

```json
"dependencies": {
  "@repo/shared": "*"
}
```

### Beispiel

```typescript
import { TodoSchema, type Todo } from "@repo/shared";

const data = {
  id: "1",
  content: "Aufgabe erledigen",
  completed: false,
  createdAt: new Date().toISOString()
};

// Validierung
const result = TodoSchema.safeParse(data);

if (result.success) {
  const todo: Todo = result.data;
}
```

## Entwicklung

### Abhängigkeiten installieren

```bash
bun install
```

### Hinzufügen neuer Schemas

Neue Schemas sollten in [src/index.ts](src/index.ts) hinzugefügt und exportiert werden.

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.8. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
