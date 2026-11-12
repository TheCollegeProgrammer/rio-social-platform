import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTrendingHashtags } from "../../services/api";
import "./SideCards.css";
import "./TrendingCard.css";

function TrendingCard() {
    const [tags, setTags] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getTrendingHashtags()
            .then((d) => { if (!cancelled) setTags((d.hashtags || []).slice(0, 6)); })
            .catch(() => { if (!cancelled) { setFailed(true); setTags([]); } });
        return () => { cancelled = true; };
    }, []);

    if (failed || (tags && tags.length === 0)) return null;

    return (
        <section className="side-card" aria-labelledby="trend-title">
            <h2 id="trend-title" className="side-title">Trending</h2>
            {tags === null ? (
                <p className="side-muted">Loading…</p>
            ) : (
                <ul className="trend-list">
                    {tags.map((t) => (
                        <li key={t.tag}>
                            <Link to={`/search?q=${encodeURIComponent(t.tag)}`} className="trend-chip">
                                <span className="trend-tag">#{t.tag}</span>
                                <span className="trend-count">{t.count}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default TrendingCard;
