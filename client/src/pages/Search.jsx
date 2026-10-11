import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchUsers, searchPosts, searchHashtag, mediaUrl } from "../services/api";
import PostCard from "../components/PostCard";
import "../styles/Home.css";
import "../styles/Profile.css";

function Search() {
    const [params, setParams] = useSearchParams();
    const [query, setQuery] = useState(() => params.get("q") || "");
    const [users, setUsers] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [searched, setSearched] = useState(false);

    const runSearch = async (raw) => {
        const q = raw.trim();
        if (!q) return;
        try {
            setLoading(true);
            setError("");
            setSearched(true);
            const isHashtag = q.startsWith("#");
            const term = q.replace("#", "");
            const [userResult, postResult] = await Promise.all([
                searchUsers(term),
                isHashtag ? searchHashtag(term) : searchPosts(q)
            ]);
            setUsers(userResult.users);
            setPosts(postResult.posts);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const q = params.get("q");
        if (q) runSearch(q);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params]);

    const handleSearch = (e) => {
        e.preventDefault();
        const q = query.trim();
        if (!q) return;
        if (params.get("q") === q) runSearch(q);
        else setParams({ q });
    };

    return (
        <div className="page">
            <div className="page-header"><h1>Search</h1></div>

            <form onSubmit={handleSearch} className="create-post">
                <input
                    type="text"
                    placeholder="Search users, posts, or #hashtags..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <div className="post-actions">
                    <span className="faint">Try #react, usernames, or keywords</span>
                    <button type="submit" className="btn btn-sm" disabled={loading || !query.trim()}>
                        {loading ? "Searching..." : "Search"}
                    </button>
                </div>
            </form>

            {error && <p className="error-message" style={{ marginTop: 16 }}>{error}</p>}

            {searched && !loading && (
                <>
                    <section className="search-group" style={{ marginTop: 28 }}>
                        <h2>Users ({users.length})</h2>
                        {users.length === 0 ? (
                            <div className="empty-state"><p>No users found.</p></div>
                        ) : users.map((u) => {
                            const avatar = mediaUrl(u.avatar);
                            return (
                                <Link key={u._id} to={`/users/${u._id}`} className="user-result">
                                    <div className="small-avatar" style={{ width: 44, height: 44 }}>
                                        {avatar ? <img src={avatar} alt="" /> : u.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="user-result-info">
                                        <strong>{u.name}</strong>
                                        <span>@{u.username}{u.bio ? ` — ${u.bio.slice(0, 50)}` : ""}</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </section>

                    <section className="search-group">
                        <h2>Posts ({posts.length})</h2>
                        {posts.length === 0 ? (
                            <div className="empty-state"><p>No posts found.</p></div>
                        ) : posts.map((post) => (
                            <PostCard key={post._id} post={post} onLike={() => {}} />
                        ))}
                    </section>
                </>
            )}
        </div>
    );
}

export default Search;
