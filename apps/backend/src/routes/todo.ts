import { zValidator } from "@hono/zod-validator";
import { db, todos } from "@repo/db";
import { CreateTodoSchema } from "@repo/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

// Konstanten
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"application/pdf",
	"text/plain",
	"application/json",
];

type Variables = {
	user: { id: string } | null;
};

export const todoApi = new Hono<{ Variables: Variables }>()
	.get("/", async (c) => {
		const user = c.get("user");
		if (!user) return c.json({ error: "Nicht autorisiert" }, 401);

		try {
			const allTodos = await db
				.select()
				.from(todos)
				.where(eq(todos.userId, user.id));
			return c.json(allTodos);
		} catch {
			return c.json({ error: "Datenbankfehler beim Laden" }, 500);
		}
	})
	.post("/", zValidator("json", CreateTodoSchema), async (c) => {
		const user = c.get("user");
		if (!user) return c.json({ error: "Nicht autorisiert" }, 401);

		const data = c.req.valid("json");

		try {
			const result = await db
				.insert(todos)
				.values({
					content: data.content,
					completed: data.completed,
					fileUrl: data.fileUrl,
					fileName: data.fileName,
					userId: user.id,
				})
				.returning();

			return c.json(result[0]);
		} catch {
			return c.json({ error: "Datenbankfehler beim Erstellen" }, 500);
		}
	})
	.post("/upload", async (c) => {
		const user = c.get("user");
		if (!user) return c.json({ error: "Nicht autorisiert" }, 401);

		try {
			const body = await c.req.parseBody();
			const file = body.file as File;

			if (!file) return c.json({ error: "Keine Datei angegeben" }, 400);

			// Größenbeschränkung prüfen
			if (file.size > MAX_FILE_SIZE_BYTES) {
				return c.json(
					{
						error: `Datei zu groß. Maximal ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB erlaubt`,
					},
					400,
				);
			}

			// MIME-Type prüfen
			if (!ALLOWED_MIME_TYPES.includes(file.type)) {
				return c.json(
					{
						error: `Dateityp nicht erlaubt. Erlaubt: ${ALLOWED_MIME_TYPES.join(", ")}`,
					},
					400,
				);
			}

			const extension = file.name.split(".").pop();
			const fileName = `${crypto.randomUUID()}.${extension}`;
			const filePath = `uploads/${fileName}`;

			await Bun.write(filePath, file);

			return c.json({
				url: `/${filePath}`,
				name: file.name,
			});
		} catch {
			return c.json({ error: "Fehler beim Hochladen der Datei" }, 500);
		}
	})
	.patch(
		"/:id",
		zValidator("json", z.object({ completed: z.boolean() })),
		async (c) => {
			const user = c.get("user");
			if (!user) return c.json({ error: "Nicht autorisiert" }, 401);

			const id = Number.parseInt(c.req.param("id"));
			const { completed } = c.req.valid("json");

			try {
				// Ownership-Check: Nur eigene Todos aktualisieren
				const result = await db
					.update(todos)
					.set({ completed })
					.where(and(eq(todos.id, id), eq(todos.userId, user.id)))
					.returning();

				if (result.length === 0) {
					return c.json(
						{ error: "Todo nicht gefunden oder keine Berechtigung" },
						404,
					);
				}

				return c.json({ success: true });
			} catch {
				return c.json({ error: "Datenbankfehler beim Aktualisieren" }, 500);
			}
		},
	)
	.delete("/:id", async (c) => {
		const user = c.get("user");
		if (!user) return c.json({ error: "Nicht autorisiert" }, 401);

		const id = Number.parseInt(c.req.param("id"));

		try {
			// Ownership-Check: Nur eigene Todos löschen
			const result = await db
				.delete(todos)
				.where(and(eq(todos.id, id), eq(todos.userId, user.id)))
				.returning();

			if (result.length === 0) {
				return c.json(
					{ error: "Todo nicht gefunden oder keine Berechtigung" },
					404,
				);
			}

			return c.json({ success: true });
		} catch {
			return c.json({ error: "Datenbankfehler beim Löschen" }, 500);
		}
	});
