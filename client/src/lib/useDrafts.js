import { useEffect, useState } from "react";
import { useToast } from "../context/useToast";
import { mediaUrl } from "../services/api";
import {
    buildDraftFormData,
    createDraft,
    patchDraftJson,
    patchDraftMultipart,
    publishDraft
} from "../services/draftApi";

// 7.2/7.3: draft lifecycle for the composer - owner-private save/load,
// explicit publish (never via autosave), version-guarded updates.
export function useDrafts({ initialDraft, category, setContent, setVisibility, setImages, reset, onDraftConsumed, onDraftChanged, onPublished }) {
    const toast = useToast();
    const [draftId, setDraftId] = useState(null);
    const [version, setVersion] = useState(null);
    const [saveStatus, setSaveStatus] = useState(""); // "" | saving | saved | error | conflict
    const saveStatusText = { saving: "Saving…", saved: "Saved", error: "Not saved", conflict: "Changed elsewhere" }[saveStatus] || "";

    // Hydrate the composer when a saved draft is picked from the list.
    useEffect(() => {
        if (!initialDraft) return;
        setDraftId(initialDraft._id);
        setVersion(initialDraft.version);
        setContent(initialDraft.content || "");
        setVisibility(initialDraft.visibility || "public");
        setImages((prev) => {
            prev.forEach((im) => { if (im.file) URL.revokeObjectURL(im.url); });
            return (initialDraft.images || []).map((p) => ({ url: mediaUrl(p), file: null, path: p }));
        });
        setSaveStatus("");
        onDraftConsumed?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialDraft]);

    const saveDraft = async ({ content, images, visibility }) => {
        setSaveStatus("saving");
        try {
            const keep = images.filter((im) => !im.file).map((im) => im.path);
            const hasFiles = images.some((im) => im.file);
            let draft;
            if (draftId && hasFiles) {
                const fd = buildDraftFormData({ content, images, visibility, category, keepImages: keep });
                draft = (await patchDraftMultipart(draftId, fd)).draft;
            } else if (draftId) {
                const body = { content, visibility, version };
                if (category !== undefined && category !== null) body.category = category;
                draft = (await patchDraftJson(draftId, body)).draft;
            } else {
                const fd = buildDraftFormData({ content, images, visibility, category, keepImages: keep });
                draft = (await createDraft(fd)).draft;
                setDraftId(draft._id);
            }
            setVersion(draft.version);
            setSaveStatus("saved");
            onDraftChanged?.();
            return draft;
        } catch (err) {
            const conflict = err.message.includes("updated elsewhere");
            setSaveStatus(conflict ? "conflict" : "error");
            toast.error(conflict ? "Draft changed in another session - reload it" : err.message);
            return null;
        }
    };

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
