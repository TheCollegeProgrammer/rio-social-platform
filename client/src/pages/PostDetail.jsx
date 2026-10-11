import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Heart, Bookmark, Trash2, Pencil, Hash } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { getPost, toggleLike, toggleBookmark, deletePost, getComments, createComment, mediaUrl } from "../services/api";
import CommentList from "../components/CommentList";
import { AuthorAvatar } from "../components/PostCard";
import "../styles/Home.css";
import "../styles/Post.css";
import "../styles/Comments.css";

function PostDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [commentText, setCommentText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);

    useEffect(() => {
        let cancelled = false;
        Promise.all([getPost(id), getComments(id)])
            .then(([postData, commentData]) => {
                if (!cancelled) {
                    setPost(postData.post);
                    setComments(commentData.comments);
                }
            })
            .catch((err) => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [id]);

    const act = async (fn) => {
        try { await fn(); } catch (err) { setError(err.message); }
    };

    const handleLike = () => act(async () => {
        const d = await toggleLike(id);
        setPost((p) => ({ ...p, liked: d.liked, likesCount: d.likesCount }));
    });

    const handleBookmark = () => act(async () => {
        await toggleBookmark(id);
        setBookmarked((b) => !b);
    });

    const handleDelete = () => act(async () => {
        if (!window.confirm("Delete this post?")) return;
        await deletePost(id);
        navigate("/");
    });

    const handleComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        try {
            setSubmitting(true);
            const data = await createComment(id, commentText);
            setComments((prev) => [data.comment, ...prev]);
            setCommentText("");
        } catch (err) { setError(err.message); }
        finally { setSubmitting(false); }
    };

    if (loading) return <div className="page"><p className="muted">Loading post...</p></div>;
    if (error && !post) return <div className="page"><p className="error-message">{error}</p></div>;
    if (!post) return <div className="page"><p className="muted">Post not found.</p></div>;

    const isOwner = user?._id === post.author?._id;

    return (
        <main className="home">
            {error && <p className="error-message">{error}</p>}

            <article className="post-card">
                <div className="post-user">
                    <AuthorAvatar author={post.author} />
                    <div>
                        <h3>{post.author?.name}</h3>
                        <span>@{post.author?.username}{post.editedAt ? " · edited" : ""}</span>
                    </div>
                </div>

                <p className="post-content">{post.content}</p>

                {post.image && <img className="post-image" src={mediaUrl(post.image)} alt="" />}

                {post.hashtags?.length > 0 && (
                    <div className="hashtags">
                        {post.hashtags.map((h) => (
                            <button key={h} className="hashtag"
                                onClick={() => navigate(`/search?q=${encodeURIComponent(h)}`)}>
                                <Hash size={13} />{h.replace("#", "")}
                            </button>
                        ))}
                    </div>
                )}

                <div className="post-footer">
                    <button className={post.liked ? "action-btn liked" : "action-btn"} onClick={handleLike}>
                        <Heart size={16} fill={post.liked ? "currentColor" : "none"} />{post.likesCount}
                    </button>
                    <button className={bookmarked ? "action-btn liked" : "action-btn"} onClick={handleBookmark}>
                        <Bookmark size={16} fill={bookmarked ? "currentColor" : "none"} />{bookmarked ? "Saved" : "Save"}
                    </button>
                    {isOwner && (
                        <>
                            <button className="action-btn" onClick={() => navigate(`/posts/${id}/edit`)}><Pencil size={16} />Edit</button>
                            <button className="action-btn danger" onClick={handleDelete}><Trash2 size={16} />Delete</button>
                        </>
                    )}
                </div>
            </article>

            <section className="comments-section">
                <h2>Comments ({comments.reduce((s, c) => s + 1 + (c.replies?.length || 0), 0)})</h2>

                <form onSubmit={handleComment} className="create-post">
                    <textarea placeholder="Write a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={2} />
                    <div className="post-actions">
                        <span />
                        <button type="submit" className="btn btn-sm" disabled={submitting || !commentText.trim()}>
                            {submitting ? "Posting..." : "Comment"}
                        </button>
                    </div>
                </form>

                <CommentList
                    postId={id}
                    comments={comments}
                    onDeleted={(cid) => setComments((p) => p.filter((c) => c._id !== cid))}
                    onUpdated={(u) => setComments((p) => p.map((c) => (c._id === u._id ? u : c)))}
                />
            </section>
        </main>
    );
}

export default PostDetail;
