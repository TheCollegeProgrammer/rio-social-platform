import { useEffect, useRef, useState } from "react";
import { useToast } from "../context/useToast";
import { mediaUrl } from "../services/api";
import {
    buildDraftFormData,
    createDraft,
    patchDraftJson,
    patchDraftMultipart,
    publishDraft
} from "../services/draftApi";

const AUTOSAVE_MS = 1200;

// 7.2/7.3: draft lifecycle for the composer - owner-private save/load,
// explicit publish (never via autosave), version-guarded updates, and
// debounced text autosave for linked drafts.
export function useDrafts({ initialDraft, category, content, setContent, setCategory, setVisibility, setImages, reset, onDraftConsumed, onDraftChanged, onPublished }) {
    const toast = useToast();
    const [draftId, setDraftId] = useState(null);
    const [version, setVersion] = useState(null);
    const [saveStatus, setSaveStatus] = useState(""); // "" | saving | saved | error | conflict
    const saveStatusText = { saving: "Saving…", saved: "Saved", error: "Not saved", conflict: "Changed elsewhere" }[saveStatus] || "";
    // Fields last confirmed by the server - autosave only fires on a delta.
    const lastRef = useRef({ content: "", category: "", visibility: "public" });

    // Hydrate the composer when a saved draft is picked from the list.
    useEffect(() => {
        if (!initialDraft) return;
        setDraftId(initialDraft._id);
        setVersion(initialDraft.version);
        setContent(initialDraft.content || "");
        setCategory?.(initialDraft.category || "");
        setVisibility(initialDraft.visibility || "public");
        setImages((prev) => {
            prev.forEach((im) => { if (im.file) URL.revokeObjectURL(im.url); });
            return (initialDraft.images || []).map((p) => ({ url: mediaUrl(p), file: null, path: p }));
        });
        lastRef.current = {
            content: initialDraft.content || "",
            category: initialDraft.category || "",
            visibility: initialDraft.visibility || "public"
        };
        setSaveStatus("");
        onDraftConsumed?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialDraft]);

    const saveDraft = async ({ content: text, images, visibility }, { silent = false } = {}) => {
        setSaveStatus("saving");
        try {
            const keep = images.filter((im) => !im.file).map((im) => im.path);
            const hasFiles = images.some((im) => im.file);
            let draft;
            if (draftId && hasFiles) {
                const fd = buildDraftFormData({ content: text, images, visibility, category, keepImages: keep });
                draft = (await patchDraftMultipart(draftId, fd)).draft;
            } else if (draftId) {
                const body = { content: text, visibility, version };
                if (category !== undefined && category !== null) body.category = category;
                draft = (await patchDraftJson(draftId, body)).draft;
            } else {
                const fd = buildDraftFormData({ content: text, images, visibility, category, keepImages: keep });
                draft = (await createDraft(fd)).draft;
                setDraftId(draft._id);
            }
            setVersion(draft.version);
            setSaveStatus("saved");
            lastRef.current = { content: text, category: category || "", visibility };
            onDraftChanged?.();
            return draft;
        } catch (err) {
            const conflict = err.message.includes("updated elsewhere");
            setSaveStatus(conflict ? "conflict" : "error");
            if (!silent || conflict) {
                toast.error(conflict ? "Draft changed in another session - reload it" : err.message);
            }
            return null;
        }
    };

    // 7.3: debounced autosave for linked drafts only (never auto-creates,
    // never publishes - PATCH only). One request per typing pause, skipped
    // while a save is in flight, hard-stopped on version conflict; failures
    // surface through the status chip instead of toasting every keystroke.
    useEffect(() => {
        if (!draftId) return;
        if (saveStatus === "saving" || saveStatus === "conflict") return;
        const dirty =
            content !== lastRef.current.content ||
            (category || "") !== lastRef.current.category ||
            visibility !== lastRef.current.visibility;
        if (!dirty) return;
        const t = setTimeout(() => {
            void saveDraft({ content, images, visibility }, { silent: true });
        }, AUTOSAVE_MS);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content, category, visibility, images, draftId, version, saveStatus]);

    // Publish is explicit only: save the latest state first, then move the
    // draft into a Post server-side (files are reused, never re-uploaded).
    const publishFromDraft = async ({ content, images, visibility }) => {
        const draft = await saveDraft({ content, images, visibility });
        if (!draft) return null;
        try {
            const data = await publishDraft(draft._id, { version: draft.version });
            reset();
            setDraftId(null);
            setVersion(null);
            setSaveStatus("");
            onDraftChanged?.();
            onPublished?.(data.post);
            toast.success("Post published");
            return data.post;
        } catch (err) {
            setSaveStatus("error");
            toast.error(err.message);
            return null;
        }
    };

    return {
        draftId,
        saveStatus,
        saveStatusText,
        saveDraft,
        publishFromDraft,
        clearDraft: () => { setDraftId(null); setVersion(null); setSaveStatus(""); }
    };
}
