import CommentItem from "./CommentItem";

function CommentList({ postId, comments, onDeleted, onUpdated }) {
    if (comments.length === 0) {
        return <p className="muted">No comments yet.</p>;
    }

    return (
        <div className="comment-list">
            {comments.map((comment) => (
                <CommentItem
                    key={comment._id}
                    postId={postId}
                    comment={comment}
                    onDeleted={onDeleted}
                    onUpdated={onUpdated}
                />
            ))}
        </div>
    );
}

export default CommentList;
