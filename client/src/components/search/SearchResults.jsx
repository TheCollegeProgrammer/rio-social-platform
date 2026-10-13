import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, FileText, UserX, FileSearch } from "lucide-react";
import PostCard from "../PostCard";
import { mediaUrl } from "../../services/api";

function UserRow({ u }) {
    const avatar = mediaUrl(u.avatar);
    return (
        <Link to={`/users/${u._id}`} className="user-result">
            <div className="small-avatar" style={{ width: 44, height: 44 }}>
                {avatar ? <img src={avatar} alt="" /> : u.name?.charAt(0).toUpperCase()}
            </div>
            <div className="user-result-info">
                <strong>{u.name}</strong>
                <span>@{u.username}{u.bio ? ` — ${u.bio.slice(0, 50)}` : ""}</span>
            </div>
        </Link>
    );
}

function SearchResults({ users, posts, query, defaultTab = "users" }) {
    const [tab, setTab] = useState(defaultTab);
    return (
        <>
            <div className="search-tabs" role="tablist">
                <button role="tab" aria-selected={tab === "users"} className={tab === "users" ? "tab active" : "tab"} onClick={() => setTab("users")}>
                    <Users size={15} /> Users <span className="tab-count">{users.length}</span>
                </button>
                <button role="tab" aria-selected={tab === "posts"} className={tab === "posts" ? "tab active" : "tab"} onClick={() => setTab("posts")}>
                    <FileText size={15} /> Posts <span className="tab-count">{posts.length}</span>
                </button>
            </div>

            <section className="search-group" style={{ marginTop: 18 }}>
                {tab === "users" ? (
                    users.length === 0 ? (
                        <div className="empty-state"><UserX size={36} /><p>No users found for “{query}”.</p></div>
                    ) : users.map((u) => <UserRow key={u._id} u={u} />)
                ) : posts.length === 0 ? (
                    <div className="empty-state"><FileSearch size={36} /><p>No posts found for “{query}”.</p></div>
                ) : posts.map((post) => (
                    <PostCard key={post._id} post={post} onLike={() => {}} />
                ))}
            </section>
        </>
    );
}

export default SearchResults;
