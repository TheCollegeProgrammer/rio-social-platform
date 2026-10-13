const notFound = (req, res) => {
    res.status(404).json({ errors: ["Route not found"] });
};

const errorHandler = (err, req, res, next) => {
    if (err.name === "CastError") {
        return res.status(400).json({ errors: ["Invalid ID format"] });
    }

    if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ errors: messages });
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({ errors: [`${field} already exists`] });
    }

    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ errors: ["Invalid JSON in request body"] });
    }

    if (err.type === "entity.too.large") {
        return res.status(413).json({ errors: ["Request body too large"] });
    }

    if (err.name === "MulterError") {
        const msg = err.code === "LIMIT_FILE_SIZE"
            ? "Image must be under 5MB"
            : err.message;
        return res.status(400).json({ errors: [msg] });
    }

    if (err.message === "Unexpected end of form") {
        return res.status(400).json({ errors: ["Malformed upload request"] });
    }

    if (err.message && err.message.includes("images are allowed")) {
        return res.status(400).json({ errors: [err.message] });
    }

    console.error("Unhandled error:", err.message);

    res.status(500).json({ errors: ["Server error"] });
};

module.exports = { notFound, errorHandler };
