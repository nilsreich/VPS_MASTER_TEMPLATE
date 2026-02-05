# Technische Analyse: Lean Monorepo

**Evaluierungsdatum:** Februar 2026  
**Zielgruppe:** Senior-Entwicklerteams zur externen Begutachtung  
**Scope:** Vollständige Code- und Architekturanalyse

---

## Executive Summary

Dieses Repository implementiert ein **Bun-basiertes Monorepo** mit dem Ziel, ressourcenschonend >10 Micro-Apps auf einem 1GB RAM VPS zu betreiben. Die Architektur folgt einer konsequenten "Lean Philosophy" mit Single-Process-Multitenancy, Subdomain-Routing und geteilten Paketen für Authentifizierung, Datenbank und Typdefinitionen.

| Kategorie | Bewertung | Begründung |
|-----------|-----------|------------|
| **Architektur** | 8/10 | Sauberes Dispatcher-Pattern, klare Paket-Trennung |
| **Type-Safety** | 9/10 | Exzellente Hono-RPC-Nutzung, striktes TypeScript |
| **Sicherheit** | 4/10 | Kritische Auth-Schwächen, fehlende Input-Validierung |
| **Code-Qualität** | 7/10 | Konsistenter Stil, Lücken im Error-Handling |
| **Developer Experience** | 8/10 | Gutes Tooling, Tests fehlen |
| **Dokumentation** | 9/10 | Umfassende Guides vorhanden |
| **Produktionsreife** | 5/10 | Sicherheitsfixes vor Deployment erforderlich |

---

## 1. Ziele & Philosophie

### 1.1 Definierte Anforderungen (aus AI Instructions)

| Anforderung | Status | Implementierung |
|-------------|--------|-----------------|
| Minimalistischer Footprint | ✅ Erfüllt | Bun als einzige Runtime, Preact statt React |
| Single-Process-Multitenancy | ✅ Erfüllt | Subdomain-Routing in `apps/backend/src/index.ts` |
| Zero-Magic DX | ✅ Erfüllt | Hono RPC statt GraphQL/tRPC |
| Hardware-Target (1GB/1vCPU) | ✅ Designziel | Deployment-Guide mit `MemoryLimit=400M` |
| Storage-Smartness | ✅ Erfüllt | Zentrale SQLite mit Table-Prefixes |
| Self-Hosting-First | ✅ Erfüllt | Keine externen CDNs/Fonts |
| Type-Safety | ✅ Erfüllt | Zod-Schemas durchgängig geteilt |

### 1.2 Zielabweichungen

| Ziel | Abweichung |
|------|------------|
| Optimistic UX | ⚠️ Teilweise: UI wartet auf Backend-Response bei CRUD-Operationen |
| Auto-SSL (Caddy) | ⏳ Dokumentiert, aber nicht im Dev-Setup getestet |

---

## 2. Architektur-Analyse

### 2.1 Monorepo-Struktur

```
/root
├── apps/
│   ├── backend/          # Zentraler Hono-Dispatcher (Port 3000)
│   │   └── src/
│   │       ├── index.ts  # 103 LOC - Haupteinstiegspunkt
│   │       └── routes/   # API-Logik pro App
│   └── todo/             # Preact-Frontend (Vite, Port 5173)
│       └── src/
│           ├── App.tsx   # 349 LOC - Haupt-SPA
│           └── lib/api.ts # 26 LOC - RPC-Client
├── packages/
│   ├── auth/             # 33 LOC - Session-Middleware
│   ├── db/               # Drizzle + LibSQL
│   │   └── schema/       # Tabellendefinitionen
│   └── shared/           # 23 LOC - Zod-Schemas
└── [Konfigurationsdateien]
```

### 2.2 Dispatcher-Pattern

**Stärke:** Das Backend implementiert ein elegantes Hostname-basiertes Routing:

```typescript
// apps/backend/src/index.ts (Zeilen 95-103)
app.use("*", async (c, next) => {
    const host = c.req.header("host") || "";
    if (host.startsWith("todo.")) {
        return apiRoutes.fetch(c.req.raw, c.env, c.executionCtx);
    }
    await next();
});
```

