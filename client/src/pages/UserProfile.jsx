import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast.js";
import { getProfile, toggleFollow, getOrCreateConversation, mediaUrl } from "../services/api";
import PostCard from "../components/PostCard";
import FollowListPopover from "../components/FollowListPopover";
import "../styles/Home.css";
import "../styles/Profile.css";

function UserProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [following, setFollowing] = useState(false);
    const [messaging, setMessaging] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getProfile(id)
            .then((data) => {
                if (!cancelled) {
                    setProfile(data.profile);
                    setFollowing(data.profile?.isFollowing || false);
                    setPosts(data.posts || []);
                }
            })
            .catch((err) => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [id]);

    const handleFollow = async () => {
        try {
            const data = await toggleFollow(id);
            setFollowing(data.following);
            if (data.following) toast.success(`Following ${profile?.name || "user"}`);
            setProfile((p) => ({
                ...p,
                followersCount: data.followersCount,
                followingCount: data.followingCount ?? p.followingCount
            }));
        } catch (err) { setError(err.message); }
    };

    const handleMessage = async () => {
        try {
            setMessaging(true);
            const data = await getOrCreateConversation(id);
            navigate("/messages", { state: { conversationId: data.conversation._id } });
        } catch (err) {
            setError(err.message);
            setMessaging(false);
        }
    };

    if (loading) return <div className="page"><p className="muted">Loading profile...</p></div>;
    if (error && !profile) return <div className="page"><p className="error-message">{error}</p></div>;
    if (!profile) return <div className="page"><p className="muted">Profile not found.</p></div>;

    const isOwn = user?._id === profile._id;
    const cover = mediaUrl(profile.coverImage);
    const avatar = mediaUrl(profile.avatar);

    return (
        <div className="page">
            {error && <p className="error-message">{error}</p>}

            <div className="profile-header">
                {cover && <img className="profile-cover" src={cover} alt="" />}
                <div className="profile-main">
                    <div className="profile-avatar">
                        {avatar ? <img src={avatar} alt="" /> : profile.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="profile-info">
                        <h1>{profile.name}</h1>
                        <span className="profile-handle">@{profile.username}</span>
                        {profile.bio && <p className="bio">{profile.bio}</p>}
                        <div className="profile-stats">
                            <span><strong>{profile.postsCount}</strong> posts</span>
                            <FollowListPopover userId={profile._id} type="followers" count={profile.followersCount} />
                            <FollowListPopover userId={profile._id} type="following" count={profile.followingCount} />
                        </div>
                    </div>
                    <div className="profile-actions">
                        {isOwn ? (
                            <button className="btn btn-ghost" onClick={() => navigate("/settings")}>
                                Edit profile
                            </button>
                        ) : (
                            <>
                                <button className={following ? "btn btn-ghost" : "btn"} onClick={handleFollow}>
                                    {following ? "Unfollow" : "Follow"}
                                </button>
                                <button className="btn btn-ghost" onClick={handleMessage} disabled={messaging}>
                                    {messaging ? "Opening..." : "Message"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <section className="feed">
                <h2>Posts</h2>
                {posts.length === 0 ? (
                    <div className="empty-state"><p>No posts yet.</p></div>
                ) : posts.map((post) => <PostCard key={post._id} post={post} onLike={() => {}} />)}
            </section>
        </div>
    );
}

export default UserProfile;
