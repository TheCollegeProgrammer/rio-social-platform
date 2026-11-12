import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useFollowToggle } from "../lib/useFollowToggle";
import AuthorAvatar from "./AuthorAvatar";
import { timeAgo } from "../lib/time";

function PostAuthor({ post }) {
    const { user } = useAuth();
    const { toggle: followToggle } = useFollowToggle();
    const [busy, setBusy] = useState(false);
    const authorId = post.author?._id;
    const isOwner = !!authorId && user?._id === authorId;
    const following = user?.following || [];
    const isFollowing = following.some((f) => (f?._id || f) === authorId);

    const handleFollow = async () => {
        if (busy || !authorId || !user) return;
        setBusy(true);
        await followToggle(authorId, !isFollowing);
        setBusy(false);
    };

    return (
        <div className="post-user">
            <AuthorAvatar author={post.author} />
            <div>
                <h3>
                    <Link to={`/users/${authorId}`} className="post-author-link">
                        {post.author?.name}
                    </Link>
                </h3>
                <span>@{post.author?.username}{post.createdAt ? ` · ${timeAgo(post.createdAt)}` : ""}</span>
            </div>
            {user && authorId && !isOwner && (
                <button
                    className={isFollowing ? "btn btn-ghost btn-sm follow-btn" : "btn btn-sm follow-btn"}
                    onClick={handleFollow}
                    disabled={busy}
                >
                    {isFollowing ? "Following" : "Follow"}
                </button>
            )}
        </div>
    );
}

export default PostAuthor;
