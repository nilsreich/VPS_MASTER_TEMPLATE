import { join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as sessionSchema from "./schema/session";
import * as todoSchema from "./schema/todo";
import * as userSchema from "./schema/user";

// Nutze absoluten Pfad für die DB, damit es von überall im Monorepo funktioniert
const dbPath = join(process.cwd(), "data.db");
const client = createClient({ url: `file:${dbPath}` });

export const db = drizzle(client, {
	schema: { ...todoSchema, ...userSchema, ...sessionSchema },
});

export * from "./schema/todo";
export * from "./schema/user";
export * from "./schema/session";
