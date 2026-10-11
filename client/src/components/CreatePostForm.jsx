import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { createPostWithImage } from "../services/api";
import { useToast } from "../context/useToast.js";

const MAX = 500;

export default function CreatePostForm({ onCreated }) {
    const toast = useToast();
    const fileRef = useRef(null);
    const [content, setContent] = useState("");
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState("");
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);

    const pickImage = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImage(file);
        setPreview(URL.createObjectURL(file));
    };

    const clearImage = () => {
        setImage(null);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim() && !image) return;
        try {
            setPosting(true);
            setError("");
            const post = await createPostWithImage(content.trim() || "(no text)", image);
            onCreated(post);
            setContent("");
            clearImage();
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
            {preview && (
                <div style={{ position: "relative" }}>
                    <img src={preview} alt="" style={{ borderRadius: 12, maxHeight: 260, objectFit: "cover", width: "100%" }} />
                    <button type="button" className="btn btn-ghost btn-sm" style={{ position: "absolute", top: 8, right: 8 }} onClick={clearImage}>
                        <X size={14} /> Remove
                    </button>
                </div>
            )}
            <div className="post-actions">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                        <ImagePlus size={15} /> Photo
                    </button>
                    <span className="char-count">{content.length}/{MAX}</span>
                </div>
                <button type="submit" className="btn btn-sm" disabled={posting || (!content.trim() && !image)}>
                    {posting ? "Posting..." : "Post"}
                </button>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={pickImage} />
        </form>
    );
}
