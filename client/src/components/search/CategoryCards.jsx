import { Link } from "react-router-dom";
import { CATEGORIES } from "../../lib/categories";
import "../../styles/Category.css";

function CategoryCards() {
    return (
        <section className="explore-section">
            <h2>Browse categories</h2>
            <div className="category-cards">
                {Object.entries(CATEGORIES).map(([slug, c]) => {
                    const Icon = c.icon;
                    return (
                        <Link
                            key={slug}
                            to={`/${slug}`}
                            className="category-card"
                            style={{ "--card-accent": c.accent }}
                        >
                            <span className="category-card-icon"><Icon size={18} /></span>
                            <strong>{c.title}</strong>
                            <span>{c.tagline}</span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

export default CategoryCards;
