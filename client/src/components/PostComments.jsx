import { useCallback, useEffect, useRef, useState } from "react";
import { getComments, createComment } from "../services/api";
import CommentList from "./CommentList";

// Comments section with real pagination: the API pages top-level comments
// (20/page) — this fetches page 1 and loads the rest on demand.
function PostComments({ postId }) {
    const [comments, setComments] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const moreRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setComments([]);
        getComments(postId, 1)
            .then((d) => {
                if (cancelled) return;
                setComments(d.comments);
                setPage(d.page || 1);
                setTotalPages(d.totalPages || 1);
            })
            .catch((e) => { if (!cancelled) setError(e.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [postId]);

    const loadMore = useCallback(async () => {
        if (moreRef.current || page >= totalPages) return;
        moreRef.current = true;
        setLoadingMore(true);
        try {
            const d = await getComments(postId, page + 1);
            setComments((prev) => [...prev, ...d.comments]);
            setPage(d.page || page + 1);
            setTotalPages(d.totalPages || totalPages);
        } catch (e) {
            setError(e.message);
        } finally {
            moreRef.current = false;
            setLoadingMore(false);
        }
    }, [postId, page, totalPages]);

    const submit = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        try {
            setSubmitting(true);
            setError("");
            const d = await createComment(postId, text);
            setComments((prev) => [d.comment, ...prev]);
            setText("");
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const count = comments.reduce((s, c) => s + 1 + (c.replies?.length || 0), 0);

    return (
        <section className="comments-section">
            <h2>Comments ({count})</h2>

            {error && <p className="error-message">{error}</p>}

            <form onSubmit={submit} className="create-post">
                <textarea
                    placeholder="Write a comment..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={2}
                />
                <div className="post-actions">
                    <span />
                    <button type="submit" className="btn btn-sm" disabled={submitting || !text.trim()}>
                        {submitting ? "Posting..." : "Comment"}
                    </button>
                </div>
            </form>

            {loading ? (
                <p className="muted">Loading comments...</p>
            ) : (
                <CommentList
                    postId={postId}
                    comments={comments}
                    onDeleted={(cid) => setComments((p) => p.filter((c) => c._id !== cid))}
                    onUpdated={(u) => setComments((p) => p.map((c) => (c._id === u._id ? u : c)))}
                />
            )}

            {!loading && page < totalPages && (
                <button className="load-more" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading more..." : "Load more comments"}
                </button>
            )}
        </section>
    );
}

export default PostComments;
