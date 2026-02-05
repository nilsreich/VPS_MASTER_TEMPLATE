import type { Todo } from "@repo/shared";
import {
	Check,
	FileText,
	LogOut,
	Paperclip,
	Play,
	Plus,
	Trash,
	User,
} from "lucide-react";
import { useEffect, useRef, useState } from "preact/hooks";
import { api } from "./lib/api";

const isCodespaces =
	typeof window !== "undefined" &&
	window.location.hostname.includes("github.dev");

const getBackendUrl = () => {
	if (import.meta.env.VITE_API_URL)
		return import.meta.env.VITE_API_URL.replace("/api", "");

	if (isCodespaces) {
		return `https://${window.location.hostname.replace("-5173", "-3000")}`;
	}
	return "http://localhost:3000";
};

const BACKEND_URL = getBackendUrl();

export default function App() {
	const [todos, setTodos] = useState<Todo[]>([]);
	const [newTodo, setNewTodo] = useState("");
	const [user, setUser] = useState<string | null>(null);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [isRegistering, setIsRegistering] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [attachedFile, setAttachedFile] = useState<{
		url: string;
		name: string;
	} | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		checkAuth();
	}, []);

	useEffect(() => {
		if (user) fetchTodos();
	}, [user]);

	const checkAuth = async () => {
		// Note: Since we use RPC, we can also use fetch for non-rpc routes if needed
		// or better: expose auth in the RPC routes.
		// For now, simple fetch as auth is at the host root.
		const res = await fetch(`${BACKEND_URL}/auth/me`, {
			credentials: "include",
		});
		const data = await res.json();
		if (data.user) setUser(data.user.id);
	};

	const handleAuth = async (e: Event) => {
		e.preventDefault();
		const endpoint = isRegistering ? "/auth/register" : "/auth/login";
		const res = await fetch(`${BACKEND_URL}${endpoint}`, {
			method: "POST",
			body: JSON.stringify({ username, password }),
			headers: { "Content-Type": "application/json" },
			credentials: "include",
		});

		const data = await res.json();
		if (res.ok) {
			setUser(data.user);
		} else {
			alert(data.message || "Anmeldung fehlgeschlagen");
		}
	};

	const logout = async () => {
		await fetch(`${BACKEND_URL}/auth/logout`, { method: "POST" });
		setUser(null);
		setTodos([]);
	};

	const fetchTodos = async () => {
		const res = await api.todo.$get();
		if (res.ok) {
			const data = await res.json();
			setTodos(data as Todo[]);
		}
	};

	const addTodo = async (e: Event) => {
		e.preventDefault();
		if (!newTodo) return;
		console.log("Adding todo with attachment:", attachedFile);
		const res = await api.todo.$post({
			json: {
				content: newTodo,
				completed: false,
				fileUrl: attachedFile?.url,
				fileName: attachedFile?.name,
			},
		});
		if (res.ok) {
			setNewTodo("");
			setAttachedFile(null);
			fetchTodos();
		}
	};

	const handleFileUpload = async (e: Event) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		setUploading(true);
		setUploadError(null);
		const formData = new FormData();
		formData.append("file", file);

		try {
			console.log("Starting upload to:", `${BACKEND_URL}/api/todo/upload`);
			const res = await fetch(`${BACKEND_URL}/api/todo/upload`, {
				method: "POST",
				body: formData,
				credentials: "include",
			});

			if (res.ok) {
				const data = await res.json();
				console.log("Upload success:", data);
				setAttachedFile(data);
			} else {
				const errorData = await res
					.json()
					.catch(() => ({ error: "Unbekannter Fehler" }));
				setUploadError(errorData.error || "Upload fehlgeschlagen");
				alert(
					`Upload fehlgeschlagen: ${errorData.error || "Unbekannter Fehler"}`,
				);
			}
		} catch (err) {
			console.error("Upload failed", err);
			setUploadError("Netzwerkfehler beim Upload");
			alert("Netzwerkfehler beim Upload. Ist das Backend erreichbar?");
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const toggleTodo = async (id: number | string, completed: boolean) => {
		const res = await api.todo[":id"].$patch({
			param: { id: id.toString() },
			json: { completed: !completed },
		});
		if (res.ok) fetchTodos();
	};

	const deleteTodo = async (id: number | string) => {
		const res = await api.todo[":id"].$delete({ param: { id: id.toString() } });
		if (res.ok) fetchTodos();
	};

	if (!user) {
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
						onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
						className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 mb-4 focus:outline-none focus:border-blue-500 transition-colors"
					/>
					<input
						type="password"
						placeholder="Passwort"
						value={password}
						onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
						className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 mb-6 focus:outline-none focus:border-blue-500 transition-colors"
					/>
					<button
						type="submit"
						className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition-colors mb-4"
					>
						{isRegistering ? "Registrieren" : "Anmelden"}
					</button>

					<button
						type="button"
						onClick={() => setIsRegistering(!isRegistering)}
						className="w-full text-zinc-500 text-sm hover:text-blue-500 transition-colors"
					>
						{isRegistering
							? "Bereits ein Konto? Anmelden"
							: "Noch kein Konto? Registrieren"}
					</button>
				</form>
			</div>
		);
	}

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
							<User size={14} /> {user}
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

				{isCodespaces && (
					<div className="mb-4 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-blue-400">
						Hinweis: Stellen Sie sicher, dass Port 3000 in Codespaces auf
						"Public" steht für Downloads.
					</div>
				)}

				<form onSubmit={addTodo} className="space-y-2 mb-8">
					<div className="flex gap-2">
						<input
							type="text"
							value={newTodo}
							onInput={(e) => setNewTodo((e.target as HTMLInputElement).value)}
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
							disabled={uploading}
							className={`p-2 rounded border border-zinc-800 transition-colors ${attachedFile ? "text-green-500 border-green-500/30 bg-green-500/10" : "text-zinc-500 hover:text-zinc-300"} ${uploading ? "animate-pulse" : ""}`}
							title={
								attachedFile
									? "Datei erfolgreich hochgeladen"
									: "Datei anhängen"
							}
						>
							<Paperclip size={20} />
						</button>
						<button
							type="submit"
							disabled={uploading}
							className={`bg-zinc-100 text-zinc-950 p-2 rounded hover:bg-zinc-300 transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
						>
							<Plus size={20} />
						</button>
					</div>
					{uploading && (
						<div className="text-xs text-blue-500 animate-pulse px-1">
							Lade Datei hoch...
						</div>
					)}
					{uploadError && (
						<div className="text-xs text-red-500 px-1">
							Fehler: {uploadError}
						</div>
					)}
					{attachedFile && (
						<div className="text-xs text-green-500 flex items-center gap-1 px-1">
							<Check size={12} />
							Bereit: {attachedFile.name} (wird mit Todo gespeichert)
							<button
								type="button"
								onClick={() => setAttachedFile(null)}
								className="ml-1 text-zinc-500 hover:text-red-500 underline"
							>
								entfernen
							</button>
						</div>
					)}
				</form>

				<div className="space-y-2">
					{todos.map((todo) => (
						<div
							key={todo.id}
							className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-900 rounded p-3 group"
						>
							<button
								type="button"
								onClick={() => toggleTodo(todo.id, todo.completed)}
								className={`p-1 rounded transition-colors ${todo.completed ? "text-green-500" : "text-zinc-600 group-hover:text-zinc-400"}`}
							>
								<Check size={20} />
							</button>
							<span
								className={`flex-1 flex flex-col ${todo.completed ? "line-through text-zinc-600" : ""}`}
							>
								<span>{todo.content}</span>
								{todo.fileUrl && (
									<a
										href={`${BACKEND_URL}${todo.fileUrl}`}
										target="_blank"
										rel="noreferrer"
										className="mt-1 inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 hover:underline w-fit"
										onClick={(e) => e.stopPropagation()}
									>
										<Paperclip size={10} />
										Anhang: {todo.fileName || "Anzeigen"}
									</a>
								)}
							</span>
							<button
								type="button"
								onClick={() => deleteTodo(todo.id)}
								className="text-zinc-700 hover:text-red-500 p-1 transition-colors"
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
