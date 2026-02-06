import { spawn } from "node:child_process";
import { join } from "node:path";
import { getApps, selectApp } from "./utils";

async function runDev() {
	const apps = getApps();

	if (apps.length === 0) {
		console.error("❌ Keine Apps in ./apps/ gefunden.");
		process.exit(1);
	}

	const selected = await selectApp(apps, "Lean-Monorepo Developer Console");
	console.log(`\n🚀 \x1b[34mStarte Backend & ${selected.dir}...\x1b[0m\n`);

	const dbPath = join(process.cwd(), "data.db");

	// Wir starten Backend und Frontend als separate Prozesse,
	// da Bun --filter bei Abhängigkeiten (Workspace-Links) sonst sequentiell wartet.
	const backend = spawn("bun", ["run", "--filter", "@repo/backend", "dev"], {
		stdio: "inherit",
		env: {
			...process.env,
			NODE_ENV: "development",
			DATABASE_URL: `file:${dbPath}`,
			FORCE_COLOR: "1",
		},
	});

	const frontend = spawn("bun", ["run", "--filter", selected.name, "dev"], {
		stdio: "inherit",
		env: {
			...process.env,
			NODE_ENV: "development",
			FORCE_COLOR: "1",
		},
	});

	// Beende beide, wenn einer stirbt oder das Hauptskript beendet wird
	const exitHandler = () => {
		backend.kill();
		frontend.kill();
		process.exit();
	};

	process.on("SIGINT", exitHandler);
	process.on("SIGTERM", exitHandler);
	process.on("exit", exitHandler);

	backend.on("exit", (code) => {
		if (code !== 0) console.error("❌ Backend beendet mit Code", code);
		exitHandler();
	});

	frontend.on("exit", (code) => {
		if (code !== 0) console.error("❌ Frontend beendet mit Code", code);
		exitHandler();
	});
}

runDev().catch(() => process.exit(1));
