import RecentSearches from "./RecentSearches";
import TrendingTags from "./TrendingTags";
import ExploreGrid from "./ExploreGrid";

function ExploreFeed({ recent, onPick, onRemove, trending, trendLoading }) {
    return (
        <>
            <RecentSearches searches={recent} onPick={onPick} onRemove={onRemove} />
            <TrendingTags tags={trending} loading={trendLoading} onSelect={onPick} />
            <section className="explore-section">
                <h2>Latest posts</h2>
                <ExploreGrid />
            </section>
        </>
    );
}

export default ExploreFeed;
