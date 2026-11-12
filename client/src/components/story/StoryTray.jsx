import { useEffect, useRef, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { useToast } from "../../context/useToast";
import { mediaUrl } from "../../services/api";
import { listStories, createStory } from "../../services/storyApi";
import StoryViewer from "./StoryViewer";
import "../../styles/Stories.css";

// 7.8: story tray above the feed - own create entry first, then one ring
// per followed author with active stories; "seen" is session-local (view
// records are author-only on the server).
export default function StoryTray() {
    const { user } = useAuth();
    const toast = useToast();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openIndex, setOpenIndex] = useState(-1);
    const [viewed, setViewed] = useState(() => new Set());
    const [busy, setBusy] = useState(false);
    const fileRef = useRef(null);

    const load = useCallback(() => {
        listStories()
            .then((d) => setGroups(d.groups || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(load, [load]);

    const pick = (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || busy) return;
        setBusy(true);
        createStory(file)
            .then(() => {
                toast.success("Story added - live for 24 hours");
                load();
            })
            .catch((err) => toast.error(err.message || "Could not add story"))
            .finally(() => setBusy(false));
    };

    if (loading) return null;

    const others = groups.filter((g) => String(g.author._id) !== String(user?._id));

    return (
        <div className="story-tray" role="list" aria-label="Stories">
            <button
                type="button"
                className="story-item story-add"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                aria-label="Add to your story"
            >
                <span className="story-avatar add">
                    {mediaUrl(user?.avatar) ? <img src={mediaUrl(user.avatar)} alt="" /> : user?.name?.charAt(0)?.toUpperCase() || "?"}
                    <i className="story-badge"><Plus size={11} /></i>
                </span>
                <span className="story-name">{busy ? "Adding…" : "Your story"}</span>
            </button>

            {others.map((g, i) => {
                const seen = g.stories.every((s) => viewed.has(s._id));
                return (
                    <button
                        key={g.author._id}
                        type="button"
                        className="story-item"
                        onClick={() => setOpenIndex(i)}
                        aria-label={`View ${g.author.name || g.author.username}'s story`}
                    >
                        <span className={seen ? "story-avatar seen" : "story-avatar"}>
                            {mediaUrl(g.author.avatar) ? (
                                <img src={mediaUrl(g.author.avatar)} alt="" />
                            ) : (
                                g.author.name?.charAt(0)?.toUpperCase() || "?"
                            )}
                        </span>
                        <span className="story-name">{(g.author.name || g.author.username || "").split(" ")[0]}</span>
                    </button>
                );
            })}

            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={pick} />

            {openIndex >= 0 && others[openIndex] && (
                <StoryViewer
                    groups={others}
                    startIndex={openIndex}
                    onClose={() => setOpenIndex(-1)}
                    onViewed={(id) => setViewed((prev) => new Set(prev).add(id))}
                    onDeleted={load}
                />
            )}
        </div>
    );
}
