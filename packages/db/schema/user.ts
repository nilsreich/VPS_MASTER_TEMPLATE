import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createTableName } from "../utils";

export const users = sqliteTable(createTableName("auth", "users"), {
	id: text("id").primaryKey(),
	username: text("username").notNull().unique(),
	password: text("password").notNull(),
	createdAt: text("created_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});
