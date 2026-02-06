import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [preact(), tailwindcss()],
	server: {
		allowedHosts: true,
		host: true,
		proxy: {
			"/api": {
				target: "http://localhost:3000",
				changeOrigin: true,
			},
			"/auth": {
				target: "http://localhost:3000",
				changeOrigin: true,
			},
			"/uploads": {
				target: "http://localhost:3000",
				changeOrigin: true,
			},
			"/ws": {
				target: "http://localhost:3000",
				ws: true,
			},
		},
	},
});
