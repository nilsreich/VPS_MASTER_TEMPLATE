import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createTableName } from "../schema-helper";

// Prefix 'todo_' zur logischen Trennung in einer Datei
export const todos = sqliteTable(createTableName("todo", "items"), {
	id: integer("id").primaryKey({ autoIncrement: true }),
	content: text("content").notNull(),
	completed: integer("completed", { mode: "boolean" }).notNull().default(false),
	userId: text("user_id").notNull(),
	fileUrl: text("file_url"),
	fileName: text("file_name"),
	createdAt: text("created_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});
