import { Hash, TrendingUp } from "lucide-react";

function TrendingTags({ tags, onSelect, loading }) {
    return (
    <section className="explore-section">
        <h2><TrendingUp size={17} /> Trending tags</h2>
        {loading ? (
            <div className="tag-cloud">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="tag-pill sk-bar" style={{ width: 70 + (i % 4) * 22, height: 30, borderRadius: 999 }} />
                ))}
            </div>
        ) : tags.length === 0 ? (
            <p className="faint">No hashtags yet — be the first to use one!</p>
        ) : (
            <div className="tag-cloud">
                {tags.map((t) => (
                    <button key={t.tag} className="tag-pill" onClick={() => onSelect(t.tag)}>
                        <Hash size={13} />
                        {t.tag.replace("#", "")}
                        <span className="tag-count">{t.count}</span>
                    </button>
                ))}
            </div>
        )}
    </section>
    );
}

export default TrendingTags;
