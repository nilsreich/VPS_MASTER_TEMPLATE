import { authMiddleware } from "@repo/auth";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { rateLimiter } from "hono-rate-limiter";
import { authApi } from "./routes/auth.ts";
import { todoApi } from "./routes/todo.ts";

// Konstanten aus Umgebungsvariablen
const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || [];
const isDev = process.env.NODE_ENV !== "production";

type Variables = {
	user: { id: string } | null;
};

const app = new Hono<{ Variables: Variables }>();

// Global Middlewares
app.use("*", logger());
app.use("*", compress());

// Rate Limiting (global)
app.use(
	"*",
	rateLimiter({
		windowMs: 60 * 1000, // 1 Minute
		limit: 100, // Max 100 Anfragen pro Minute
		standardHeaders: "draft-6",
		keyGenerator: (c) =>
			c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
			c.req.header("x-real-ip") ||
			"unknown",
		message: { error: "Zu viele Anfragen. Bitte später erneut versuchen." },
	}),
);

// Strengeres Rate Limit für Auth-Endpoints
app.use(
	"/auth/*",
	rateLimiter({
		windowMs: 15 * 60 * 1000, // 15 Minuten
		limit: 10, // Max 10 Auth-Versuche pro 15 Minuten
		standardHeaders: "draft-6",
		keyGenerator: (c) =>
			c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
			c.req.header("x-real-ip") ||
			"unknown",
		message: { error: "Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen." },
	}),
);

// CORS Konfiguration
app.use(
	"*",
	cors({
		origin: (origin) => {
			// Produktion: Nur erlaubte Origins
			if (ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin)) {
				return origin;
			}
			// Entwicklung: Alle Origins erlauben
			if (isDev) {
				return origin;
			}
			// Fallback: Kein Origin
			return null;
		},
		credentials: true,
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
		allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
		exposeHeaders: ["Content-Length"],
		maxAge: 600,
	}),
);

// Auth Routes (mit authMiddleware für /me)
app.use("/auth/me", authMiddleware);
app.route("/auth", authApi);

// Statische Dateien (Uploads)
app.use("/uploads/*", serveStatic({ root: "./" }));

// Geschützte API-Routes
const apiRoutes = new Hono<{ Variables: Variables }>()
	.use("*", authMiddleware)
	.route("/todo", todoApi);

// Multi-Tenancy Hostname-Routing (Dispatcher)
app.use("*", async (c, next) => {
	const host = c.req.header("host") || "";

	if (host.startsWith("todo.")) {
		return apiRoutes.fetch(c.req.raw, c.env, c.executionCtx);
	}

	await next();
});

// Direkter API-Zugang
app.route("/api", apiRoutes);

// RPC-Export für Frontend
export type AppType = typeof apiRoutes;

export default {
	port: PORT,
	fetch: app.fetch,
};
