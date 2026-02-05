# 🚀 Master Guide: Neue App im Lean-Monorepo erstellen

Dieser Guide führt dich durch den Prozess, eine neue App (z.B. eine Notiz-App namens `notes`) von Null auf Hundert sicher und performant zu integrieren.

---

## 📋 Schnellstart-Checkliste (Übersicht)

| Schritt | Aktion | Ziel-Verzeichnis / Datei | Warum? |
| :--- | :--- | :--- | :--- |
| **1** | Ordner erstellen | `apps/[name]` | Basis für die neue App. |
| **2** | `package.json` | `apps/[name]/package.json` | Abhängigkeiten & Workspace-Anbindung. |
| **3** | `tsconfig.json` | `apps/[name]/tsconfig.json` | TypeScript-Support & Pfad-Aliase. |
| **4** | Root-Link | `/package.json` | Start-Script für den Root-Modus. |
| **5** | DB-Schema | `packages/db/schema/[name].ts` | Datenbank-Tabelle definieren. |
| **5.5** | Shared Types | `packages/shared/src/index.ts` | Validierung & Type-Safety für RPC. |
| **6** | Backend-Route | `apps/backend/src/routes/[name].ts` | API-Logik & Auth-Schutz. |
| **7** | Dispatcher | `apps/backend/src/index.ts` | Routing & Subdomain-Zuweisung. |

---

## 📂 Schritt 1: Dateistruktur & Scaffolding

Zuerst legen wir die App-Basis an:

```bash
mkdir -p apps/notes/src/lib
```

### `apps/notes/package.json`
**Was?** Definiert den Namen und die Abhängigkeiten.
**Wichtig:** Nutze `workspace:*` für interne Pakete, damit Änderungen sofort überall verfügbar sind.

```json
{
  "name": "@repo/notes",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@repo/shared": "workspace:*",
    "@repo/backend": "workspace:*",
    "hono": "latest",
    "preact": "latest",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "@preact/preset-vite": "latest",
    "typescript": "latest",
    "vite": "latest"
  }
}
```

### `apps/notes/tsconfig.json`
**Was?** Erbt die Regeln vom Root.
**Warum?** Damit Pfad-Aliase wie `@repo/shared` funktionieren.

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

---

## 💾 Schritt 2: Datenbank & Storage (@repo/db)

### 1. Tabelle definieren
Erstelle `packages/db/schema/notes.ts`.
**Best Practice:** Nutze `createTableName("[app]", "[table]")` für saubere Präfixe in der `data.db`.

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createTableName } from "../schema-helper";

export const notes = sqliteTable(createTableName("notes", "items"), {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(), // Verbindung zum User
  title: text("title").notNull(),
  content: text("content"),
  fileUrl: text("file_url"), // Falls Storage genutzt wird
});
```

### 2. Schema registrieren
In `packages/db/index.ts` muss das neue Schema importiert und in das `db`-Objekt gemergt werden:
```typescript
import * as noteSchema from "./schema/notes";
export const db = drizzle(client, { schema: { ...authSchema, ...todoSchema, ...noteSchema } });
export * from "./schema/notes";
```

### 3. Sync
```bash
bun db:push  # Erstellt die Tabelle physisch in deiner SQLite DB
```

---

## 🏗️ Schritt 2.5: Shared Types & Validierung (@repo/shared)

**Warum?** Damit Frontend und Backend die exakt gleichen Regeln für Daten nutzen (z.B. "Titel muss mind. 3 Zeichen haben"). Dies ermöglicht die volle **Type-Safety** beim Hono-RPC Client.

### 1. Schema in `packages/shared/src/index.ts` hinzufügen
Ergänze die Datei um dein neues App-Modell:

```typescript
export const NoteSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string().min(3),
  content: z.string().optional(),
  fileUrl: z.string().optional().nullable(),
});

export const CreateNoteSchema = NoteSchema.omit({ id: true });

export type Note = z.infer<typeof NoteSchema>;
```

---

## 🔐 Schritt 3: Backend & Authentifizierung

### 1. Route erstellen (`apps/backend/src/routes/notes.ts`)
Hier deinieerst du die Logik. Durch `api.use("*", authMiddleware)` ist alles geschützt.

```typescript
import { Hono } from "hono";
import { db, notes } from "@repo/db";
import { eq } from "drizzle-orm";

export const notesApi = new Hono<{ Variables: { user: { id: string } | null } }>()
  .get("/", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Auth required" }, 401);
    
    const data = await db.select().from(notes).where(eq(notes.userId, user.id));
    return c.json(data);
  });
// Hier können auch Upload-Endpoints rein (siehe Todo-App Beispiel)
```

### 2. Integration im Dispatcher (`apps/backend/src/index.ts`)
**Warum?** Damit das Backend weiß, welche Subdomain zu welcher Route gehört.

```typescript
// 1. Import
import { notesApi } from "./routes/notes";

// 2. Im apiRoutes Verbund registrieren
const apiRoutes = new Hono().use("*", authMiddleware)
  .route("/todo", todoApi)
  .route("/notes", notesApi); // /api/notes/...

// 3. Im Dispatcher (Hostname Routing)
if (host.startsWith("notes.")) {
  return apiRoutes.fetch(c.req.raw, c.env, c.executionCtx);
}
```

---

## 🖼️ Schritt 4: Frontend-Umsetzung (Praxisbeispiel)

### Daten abrufen mit RPC (Hono Client)
Nutze `hc` für Type-Safety direkt vom Backend.

```tsx
// apps/notes/src/App.tsx
import { useEffect, useState } from "preact/hooks";
import { hc } from "hono/client";
import type { AppType } from "@repo/backend";

const client = hc<AppType>("/api"); // In Dev dynamisch umschreiben (siehe Todo-App)

export function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // credentials: "include" ist ESSENZIELL für Auth-Cookies in Codespaces!
    const fetchNotes = async () => {
      const res = await client.notes.$get({}, { init: { credentials: "include" } });
      if (res.ok) setData(await res.json());
    };
    fetchNotes();
  }, []);

  return <div>{data.map(n => <p>{n.title}</p>)}</div>;
}
```

### File Upload (Storage) Integration
```tsx
const handleUpload = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/notes/upload", {
    method: "POST",
    body: formData,
    credentials: "include" // Wieder: Cookies mitsenden!
  });
  const { url } = await res.json();
  // Speicher die URL im Note-Eintrag
};
```

---

## ⚙️ Wichtige Einstellungen im Überblick

1.  **CORS & Cookies**: In GitHub Codespaces muss der Browser-Request `credentials: "include"` haben. Im Backend sorgt `sameSite: "None"` (nur in Dev) dafür, dass das Cookie akzeptiert wird.
2.  **Storage**: Bun schreibt Dateien mit `await Bun.write(path, file)`. Der `uploads/` Ordner muss im Backend existieren (`mkdir -p apps/backend/uploads`).
3.  **Ports**: In Codespaces Port 3000 (Backend) immer auf **Public** stellen!
