import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { useToast } from "../../context/useToast";
import { mediaUrl } from "../../services/api";
import { getStory, viewStory, deleteStory } from "../../services/storyApi";

const DURATION = 5000;

// 7.8: fullscreen viewer - auto-advances every 5s, tap/arrow navigation,
// records the view server-side (deduped, author excluded), and for OWN
// stories fetches the author-only viewer list + offers delete.
export default function StoryViewer({ groups, startIndex = 0, onClose, onViewed, onDeleted }) {
    const { user } = useAuth();
    const toast = useToast();
    const [gi, setGi] = useState(startIndex);
    const [si, setSi] = useState(0);
    const [progress, setProgress] = useState(0);
    const [own, setOwn] = useState(null);

    const group = groups[gi];
    const story = group?.stories?.[si];
    const isOwn = story && String(story.author._id ?? story.author) === String(user?._id);

    const move = (dir) => {
        if (!group) return;
        if (dir > 0) {
            if (si + 1 < group.stories.length) setSi(si + 1);
            else if (gi + 1 < groups.length) { setGi(gi + 1); setSi(0); }
            else onClose();
        } else if (si > 0) setSi(si - 1);
        else if (gi > 0) { setGi(gi - 1); setSi(groups[gi - 1].stories.length - 1); }
    };

    useEffect(() => {
        setProgress(0);
        if (!story) return undefined;
        const start = Date.now();
        const tick = () => {
            const p = Math.min(100, ((Date.now() - start) / DURATION) * 100);
            setProgress(p);
            if (p >= 100) move(1);
        };
        const timer = setInterval(tick, 100);
        return () => clearInterval(timer);
    }, [story?._id]);

    useEffect(() => {
        if (!story) return;
        if (String(story.author._id ?? story.author) === String(user?._id)) {
            setOwn(null);
            getStory(story._id)
                .then(({ story: s }) => setOwn({ count: s.views?.length || 0, viewers: (s.views || []).map((v) => v.user?.username).filter(Boolean) }))
                .catch(() => {});
            return;
        }
        onViewed?.(story._id);
        viewStory(story._id).catch(() => {});
    }, [story?._id]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowRight") move(1);
            else if (e.key === "ArrowLeft") move(-1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    const remove = () => {
        deleteStory(story._id)
            .then(() => {
                toast.success("Story deleted");
                onDeleted?.();
                onClose();
            })
            .catch(() => toast.error("Could not delete story"));
    };

    if (!story) return null;
    const authorName = group.author?.name || group.author?.username || "";

    return (
        <div className="story-overlay" role="dialog" aria-modal="true" aria-label={`${authorName}'s story`} onClick={onClose}>
            <div className="story-view" onClick={(e) => e.stopPropagation()}>
                <div className="story-bars" aria-hidden="true">
                    {group.stories.map((s, i) => (
                        <span key={s._id}>
                            <i style={{ width: i < si ? "100%" : i === si ? `${progress}%` : "0%" }} />
                        </span>
                    ))}
                </div>
                <header className="story-head">
                    <span className="story-avatar sm">
                        {mediaUrl(group.author?.avatar) ? <img src={mediaUrl(group.author.avatar)} alt="" /> : authorName.charAt(0)}
                    </span>
                    <b>{authorName}</b>
                    <span className="muted story-time">24h story</span>
                    <button type="button" className="story-close" onClick={onClose} aria-label="Close story viewer">
                        <X size={18} />
                    </button>
                </header>
                <div className="story-media">
                    <button type="button" className="story-tap left" aria-label="Previous story" onClick={() => move(-1)} />
                    <button type="button" className="story-tap right" aria-label="Next story" onClick={() => move(1)} />
                    <img src={mediaUrl(story.media)} alt="" />
                </div>
                <footer className="story-foot">
                    {isOwn ? (
                        <>
                            <span>{own ? `${own.count} view${own.count === 1 ? "" : "s"}${own.viewers?.length ? ` - ${own.viewers.slice(0, 4).join(", ")}` : ""}` : "Loading views…"}</span>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={remove}>Delete</button>
                        </>
                    ) : (
                        <span className="muted">Only you can see that you viewed this</span>
                    )}
                </footer>
            </div>
        </div>
    );
}
