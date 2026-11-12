import { ArrowUp } from "lucide-react";

// Floating pill: new posts are buffered, never auto-inserted (D3).
function NewPostsPill({ count, onReveal }) {
    if (!count) return null;
    return (
        <button
            className="new-posts-pill"
            onClick={onReveal}
            aria-live="polite"
            aria-label={`Show ${count} new post${count > 1 ? "s" : ""}`}
        >
            <ArrowUp size={14} aria-hidden="true" />
            {count} new post{count > 1 ? "s" : ""}
        </button>
    );
}

export default NewPostsPill;
