import { apiRequest } from "./http";

// 7.8: ephemeral stories - the server owns expiry (SERVER clock), privacy
// and view tracking; these calls never decide visibility client-side.
export const listStories = () => apiRequest("/stories");

export const getUserStories = (userId) => apiRequest(`/stories/user/${userId}`);

export const getStory = (id) => apiRequest(`/stories/${id}`);

export const createStory = (file, visibility = "public") => {
    const fd = new FormData();
    fd.append("image", file);
    fd.append("visibility", visibility);
    return apiRequest("/stories", { method: "POST", body: fd });
};

export const viewStory = (id) =>
    apiRequest(`/stories/${id}/view`, { method: "POST", body: {} });

export const deleteStory = (id) =>
    apiRequest(`/stories/${id}`, { method: "DELETE" });
