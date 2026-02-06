import { zValidator } from "@hono/zod-validator";
import { db, todos } from "@repo/db";
import { CreateTodoSchema } from "@repo/shared";
import { uploadFile } from "@repo/storage";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

type Variables = { user: { id: string } | null };

export const todoApi = new Hono<{ Variables: Variables }>()
	.get("/", async (c) => {
		// biome-ignore lint/style/noNonNullAssertion: authMiddleware ensures user is set
		const user = c.get("user")!;
		return c.json(
			await db.select().from(todos).where(eq(todos.userId, user.id)),
		);
	})
	.post("/", zValidator("json", CreateTodoSchema), async (c) => {
		// biome-ignore lint/style/noNonNullAssertion: authMiddleware ensures user is set
		const user = c.get("user")!;
		const [res] = await db
			.insert(todos)
			.values({ ...c.req.valid("json"), userId: user.id })
			.returning();
		return c.json(res);
	})
	.post("/upload", async (c) => {
		const { file } = await c.req.parseBody();
		if (!(file instanceof File)) return c.json({ error: "No file" }, 400);

		const res = await uploadFile(file);
		return c.json(res);
	})
	.patch(
		"/:id",
		zValidator("json", z.object({ completed: z.boolean() })),
		async (c) => {
			// biome-ignore lint/style/noNonNullAssertion: authMiddleware ensures user is set
			const user = c.get("user")!;
			const id = Number.parseInt(c.req.param("id"));
			const { completed } = c.req.valid("json");
			const [res] = await db
				.update(todos)
				.set({ completed })
				.where(and(eq(todos.id, id), eq(todos.userId, user.id)))
				.returning();
			return res ? c.json({ success: true }) : c.json({ error: "None" }, 404);
		},
	)
	.delete("/:id", async (c) => {
		// biome-ignore lint/style/noNonNullAssertion: authMiddleware ensures user is set
		const user = c.get("user")!;
		const id = Number.parseInt(c.req.param("id"));
		const [res] = await db
			.delete(todos)
			.where(and(eq(todos.id, id), eq(todos.userId, user.id)))
			.returning();
		return res ? c.json({ success: true }) : c.json({ error: "None" }, 404);
	});
