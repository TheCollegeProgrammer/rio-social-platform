import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { createPostWithImages } from "../services/api";
import { useToast } from "../context/useToast.js";
import "../styles/Media.css";

const MAX = 500;
const MAX_IMAGES = 8;

export default function CreatePostForm({ onCreated, category = null }) {
    const toast = useToast();
    const fileRef = useRef(null);
    const [content, setContent] = useState("");
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState("");
    const [images, setImages] = useState([]);

    const pickImages = (e) => {
        const picked = Array.from(e.target.files || []);
        if (!picked.length) return;
        const added = picked.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
        setImages((prev) => [...prev, ...added].slice(0, MAX_IMAGES));
        e.target.value = "";
    };

    const removeImage = (i) => {
        setImages((prev) => {
            URL.revokeObjectURL(prev[i].url);
            return prev.filter((_, idx) => idx !== i);
        });
    };

    const clearImages = () => {
        images.forEach((im) => URL.revokeObjectURL(im.url));
        setImages([]);
        if (fileRef.current) fileRef.current.value = "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim() && images.length === 0) return;
        try {
            setPosting(true);
            setError("");
            const post = await createPostWithImages(
                content.trim() || "(no text)",
                images.map((im) => im.file),
                category
            );
            onCreated(post);
            setContent("");
            clearImages();
            toast.success("Post published");
        } catch (err) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setPosting(false);
        }
    };

    return (
        <form className="create-post" onSubmit={handleSubmit}>
            <textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                maxLength={MAX}
            />
            {error && <p className="error-message">{error}</p>}
            {images.length > 0 && (
                <div className="preview-grid">
                    {images.map((im, i) => (
                        <div className="preview-cell" key={im.url}>
                            <img src={im.url} alt="" />
                            <button type="button" className="preview-x" onClick={() => removeImage(i)} aria-label="Remove image">
                                <X size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <div className="post-actions">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                        <ImagePlus size={15} /> Photos
                        {images.length > 0 ? ` (${images.length})` : ""}
                    </button>
                    <span className="char-count">{content.length}/{MAX}</span>
                </div>
                <button type="submit" className="btn btn-sm" disabled={posting || (!content.trim() && images.length === 0)}>
                    {posting ? "Posting..." : "Post"}
                </button>
            </div>
            <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                hidden
                onChange={pickImages}
            />
        </form>
    );
}
