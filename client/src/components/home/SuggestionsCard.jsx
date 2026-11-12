import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { useFollowToggle } from "../../lib/useFollowToggle";
import { getSuggestions, mediaUrl } from "../../services/api";
import "./SideCards.css";

const PAGE = 5;

function SuggestionRow({ u, busy, onFollow }) {
    const label =
        u.mutualCount > 0
            ? `Followed by ${u.mutualCount} ${u.mutualCount === 1 ? "person" : "people"}`
            : u.isNew
                ? "New to RIO"
                : u.followersCount > 0
                    ? `${u.followersCount} follower${u.followersCount === 1 ? "" : "s"}`
                    : u.bio || "Suggested for you";
    const src = mediaUrl(u.avatar);
    return (
        <li className="sug-row">
            <Link to={`/users/${u._id}`} className="sug-identity">
                <span className="sug-avatar">
                    {src ? <img src={src} alt="" /> : u.name?.charAt(0)?.toUpperCase() || "?"}
                </span>
                <span className="sug-text">
                    <span className="sug-name">{u.name}</span>
                    <span className="sug-meta">@{u.username} · {label}</span>
                </span>
            </Link>
            <button
                className={u.following ? "btn btn-ghost btn-sm sug-btn" : "btn btn-sm sug-btn"}
                onClick={() => onFollow(u)}
                disabled={busy}
                aria-label={u.following ? `Unfollow ${u.name}` : `Follow ${u.name}`}
            >
                {busy ? "…" : u.following ? "Following" : "Follow"}
            </button>
        </li>
    );
}

function SuggestionsCard() {
    const { user } = useAuth();
    const { toggle: followToggle } = useFollowToggle();
    const [users, setUsers] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const loadingMore = useRef(false);

    const load = useCallback(async (offset = 0) => {
        try {
            const d = await getSuggestions(PAGE, offset);
            setUsers((prev) => (offset ? [...prev, ...d.users] : d.users));
            setHasMore(Boolean(d.hasMore));
        } catch (e) {
            setError(e.message);
        } finally {
            setLoaded(true);
        }
    }, []);

    useEffect(() => { load(0); }, [load]);

    const onFollow = async (u) => {
        if (busyId) return;
        setBusyId(u._id);
        const ids = user?.following || [];
        const isF = ids.some((f) => (f?._id || f) === u._id);
        try {
            await followToggle(u._id, !isF);
        } finally {
            setBusyId(null);
        }
    };

    const seeAll = async () => {
        if (loadingMore.current) return;
        loadingMore.current = true;
        await load(users.length);
        loadingMore.current = false;
    };

    const followingIds = user?.following || [];

    return (
        <section className="side-card" aria-labelledby="sug-title">
            <h2 id="sug-title" className="side-title">Suggested for You</h2>
            {!loaded ? (
                <div className="sk-side-list" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="sk-side">
                            <span className="sk-circle" />
                            <span className="sk-lines"><span className="sk-bar" /><span className="sk-bar" /></span>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="side-error">
                    <p>{error}</p>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setError(""); load(0); }}>
                        Retry
                    </button>
                </div>
            ) : users.length === 0 ? (
                <p className="side-muted">No suggestions yet — follow a few people to get started.</p>
            ) : (
                <ul className="sug-list">
                    {users.map((u) => (
                        <SuggestionRow
                            key={u._id}
                            u={{
                                ...u,
                                following: followingIds.some((f) => (f?._id || f) === u._id)
                            }}
                            busy={busyId === u._id}
                            onFollow={onFollow}
                        />
                    ))}
                </ul>
            )}
            {hasMore && loaded && !error && (
                <button className="side-link" onClick={seeAll}>See all suggestions</button>
            )}
        </section>
    );
}

export default SuggestionsCard;