**Vorteile:**
- Ein Prozess für alle Apps (RAM-Effizienz)
- Saubere Trennung ohne Code-Duplizierung
- RPC-Typ-Export für Frontend-Konsumenten

### 2.3 Paket-Auflösung

- `workspace:*` Protokoll für lokale Abhängigkeiten
- Root `tsconfig.json` definiert `@repo/*` Pfad-Aliase
- Jedes Paket re-exportiert über `index.ts`

---

## 3. Stack-Bewertung

### 3.1 Technologie-Entscheidungen

| Komponente | Wahl | Lean-Alignment | Bewertung |
|------------|------|----------------|-----------|
| **Runtime** | Bun 1.3.8 | ✅ Alles-in-einem: Runtime, Bundler, PM | Exzellent |
| **Backend** | Hono + RPC | ✅ Leichtgewichtig, Type-Safe | Exzellent |
| **Frontend** | Preact + Vite | ✅ 3KB vs React's 45KB | Exzellent |
| **ORM** | Drizzle | ✅ Typ-sicher ohne Codegen | Gut |
| **DB** | LibSQL (SQLite) | ✅ Zero-Config, Single-File | Exzellent |
| **Validierung** | Zod | ✅ Schema-First, keine Duplizierung | Exzellent |
| **Styling** | Tailwind v4 | ✅ On-demand, kein Build-Overhead | Gut |
| **Linting** | Biome | ✅ Schneller als ESLint+Prettier | Gut |
| **Icons** | Lucide-React | ⚠️ Tree-shakable, aber größere Bundle-Size | Akzeptabel |

### 3.2 Abhängigkeits-Risiken

```json
// ⚠️ Anti-Pattern: "latest" statt fixer Versionen
"dependencies": {
    "hono": "latest",
    "zod": "latest"
}
```

**Risiko:** Nicht-reproduzierbare Builds bei späteren Installationen.

---

## 4. Code-Qualität

### 4.1 TypeScript-Konfiguration

| Aspekt | Einstellung | Bewertung |
|--------|-------------|-----------|
| Strict Mode | `strict: true` | ✅ Exzellent |
| noUncheckedIndexedAccess | Nur in `packages/db` | ⚠️ Inkonsistent |
| skipLibCheck | `true` | ⚠️ Versteckt potentielle Typfehler |

### 4.2 Error-Handling

**Kritische Lücken:**

| Datei | Problem | Auswirkung |
|-------|---------|------------|
| `apps/backend/src/index.ts` | Generischer Catch ohne Logging | Debugging erschwert |
| `apps/backend/src/routes/todo.ts` | Kein try/catch bei DB-Operationen | Unhandled Rejections |
| `apps/todo/src/lib/api.ts` | Kein Error-Interceptor | Stille Fehler im Frontend |

**Beispiel (problematisch):**
```typescript
// apps/backend/src/index.ts L55-58
} catch (error) {
    return c.json({ message: "Internal error" }, 500);
    // ⚠️ Kein console.error(), kein Fehler-Detail
}
```

### 4.3 Stil-Konsistenz

- ✅ Biome erzwingt einheitliche Formatierung (Tabs, Double-Quotes)
- ✅ Konsistente Namenskonventionen (`*Api`, `*Schema`)
- ⚠️ Gemischte Sprache in UI (Deutsch) vs. Code (Englisch)

---

## 5. Sicherheits-Analyse

### 5.1 Kritische Schwachstellen

#### 🚨 Session-Forgery (Kritisch)

**Datei:** `packages/auth/index.ts`

```typescript
// L13-14: Session-ID IST die User-ID
const userId = getCookie(c, SESSION_COOKIE);
if (userId) {
    c.set("user", { id: userId });
}
```

**Problem:** Jeder kann eine Session fälschen, indem er `session_id=<beliebige-uuid>` als Cookie setzt.

**Fix erforderlich:**
```typescript
// Sichere Variante:
const sessions = sqliteTable("sessions", {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    expiresAt: integer("expires_at")
});
// Validierung bei jedem Request
const session = await db.select().from(sessions).where(eq(sessions.id, sessionId));
```

