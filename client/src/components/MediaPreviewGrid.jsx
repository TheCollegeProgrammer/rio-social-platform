import { useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

// 7.4: ordered media preview - drag to reorder with keyboard and
// button alternatives; `images` order is exactly the submit order.
export default function MediaPreviewGrid({ images, onRemove, onMove }) {
    const dragIndex = useRef(null);
    return (
        <div className="preview-grid" role="list" aria-label="Selected images, in order">
            {images.map((im, i) => (
                <div
                    className="preview-cell"
                    key={im.url}
                    role="listitem"
                    draggable
                    tabIndex={0}
                    aria-label={`Image ${i + 1} of ${images.length}. Drag it, use the arrow buttons, or press left and right arrow keys to reorder.`}
                    onDragStart={() => { dragIndex.current = i; }}
                    onDragEnd={() => { dragIndex.current = null; }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (dragIndex.current !== null && dragIndex.current !== i) onMove(dragIndex.current, i);
                        dragIndex.current = null;
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "ArrowLeft") { e.preventDefault(); onMove(i, i - 1); }
                        else if (e.key === "ArrowRight") { e.preventDefault(); onMove(i, i + 1); }
                    }}
                >
                    <img src={im.url} alt={im.file.name || "Selected image"} />
                    <button type="button" className="preview-x" onClick={() => onRemove(i)} aria-label={`Remove ${im.file.name || "image"}`}>
                        <X size={13} />
                    </button>
                    <div className="preview-move">
                        <button type="button" onClick={() => onMove(i, i - 1)} disabled={i === 0} aria-label={`Move image ${i + 1} left`}>
                            <ChevronLeft size={12} />
                        </button>
                        <button type="button" onClick={() => onMove(i, i + 1)} disabled={i === images.length - 1} aria-label={`Move image ${i + 1} right`}>
                            <ChevronRight size={12} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
