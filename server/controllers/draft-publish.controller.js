const Draft = require("../models/Draft");
const Post = require("../models/post");
const { extractHashtags } = require("./post.controller");
const { parseVisibility } = require("../utils/visibility");
const { resolveMentions, notifyMentions } = require("../utils/mentions");

const ownDraft = (id, userId) => Draft.findOne({ _id: id, author: userId });

// 7.2: publishing moves the draft's stored files to a new Post (no
// re-upload), then removes the draft record only - files are never deleted
// here (they now belong to the post). Stale `version` gets 409 first.
const publishDraft = async (req, res, next) => {
    try {
        const draft = await ownDraft(req.params.id, req.user.id);
        if (!draft) return res.status(404).json({ errors: ["Draft not found"] });
        if (req.body.version !== undefined && Number(req.body.version) !== draft.version) {
            return res.status(409).json({ errors: ["Draft was updated elsewhere"], draft });
        }
        const content = draft.content.trim();
        if (!content && draft.images.length === 0) {
            return res.status(400).json({ errors: ["Draft is empty"] });
        }
        // followers-only drafts must stay followers-only on publish.
        const vis = parseVisibility(draft.visibility);
        if (!vis.ok) return res.status(400).json({ errors: ["Draft has invalid visibility"] });
        const mentions = await resolveMentions(content);
        const post = await Post.create({
            content,
            author: draft.author,
            hashtags: extractHashtags(content),
            category: draft.category,
            visibility: vis.value,
            mentions,
            images: draft.images,
            image: draft.images[0] || null
        });
        await draft.deleteOne();
        await notifyMentions(mentions, draft.author, { post: post._id });
        await post.populate("author", "username name avatar");
        res.status(201).json({ message: "Post published", post });
    } catch (error) {
        return next(error);
    }
};

module.exports = { publishDraft };
