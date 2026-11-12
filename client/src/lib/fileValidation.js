// 7.1: shared client-side media checks before files reach the upload pipeline.
// Mirrors server limits (multer 5 MB, sharp-validated image types).
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function filterImages(files, room, max) {
    const problems = [];
    const valid = [];
    for (const f of Array.from(files || [])) {
        if (!IMAGE_TYPES.includes(f.type)) {
            problems.push(`"${f.name || "File"}" is not a supported image`);
            continue;
        }
        if (f.size > MAX_IMAGE_BYTES) {
            problems.push(`"${f.name}" is over 5 MB`);
            continue;
        }
        valid.push(f);
    }
    const take = valid.slice(0, Math.max(room, 0));
    if (valid.length > take.length) {
        problems.push(room <= 0 ? `Post image limit reached (${max})` : `Only ${room} more image${room === 1 ? "" : "s"} allowed`);
    }
    return { take, problems };
}
