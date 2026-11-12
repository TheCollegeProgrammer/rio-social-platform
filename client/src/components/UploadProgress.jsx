// 7.6: truthful upload progress bar with a cancel control (composer embed).
export default function UploadProgress({ progress, onCancel }) {
    if (progress === null) return null;
    return (
        <div className="upload-progress-row">
            <div
                className="upload-progress"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Upload progress"
            >
                <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <span className="char-count">{progress}%</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
                Cancel
            </button>
        </div>
    );
}
