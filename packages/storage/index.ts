export async function uploadFile(
	file: File,
): Promise<{ url: string; name: string }> {
	const path = `uploads/${crypto.randomUUID()}.${file.name.split(".").pop()}`;
	await Bun.write(path, file);
	return { url: `/${path}`, name: file.name };
}
