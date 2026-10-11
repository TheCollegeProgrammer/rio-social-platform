import { useState } from "react";
import { Heart, MessageSquareReply, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { editComment, deleteComment, toggleCommentLike, createComment } from "../services/api";
import { AuthorAvatar } from "./PostCard";

function CommentItem({ postId, comment, onDeleted, onUpdated, depth = 0 }) {
    const { user } = useAuth();
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(comment.content);
    const [replying, setReplying] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [error, setError] = useState("");
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(comment.likes?.length || 0);

    const isOwner = user?._id === comment.author?._id;
    const canReply = depth < 3;

    const handleEdit = async (e) => {
        e.preventDefault();
        try {
            const data = await editComment(postId, comment._id, editText);
            onUpdated(data.comment);
            setEditing(false);
        } catch (err) { setError(err.message); }
    };

    const handleDelete = async () => {
        if (!window.confirm("Delete this comment?")) return;
        try {
            await deleteComment(postId, comment._id);
            onDeleted(comment._id);
        } catch (err) { setError(err.message); }
    };

    const handleLike = async () => {
        try {
            const data = await toggleCommentLike(postId, comment._id);
            setLiked(data.liked);
            setLikesCount(data.likesCount);
        } catch (err) { setError(err.message); }
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        try {
            const data = await createComment(postId, replyText, comment._id);
            const updated = {
                ...comment,
                replies: [...(comment.replies || []), data.comment]
            };
            onUpdated(updated);
            setReplyText("");
            setReplying(false);
        } catch (err) { setError(err.message); }
    };

    return (
        <div className="comment" style={{ marginLeft: Math.min(depth, 2) * 20 }}>
            {error && <p className="error-message">{error}</p>}
            <div className="comment-header">
                <AuthorAvatar author={comment.author} size={28} />
                <strong>{comment.author?.name}</strong>
                <span>@{comment.author?.username}</span>
                <span>· {new Date(comment.createdAt).toLocaleDateString()}</span>
                {comment.editedAt && <span>· edited</span>}
            </div>

            {editing ? (
                <div className="comment-editor">
                    <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={2}
                    />
                    <div className="comment-editor-actions">
                        <button type="submit" className="btn btn-sm" onClick={handleEdit}>Save</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                    </div>
                </div>
            ) : (
                <p className="comment-content">{comment.content}</p>
            )}

            <div className="comment-actions">
                <button className={liked ? "liked" : ""} onClick={handleLike}>
                    <Heart size={14} fill={liked ? "currentColor" : "none"} /> {likesCount}
                </button>
                {canReply && (
                    <button onClick={() => setReplying(!replying)}>
                        <MessageSquareReply size={14} /> Reply
                    </button>
                )}
                {isOwner && (
                    <>
                        <button onClick={() => setEditing(true)}>
                            <Pencil size={14} /> Edit
                        </button>
                        <button onClick={handleDelete}>
                            <Trash2 size={14} /> Delete
                        </button>
                    </>
                )}
            </div>

            {replying && (
                <form onSubmit={handleReply} className="comment-editor">
                    <textarea
                        placeholder="Write a reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                    />
                    <div className="comment-editor-actions">
                        <button type="submit" className="btn btn-sm">Reply</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReplying(false)}>Cancel</button>
                    </div>
                </form>
            )}

            {comment.replies?.map((reply) => (
                <CommentItem
                    key={reply._id}
                    postId={postId}
                    comment={reply}
                    onDeleted={onDeleted}
                    onUpdated={onUpdated}
                    depth={depth + 1}
                />
            ))}
        </div>
    );
}

function CommentList({ postId, comments, onDeleted, onUpdated }) {
    if (comments.length === 0) {
        return <p className="muted">No comments yet.</p>;
    }

    return (
        <div className="comment-list">
            {comments.map((comment) => (
                <CommentItem
                    key={comment._id}
                    postId={postId}
                    comment={comment}
                    onDeleted={onDeleted}
                    onUpdated={onUpdated}
                />
            ))}
        </div>
    );
}

export default CommentList;
