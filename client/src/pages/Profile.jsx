import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { getProfile, getBookmarks, mediaUrl } from "../services/api";
import PostCard from "../components/PostCard";
import "../styles/Home.css";
import "../styles/Profile.css";

function ProfileAvatar({ user }) {
    const src = mediaUrl(user?.avatar);
    return (
        <div className="profile-avatar">
            {src ? <img src={src} alt="" /> : user?.name?.charAt(0).toUpperCase()}
        </div>
    );
}

function Profile() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("posts");

    useEffect(() => {
        if (!user?._id) return;
        let cancelled = false;
        Promise.all([getProfile(user._id), getBookmarks()])
            .then(([profileData, bookmarkData]) => {
                if (!cancelled) {
                    setProfile(profileData);
                    setPosts(profileData.posts || []);
                    setBookmarks(bookmarkData.posts || []);
                }
            })
            .catch((err) => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [user]);

    if (loading) return <div className="page"><p className="muted">Loading profile...</p></div>;
    if (error && !profile) return <div className="page"><p className="error-message">{error}</p></div>;
    if (!profile) return <div className="page"><p className="muted">Profile not found.</p></div>;

    const cover = mediaUrl(profile.coverImage);

    return (
        <div className="page">
            <div className="profile-header">
                {cover && <img className="profile-cover" src={cover} alt="" />}
                <div className="profile-main">
                    <ProfileAvatar user={profile} />
                    <div className="profile-info">
                        <h1>{profile.name}</h1>
                        <span className="profile-handle">@{profile.username}</span>
                        {profile.bio && <p className="bio">{profile.bio}</p>}
                        <div className="profile-stats">
                            <span><strong>{profile.postsCount}</strong> posts</span>
                            <span><strong>{profile.followersCount}</strong> followers</span>
                            <span><strong>{profile.followingCount}</strong> following</span>
                        </div>
                    </div>
                    <div className="profile-actions">
                        <button className="btn btn-ghost" onClick={() => navigate("/settings")}>
                            <Pencil size={14} /> Edit profile
                        </button>
                    </div>
                </div>
            </div>

            <div className="profile-tabs">
                <button
                    className={activeTab === "posts" ? "active" : ""}
                    onClick={() => setActiveTab("posts")}
                >Posts</button>
                <button
                    className={activeTab === "bookmarks" ? "active" : ""}
                    onClick={() => setActiveTab("bookmarks")}
                >Bookmarks</button>
            </div>

            <section className="feed">
                {activeTab === "posts" ? (
                    posts.length === 0 ? (
                        <div className="empty-state"><p>No posts yet.</p></div>
                    ) : posts.map((post) => <PostCard key={post._id} post={post} onLike={() => {}} />)
                ) : bookmarks.length === 0 ? (
                    <div className="empty-state"><p>No bookmarks yet.</p></div>
                ) : bookmarks.map((post) => <PostCard key={post._id} post={post} onLike={() => {}} />)}
            </section>
        </div>
    );
}

export default Profile;
