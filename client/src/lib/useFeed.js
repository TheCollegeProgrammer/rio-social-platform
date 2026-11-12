import { useCallback, useEffect, useRef, useState } from "react";
import { getFeed, toggleLike } from "../services/api";
import { reducedMotion } from "./utils";
import { useAutoLoad } from "./useAutoLoad";
import { useFeedRefresh } from "./useFeedRefresh";

// Owns feed state: cursor paging with id-dedupe, a pending buffer for the
// new-posts pill (no auto-insert jumps), and optimistic like updates.
// Understands BOTH response shapes — cursor payloads (hasMore/nextCursor)
// and legacy page payloads (page/totalPages) — so the feed never caps out
// at the first page just because an older server build is answering.
export function useFeed(limit = 10) {
    const [posts, setPosts] = useState([]);
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [rearm, setRearm] = useState(0);
    const cursorRef = useRef(null);
    const pageRef = useRef(1);
    const loadingRef = useRef(false);
    const pendingRef = useRef([]);
    const seenRef = useRef(new Set());
    const sentinelRef = useRef(null);
    const feedRef = useRef(null);

    const track = (list) => list.forEach((p) => seenRef.current.add(p._id));

    const normalize = useCallback((d) => {
        const list = d.posts || [];
        const hasMore = typeof d.hasMore === "boolean"
            ? d.hasMore
            : d.totalPages != null && d.page != null
                ? d.page < d.totalPages
                : list.length >= limit;
        return { posts: list, hasMore, cursor: d.nextCursor || null, page: d.page };
    }, [limit]);

    const loadInitial = useCallback(async () => {
        setError("");
        setLoading(true);
        try {
            const n = normalize(await getFeed({ limit }));
            setPosts(n.posts);
            track(n.posts);
            cursorRef.current = n.cursor;
            pageRef.current = n.page || 1;
            setHasMore(n.hasMore);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [limit, normalize]);

    useEffect(() => {
        loadInitial();
    }, [loadInitial]);

    const loadMore = useCallback(async () => {
        if (loadingRef.current) return;
        const useCursor = Boolean(cursorRef.current);
        const prevCursor = cursorRef.current;
        const prevPage = pageRef.current;
        loadingRef.current = true;
        setLoadingMore(true);
        try {
            const d = await getFeed(
                useCursor ? { cursor: cursorRef.current, limit } : { page: prevPage + 1, limit }
            );
            const n = normalize(d);
            const fresh = n.posts.filter((p) => !seenRef.current.has(p._id));
            const advanced = useCursor
                ? n.cursor !== prevCursor
                : n.page == null || n.page > prevPage;

            if (useCursor) cursorRef.current = n.cursor;
            else pageRef.current = n.page != null ? n.page : prevPage + 1;

            setPosts((prev) => [...prev, ...fresh]);
            track(fresh);
            setHasMore(n.hasMore);

            // Server claims more but returned nothing new: keep walking only
            // if the position actually advanced; a stuck position is a broken
            // server, so stop instead of looping forever.
            if (n.hasMore && fresh.length === 0) {
                if (!advanced) setHasMore(false);
                else setRearm((r) => r + 1);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            loadingRef.current = false;
            setLoadingMore(false);
        }
    }, [limit, normalize]);

    const handleFresh = useCallback((fresh) => {
        const truly = fresh.filter((p) => !seenRef.current.has(p._id));
        pendingRef.current = truly;
        setPending(truly);
    }, []);

    useAutoLoad(sentinelRef, loadMore, !loading && hasMore, [posts.length, rearm]);
    useFeedRefresh({ fetchPage: () => getFeed({ limit }), onFresh: handleFresh, active: !loading });

    const revealPending = useCallback(() => {
        const add = pendingRef.current;
        pendingRef.current = [];
        setPending([]);
        if (add.length) {
            setPosts((prev) => {
                const ids = new Set(prev.map((p) => p._id));
                const merged = add.filter((p) => !ids.has(p._id));
                merged.forEach((p) => seenRef.current.add(p._id));
                return [...merged, ...prev];
            });
            window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
        }
    }, []);

    const prependLocal = useCallback((post) => {
        seenRef.current.add(post._id);
        setPosts((prev) => [post, ...prev]);
    }, []);

    const handleLike = useCallback(async (postId) => {
        try {
            const d = await toggleLike(postId);
            setPosts((prev) =>
                prev.map((p) => (p._id === postId ? { ...p, likesCount: d.likesCount, liked: d.liked } : p))
            );
        } catch (e) {
            setError(e.message);
        }
    }, []);

    return {
        posts, pending, loading, error, setError, hasMore, loadingMore,
        sentinelRef, feedRef, loadInitial, loadMore, revealPending, prependLocal, handleLike
    };
}
