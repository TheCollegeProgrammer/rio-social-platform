import { useState, useRef, useEffect } from "react";

// 7.5: pre-publish crop/position editor. The canvas output IS the uploaded
// bytes, so the preview the user confirms is byte-identical to what gets
// published on every backend (local disk or CDN - no server transform
// pipeline needed). Originals stay untouched until Apply; animated GIFs
// never open this editor (their preview cell hides the button), so
// animation is preserved by never rasterizing it. Output is capped at
// MAX_OUT pixels per side to bound canvas memory.

const RATIOS = [
    { label: "Original", value: null },
    { label: "1:1", value: 1 },
    { label: "4:5", value: 0.8 },
    { label: "16:9", value: 16 / 9 }
];
const MAX_OUT = 2048;
const OUT_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ImageCropper({ file, onApply, onClose }) {
    const [src, setSrc] = useState("");
    const [ratio, setRatio] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [frame, setFrame] = useState({ w: 320, h: 320 });
    const imgRef = useRef(null);
    const dragRef = useRef(null);

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setSrc(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const nat = imgRef.current && imgRef.current.naturalWidth
        ? { w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight }
        : null;
    const base = nat ? Math.max(frame.w / nat.w, frame.h / nat.h) : 1;
    const scale = base * zoom;
    const dispW = nat ? nat.w * scale : 0;
    const dispH = nat ? nat.h * scale : 0;
    const clampX = (x) => Math.min(0, Math.max(frame.w - dispW, x));
    const clampY = (y) => Math.min(0, Math.max(frame.h - dispH, y));
    const left = clampX(pos.x);
    const top = clampY(pos.y);

    const fitFrame = () => {
        const img = imgRef.current;
        if (!img || !img.naturalWidth) return;
        const max = Math.min(420, (window.innerWidth || 800) - 48);
        let fw = max, fh = max;
        if (ratio) {
            fh = max;
            fw = max * ratio;
            if (fw > max) { fw = max; fh = max / ratio; }
        } else {
            const k = Math.min(max / img.naturalWidth, max / img.naturalHeight, 1);
            fw = img.naturalWidth * k;
            fh = img.naturalHeight * k;
        }
        setFrame({ w: Math.round(fw), h: Math.round(fh) });
        setPos({ x: 0, y: 0 });
        setZoom(1);
    };

    useEffect(() => { fitFrame(); }, [ratio, src]);

    const onPointerDown = (e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { x: e.clientX, y: e.clientY, lx: left, ly: top };
    };
    const onPointerMove = (e) => {
        const d = dragRef.current;
        if (!d) return;
        setPos({ x: clampX(d.lx + e.clientX - d.x), y: clampY(d.ly + e.clientY - d.y) });
    };

    const apply = () => {
        const img = imgRef.current;
        if (!img || !nat) return;
        const sx = -left / scale;
        const sy = -top / scale;
        const sw = frame.w / scale;
        const sh = frame.h / scale;
        const k = Math.min(1, MAX_OUT / Math.max(sw, sh));
        const outW = Math.max(1, Math.round(sw * k));
        const outH = Math.max(1, Math.round(sh * k));
        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
        const outType = OUT_TYPES.includes(file.type) ? file.type : "image/jpeg";
        canvas.toBlob((blob) => {
            if (!blob) return;
            const ext = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png";
            const baseName = (file.name || "image").replace(/\.[^.]+$/, "");
            onApply(new File([blob], `${baseName}-crop.${ext}`, { type: blob.type }));
        }, outType, 0.92);
    };

    return (
        <div className="crop-overlay" role="dialog" aria-modal="true" aria-label="Crop image" onClick={onClose}>
            <div className="crop-box" onClick={(e) => e.stopPropagation()}>
                <div
                    className="crop-stage"
                    style={{ width: frame.w, height: frame.h }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={() => { dragRef.current = null; }}
                    onPointerCancel={() => { dragRef.current = null; }}
                >
                    {src && (
                        <img
                            ref={imgRef}
                            src={src}
                            alt=""
                            draggable={false}
                            onLoad={fitFrame}
                            style={{ left, top, width: dispW, height: dispH }}
                        />
                    )}
                </div>
                <div className="crop-controls">
                    <div className="crop-ratios" role="group" aria-label="Aspect ratio">
                        {RATIOS.map((r) => (
                            <button
                                key={r.label}
                                type="button"
                                className={ratio === r.value ? "crop-ratio active" : "crop-ratio"}
                                onClick={() => setRatio(r.value)}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <label className="crop-zoom">
                        Zoom
                        <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
                    </label>
                </div>
                <div className="crop-actions">
                    <button type="button" className="btn btn-sm" onClick={onClose}>Cancel</button>
                    <button type="button" className="btn btn-sm btn-primary" onClick={apply} autoFocus>Apply</button>
                </div>
            </div>
        </div>
    );
}
