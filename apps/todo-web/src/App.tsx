import { signal } from "@preact/signals";
import type { Todo } from "@repo/shared";
import {
	Check,
	LogOut,
	Paperclip,
	Play,
	Plus,
	Trash,
	User,
} from "lucide-react";
import { useRef } from "preact/hooks";
import { api } from "./lib/api";
import { useFetch } from "./lib/fetch";
import { navigate, useRoute } from "./lib/router";

// --- KONFIGURATION ---
const getBackendUrl = () => {
	if (import.meta.env.VITE_API_URL)
		return import.meta.env.VITE_API_URL.replace("/api", "");

	// In development, we use Vite's proxy (see vite.config.ts)
	// In production, the frontend is typically served from the same origin as the API
	return "";
};

const BACKEND_URL = getBackendUrl();

// --- STATE (Signals) ---
const user = signal<string | null>(null);
const search = signal("");
const isRegistering = signal(false);
const uploading = signal(false);
const attachedFile = signal<{ url: string; name: string } | null>(null);

const username = signal("");
const password = signal("");

// Route parsing
type Route = { type: "app" } | { type: "login" };
const parse = (p: string): Route =>
	p === "/login" ? { type: "login" } : { type: "app" };

// --- AUTH LOGIK ---
async function checkAuth() {
	try {
		const res = await fetch(`${BACKEND_URL}/auth/me`, {
			credentials: "include",
		});
		if (res.ok) {
			const data = await res.json();
			if (data.user) user.value = data.user.id;
		}
	} catch (e) {
		console.warn(
			"Auth-Check fehlgeschlagen (evtl. Backend noch nicht bereit):",
			e,
		);
	}
}

// Initialer Check
checkAuth();

// --- KOMPONENTEN ---

function LoginView() {
	const handleAuth = async (e: Event) => {
		e.preventDefault();
		const endpoint = isRegistering.value ? "/auth/register" : "/auth/login";
		const res = await fetch(`${BACKEND_URL}${endpoint}`, {
			method: "POST",
			body: JSON.stringify({
				username: username.value,
				password: password.value,
			}),
			headers: { "Content-Type": "application/json" },
			credentials: "include",
		});

		const data = await res.json();
		if (res.ok) {
			user.value = data.user;
			navigate("/");
		} else {
			alert(data.message || "Anmeldung fehlgeschlagen");
		}
	};

	return (
		<div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-8">
			<form
				onSubmit={handleAuth}
				className="w-full max-w-sm bg-zinc-900 p-8 rounded-lg border border-zinc-800 shadow-xl"
			>
				<h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
					<Play size={24} className="text-blue-500" />
					Lean Auth
				</h1>
				<input
					type="text"
					placeholder="Benutzername"
					value={username}
					onInput={(e) => {
						username.value = (e.target as HTMLInputElement).value;
					}}
					className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 mb-4 focus:outline-none focus:border-blue-500 transition-colors"
				/>
				<input
					type="password"
					placeholder="Passwort"
					value={password}
					onInput={(e) => {
						password.value = (e.target as HTMLInputElement).value;
					}}
					className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 mb-6 focus:outline-none focus:border-blue-500 transition-colors"
				/>
				<button
					type="submit"
					className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition-colors mb-4"
				>
					{isRegistering.value ? "Registrieren" : "Anmelden"}
				</button>
				<button
					type="button"
					onClick={() => {
						isRegistering.value = !isRegistering.value;
					}}
					className="w-full text-zinc-500 text-sm hover:text-blue-500 transition-colors"
				>
					{isRegistering.value
						? "Bereits ein Konto? Anmelden"
						: "Noch kein Konto? Registrieren"}
				</button>
			</form>
		</div>
	);
}

