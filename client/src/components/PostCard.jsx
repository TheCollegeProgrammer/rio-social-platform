import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Bookmark, Hash, Pencil } from "lucide-react";
import { useAuth } from "../context/useAuth";
import ShareMenu from "./ShareMenu";
import PostAuthor from "./PostAuthor";
import PostMedia from "./PostMedia";
import { AuthorAvatar } from "./AuthorAvatar";
import "../styles/Post.css";

function PostCard({ post, onLike }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isOwner = user?._id === post.author?._id;

    return (
        <article className="post-card">
            <PostAuthor post={post} />

            {post.editedAt && <span className="edited-badge">Edited</span>}

            <Link to={`/posts/${post._id}`} className="post-content-link">
                <p className="post-content">{post.content}</p>
            </Link>

            <PostMedia post={post} linked />

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
                <button className={post.liked ? "action-btn liked" : "action-btn"} onClick={() => onLike(post._id)}>
                    <Heart size={16} fill={post.liked ? "currentColor" : "none"} />
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
                {isOwner && (
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
