import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createTableName } from "../schema-helper";

export const users = sqliteTable(createTableName("auth", "users"), {
	id: text("id").primaryKey(), // We can use UUIDs or usernames
	username: text("username").notNull().unique(),
	password: text("password").notNull(), // In a real app, hash this!
	createdAt: text("created_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});
