import type { AppType } from "@repo/backend";
import { hc } from "hono/client";

// Point to the central backend's /api base
const getBaseUrl = () => {
	if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

	const isCodespaces =
		typeof window !== "undefined" &&
		window.location.hostname.includes("github.dev");
	if (isCodespaces) {
		return `https://${window.location.hostname.replace("-5173", "-3000")}/api`;
	}
	return "http://localhost:3000/api";
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
