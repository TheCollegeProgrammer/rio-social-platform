import { useRef, useLayoutEffect } from "react";
import { FileText } from "lucide-react";
import gsap from "gsap";
import { useAuth } from "../context/useAuth";
import { useFeed } from "../lib/useFeed";
import { reducedMotion } from "../lib/utils";
import PostCard from "../components/PostCard";
import FeedSkeleton from "../components/FeedSkeleton";
import CompactComposer from "../components/home/CompactComposer";
import NewPostsPill from "../components/home/NewPostsPill";
import SuggestionsCard from "../components/home/SuggestionsCard";
import MessagesCard from "../components/home/MessagesCard";
import TrendingCard from "../components/home/TrendingCard";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import { mediaUrl } from "../services/api";
import "../styles/Home.css";
import "../components/home/FeedChrome.css";

function Home() {
    const { user } = useAuth();
    const {
        posts, pending, loading, error, setError, hasMore, loadingMore,
        sentinelRef, feedRef, loadInitial, loadMore, revealPending, prependLocal, handleLike
    } = useFeed();
    const animatedIds = useRef(new Set());

    useLayoutEffect(() => {
        if (reducedMotion() || !feedRef.current) return;
        const cards = Array.from(feedRef.current.querySelectorAll(".post-card"));
        const fresh = cards.filter((el) => !animatedIds.current.has(el.dataset.postId));
        if (!fresh.length) return;
        const ctx = gsap.context(() => {
            gsap.from(fresh, {
                opacity: 0,
                y: 12,
                duration: 0.5,
                stagger: 0.07,
                ease: "power2.out",
                clearProps: "opacity,transform"
            });
        }, feedRef);
        fresh.forEach((el) => animatedIds.current.add(el.dataset.postId));
        return () => ctx.revert();
    }, [posts, feedRef]);

    return (
        <div className="home-grid">
            <div className="home-center">
                <header className="home-header">
                    <div className="home-user">
                        <div className="avatar">
                            {mediaUrl(user?.avatar) ? (
                                <img src={mediaUrl(user.avatar)} alt="" />
                            ) : (
                                user?.name?.charAt(0).toUpperCase() || "?"
                            )}
                        </div>
                        <div>
                            <p className="welcome">Welcome back</p>
                            {reducedMotion() ? (
                                <h1>{user?.name || "there"}</h1>
                            ) : (
                                <TextEffect as="h1" per="char" preset="fade-in-blur">
                                    {user?.name || "there"}
                                </TextEffect>
                            )}
                        </div>
                    </div>
                </header>

                <CompactComposer onCreated={prependLocal} />
                <NewPostsPill count={pending.length} onReveal={revealPending} />

                {error && posts.length === 0 && !loading ? (
                    <div className="feed-error" role="alert">
                        <p>{error}</p>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setError(""); loadInitial(); }}>
                            Retry
                        </button>
                    </div>
                ) : error && (
                    <p className="error-message home-error" role="alert">{error}</p>
                )}

                <section className="feed" ref={feedRef} aria-label="Home feed">
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
                                <>
                                    <div ref={sentinelRef} aria-hidden="true" />
                                    <button className="load-more" onClick={loadMore} disabled={loadingMore}>
                                        {loadingMore ? "Loading more..." : "Load more"}
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </section>
            </div>

            <aside className="home-side" aria-label="Discover and messages">
                <SuggestionsCard />
                <MessagesCard />
                <TrendingCard />
            </aside>
        </div>
    );
}

export default Home;