#### 🚨 Fehlende Ownership-Checks (Kritisch)

**Datei:** `apps/backend/src/routes/todo.ts`

```typescript
// L67-71: JEDER authentifizierte User kann JEDES Todo löschen!
.delete("/:id", async (c) => {
    const id = Number.parseInt(c.req.param("id"));
    await db.delete(todos).where(eq(todos.id, id));
    // ⚠️ Kein: .where(and(eq(todos.id, id), eq(todos.userId, user.id)))
});
```

#### 🚨 File-Upload ohne Validierung (Hoch)

**Datei:** `apps/backend/src/routes/todo.ts` L40-55

| Problem | Risiko |
|---------|--------|
| Keine MIME-Type-Prüfung | Ausführbare Dateien hochladbar |
| Keine Größenbeschränkung | Disk-Exhaustion-Angriff |
| Keine Virus-Prüfung | Malware-Verteilung |

### 5.2 Cookie-Konfiguration

```typescript
// packages/auth/index.ts L21-27
httpOnly: true,      // ✅ XSS-Schutz
secure: true,        // ✅ HTTPS-only
sameSite: isDev ? "None" : "Lax",  // ⚠️ "None" in Dev = CSRF-Risiko
```

### 5.3 CORS-Konfiguration

```typescript
// apps/backend/src/index.ts L20-33
origin: (origin) => {
    return origin; // ⚠️ Reflektiert jeden Origin = Offen für alle
}
```

**Bewertung:** In Entwicklung akzeptabel, für Produktion muss eine Whitelist implementiert werden.

---

## 6. Datenbank-Design

### 6.1 Schema-Analyse

**Users-Tabelle:**
```typescript
// packages/db/schema/user.ts
id: text("id").primaryKey(),           // UUID
username: text("username").unique(),
password: text("password"),             // ✅ Wird mit Bun.password gehasht
createdAt: text("created_at")           // ⚠️ TEXT statt INTEGER (UNIX)
```

**Todos-Tabelle:**
```typescript
// packages/db/schema/todo.ts
id: integer("id").primaryKey({ autoIncrement: true }),
userId: text("user_id").notNull(),      // ⚠️ Kein Foreign Key
```

### 6.2 Schema-Probleme

| Problem | Datei | Fix |
|---------|-------|-----|
| Keine Foreign Keys | `schema/todo.ts` | `.references(() => users.id)` |
| Fehlende Indexes | `schema/todo.ts` | `userId` für Abfrage-Performance |
| Timestamps als TEXT | Beide Schemas | `INTEGER` für UNIX-Timestamps |

### 6.3 Table-Prefix-Pattern

```typescript
// packages/db/schema-helper.ts
export const createTableName = (app: string, table: string) => `${app}_${table}`;
```

**Stärke:** Ermöglicht Multi-App-Isolation in einer SQLite-Datei.

---

## 7. Developer Experience

### 7.1 Stärken

| Feature | Implementation | Bewertung |
|---------|---------------|-----------|
| Hot Reload | Bun `--hot` + Vite HMR | ✅ Exzellent |
| Type-Safety | Hono RPC End-to-End | ✅ Exzellent |
| Linting/Formatting | Biome (< 100ms) | ✅ Sehr gut |
| Codespaces-Ready | Port-Detection, CORS | ✅ Exzellent |
| Dokumentation | NEW_APP_GUIDE.md | ✅ Exzellent |
| Workspace-Scripts | `bun run --filter` | ✅ Gut |

### 7.2 Lücken

| Fehlendes Feature | Priorität | Aufwand |
|-------------------|-----------|---------|
| Test-Framework (Vitest) | Hoch | 2h |
| Pre-Commit-Hooks (Husky) | Mittel | 30min |
| CI/CD-Pipeline | Hoch | 2-4h |
| Environment-Validierung | Mittel | 1h |
| i18n-System | Niedrig | Optional |

---

## 8. Features

### 8.1 Implementierte Features

