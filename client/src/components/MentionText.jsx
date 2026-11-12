import { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Mention.css";

// 6.6: renders @mentions as profile links when the backend resolved them
// to a real account. Unresolved names stay plain text. Rendered as spans
// because post content sits inside an anchor (no nested <a>).
export default function MentionText({ text, mentions = [] }) {
    const navigate = useNavigate();
    const byName = new Map((mentions || []).map((m) => [String(m.username).toLowerCase(), m]));
    const parts = String(text || "").split(/(@\w+)/g);

    return parts.map((part, i) => {
        const match = part.startsWith("@") ? byName.get(part.slice(1).toLowerCase()) : null;
        if (!match) return <Fragment key={i}>{part}</Fragment>;
        const go = (e) => {
            e.stopPropagation();
            navigate(`/users/${match._id}`);
        };
        return (
            <span
                key={i}
                className="mention"
                role="link"
                tabIndex={0}
                onClick={go}
                onKeyDown={(e) => { if (e.key === "Enter") go(e); }}
            >
                {part}
            </span>
        );
    });
}
