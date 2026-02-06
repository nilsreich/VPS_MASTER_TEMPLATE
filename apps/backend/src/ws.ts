import type { ServerWebSocket } from "bun";

export type WSData = { userId: string; roomId: string };

export const websocket = {
	open(ws: ServerWebSocket<WSData>) {
		// Optional: Logging
	},

	async message(ws: ServerWebSocket<WSData>, msg: string | Buffer) {
		const data = JSON.parse(msg.toString());

		// 1. Authentifizierung & Room-Join (erste Message)
		if (data.type === "auth") {
			ws.data = { userId: data.userId, roomId: data.roomId };
			ws.subscribe(data.roomId);
			return;
		}

		// 2. Neue Nachricht verarbeiten (Pure Relay)
		if (data.type === "message") {
			const message = {
				id: crypto.randomUUID(),
				userId: ws.data.userId,
				roomId: ws.data.roomId,
				content: data.text,
				createdAt: new Date().toISOString(),
			};

			// KEINE DB - Nur Broadcast an alle im Room
			ws.publish(
				ws.data.roomId,
				JSON.stringify({
					type: "message",
					data: message,
				}),
			);

			// Workaround: publish sendet nicht an sich selbst
			ws.send(JSON.stringify({ type: "message", data: message }));
		}
	},

	close(ws: ServerWebSocket<WSData>) {
		if (ws.data?.roomId) ws.unsubscribe(ws.data.roomId);
	},
};
