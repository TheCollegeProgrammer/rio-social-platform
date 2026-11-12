import { Globe, Lock } from "lucide-react";

export default function VisibilityToggle({ value, onChange }) {
    const isPublic = value !== "followers";
    return (
        <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onChange(isPublic ? "followers" : "public")}
            title={isPublic ? "Everyone can see this post" : "Only your followers can see this post"}
            aria-label={`Post visibility: ${value}`}
        >
            {isPublic ? <Globe size={15} /> : <Lock size={15} />}
            {isPublic ? "Public" : "Followers"}
        </button>
    );
}
