import { apiRequest } from "./http";

// 6.7: report intake (any user) + moderation queue API (admins).
export const createReport = (targetType, targetId, reason) =>
    apiRequest("/reports", { method: "POST", body: JSON.stringify({ targetType, targetId, reason }) });

export const listReports = (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return apiRequest(`/admin/reports${q ? `?${q}` : ""}`);
};
export const getReport = (id) => apiRequest(`/admin/reports/${id}`);
export const updateReport = (id, data) =>
    apiRequest(`/admin/reports/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const suspendUser = (id, reason) =>
    apiRequest(`/admin/users/${id}/suspend`, { method: "POST", body: JSON.stringify({ reason }) });
export const restoreUser = (id) => apiRequest(`/admin/users/${id}/restore`, { method: "POST" });

// 6.8: appeal intake (affected user) + moderator review.
export const createAppeal = (reportId, reason) =>
    apiRequest("/appeals", { method: "POST", body: JSON.stringify({ reportId, reason }) });
export const getMyAppeals = () => apiRequest("/appeals/mine");
export const listAppeals = (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return apiRequest(`/admin/appeals${q ? `?${q}` : ""}`);
};
export const decideAppeal = (id, data) =>
    apiRequest(`/admin/appeals/${id}`, { method: "PATCH", body: JSON.stringify(data) });
