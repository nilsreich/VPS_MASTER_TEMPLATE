# @repo/auth

Dieses Paket stellt gemeinsame Authentifizierungslogik und Middlewares für das Monorepo bereit.

## Features

- **Session Management**: Funktionen zum Erstellen (`createSession`) und Löschen (`clearSession`) von Sessions.
- **Hono Middleware**: `authMiddleware` zum Schutz von API-Endpunkten. Es prüft die Session und setzt den Benutzerkontext.
- **Konsistenz**: Stellt sicher, dass die Authentifizierung über verschiedene Services hinweg einheitlich funktioniert.

## Verwendung im Backend

```typescript
import { authMiddleware } from "@repo/auth";
import { Hono } from "hono";

const app = new Hono();

// Middleware global oder für spezifische Routen anwenden
app.use("/api/*", authMiddleware);

app.get("/api/me", (c) => {
  const user = c.get("user");
  return c.json({ user });
});
```

## Entwicklung

Dieses Paket nutzt Bun und Hono als Kerntechnologien. Alle Änderungen an der Authentifizierungslogik sollten hier zentral vorgenommen werden.
