import { useState } from "react";
import { ImagePlus, Layers } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import CreatePostForm from "../CreatePostForm";
import DraftsList from "./DraftsList";
import { mediaUrl } from "../../services/api";
import "./Composer.css";

const CATEGORIES = [
    { slug: "", label: "Category" },
    { slug: "motivation", label: "Motivation" },
    { slug: "billionaire-mindset", label: "Billionaire Mindset" },
    { slug: "f1", label: "F1" },
    { slug: "motorsport", label: "Motorsport" }
];

// Collapsed row reuses the existing CreatePostForm when expanded — no
// second posting implementation (D1).
function CompactComposer({ onCreated }) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [category, setCategory] = useState("");
    const [loadDraft, setLoadDraft] = useState(null);
    const [draftsVersion, setDraftsVersion] = useState(0);
    const src = user ? mediaUrl(user.avatar) : null;
    const bumpDrafts = () => setDraftsVersion((v) => v + 1);

    if (open) {
        return (
            <>
                <DraftsList
                    refreshToken={draftsVersion}
                    onPick={(d) => setLoadDraft(d)}
                />
                <CreatePostForm
                    category={category || null}
                    setCategory={setCategory}
                    onCreated={onCreated}
                    initialDraft={loadDraft}
                    onDraftConsumed={() => setLoadDraft(null)}
                    onDraftChanged={bumpDrafts}
                />
            </>
        );
    }

    const openForm = () => setOpen(true);

    return (
        <>
            <DraftsList refreshToken={draftsVersion} onPick={(d) => { setLoadDraft(d); setOpen(true); }} />
            <div className="composer-compact">
            <span className="composer-avatar">
                {src ? <img src={src} alt="" /> : user?.name?.charAt(0).toUpperCase() || "?"}
            </span>
            <button className="composer-trigger" onClick={openForm}>
                What&apos;s happening?
            </button>
            <div className="composer-tools">
                <button
                    className="composer-tool"
                    onClick={openForm}
                    aria-label="Add photos"
                    title="Add photos"
                >
                    <ImagePlus size={17} />
                </button>
                <label className="composer-category" title="Post category">
                    <Layers size={15} aria-hidden="true" />
                    <select
                        aria-label="Category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        {CATEGORIES.map((c) => (
                            <option key={c.slug} value={c.slug}>{c.label}</option>
                        ))}
                    </select>
                </label>
                <button className="btn btn-sm" onClick={openForm}>Post</button>
            </div>
            </div>
        </>
    );
}

export default CompactComposer;
