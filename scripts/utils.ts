import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface AppInfo {
	dir: string;
	name: string;
}

export function getApps(): AppInfo[] {
	const appsDir = join(process.cwd(), "apps");
	return readdirSync(appsDir, { withFileTypes: true })
		.filter((dirent) => dirent.isDirectory() && dirent.name !== "backend")
		.map((dirent) => {
			const appPath = join(appsDir, dirent.name, "package.json");
			try {
				const pkg = JSON.parse(readFileSync(appPath, "utf-8"));
				return { dir: dirent.name, name: pkg.name };
			} catch {
				return { dir: dirent.name, name: `@repo/${dirent.name}` };
			}
		});
}

export async function selectApp(
	apps: AppInfo[],
	title: string,
): Promise<AppInfo> {
	console.log(`\n✨ ${title}`);
	console.log("----------------------------------");
	apps.forEach((app, i) => {
		console.log(`  ${i + 1}) \x1b[32m${app.dir}\x1b[0m (${app.name})`);
	});
	console.log("----------------------------------");
	process.stdout.write("Auswahl (Nummer): ");

	for await (const line of console) {
		const choice = line.trim();
		const index = Number.parseInt(choice) - 1;

		if (apps[index]) {
			return apps[index];
		}
		process.stdout.write("❌ Ungültige Auswahl. Bitte Nummer eingeben: ");
	}
	throw new Error("Keine Auswahl getroffen");
}
