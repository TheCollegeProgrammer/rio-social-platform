import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import "../styles/Lightbox.css";

function MediaLightbox({ open, images, index, onClose, onIndex }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowRight" && index < images.length - 1) onIndex(index + 1);
            else if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
        };
        window.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open, index, images.length, onClose, onIndex]);

    return (
        <AnimatePresence>
            {open && images?.length > 0 && (
                <motion.div
                    className="lightbox"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                >
                    <button className="lightbox-btn lightbox-close" onClick={onClose} aria-label="Close image viewer">
                        <X size={20} />
                    </button>

                    {images.length > 1 && index > 0 && (
                        <button
                            className="lightbox-btn lightbox-prev"
                            aria-label="Previous image"
                            onClick={(e) => { e.stopPropagation(); onIndex(index - 1); }}
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}

                    <AnimatePresence mode="wait" initial={false}>
                        <motion.img
                            key={images[index]}
                            src={images[index]}
                            alt=""
                            className="lightbox-img"
                            initial={{ scale: 0.55, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.55, opacity: 0 }}
                            transition={{ type: "spring", damping: 26, stiffness: 320, mass: 0.7 }}
                            onClick={onClose}
                        />
                    </AnimatePresence>

                    {images.length > 1 && index < images.length - 1 && (
                        <button
                            className="lightbox-btn lightbox-next"
                            aria-label="Next image"
                            onClick={(e) => { e.stopPropagation(); onIndex(index + 1); }}
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}

                    {images.length > 1 && (
                        <span className="lightbox-count">{index + 1} / {images.length}</span>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default MediaLightbox;
