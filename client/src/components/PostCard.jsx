import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Bookmark, Hash, Pencil, Trash2 } from "lucide-react";
import gsap from "gsap";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import { reducedMotion } from "../lib/utils";
import ShareMenu from "./ShareMenu";
import PostAuthor from "./PostAuthor";
import PostMedia from "./PostMedia";
import { AuthorAvatar } from "./AuthorAvatar";
import { deletePost } from "../services/api";
import "../styles/Post.css";

function PostCard({ post, onLike }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();
    const [hidden, setHidden] = useState(false);
    const heartRef = useRef(null);
    const isOwner = user?._id === post.author?._id;
    const canEdit = isOwner || user?.role === "admin";

    const handleLike = () => {
        onLike(post._id);
        if (!post.liked && heartRef.current && !reducedMotion()) {
            gsap.fromTo(
                heartRef.current,
                { scale: 1 },
                { scale: 1.4, duration: 0.16, yoyo: true, repeat: 1, ease: "power2.out", clearProps: "scale" }
            );
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Delete this post?")) return;
        try {
            await deletePost(post._id);
            setHidden(true);
        } catch (error) {
            toast.error(error.message || "Could not delete post");
        }
    };

    if (hidden) return null;

    return (
        <article className="post-card" data-post-id={post._id}>
            <PostAuthor post={post} />

            {post.editedAt && <span className="edited-badge">Edited</span>}

            <Link to={`/posts/${post._id}`} className="post-content-link">
                <p className="post-content">{post.content}</p>
            </Link>

            <PostMedia post={post} />

            {post.hashtags?.length > 0 && (
                <div className="hashtags">
                    {post.hashtags.map((h) => (
                        <button
                            key={h}
                            className="hashtag"
                            onClick={(e) => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(h)}`); }}
                        >
                            <Hash size={13} />{h.replace("#", "")}
                        </button>
                    ))}
                </div>
            )}

            <div className="post-footer">
                <button className={post.liked ? "action-btn liked" : "action-btn"} onClick={handleLike}>
                    <Heart ref={heartRef} size={16} fill={post.liked ? "currentColor" : "none"} />
                    {post.likesCount || 0}
                </button>
                <Link to={`/posts/${post._id}`} className="action-btn">
                    <MessageCircle size={16} />
                    Comments
                </Link>
                <span className="action-btn">
                    <Bookmark size={16} />
                    Save
                </span>
                <ShareMenu postId={post._id} title={post.content.slice(0, 80)} />
                {canEdit && (
                    <button className="action-btn danger" onClick={handleDelete}>
                        <Trash2 size={16} />
                        Delete
                    </button>
                )}
                {canEdit && (
                    <button className="action-btn" onClick={() => navigate(`/posts/${post._id}/edit`)}>
                        <Pencil size={16} />
                        Edit
                    </button>
                )}
            </div>
        </article>
    );
}

export { AuthorAvatar };
export default PostCard;
