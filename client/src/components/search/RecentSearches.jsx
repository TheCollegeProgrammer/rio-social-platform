import { Clock, X } from "lucide-react";

function RecentSearches({ searches, onPick, onRemove }) {
    if (!searches.length) return null;
    return (
    <section className="explore-section">
        <h2><Clock size={17} /> Recent searches</h2>
        <div className="tag-cloud">
            {searches.map((s) => (
                <span key={s} className="tag-pill recent">
                    <button className="recent-pick" onClick={() => onPick(s)}>{s}</button>
                    <button className="recent-remove" aria-label={`Remove ${s}`} onClick={() => onRemove(s)}>
                        <X size={12} />
                    </button>
                </span>
            ))}
        </div>
    </section>
    );
}

export default RecentSearches;
