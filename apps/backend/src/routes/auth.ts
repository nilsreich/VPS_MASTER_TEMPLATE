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

		try {
			const hashedPassword = await Bun.password.hash(password);
			const user = await db
				.insert(users)
				.values({
					id: crypto.randomUUID(),
					username,
					password: hashedPassword,
				})
				.returning()
				.get();

			await createSession(c, user.id);
			return c.json({ success: true, user: user.username });
		} catch {
			return c.json(
				{ success: false, message: "Benutzer existiert bereits" },
				400,
			);
		}
	})
	.post("/login", zValidator("json", AuthSchema), async (c) => {
		const { username, password } = c.req.valid("json");

		try {
			const user = await db
				.select()
				.from(users)
				.where(eq(users.username, username))
				.get();

			if (!user) {
				return c.json(
					{ success: false, message: "Ungültige Anmeldedaten" },
					401,
				);
			}

			const isValid = await Bun.password.verify(password, user.password);
			if (!isValid) {
				return c.json(
					{ success: false, message: "Ungültige Anmeldedaten" },
					401,
				);
			}

			await createSession(c, user.id);
			return c.json({ success: true, user: user.username });
		} catch {
			return c.json({ success: false, message: "Anmeldefehler" }, 500);
		}
	})
	.post("/logout", async (c) => {
		try {
			await clearSession(c);
			return c.json({ success: true });
		} catch {
			return c.json({ success: false, message: "Abmeldefehler" }, 500);
		}
	})
	.get("/me", (c) => {
		const user = c.get("user");
		return c.json({ user });
	});
