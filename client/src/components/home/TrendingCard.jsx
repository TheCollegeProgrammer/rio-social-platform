import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTrendingHashtags } from "../../services/api";
import "./SideCards.css";
import "./TrendingCard.css";

function TrendingCard() {
    const [tags, setTags] = useState(null);
    const [failed, setFailed] = useState(false);

    const fetchTags = useCallback(async () => {
        try {
            const d = await getTrendingHashtags();
            setTags((d.hashtags || []).slice(0, 6));
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, []);

    useEffect(() => { fetchTags(); }, [fetchTags]);

    const retry = () => { setFailed(false); setTags(null); fetchTags(); };

    // Nothing trending yet = no card; failures surface with retry instead.
    if (!failed && tags && tags.length === 0) return null;

    return (
        <section className="side-card" aria-labelledby="trend-title">
            <h2 id="trend-title" className="side-title">Trending</h2>
            {failed ? (
                <div className="side-error">
                    <p>Couldn't load trending.</p>
                    <button className="btn btn-ghost btn-sm" onClick={retry}>Retry</button>
                </div>
            ) : tags === null ? (
                <div className="sk-lines" aria-hidden="true">
                    <span className="sk-bar" />
                    <span className="sk-bar" />
                    <span className="sk-bar" />
                </div>
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
