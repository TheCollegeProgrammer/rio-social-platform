import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Heart, Bookmark, Trash2, Pencil, Hash, Pin, PinOff, Flag } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import { getPost, toggleLike, toggleBookmark, deletePost, togglePin } from "../services/api";
import { useReport } from "../lib/useReport";
import PostComments from "../components/PostComments";
import ShareMenu from "../components/ShareMenu";
import PostAuthor from "../components/PostAuthor";
import PostMedia from "../components/PostMedia";
import MentionText from "../components/MentionText";
import "../styles/Home.css";
import "../styles/Post.css";
import "../styles/Comments.css";

function PostDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();
    const { report: reportPost, busy: reportBusy } = useReport("post");
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [bookmarked, setBookmarked] = useState(false);
    const [pinned, setPinned] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getPost(id)
            .then((d) => { if (!cancelled) { setPost(d.post); setPinned(Boolean(d.post.pinnedAt)); } })
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

    const handlePin = () => act(async () => {
        const d = await togglePin(id);
        setPinned(d.pinned);
    });

    const handleReport = async () => {
        const res = await reportPost(id, "post");
        if (!res) return;
        if (res.ok) toast.success(res.message);
        else toast.error(res.message);
    };

    if (loading) return <div className="page"><p className="muted">Loading post...</p></div>;
    if (error && !post) return <div className="page"><p className="error-message">{error}</p></div>;
    if (!post) return <div className="page"><p className="muted">Post not found.</p></div>;

    const isOwner = user?._id === post.author?._id;
    const canManage = isOwner || user?.role === "admin";

    return (
        <main className="home">
            {error && <p className="error-message">{error}</p>}

            <article className="post-card">
                <PostAuthor post={post} />

                {post.editedAt && <span className="edited-badge">Edited</span>}

                <p className="post-content"><MentionText text={post.content} mentions={post.mentions} /></p>

                <PostMedia post={post} />

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
                    <ShareMenu postId={id} title={post.content.slice(0, 80)} />
                    {!isOwner && (
                        <button className="action-btn" onClick={handleReport} disabled={reportBusy}>
                            <Flag size={16} />Report
                        </button>
                    )}
                    {canManage && (
                        <>
                            <button className="action-btn" onClick={handlePin}>{pinned ? <PinOff size={16} /> : <Pin size={16} />}{pinned ? "Unpin" : "Pin"}</button>
                            <button className="action-btn" onClick={() => navigate(`/posts/${id}/edit`)}><Pencil size={16} />Edit</button>
                            <button className="action-btn danger" onClick={handleDelete}><Trash2 size={16} />Delete</button>
                        </>
                    )}
                </div>
            </article>

            <PostComments postId={id} />
        </main>
    );
}

export default PostDetail;
