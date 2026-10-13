import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, X } from "lucide-react";
import { searchUsers, searchPosts, searchHashtag, getTrendingHashtags } from "../services/api";
import TrendingTags from "../components/search/TrendingTags";
import RecentSearches from "../components/search/RecentSearches";
import SearchResults from "../components/search/SearchResults";
import SearchSkeleton from "../components/search/SearchSkeleton";
import "../styles/Home.css";
import "../styles/Profile.css";
import "../styles/Search.css";

const RECENT_KEY = "rio-recent-searches";
const loadRecent = () => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
};

function Search() {
    const [params, setParams] = useSearchParams();
    const [query, setQuery] = useState(() => params.get("q") || "");
    const [users, setUsers] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [searched, setSearched] = useState(false);
    const [trending, setTrending] = useState([]);
    const [trendLoading, setTrendLoading] = useState(true);
    const [recent, setRecent] = useState(loadRecent);

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
            const list = [q, ...recent.filter((x) => x !== q)].slice(0, 6);
            setRecent(list);
            localStorage.setItem(RECENT_KEY, JSON.stringify(list));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        getTrendingHashtags()
            .then((d) => { if (!cancelled) setTrending(d.hashtags || []); })
            .catch(() => { /* explore still works without trending */ })
            .finally(() => { if (!cancelled) setTrendLoading(false); });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const q = params.get("q");
        if (q) runSearch(q);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params]);

    const go = (q) => {
        const term = q.trim();
        if (!term) return;
        setQuery(term);
        if (params.get("q") === term) runSearch(term);
        else setParams({ q: term });
    };

    const clearAll = () => {
        setQuery("");
        setParams({});
        setSearched(false);
        setUsers([]);
        setPosts([]);
    };

    const removeRecent = (s) => {
        const list = recent.filter((x) => x !== s);
        setRecent(list);
        localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    };

    return (
        <div className="page">
            <div className="page-header"><h1>Explore</h1></div>

            <form onSubmit={(e) => { e.preventDefault(); go(query); }} className="search-bar">
                <SearchIcon size={18} className="search-bar-icon" />
                <input
                    type="text"
                    placeholder="Search people, posts, or #hashtags..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                    <button type="button" className="search-clear" aria-label="Clear search" onClick={clearAll}>
                        <X size={16} />
                    </button>
                )}
                <button type="submit" className="btn btn-sm" disabled={loading || !query.trim()}>
                    {loading ? "..." : "Search"}
                </button>
            </form>

            {error && <p className="error-message" style={{ marginTop: 16 }}>{error}</p>}
            {loading && <SearchSkeleton />}

            {!loading && !searched && (
                <>
                    <RecentSearches searches={recent} onPick={go} onRemove={removeRecent} />
                    <TrendingTags tags={trending} loading={trendLoading} onSelect={go} />
                </>
            )}

            {!loading && searched && (
                <SearchResults
                    key={query}
                    users={users}
                    posts={posts}
                    query={query}
                    defaultTab={query.startsWith("#") ? "posts" : "users"}
                />
            )}
        </div>
    );
}

export default Search;
