import { useRef, useState } from "react";
import { mediaUrl } from "../services/api";

function ImageUpload({ label, current, onUpload, onDelete, round }) {
    const inputRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const src = mediaUrl(current);

    const pick = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setBusy(true);
            setError("");
            await onUpload(file);
        } catch (err) { setError(err.message); }
        finally { setBusy(false); e.target.value = ""; }
    };

    const remove = async () => {
        try {
            setBusy(true);
            setError("");
            await onDelete();
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    };

    return (
        <div className="field">
            <label>{label}</label>
            <div className="upload-row">
                <div className={`upload-preview ${round ? "" : "cover"}`}>
                    {src ? <img src={src} alt="" /> : label.charAt(0)}
                </div>
                <div className="upload-actions">
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => inputRef.current?.click()}
                    >
                        {busy ? "Uploading..." : src ? "Change" : "Upload"}
                    </button>
                    {src && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={remove} disabled={busy}>
                            Remove
                        </button>
                    )}
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden-input"
                        onChange={pick}
                    />
                </div>
            </div>
            {error && <p className="error-message" style={{ marginTop: 10 }}>{error}</p>}
        </div>
    );
}

export default ImageUpload;
