import { mediaUrl } from "../services/api";

function AuthorAvatar({ author, size = 42 }) {
    const src = mediaUrl(author?.avatar);
    const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
    if (src) {
        return <div className="small-avatar" style={style}><img src={src} alt="" /></div>;
    }
    return (
        <div className="small-avatar" style={style}>
            {author?.name?.charAt(0).toUpperCase()}
        </div>
    );
}

export { AuthorAvatar };
export default AuthorAvatar;
