const Story = require("../models/Story");
const User = require("../models/User");
const { deleteMedia } = require("../utils/media");
const { blockedEither } = require("../utils/socialGraph");
const { parseVisibility } = require("../utils/visibility");

// 7.8: story TTL (server clock); ops can tune STORY_TTL_HOURS (hours).
const TTL_MS = (Number(process.env.STORY_TTL_HOURS) || 24) * 3600 * 1000;
const active = () => ({ expiresAt: { $gt: new Date() } });
const notFound = (res) => res.status(404).json({ errors: ["Story not found"] });
const mediaOf = (file) => (file ? file.remoteUrl || `/uploads/${file.filename}` : "");

// Viewer privacy mirrors post policy: blocks always hide, private accounts
// and followers-only stories require an APPROVED follow edge.
const canViewStory = async (viewerId, author, visibility) => {
    const aid = author._id ?? author;
    if (String(aid) === String(viewerId)) return true;
    if (await blockedEither(viewerId, aid)) return false;
    if (author.isPrivate !== true && visibility !== "followers") return true;
    const me = await User.findById(viewerId).select("following");
    return (me?.following || []).some((f) => String(f) === String(aid));
};

// Lazy media cleanup: expired docs are swept (file + record) on tray reads;
// the TTL index remains as the database-level backstop.
const sweepExpired = async () => {
    try {
        const expired = await Story.find({ expiresAt: { $lte: new Date() } }).limit(20);
        for (const s of expired) {
            deleteMedia([s.media]);
            await s.deleteOne();
        }
    } catch { /* best-effort: TTL index + next sweep retry */ }
};

const createStory = async (req, res, next) => {
    try {
        const media = mediaOf(req.file);
        if (!media) return res.status(400).json({ errors: ["Image is required"] });
        const vis = parseVisibility(req.body.visibility);
        if (!vis.ok) return res.status(400).json({ errors: ["Invalid visibility"] });
        const story = await Story.create({ author: req.user.id, media, visibility: vis.value, expiresAt: new Date(Date.now() + TTL_MS) });
        return res.status(201).json({ story });
    } catch (error) {
        if (req.file) deleteMedia([mediaOf(req.file)]);
        return next(error);
    }
};

const listStories = async (req, res, next) => {
    try {
        await sweepExpired();
        const me = await User.findById(req.user.id).select("following");
        const authorIds = [req.user.id, ...(me?.following || [])];
        const raw = await Story.find({ author: { $in: authorIds }, ...active() })
            .populate("author", "username name avatar isPrivate")
            .sort({ createdAt: -1 })
            .limit(200);
        const groups = [];
        const byId = new Map();
        for (const s of raw) {
            const key = String(s.author._id);
            if (!byId.has(key)) {
                if (key !== String(req.user.id) && (await blockedEither(req.user.id, key))) continue;
                const g = { author: s.author, stories: [] };
                byId.set(key, g);
                groups.push(g);
            }
            byId.get(key).stories.push(s);
        }
        // views stay author-only; tray "seen" state is session-local.
        for (const g of groups) if (String(g.author._id) !== String(req.user.id)) g.stories.forEach((s) => { delete s.views; });
        return res.json({ groups });
    } catch (error) { return next(error); }
};

const getUserStories = async (req, res, next) => {
    try {
        const author = await User.findById(req.params.userId).select("username name avatar isPrivate");
        if (!author) return notFound(res);
        const stories = await Story.find({ author: author._id, ...active() }).sort({ createdAt: 1 }).limit(20);
        const visible = [];
        for (const s of stories) {
            if (await canViewStory(req.user.id, author, s.visibility)) visible.push(s);
        }
        return res.json({ stories: visible });
    } catch (error) { return next(error); }
};

const getStory = async (req, res, next) => {
    try {
        const story = await Story.findOne({ _id: req.params.id, ...active() })
            .populate("author", "username name avatar isPrivate")
            .populate("views.user", "username name avatar");
        if (!story || !(await canViewStory(req.user.id, story.author, story.visibility))) {
            return notFound(res);
        }
        const isAuthor = String(story.author._id) === String(req.user.id);
        const payload = story.toObject();
        if (!isAuthor) delete payload.views;
        return res.json({ story: payload });
    } catch (error) { return next(error); }
};

const viewStory = async (req, res, next) => {
    try {
        const story = await Story.findOne({ _id: req.params.id, ...active() })
            .populate("author", "username name avatar isPrivate");
        if (!story || !(await canViewStory(req.user.id, story.author, story.visibility))) {
            return notFound(res);
        }
        if (String(story.author._id) === String(req.user.id)) {
            return res.json({ views: story.views.length });
        }
        await Story.updateOne(
            { _id: story._id, "views.user": { $ne: req.user.id } },
            {
                $push: {
                    views: {
                        $each: [{ user: req.user.id, viewedAt: new Date() }],
                        $slice: -500
                    }
                }
            }
        );
        const fresh = await Story.findById(story._id).select("views");
        return res.json({ views: fresh ? fresh.views.length : 0 });
    } catch (error) { return next(error); }
};

const deleteStory = async (req, res, next) => {
    try {
        const story = await Story.findOne({ _id: req.params.id });
        if (!story || String(story.author) !== String(req.user.id)) return notFound(res);
        deleteMedia([story.media]);
        await story.deleteOne();
        return res.json({ success: true });
    } catch (error) { return next(error); }
};

module.exports = {
    createStory,
    listStories,
    getUserStories,
    getStory,
    viewStory,
    deleteStory
};
