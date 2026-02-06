import { spawn } from "node:child_process";
import { getApps, selectApp } from "./utils";

async function runBuild() {
	const apps = getApps();

	if (apps.length === 0) {
		console.error("❌ Keine Apps in ./apps/ gefunden.");
		process.exit(1);
	}

	// Option hinzufügen, alles zu bauen
	const options = [...apps, { dir: "ALLE APPS", name: "*" }];

	const selected = await selectApp(options, "Lean-Monorepo Build Selector");
	console.log(`\n📦 \x1b[34mBaue ${selected.dir}...\x1b[0m\n`);

	const proc = spawn("bun", ["run", "--filter", selected.name, "build"], {
		stdio: "inherit",
		env: { ...process.env, FORCE_COLOR: "1" },
	});

	proc.on("exit", (code) => {
		process.exit(code || 0);
	});
}

runBuild().catch(() => process.exit(1));
