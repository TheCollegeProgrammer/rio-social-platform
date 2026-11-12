import { useRef, useState } from "react";
import { createPostWithImages } from "../services/api";
import { useToast } from "../context/useToast";

// 7.6: composer publish flow with truthful progress, cancellation and
// retry-safe failure state. Retry only runs after a failed attempt, so a
// publish can never double-fire (server creates the post on completion only).
export function usePostUpload({ category, onCreated, onDone }) {
    const toast = useToast();
    const abortRef = useRef(null);
    const [posting, setPosting] = useState(false);
    const [progress, setProgress] = useState(null);
    const [failed, setFailed] = useState(false);
    const [error, setError] = useState("");

    const publish = async (text, files, visibility) => {
        const ctl = new AbortController();
        abortRef.current = ctl;
        try {
            setPosting(true);
            setFailed(false);
            setError("");
            setProgress(0);
            const post = await createPostWithImages(text, files, category, visibility, {
                signal: ctl.signal,
                onProgress: setProgress
            });
            onCreated(post);
            onDone();
            toast.success("Post published");
            return true;
        } catch (err) {
            if (err.name === "AbortError") {
                toast.info("Upload cancelled");
            } else {
                setFailed(true);
                setError(err.message);
                toast.error(err.message);
            }
            return false;
        } finally {
            setPosting(false);
            setProgress(null);
            abortRef.current = null;
        }
    };

    const cancelUpload = () => abortRef.current?.abort();

    return { posting, progress, failed, error, setError, publish, cancelUpload };
}
