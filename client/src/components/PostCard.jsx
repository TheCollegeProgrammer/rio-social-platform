import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Bookmark, Hash, Pencil } from "lucide-react";
import { mediaUrl } from "../services/api";
import { useAuth } from "../context/useAuth";
import ShareMenu from "./ShareMenu";
import "../styles/Post.css";

function AuthorAvatar({ author, size = 42 }) {
    const src = mediaUrl(author?.avatar);
    const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
    if (src) {
        return <div className="small-avatar" style={style}><img src={src} alt="" /></div>;
    }
    return (
        <div className="small-avatar" style={style}>
            {author?.name?.charAt(0).toUpperCase()}
        </div>
    );
}

function PostCard({ post, onLike }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const image = mediaUrl(post.image);
    const isOwner = user?._id === post.author?._id;

    return (
        <article className="post-card">
            <div className="post-user">
                <AuthorAvatar author={post.author} />
                <div>
                    <h3>
                        <Link to={`/users/${post.author?._id}`} className="post-author-link">
                            {post.author?.name}
                        </Link>
                    </h3>
                    <span>@{post.author?.username}</span>
                </div>
            </div>

            {post.editedAt && <span className="edited-badge">Edited</span>}

            <Link to={`/posts/${post._id}`} className="post-content-link">
                <p className="post-content">{post.content}</p>
            </Link>

            {image && (
                <Link to={`/posts/${post._id}`}>
                    <img className="post-image" src={image} alt="" loading="lazy" />
                </Link>
            )}

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
