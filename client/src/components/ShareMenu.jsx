import { useState, useRef, useEffect } from "react";
import { Share2, Link2, MessageCircle, Mail, Check } from "lucide-react";
import { useToast } from "../context/useToast.js";
import "../styles/Share.css";

function ShareMenu({ postId, title }) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const wrapRef = useRef(null);
    const toast = useToast();
    const url = `${window.location.origin}/posts/${postId}`;
    const text = title || "Check out this post";

    useEffect(() => {
        if (!open) return;
        const onClick = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [open]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            toast.error("Could not copy link");
        }
    };

    const nativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: text, url });
                setOpen(false);
            } catch { /* user cancelled */ }
        } else {
            copy();
        }
    };

    return (
        <div className="share-wrap" ref={wrapRef}>
            <button type="button" className="action-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
                <Share2 size={16} />
                Share
            </button>
            {open && (
                <div className="share-menu" role="menu">
                    <button type="button" role="menuitem" onClick={copy}>
                        {copied ? <Check size={14} /> : <Link2 size={14} />}
                        {copied ? "Copied!" : "Copy link"}
                    </button>
                    <button type="button" role="menuitem" onClick={nativeShare}>
                        <Share2 size={14} /> Share...
                    </button>
                    <a role="menuitem" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noreferrer">
                        <MessageCircle size={14} /> WhatsApp
                    </a>
                    <a role="menuitem" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">
                        <span className="x-glyph">𝕏</span> Post on X
                    </a>
                    <a role="menuitem" href={`mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`}>
                        <Mail size={14} /> Email
                    </a>
                </div>
            )}
        </div>
    );
}

export default ShareMenu;
