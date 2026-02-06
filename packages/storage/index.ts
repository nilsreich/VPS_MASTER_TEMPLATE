const MIME_MAP: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/gif": "gif",
	"application/pdf": "pdf",
};

export async function uploadFile(
	file: File,
): Promise<{ url: string; name: string }> {
	const extension = MIME_MAP[file.type];
	if (!extension) {
		throw new Error("Dateityp nicht erlaubt");
	}

	const path = `uploads/${crypto.randomUUID()}.${extension}`;
	await Bun.write(path, file);
	return { url: `/${path}`, name: file.name };
}
