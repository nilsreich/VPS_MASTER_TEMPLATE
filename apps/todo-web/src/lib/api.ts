import type { AppType } from "@repo/backend";
import { hc } from "hono/client";

// Central API client configuration
const getBaseUrl = () => {
	if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

	// In development, we use Vite's proxy (see vite.config.ts)
	// In production, the frontend is typically served from the same origin as the API
	return "/api";
};

const client = hc<AppType>(getBaseUrl(), {
	headers: {},
	fetch: (async (url: string | URL | Request, init?: RequestInit) => {
		return fetch(url, {
			...init,
			credentials: "include",
		});
	}) as typeof fetch,
});

export const api = client;
