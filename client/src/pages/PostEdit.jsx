import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useToast } from "../context/useToast.js";
import { getPost, editPost } from "../services/api";
import "../styles/Home.css";

const MAX = 500;

function PostEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        getPost(id)
            .then((data) => { if (!cancelled) setContent(data.post.content); })
            .catch((err) => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [id]);

    const trimmed = content.trim();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!trimmed || trimmed.length > MAX) return;
        try {
            setSaving(true);
            await editPost(id, trimmed);
            toast.success("Post updated");
            navigate(`/posts/${id}`);
        } catch (err) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="page"><p className="muted">Loading post...</p></div>;
    if (error && !content) return <div className="page"><p className="error-message">{error}</p></div>;

    return (
        <main className="home">
            <div className="home-header"><h1>Edit post</h1></div>

            <form className="create-post" onSubmit={handleSubmit}>
                <textarea
                    placeholder="What's on your mind?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    maxLength={MAX}
                    autoFocus
                />
                <div className="post-actions">
                    <span className={content.length > MAX ? "error-message" : "char-count"}>
                        {content.length}/{MAX}
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(`/posts/${id}`)}>
                            <X size={14} /> Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-sm"
                            disabled={saving || !trimmed || trimmed.length > MAX}
                        >{saving ? "Saving..." : "Save changes"}</button>
                    </div>
                </div>
            </form>
        </main>
    );
}

export default PostEdit;