function TodoView() {
	const {
		data: todos,
		refetch,
		mutate,
	} = useFetch(async () => {
		const res = await api.todo.$get();
		if (!res.ok) throw new Error("Failed to fetch todos");
		return res.json() as Promise<Todo[]>;
	});
	const newTodo = signal("");
	const fileInputRef = useRef<HTMLInputElement>(null);

	const logout = async () => {
		await fetch(`${BACKEND_URL}/auth/logout`, { method: "POST" });
		user.value = null;
		navigate("/login");
	};

	const handleFileUpload = async (e: Event) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		uploading.value = true;
		const formData = new FormData();
		formData.append("file", file);

		try {
			const res = await fetch(`${BACKEND_URL}/api/todo/upload`, {
				method: "POST",
				body: formData,
				credentials: "include",
			});
			if (res.ok) attachedFile.value = await res.json();
		} finally {
			uploading.value = false;
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const addTodo = async (e: Event) => {
		e.preventDefault();
		if (!newTodo.value) return;

		const content = newTodo.value;
		const file = attachedFile.value;

		mutate(
			(prev) => [
				...(prev || []),
				{
					id: Date.now(),
					content,
					completed: false,
					// biome-ignore lint/style/noNonNullAssertion: user is logged in
					userId: user.value!,
					fileUrl: file?.url ?? null,
					fileName: file?.name ?? null,
					createdAt: new Date().toISOString(),
					// biome-ignore lint/suspicious/noExplicitAny: cast to allow optimistic update
				} as any, // Cast to any because the inferred Hono type might be more strict
			],
			async () => {
				const res = await api.todo.$post({
					json: {
						content,
						completed: false,
						fileUrl: file?.url,
						fileName: file?.name,
					},
				});
				if (!res.ok) throw new Error("Failed to add");
				refetch(); // Sicherstellen, dass die ID vom Server kommt
			},
		);

		newTodo.value = "";
		attachedFile.value = null;
	};

	return (
		<div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center p-8">
			<div className="w-full max-w-md">
				<div className="flex justify-between items-center mb-8">
					<h1 className="text-2xl font-bold flex items-center gap-2">
						<Play size={24} className="text-zinc-500" />
						Lean Todo
					</h1>
					<div className="flex items-center gap-4">
						<span className="text-sm text-zinc-500 flex items-center gap-1">
							<User size={14} /> {user.value}
						</span>
						<button
							type="button"
							onClick={logout}
							className="text-zinc-500 hover:text-red-500"
						>
							<LogOut size={20} />
						</button>
					</div>
				</div>

				<form onSubmit={addTodo} className="space-y-2 mb-8">
					<div className="flex gap-2">
						<input
							type="text"
							value={newTodo}
							onInput={(e) => {
								newTodo.value = (e.target as HTMLInputElement).value;
							}}
							className="flex-1 bg-zinc-900 border border-zinc-800 rounded p-2 focus:outline-none focus:border-zinc-600 transition-colors"
							placeholder="Was muss erledigt werden?"
						/>
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleFileUpload}
							className="hidden"
						/>
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							disabled={uploading.value}
							className={`p-2 rounded border border-zinc-800 transition-colors ${attachedFile.value ? "text-green-500 border-green-500/30 bg-green-500/10" : "text-zinc-500 hover:text-zinc-300"}`}
						>
							<Paperclip size={20} />
						</button>
						<button
							type="submit"
							className="bg-zinc-100 text-zinc-950 p-2 rounded hover:bg-zinc-300 transition-colors"
						>
							<Plus size={20} />
						</button>
					</div>
					{attachedFile.value && (
						<div className="text-xs text-green-500 flex items-center gap-1 px-1">
							<Check size={12} /> {attachedFile.value.name}
							<button
								type="button"
								onClick={() => {
									attachedFile.value = null;
								}}
								className="ml-1 text-zinc-500 underline"
							>
								entfernen
							</button>
						</div>
					)}
				</form>

				<div className="space-y-2">
					<input
						type="text"
						placeholder="Suchen..."
						value={search}
						onInput={(e) => {
							search.value = (e.target as HTMLInputElement).value;
						}}
						className="w-full bg-zinc-900 text-xs p-2 rounded border border-zinc-800 mb-4"
					/>
					{todos.value
						?.filter((t) =>
							t.content.toLowerCase().includes(search.value.toLowerCase()),
						)
						.map((todo) => (
							<div
								key={todo.id}
								className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-900 rounded p-3"
							>
								<span
									className={`flex-1 ${todo.completed ? "line-through text-zinc-600" : ""}`}
								>
									{todo.content}
								</span>
								<button
									type="button"
									onClick={() =>
										mutate(
											(prev) => prev?.filter((t) => t.id !== todo.id) || [],
											() =>
												api.todo[":id"].$delete({
													param: { id: todo.id.toString() },
												}),
										)
									}
									className="text-zinc-700 hover:text-red-500"
								>
									<Trash size={20} />
								</button>
							</div>
						))}
				</div>
			</div>
		</div>
	);
}

export default function App() {
	const route = useRoute(parse);

	if (!user.value || route.value.type === "login") {
		return <LoginView />;
	}

	return <TodoView />;
}
