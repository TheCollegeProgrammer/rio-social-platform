import { mediaUrl } from "../services/api";

function Avatar({ user, size = 44 }) {
    const src = mediaUrl(user?.avatar);
    const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
    if (src) {
        return <img className="msg-avatar" style={style} src={src} alt="" />;
    }
    return (
        <div className="msg-avatar msg-avatar-fallback" style={style}>
            {user?.name?.charAt(0).toUpperCase() || "?"}
        </div>
    );
}

export default Avatar;
