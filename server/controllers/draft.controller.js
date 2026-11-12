const Draft = require("../models/Draft");
const { normalizeCategory } = require("../config/categories");
const { deleteMedia } = require("../utils/media");
const { parseVisibility } = require("../utils/visibility");

const MAX_IMAGES = 8;

const toPaths = (files) => (files || []).map((f) => f.remoteUrl || `/uploads/${f.filename}`);

// Owner scope only: another user's draft id reads as 404 (no existence leak).
const ownDraft = (id, userId) => Draft.findOne({ _id: id, author: userId });

const bad = (res, message) => res.status(400).json({ errors: [message] });
const notFound = (res) => res.status(404).json({ errors: ["Draft not found"] });

const createDraft = async (req, res, next) => {
    try {
        const files = toPaths(req.files);
        const content = typeof req.body.content === "string" ? req.body.content : "";
        if (!content.trim() && files.length === 0) {
            deleteMedia(files);
            return bad(res, "Draft needs content or images");
        }
        if (content.length > 5000) { deleteMedia(files); return bad(res, "Draft must be under 5000 characters"); }
        if (files.length > MAX_IMAGES) { deleteMedia(files); return bad(res, `Draft can have at most ${MAX_IMAGES} images`); }
        const vis = parseVisibility(req.body.visibility);
        if (!vis.ok) { deleteMedia(files); return bad(res, "visibility must be public or followers"); }
        const draft = await Draft.create({
            author: req.user.id,
            content,
            category: normalizeCategory(req.body.category),
            visibility: vis.value,
            images: files
        });
        res.status(201).json({ message: "Draft saved", draft });
    } catch (error) {
        return next(error);
    }
};

const listDrafts = async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 50);
        const drafts = await Draft.find({ author: req.user.id })
            .sort({ updatedAt: -1 })
            .limit(limit)
            .select("-__v");
        res.json({ drafts });
    } catch (error) {
        return next(error);
    }
};

const getDraft = async (req, res, next) => {
    try {
        const draft = await ownDraft(req.params.id, req.user.id);
        if (!draft) return notFound(res);
        res.json({ draft });
    } catch (error) {
        return next(error);
    }
};

// Handles both JSON (autosave) and multipart (new files appended). A stale
// `version` gets 409 instead of silently overwriting newer content (7.3).
const updateDraft = async (req, res, next) => {
    try {
        const draft = await ownDraft(req.params.id, req.user.id);
        if (!draft) return notFound(res);

        // Extract paths first so every early return can clean up multer files.
        const newFiles = toPaths(req.files);
        if (req.body.version !== undefined && Number(req.body.version) !== draft.version) {
            deleteMedia(newFiles);
            return res.status(409).json({ errors: ["Draft was updated elsewhere"], draft });
        }

        if (draft.images.length + newFiles.length > MAX_IMAGES) {
            deleteMedia(newFiles);
            return bad(res, `Draft can have at most ${MAX_IMAGES} images`);
        }

        if (req.body.content !== undefined) {
            const content = String(req.body.content);
            if (content.length > 5000) {
                deleteMedia(newFiles);
                return bad(res, "Draft must be under 5000 characters");
            }
            draft.content = content;
        }
        if (req.body.category !== undefined) {
            draft.category = normalizeCategory(req.body.category);
        }
        if (req.body.visibility !== undefined) {
            const vis = parseVisibility(req.body.visibility);
            if (!vis.ok) {
                deleteMedia(newFiles);
                return bad(res, "visibility must be public or followers");
            }
            draft.visibility = vis.value;
        }
        if (req.body.images !== undefined) {
            let keep;
            try {
                keep = typeof req.body.images === "string" ? JSON.parse(req.body.images) : req.body.images;
            } catch {
                deleteMedia(newFiles);
                return bad(res, "Invalid images list");
            }
            // Retained refs must already belong to this draft - never trust
            // client-supplied paths (would let a draft adopt/destroy others' files).
            if (!Array.isArray(keep) || keep.some((p) => !draft.images.includes(p))) {
                deleteMedia(newFiles);
                return bad(res, "Invalid images list");
            }
            // Dropping a retained path is a delete: clean up its file too.
            deleteMedia(draft.images.filter((p) => !keep.includes(p)));
            draft.images = [...keep, ...newFiles];
        } else if (newFiles.length) {
            draft.images = [...draft.images, ...newFiles];
        }

        draft.version += 1;
        await draft.save();
        res.json({ message: "Draft updated", draft });
    } catch (error) {
        return next(error);
    }
};

const deleteDraft = async (req, res, next) => {
    try {
        const draft = await ownDraft(req.params.id, req.user.id);
        if (!draft) return notFound(res);
        deleteMedia(draft.images);
        await draft.deleteOne();
        res.json({ message: "Draft deleted" });
    } catch (error) {
        return next(error);
    }
};

module.exports = { createDraft, listDrafts, getDraft, updateDraft, deleteDraft };
