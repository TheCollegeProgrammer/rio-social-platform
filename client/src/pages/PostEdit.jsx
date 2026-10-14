import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ImagePlus, X } from "lucide-react";
import { useToast } from "../context/useToast.js";
import { getPost, editPost, addPostImages, removePostImage, mediaUrl } from "../services/api";
import "../styles/Home.css";
import "../styles/Media.css";

const MAX = 500;
const MAX_IMAGES = 8;
const listImages = (p) => (p.images?.length ? p.images : p.image ? [p.image] : []);

function PostEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const fileRef = useRef(null);
    const [content, setContent] = useState("");
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        getPost(id)
            .then((data) => {
                if (!cancelled) {
                    setContent(data.post.content);
                    setImages(listImages(data.post));
                }
            })
            .catch((err) => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [id]);

    const trimmed = content.trim();

    const handleAdd = async (files) => {
        try {
            const post = await addPostImages(id, files);
            setImages(listImages(post));
            toast.success(files.length > 1 ? "Images added" : "Image added");
        } catch (err) { toast.error(err.message); }
    };

    const handleFiles = (e) => {
        const picked = Array.from(e.target.files || []);
        e.target.value = "";
        if (picked.length) handleAdd(picked.slice(0, MAX_IMAGES - images.length));
    };

    const handleRemove = async (index) => {
        try {
            const data = await removePostImage(id, index);
            setImages(listImages(data.post));
            toast.success("Image removed");
        } catch (err) { toast.error(err.message); }
    };
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
                <div className="field">
                    <label>Post images <span className="faint">({images.length}/{MAX_IMAGES})</span></label>
                    <div className="edit-images">
                        {images.map((img, i) => (
                            <div className="edit-image" key={img}>
                                <img src={mediaUrl(img)} alt="" />
                                <button
                                    type="button"
                                    className="edit-image-x"
                                    onClick={() => handleRemove(i)}
                                    aria-label="Remove image"
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        ))}
                        {images.length < MAX_IMAGES && (
                            <button
                                type="button"
                                className="edit-image edit-image-add"
                                onClick={() => fileRef.current?.click()}
                            >
                                <ImagePlus size={18} /> Add
                            </button>
                        )}
                    </div>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        multiple
                        hidden
                        onChange={handleFiles}
                    />
                </div>
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
