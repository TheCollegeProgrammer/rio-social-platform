import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Pencil } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { getProfile, getBookmarks, mediaUrl } from "../services/api";
import { getUserStories } from "../services/storyApi";
import PostCard from "../components/PostCard";
import StoryViewer from "../components/story/StoryViewer";
import FollowListPopover from "../components/FollowListPopover";
import "../styles/Home.css";
import "../styles/Profile.css";
import "../styles/Stories.css";

function ProfileAvatar({ user, hasStory, onStory }) {
    const src = mediaUrl(user?.avatar);
    const inner = (
        <div className={hasStory ? "profile-avatar has-story" : "profile-avatar"}>
            {src ? <img src={src} alt="" /> : user?.name?.charAt(0).toUpperCase()}
        </div>
    );
    if (!hasStory) return inner;
    return (
        <button type="button" className="story-profile-btn" onClick={onStory} aria-label="View your story">
            {inner}
        </button>
    );
}

function Profile() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState(() =>
        searchParams.get("tab") === "bookmarks" ? "bookmarks" : "posts"
    );
    const [myStories, setMyStories] = useState([]);
    const [storyOpen, setStoryOpen] = useState(false);

    // 7.8: profile story indicator - active (unexpired) stories only.
    useEffect(() => {
        if (!user?._id) return;
        let cancelled = false;
        getUserStories(user._id)
            .then((d) => { if (!cancelled) setMyStories(d.stories || []); })
            .catch(() => { if (!cancelled) setMyStories([]); });
        return () => { cancelled = true; };
    }, [user?._id]);

    const onTab = (tab) => {
        setActiveTab(tab);
        if (tab === "bookmarks") setSearchParams({ tab: "bookmarks" }, { replace: true });
        else setSearchParams({}, { replace: true });
    };

    useEffect(() => {
        if (!user?._id) return;
        let cancelled = false;
        Promise.all([getProfile(user._id), getBookmarks()])
            .then(([profileData, bookmarkData]) => {
                if (!cancelled) {
                    setProfile(profileData.profile);
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
                    <ProfileAvatar
                        user={profile}
                        hasStory={myStories.length > 0}
                        onStory={() => setStoryOpen(true)}
                    />
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
                        <button className="btn btn-ghost" onClick={() => navigate("/profile/edit")}>
                            <Pencil size={14} /> Edit profile
                        </button>
                    </div>
                </div>
            </div>

            <div className="profile-tabs">
                <button
                    className={activeTab === "posts" ? "active" : ""}
                    onClick={() => onTab("posts")}
                >Posts</button>
                <button
                    className={activeTab === "bookmarks" ? "active" : ""}
                    onClick={() => onTab("bookmarks")}
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

            {storyOpen && myStories.length > 0 && (
                <StoryViewer
                    groups={[{ author: profile, stories: myStories }]}
                    startIndex={0}
                    onClose={() => setStoryOpen(false)}
                    onDeleted={() => { setMyStories([]); setStoryOpen(false); }}
                />
            )}
        </div>
    );
}

export default Profile;
