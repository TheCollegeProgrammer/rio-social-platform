import { apiRequest } from "./http";

// 7.2: draft persistence - owner-private save/list/load/delete/publish.
export const listDrafts = (limit = 50) => apiRequest(`/drafts?limit=${limit}`);

// Retained (already-stored) image paths ride as a JSON field; new picks are
// appended as multipart files, preserving preview order.
export const buildDraftFormData = ({ content, images, visibility, category, keepImages }) => {
    const fd = new FormData();
    fd.append("content", content || "");
    fd.append("visibility", visibility || "public");
    fd.append("category", category || "");
    fd.append("images", JSON.stringify(keepImages));
    images.filter((im) => im.file).forEach((im) => fd.append("image", im.file));
    return fd;
};

export const createDraft = (formData) => apiRequest("/drafts", { method: "POST", body: formData });

export const patchDraftJson = (id, body) =>
    apiRequest(`/drafts/${id}`, { method: "PATCH", body });

export const patchDraftMultipart = (id, formData) =>
    apiRequest(`/drafts/${id}`, { method: "PATCH", body: formData });

export const deleteDraft = (id) => apiRequest(`/drafts/${id}`, { method: "DELETE" });

export const publishDraft = (id, body) =>
    apiRequest(`/drafts/${id}/publish`, { method: "POST", body });
