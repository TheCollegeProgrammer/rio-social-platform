import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { filterImages } from "../lib/fileValidation";
import { usePostUpload } from "../lib/usePostUpload";
import VisibilityToggle from "./VisibilityToggle";
import UploadProgress from "./UploadProgress";
import "../styles/Media.css";

const MAX = 500;
const MAX_IMAGES = 8;

export default function CreatePostForm({ onCreated, category = null }) {
    const fileRef = useRef(null);
    const [content, setContent] = useState("");
    const [images, setImages] = useState([]);
    const [visibility, setVisibility] = useState("public");
    const [dragging, setDragging] = useState(false);

    // 7.1: one validation path shared by the file picker and drag-and-drop.
    const addFiles = (fileList) => {
        const { take, problems } = filterImages(fileList, MAX_IMAGES - images.length, MAX_IMAGES);
        if (take.length) {
            setImages((prev) => [...prev, ...take.map((f) => ({ file: f, url: URL.createObjectURL(f) }))]);
        }
        setError(problems.join(" · "));
    };

    const pickImages = (e) => {
        addFiles(e.target.files);
        e.target.value = "";
    };

    const onDragOver = (e) => {
        e.preventDefault();
        setDragging(true);
    };
    const onDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
    };
    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer?.files);
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

    // 7.6: publish flow owns progress/cancel/retry; resets on success.
    const { posting, progress, failed, error, setError, publish, cancelUpload } =
        usePostUpload({ category, onCreated, onDone: () => { setContent(""); clearImages(); setVisibility("public"); } });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim() && images.length === 0) return;
        await publish(content.trim() || "(no text)", images.map((im) => im.file), visibility);
    };

    return (
        <form
            className={dragging ? "create-post drag-over" : "create-post"}
            onSubmit={handleSubmit}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            aria-busy={posting}
        >
            <textarea
                placeholder="What's on your mind?"
                aria-label="Post caption"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                maxLength={MAX}
            />
            {!content && images.length === 0 && (
                <p className="muted composer-hint">
                    Drag images here or use Photos to attach. Up to 8 images, 5 MB each.
                </p>
            )}
            {error && <p className="error-message">{error}</p>}
            {images.length > 0 && (
                <div className="preview-grid" aria-label="Selected images">
                    {images.map((im, i) => (
                        <div className="preview-cell" key={im.url}>
                            <img src={im.url} alt={im.file.name || "Selected image"} />
                            <button type="button" className="preview-x" onClick={() => removeImage(i)} aria-label={`Remove ${im.file.name || "image"}`}>
                                <X size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <UploadProgress progress={progress} onCancel={cancelUpload} />
            <div className="post-actions">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                        <ImagePlus size={15} /> Photos
                        {images.length > 0 ? ` (${images.length}/${MAX_IMAGES})` : ""}
                    </button>
                    <VisibilityToggle value={visibility} onChange={setVisibility} />
                    {images.length > 0 && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={clearImages}>Clear</button>
                    )}
                    <span className={content.length > MAX - 50 ? "char-count warn" : "char-count"}>{content.length}/{MAX}</span>
                </div>
                <button type="submit" className="btn btn-sm" disabled={posting || (!content.trim() && images.length === 0)}>
                    {posting ? `Uploading ${progress}%` : failed ? "Retry" : "Post"}
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
