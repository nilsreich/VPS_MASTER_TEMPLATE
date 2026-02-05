# Lean Monorepo AI Instructions

Du bist ein Experten-Assistent für dieses performante, ressourcenschonende Bun-Monorepo. Jede Codezeile muss der **Lean-Philosophie** folgen.

## 🚀 Core-Prinzipien (Pflicht)
- **Minimaler Footprint**: Jede Komponente muss ressourcenschonend sein. Vermeide Runtime-Overhead.
- **Single-Process-Hosting**: Alle Apps laufen in EINEM Bun-Backend-Prozess. Nutze Subdomain-Routing in `apps/backend/src/index.ts` basierend auf dem `Host`-Header.
- **Zero-Magic DX**: Direkte Code-Pfade. Kein GraphQL, kein tRPC. Nutze **Hono RPC** für End-to-End Type-Safety.
- **Hardware-Ziel**: Optimiert für 1GB RAM, 1 vCPU.
- **Storage-Smartness**: Eine einzige SQLite (libSQL) Instanz. Alle Tabellen MÜSSEN `createTableName(appName, tableName)` aus `@repo/db` nutzen.
- **Keine externen Abhängigkeiten**: Self-Hosting (Fonts, Scripts). Keine CDNs, kein Google Fonts.
- **Kein Edge / Kein Admin-UI**: Keine Edge-Functions oder komplexe Admin-Oberflächen.

## 🛠 Tech-Stack
- **Runtime**: Bun + Bun Workspaces
- **Backend**: Hono + Hono RPC
- **Frontend**: Preact + Vite + Tailwind CSS 4
- **Datenbank**: Drizzle ORM + libSQL (SQLite)
- **Validierung**: Zod (geteilt in `@repo/shared`)
- **Tooling**: Biome (Linting/Formatting), TypeScript (Strict)
- **Auth**: Session-Cookies (httpOnly, Secure, sameSite: Lax/None)
- **Rate-Limiting**: `hono-rate-limiter`

## 📂 Projektstruktur
```
/root
├── apps/
│   ├── backend/          # Zentraler Dispatcher & API
│   │   └── src/
│   │       ├── index.ts  # Hostname-Routing, Middlewares
│   │       └── routes/   # API-Logik pro App (auth.ts, todo.ts, ...)
│   └── [app-name]/       # Preact-Frontends
├── packages/
│   ├── db/               # Drizzle Client & Schemas mit Tabellen-Präfixen
│   │   └── schema/       # Eine Datei pro App (todo.ts, user.ts, session.ts)
│   ├── shared/           # Zod-Schemas & geteilte Types
│   └── auth/             # Session-Middleware & Cookie-Handling
├── .env.example          # Template für Umgebungsvariablen
└── package.json          # Workspaces-Konfiguration
```

## 📝 Coding-Regeln

### 1. Benennung
- Nutze `@repo/` Workspace-Scope für lokale Pakete
- Tabellen-Präfixe: `createTableName("app", "table")` → `app_table`

### 2. Type-Safety
- Zod-Schemas in `@repo/shared` definieren und überall nutzen
- Hono RPC: `export type AppType = typeof apiRoutes` im Backend
- Frontend: `hc<AppType>("/api")` für typisierte API-Aufrufe

### 3. Sicherheit (KRITISCH)
- **Sessions**: IMMER in DB validieren, NIE User-ID direkt im Cookie
- **Ownership-Checks**: Bei UPDATE/DELETE immer `userId` prüfen
- **File-Uploads**: MIME-Type-Whitelist + Größenbeschränkung
- **Rate-Limiting**: `hono-rate-limiter` für alle Endpoints
- **CORS**: Explizite Origin-Whitelist in Produktion

### 4. Datenbank
- Try/Catch um ALLE DB-Operationen
- Konstanten statt Magic Numbers/Strings
- Fehler auf Deutsch zurückgeben

### 5. UI
- Sprache: NUR Deutsch
- Keine State-Libraries (Jotai, Redux) - nur Preact hooks
- `credentials: "include"` bei allen fetch-Aufrufen

### 6. Formatierung
- Biome-Regeln befolgen (Tabs, Doppelte Anführungszeichen)
- Kein ESLint, kein Prettier
- Package-Versionen explizit pinnen (keine `"latest"`)

### 7. TypeScript-Konfiguration
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `skipLibCheck: false`

## 🔒 Sicherheits-Template (Auth Route)

```typescript
// apps/backend/src/routes/example.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, items } from "@repo/db";
import { and, eq } from "drizzle-orm";

export const exampleApi = new Hono<{ Variables: { user: { id: string } | null } }>()
  .get("/", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Nicht autorisiert" }, 401);

    try {
      const data = await db.select().from(items).where(eq(items.userId, user.id));
      return c.json(data);
    } catch {
      return c.json({ error: "Datenbankfehler" }, 500);
    }
  })
  .delete("/:id", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Nicht autorisiert" }, 401);

    const id = Number.parseInt(c.req.param("id"));

    try {
      // OWNERSHIP CHECK: Nur eigene Einträge löschen
      const result = await db
        .delete(items)
        .where(and(eq(items.id, id), eq(items.userId, user.id)))
        .returning();

      if (result.length === 0) {
        return c.json({ error: "Nicht gefunden oder keine Berechtigung" }, 404);
      }
      return c.json({ success: true });
    } catch {
      return c.json({ error: "Datenbankfehler beim Löschen" }, 500);
    }
  });
```

## 📦 Rate-Limiting Template

```typescript
import { rateLimiter } from "hono-rate-limiter";

// Global (100 req/min)
app.use("*", rateLimiter({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-6",
  keyGenerator: (c) => c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
  message: { error: "Zu viele Anfragen" },
}));

// Auth-Endpoints (10 req/15min)
app.use("/auth/*", rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-6",
  keyGenerator: (c) => c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
  message: { error: "Zu viele Anmeldeversuche" },
}));
```

## 📤 File-Upload Template

```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

.post("/upload", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Nicht autorisiert" }, 401);

  try {
    const body = await c.req.parseBody();
    const file = body.file as File;

    if (!file) return c.json({ error: "Keine Datei" }, 400);
    if (file.size > MAX_FILE_SIZE) return c.json({ error: "Datei zu groß" }, 400);
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return c.json({ error: "Typ nicht erlaubt" }, 400);

    const fileName = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
    await Bun.write(`uploads/${fileName}`, file);

    return c.json({ url: `/uploads/${fileName}`, name: file.name });
  } catch {
    return c.json({ error: "Upload fehlgeschlagen" }, 500);
  }
});
```

## 🗄️ Session-Schema Template

```typescript
// packages/db/schema/session.ts
export const sessions = sqliteTable(createTableName("auth", "sessions"), {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
```

## ⚠️ Verboten
- `"latest"` in package.json → Explizite Semver-Versionen
- Magic Strings → Konstanten am Dateianfang definieren
- Englische UI-Texte → Nur Deutsch
- Direkte User-ID im Cookie → Session-ID mit DB-Lookup
- DELETE ohne Ownership-Check → `and(eq(id), eq(userId))`
- DB-Operationen ohne Try/Catch → Immer umwickeln

