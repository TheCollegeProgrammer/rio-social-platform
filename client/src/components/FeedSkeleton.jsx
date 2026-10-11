export default function FeedSkeleton() {
    return (
        <>
            {[0, 1, 2].map((i) => (
                <div className="post-card skeleton-card" key={i}>
                    <div className="sk-row">
                        <div className="sk-circle" />
                        <div className="sk-lines">
                            <div className="sk-bar" style={{ width: "40%" }} />
                            <div className="sk-bar" style={{ width: "25%" }} />
                        </div>
                    </div>
                    <div className="sk-bar" style={{ width: "92%", marginTop: 16 }} />
                    <div className="sk-bar" style={{ width: "74%", marginTop: 8 }} />
                </div>
            ))}
        </>
    );
}
