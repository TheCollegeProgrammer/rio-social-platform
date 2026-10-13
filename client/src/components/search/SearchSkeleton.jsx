function SearchSkeleton() {
    return (
        <div className="search-skeleton">
            <div className="skeleton-card" style={{ padding: "14px 16px", borderRadius: 12 }}>
                <div className="sk-row"><div className="sk-circle" /><div className="sk-lines"><div className="sk-bar" style={{ width: "40%" }} /><div className="sk-bar" style={{ width: "65%" }} /></div></div>
            </div>
            <div className="skeleton-card" style={{ padding: "14px 16px", borderRadius: 12 }}>
                <div className="sk-row"><div className="sk-circle" /><div className="sk-lines"><div className="sk-bar" style={{ width: "35%" }} /><div className="sk-bar" style={{ width: "70%" }} /></div></div>
            </div>
            <div className="skeleton-card" style={{ padding: "18px 20px", borderRadius: 14 }}>
                <div className="sk-lines" style={{ gap: 10 }}>
                    <div className="sk-bar" style={{ width: "30%" }} />
                    <div className="sk-bar" style={{ width: "95%" }} />
                    <div className="sk-bar" style={{ width: "80%" }} />
                    <div className="sk-bar" style={{ width: "50%", height: 140, borderRadius: 10 }} />
                </div>
            </div>
        </div>
    );
}

export default SearchSkeleton;
