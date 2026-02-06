import { zValidator } from "@hono/zod-validator";
import { clearSession, createSession } from "@repo/auth";
import { db, users } from "@repo/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

// Validierungsschemas
const AuthSchema = z.object({
	username: z.string().min(3, "Benutzername muss mindestens 3 Zeichen haben"),
	password: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben"),
});

type Variables = {
	user: { id: string } | null;
};

export const authApi = new Hono<{ Variables: Variables }>()
	.post("/register", zValidator("json", AuthSchema), async (c) => {
		const { username, password } = c.req.valid("json");
		const [user] = await db
			.insert(users)
			.values({
				id: crypto.randomUUID(),
				username,
				password: await Bun.password.hash(password),
			})
			.returning();
		if (!user) return c.json({ error: "Fail" }, 500);
		await createSession(c, user.id);
		return c.json({ success: true, user: user.username });
	})
	.post("/login", zValidator("json", AuthSchema), async (c) => {
		const { username, password } = c.req.valid("json");
		const user = await db
			.select()
			.from(users)
			.where(eq(users.username, username))
			.get();
		if (!user || !(await Bun.password.verify(password, user.password)))
			return c.json({ error: "Invalid" }, 401);
		await createSession(c, user.id);
		return c.json({ success: true, user: user.username });
	})
	.post("/logout", async (c) => {
		await clearSession(c);
		return c.json({ success: true });
	})
	.get("/me", (c) => c.json({ user: c.get("user") }));
