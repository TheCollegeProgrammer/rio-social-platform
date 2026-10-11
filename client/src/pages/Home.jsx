import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { getPosts, toggleLike } from "../services/api";
import PostCard from "../components/PostCard";
import FeedSkeleton from "../components/FeedSkeleton";
import CreatePostForm from "../components/CreatePostForm";
import "../styles/Home.css";

function Home() {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        let cancelled = false;
        getPosts(1)
            .then((data) => {
                if (!cancelled) {
                    setPosts(data.posts);
                    setHasMore(1 < data.totalPages);
                }
            })
            .catch((err) => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const loadMore = () => {
        const next = page + 1;
        setPage(next);
        getPosts(next)
            .then((data) => {
                setPosts((prev) => [...prev, ...data.posts]);
                setHasMore(next < data.totalPages);
            })
            .catch((err) => setError(err.message));
    };

    const handleLike = async (postId) => {
        try {
            const data = await toggleLike(postId);
            setPosts((prev) =>
                prev.map((p) =>
                    p._id === postId
                        ? { ...p, likesCount: data.likesCount, liked: data.liked }
                        : p
                )
            );
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <main className="home">
            <div className="home-header">
                <div>
                    <p className="welcome">Welcome back</p>
                    <h1>{user?.name}</h1>
                </div>
            </div>

            <CreatePostForm onCreated={(post) => setPosts((prev) => [post, ...prev])} />

            {error && <p className="error-message" style={{ marginTop: 16 }}>{error}</p>}

            <section className="feed">
                {loading ? (
                    <FeedSkeleton />
                ) : posts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon"><FileText size={44} strokeWidth={1.3} /></div>
                        <p>No posts yet. Be the first to post!</p>
                    </div>
                ) : (
                    <>
                        {posts.map((post) => (
                            <PostCard key={post._id} post={post} onLike={handleLike} />
                        ))}
                        {hasMore && (
                            <button className="load-more" onClick={loadMore} disabled={loading}>
                                {loading ? "Loading..." : "Load more"}
                            </button>
                        )}
                    </>
                )}
            </section>
        </main>
    );
}

export default Home;
