import { db, sessions } from "@repo/db";
import { eq, lt } from "drizzle-orm";
import type { Context, Next } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

// Konstanten
const SESSION_COOKIE_NAME = "session_id";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 1 Woche

export const authMiddleware = async (c: Context, next: Next) => {
	const sessionId = getCookie(c, SESSION_COOKIE_NAME);

	if (!sessionId) {
		c.set("user", null);
		return next();
	}

	try {
		// Session aus DB laden und validieren
		const session = await db
			.select()
			.from(sessions)
			.where(eq(sessions.id, sessionId))
			.get();

		if (session && session.expiresAt > Date.now()) {
			c.set("user", { id: session.userId });
		} else {
			// Abgelaufene Session löschen
			if (session) {
				await db.delete(sessions).where(eq(sessions.id, sessionId));
			}
			deleteCookie(c, SESSION_COOKIE_NAME);
			c.set("user", null);
		}
	} catch {
		c.set("user", null);
	}

	await next();
};

export const createSession = async (c: Context, userId: string) => {
	const isDev =
		process.env.NODE_ENV !== "production" ||
		c.req.header("host")?.includes("github.dev");

	const sessionId = crypto.randomUUID();
	const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;

	try {
		await db.insert(sessions).values({
			id: sessionId,
			userId,
			expiresAt,
		});

		setCookie(c, SESSION_COOKIE_NAME, sessionId, {
			httpOnly: true,
			secure: true,
			sameSite: isDev ? "None" : "Lax",
			maxAge: SESSION_MAX_AGE_SECONDS,
			path: "/",
		});
	} catch {
		throw new Error("Session konnte nicht erstellt werden");
	}
};

export const clearSession = async (c: Context) => {
	const sessionId = getCookie(c, SESSION_COOKIE_NAME);

	if (sessionId) {
		try {
			await db.delete(sessions).where(eq(sessions.id, sessionId));
		} catch {
			// Session-Löschung fehlgeschlagen, Cookie trotzdem entfernen
		}
	}

	deleteCookie(c, SESSION_COOKIE_NAME);
};

// Cleanup abgelaufener Sessions (kann periodisch aufgerufen werden)
export const cleanupExpiredSessions = async () => {
	try {
		await db.delete(sessions).where(lt(sessions.expiresAt, Date.now()));
	} catch {
		// Cleanup fehlgeschlagen
	}
};
