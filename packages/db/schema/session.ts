import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createTableName } from "../schema-helper";

export const sessions = sqliteTable(createTableName("auth", "sessions"), {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
	expiresAt: integer("expires_at").notNull(),
	createdAt: text("created_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});
