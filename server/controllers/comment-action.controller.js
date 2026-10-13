const Comment = require("../models/Comment");
const { createNotification } = require("./notification.controller");

const editComment = async (req, res, next) => {
    try {
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ errors: ["Content is required"] });
        }
        if (content.length > 1000) {
            return res.status(400).json({ errors: ["Comment must be under 1000 characters"] });
        }

        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ errors: ["Comment not found"] });
        if (comment.author.toString() !== req.user.id) {
            return res.status(403).json({ errors: ["Not authorized"] });
        }

        comment.content = content.trim();
        comment.editedAt = new Date();
        await comment.save();
        await comment.populate("author", "username name avatar");

        res.json({ message: "Comment updated", comment });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid comment ID"] });
        }
        return next(error);
    }
};

const deleteComment = async (req, res, next) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ errors: ["Comment not found"] });
        if (comment.author.toString() !== req.user.id) {
            return res.status(403).json({ errors: ["Not authorized"] });
        }

        const deleteChildren = async (parentId) => {
            const children = await Comment.find({ parentComment: parentId });
            for (const child of children) {
                await deleteChildren(child._id);
            }
            await Comment.findByIdAndDelete(parentId);
        };

        await deleteChildren(comment._id);
        res.json({ message: "Comment deleted" });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid comment ID"] });
        }
        return next(error);
    }
};

const toggleCommentLike = async (req, res, next) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ errors: ["Comment not found"] });

        const userId = req.user.id;
        const alreadyLiked = comment.likes.some((id) => id.toString() === userId);

        const updated = await Comment.findByIdAndUpdate(
            req.params.id,
            alreadyLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
            { new: true }
        );

        if (!alreadyLiked) {
            createNotification({
                recipient: comment.author,
                sender: userId,
                type: "like",
                post: comment.post,
                comment: comment._id
            });
        }

        res.json({ liked: !alreadyLiked, likesCount: updated.likes.length });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid comment ID"] });
        }
        return next(error);
    }
};

module.exports = { editComment, deleteComment, toggleCommentLike };
