import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle } from "lucide-react";
import { getPosts, mediaUrl } from "../../services/api";

function ExploreGrid() {
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        getPosts(1, 30, true)
            .then((d) => {
                if (!cancelled) {
                    setPosts(d.posts);
                    setPage(1);
                    setTotalPages(d.totalPages || 1);
                }
            })
            .catch((e) => { if (!cancelled) setError(e.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const loadMore = async () => {
        const next = page + 1;
        try {
            const d = await getPosts(next, 30, true);
            setPosts((p) => [...p, ...d.posts]);
            setPage(next);
            setTotalPages(d.totalPages || 1);
        } catch (e) { setError(e.message); }
    };

    if (loading) {
        return (
            <div className="explore-grid">
                {[...Array(12)].map((_, i) => <div key={i} className="ex-cell sk-bar" style={{ borderRadius: 0, height: "auto", aspectRatio: "1/1" }} />)}
            </div>
        );
    }
    if (error) return <p className="error-message" style={{ marginTop: 16 }}>{error}</p>;

    return (
        <>
            <div className="explore-grid">
                {posts.map((post) => {
                    const image = mediaUrl(post.image);
                    if (!image) return null;
                    return (
                        <button key={post._id} className="ex-cell" onClick={() => navigate(`/posts/${post._id}`)}>
                            <img src={image} alt="" loading="lazy" />
                            <span className="ex-overlay">
                                <strong>@{post.author?.username}</strong>
                                <span className="ex-stats">
                                    <span><Heart size={13} fill="currentColor" /> {post.likesCount || 0}</span>
                                    <span><MessageCircle size={13} /> {post.hashtags?.length ? post.hashtags[0] : "post"}</span>
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
            {page < totalPages && (
                <button className="load-more" onClick={loadMore}>Load more posts</button>
            )}
        </>
    );
}

export default ExploreGrid;
