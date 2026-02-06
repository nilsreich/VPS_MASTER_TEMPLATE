import { authMiddleware } from "@repo/auth";
import { authApi } from "@repo/auth";
import type { Server } from "bun";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { todoApi } from "./routes/todo";
import { type WSData, websocket } from "./ws";

const app = new Hono<{ Variables: { user: { id: string } | null } }>();

app.use("*", logger());
app.use("*", cors({ origin: (o) => o, credentials: true }));

// Auth & API
app.use("/auth/me", authMiddleware);
app.route("/auth", authApi);

const apiRoutes = new Hono<{ Variables: { user: { id: string } | null } }>()
	.use("*", authMiddleware)
	.route("/todo", todoApi);

app.route("/api", apiRoutes);

// Uploads & Apps
app.use(
	"/uploads/*",
	authMiddleware,
	async (c, next) => {
		if (!c.get("user")) return c.json({ error: "No" }, 401);
		await next();
	},
	serveStatic({ root: "./" }),
);

app.use("*", async (c, next) => {
	if (c.req.path.startsWith("/api") || c.req.path.startsWith("/auth"))
		return next();
	const host = c.req.header("host") || "";
	if (host.startsWith("todo."))
		return serveStatic({
			root: "../../apps/todo-web/dist",
			path: c.req.path === "/" ? "index.html" : c.req.path,
		})(c, next);
	if (host.startsWith("notes."))
		return serveStatic({
			root: "../../apps/notes-web/dist",
			path: c.req.path === "/" ? "index.html" : c.req.path,
		})(c, next);
	await next();
});

export type AppType = typeof apiRoutes;
export default {
	port: process.env.PORT || 3000,
	websocket,
	fetch: (req: Request, server: Server<WSData>) => {
		if (
			new URL(req.url).pathname === "/ws" &&
			server.upgrade(req, { data: { userId: "", roomId: "" } })
		)
			return;
		return app.fetch(req, server);
	},
};
