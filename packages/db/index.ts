import { join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as sessionSchema from "./schema/session";
import * as todoSchema from "./schema/todo";
import * as userSchema from "./schema/user";

// Nutze absoluten Pfad für die DB, damit es von überall im Monorepo funktioniert
const dbPath =
	process.env.DATABASE_URL?.replace("file:", "") ||
	join(process.cwd(), "data.db");
const client = createClient({ url: `file:${dbPath}` });

// ⚡ PERFORMANCE-KRITISCH: Concurrency aktivieren
// Erlaubt paralleles Lesen & Schreiben für High-Traffic auf einer Datei.
try {
	client.execute("PRAGMA journal_mode = WAL;");
	client.execute("PRAGMA synchronous = NORMAL;"); // Balance zwischen Speed und Sicherheit
} catch (e) {
	console.warn(
		"Warnung: Konnte WAL-Mode nicht aktivieren (z.B. In-Memory DB).",
	);
}

export const db = drizzle(client, {
	schema: {
		...todoSchema,
		...userSchema,
		...sessionSchema,
	},
});

export * from "./schema/todo";
export * from "./schema/user";
export * from "./schema/session";
