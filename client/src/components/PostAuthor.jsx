import { useState } from "react";
import { Link } from "react-router-dom";
import { toggleFollow } from "../services/api";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import AuthorAvatar from "./AuthorAvatar";

function PostAuthor({ post }) {
    const { user, setUser } = useAuth();
    const { error: toastError } = useToast();
    const [busy, setBusy] = useState(false);
    const authorId = post.author?._id;
    const isOwner = !!authorId && user?._id === authorId;
    const following = user?.following || [];
    const isFollowing = following.some((f) => (f?._id || f) === authorId);

    const handleFollow = async () => {
        if (busy || !authorId || !user) return;
        setBusy(true);
        try {
            const d = await toggleFollow(authorId);
            setUser({
                ...user,
                following: d.following
                    ? [...following, authorId]
                    : following.filter((f) => (f?._id || f) !== authorId)
            });
        } catch (err) {
            toastError(err.message || "Could not update follow");
        } finally {
            setBusy(false);
        }
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
                <span>@{post.author?.username}</span>
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
