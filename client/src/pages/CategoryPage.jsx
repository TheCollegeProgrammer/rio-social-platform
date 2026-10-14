import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { getPosts, toggleLike } from "../services/api";
import PostCard from "../components/PostCard";
import FeedSkeleton from "../components/FeedSkeleton";
import CreatePostForm from "../components/CreatePostForm";
import { CATEGORIES } from "../lib/categories";
import { TextScramble } from "@/components/motion-primitives/text-scramble";
import { AnimatedGroup } from "@/components/motion-primitives/animated-group";
import "../styles/Category.css";

function CategoryPage({ category }) {
    const config = CATEGORIES[category];
    const [posts, setPosts] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setPosts([]);
        setPage(1);
        getPosts(1, 10, false, category)
            .then((data) => {
                if (!cancelled) {
                    setPosts(data.posts);
                    setHasMore(1 < data.totalPages);
                }
            })
            .catch((err) => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [category]);

    const loadMore = () => {
        const next = page + 1;
        setPage(next);
        getPosts(next, 10, false, category)
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

    if (!config) {
        return <div className="page"><p className="error-message">Unknown category.</p></div>;
    }
    const Icon = config.icon;

    return (
        <main className="home category-page">
            <header className="category-hero" style={{ "--cat-accent": config.accent }}>
                <span className="category-icon"><Icon size={26} /></span>
                <div>
                    <TextScramble as="h1" className="category-title" duration={0.9}>
                        {config.title}
                    </TextScramble>
                    <p className="category-tagline">{config.tagline}</p>
                </div>
            </header>

            <CreatePostForm
                category={category}
                onCreated={(post) => setPosts((prev) => [post, ...prev])}
            />

            {error && <p className="error-message" style={{ marginTop: 16 }}>{error}</p>}

            <section className="feed">
                {loading ? (
                    <FeedSkeleton />
                ) : posts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon"><FileText size={44} strokeWidth={1.3} /></div>
                        <p>No posts in this category yet. Be the first!</p>
                    </div>
                ) : (
                    <>
                        <AnimatedGroup preset="slide" className="feed-inner" as="div">
                            {posts.map((post) => (
                                <PostCard key={post._id} post={post} onLike={handleLike} />
                            ))}
                        </AnimatedGroup>
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

export default CategoryPage;
