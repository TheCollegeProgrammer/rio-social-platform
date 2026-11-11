const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const ALLOWED = new Set(["jpeg", "png", "gif", "webp"]);
const MAX_SIDE = Number(process.env.UPLOAD_MAX_SIDE || 8192);
const MAX_PIXELS = Number(process.env.UPLOAD_MAX_PIXELS || 40000000);
const EXT = { jpeg: ".jpg", png: ".png", gif: ".gif", webp: ".webp" };

// Rejecting a request must never leave the multer-written file on disk.
const fail = (res, req, message) => {
    const files = req.file ? [req.file] : req.files || [];
    for (const f of files) {
        if (f.path) {
            try {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            } catch {
                // best-effort
            }
        }
    }
    return res.status(400).json({ errors: [message] });
};

// P0-05/F-07: validate the actual bytes (not the client-declared MIME)
// between multer and any Cloudinary push:
//   - detected format must be jpeg/png/gif/webp
//   - dimensions within env-tunable side/pixel caps (decompression bombs)
//   - full re-encode round-trip rejects truncated/malformed payloads
//   - stored extension is derived from detected bytes, never originalname
const validateImages = async (req, res, next) => {
    const files = req.file ? [req.file] : req.files || [];
    if (files.length === 0) return next();

    try {
        for (const f of files) {
            const buffer = f.buffer || (f.path ? await fs.promises.readFile(f.path) : null);
            if (!buffer) continue;

            const meta = await sharp(buffer, { animated: true })
                .metadata()
                .catch(() => null);
            if (!meta || !meta.format || !ALLOWED.has(meta.format)) {
                return fail(
                    res,
                    req,
                    "Only JPEG, PNG, GIF, and WebP images are allowed"
                );
            }

            const width = meta.width || 0;
            const height = meta.height || 0;
            const frames = meta.pages || 1;
            if (!width || !height || width > MAX_SIDE || height > MAX_SIDE) {
                return fail(
                    res,
                    req,
                    `Image dimensions must be 1-${MAX_SIDE} pixels per side`
                );
            }
            if (width * height * frames > MAX_PIXELS) {
                return fail(res, req, "Image decodes to too many pixels");
            }

            await sharp(buffer, { animated: true }).toBuffer();

            if (f.path) {
                const ext = path.extname(f.path);
                const withFormat =
                    f.path.slice(0, f.path.length - ext.length) + EXT[meta.format];
                if (withFormat !== f.path) {
                    fs.renameSync(f.path, withFormat);
                    f.path = withFormat;
                    f.filename = path.basename(withFormat);
                }
            }
            f.detectedFormat = meta.format;
        }
        next();
    } catch (error) {
        return fail(res, req, "Invalid or corrupted image");
    }
};

module.exports = { validateImages };