| Feature | Status | Qualität |
|---------|--------|----------|
| User-Registrierung | ✅ | Funktional |
| User-Login | ✅ | Funktional |
| Passwort-Hashing (Argon2) | ✅ | Sicher |
| Todo-CRUD | ✅ | Funktional |
| File-Attachments | ✅ | Grundlegend |
| Subdomain-Routing | ✅ | Elegant |
| RPC-Type-Inference | ✅ | Exzellent |

### 8.2 Feature-Lücken

| Fehlendes Feature | Business Impact |
|-------------------|-----------------|
| Passwort-Reset | Hoch |
| Email-Verifizierung | Mittel |
| Rate-Limiting | Hoch (Sicherheit) |
| Session-Invalidierung | Hoch (Sicherheit) |
| File-Type-Validation | Hoch (Sicherheit) |

---

## 9. Best Practices

### 9.1 Eingehaltene Practices

| Practice | Umsetzung |
|----------|-----------|
| **Separation of Concerns** | Routes, Schemas, Auth getrennt |
| **DRY** | Zod-Schemas verhindert Duplizierung |
| **Single Responsibility** | Ein Package = Ein Zweck |
| **Immutable Config** | tsconfig.json wird vererbt |
| **Explicit Exports** | `export type AppType` für RPC |

### 9.2 Verletzte Practices

| Violation | Datei | Empfehlung |
|-----------|-------|------------|
| **Hardcoded Secrets** | - | .env-Datei nutzen |
| **Magic Strings** | App.tsx | Constants extrahieren |
| **Mixed Concerns** | index.ts | Auth-Routes in eigene Datei |
| **Unversioned Deps** | package.json | Explizite Versionen |

---

## 10. Empfehlungen

### 10.1 Sofort (vor Produktion)

| Maßnahme | Aufwand | Impact |
|----------|---------|--------|
| Session-Validierung via DB | 4h | Kritisch |
| Ownership-Checks bei CRUD | 1h | Kritisch |
| File-Upload-Limits | 1h | Hoch |
| CORS-Whitelist für Prod | 30min | Hoch |

### 10.2 Kurzfristig (2 Wochen)

| Maßnahme | Aufwand |
|----------|---------|
| Vitest einrichten | 2-4h |
| Pre-Commit-Hooks | 30min |
| Error-Logging (Strukturiert) | 2h |
| Rate-Limiting-Middleware | 2h |

### 10.3 Mittelfristig (1 Monat)

| Maßnahme | Aufwand |
|----------|---------|
| CI/CD-Pipeline (GitHub Actions) | 4h |
| Health-Checks & Monitoring | 2h |
| Backup-Strategie für SQLite | 2h |
| i18n-Vorbereitung | Optional |

---

## 11. Fazit

### Stärken

1. **Architektur:** Das Dispatcher-Pattern ermöglicht echte Single-Process-Multitenancy
2. **Type-Safety:** Hono RPC eliminiert Typdiskrepanzen zwischen Frontend/Backend
3. **DX:** Schnelle Feedbackschleifen, klare Dokumentation
4. **Stack-Wahl:** Bun + Preact + SQLite treffen exakt das "Lean"-Ziel

### Kritische Punkte vor Produktion

1. **Session-Sicherheit:** Cookie-Wert darf NICHT die User-ID sein
2. **Authorization:** Ownership-Checks auf allen mutierenden Endpoints
3. **Input-Validierung:** File-Uploads und Delete-Operationen absichern

### Gesamtbewertung

Das Projekt zeigt eine **klare Vision** und **konsistente Umsetzung** der Lean-Philosophie. Die Architektur ist für das Ziel (>10 Apps auf 1GB RAM) gut geeignet. Vor einem Produktions-Deployment müssen jedoch die **kritischen Sicherheitslücken** (Session-Forgery, fehlende Ownership-Checks) behoben werden.

**Empfehlung:** Mit 8-12 Stunden fokussierter Arbeit auf die Sicherheits-Fixes ist das Repository produktionsbereit.

---

*Generiert durch automatisierte Code-Analyse am 05.02.2026*
