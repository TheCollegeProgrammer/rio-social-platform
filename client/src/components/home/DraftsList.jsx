import { useEffect, useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { useToast } from "../../context/useToast";
import { listDrafts, deleteDraft } from "../../services/draftApi";
import "./Composer.css";

// 7.2: resume/delete flow for owner-private drafts; picking one hydrates
// the composer through CompactComposer's load-draft state.
export default function DraftsList({ onPick, refreshToken = 0 }) {
    const toast = useToast();
    const [drafts, setDrafts] = useState([]);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        let live = true;
        listDrafts()
            .then((d) => { if (live) setDrafts(d.drafts || []); })
            .catch(() => {});
        return () => { live = false; };
    }, [refreshToken]);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Delete this draft permanently?")) return;
        try {
            await deleteDraft(id);
            setDrafts((prev) => prev.filter((d) => d._id !== id));
        } catch (err) {
            toast.error(err.message);
        }
    };

    if (drafts.length === 0) return null;

    return (
        <div className="drafts-list">
            <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
            >
                <FileText size={15} /> Drafts ({drafts.length})
            </button>
            {open && (
                <ul className="drafts-panel" role="list">
                    {drafts.map((d) => (
                        <li key={d._id}>
                            <button
                                type="button"
                                className="draft-item"
                                onClick={() => { setOpen(false); onPick(d); }}
                            >
                                <span className="draft-excerpt">
                                    {d.content?.trim().slice(0, 80) || "Image-only draft"}
                                </span>
                                <span className="muted draft-date">
                                    {new Date(d.updatedAt).toLocaleString()}
                                </span>
                            </button>
                            <button
                                type="button"
                                className="draft-delete"
                                onClick={(e) => handleDelete(e, d._id)}
                                aria-label="Delete draft"
                                title="Delete draft"
                            >
                                <Trash2 size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
