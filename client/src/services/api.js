import { apiRequest, uploadRequest } from "./http";

export const registerUser = (userData) =>
    apiRequest("/auth/register", { method: "POST", body: JSON.stringify(userData) });
export const loginUser = (credentials) =>
    apiRequest("/auth/login", { method: "POST", body: JSON.stringify(credentials) });
export const logoutUser = () => apiRequest("/auth/logout", { method: "POST" });
export const getCurrentUser = () => apiRequest("/auth/me");
export const forgotPassword = (email) =>
    apiRequest("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
export const resetPassword = (token, newPassword) =>
    apiRequest("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword }) });
export const changePassword = (currentPassword, newPassword) =>
    apiRequest("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });

export const getPosts = (page = 1) => apiRequest(`/posts?page=${page}`);
export const getPost = (id) => apiRequest(`/posts/${id}`);
export const createPost = (content) =>
    apiRequest("/posts", { method: "POST", body: JSON.stringify({ content }) }).then((d) => d.post);
export const editPost = (id, content) =>
    apiRequest(`/posts/${id}`, { method: "PUT", body: JSON.stringify({ content }) });
export const deletePost = (id) => apiRequest(`/posts/${id}`, { method: "DELETE" });
export const toggleLike = (id) => apiRequest(`/posts/${id}/like`, { method: "POST" });
export const toggleBookmark = (id) => apiRequest(`/posts/${id}/bookmark`, { method: "POST" });
export const getBookmarks = () => apiRequest("/posts/bookmarks");
export const searchPosts = (q) => apiRequest(`/posts/search?q=${encodeURIComponent(q)}`);
export const searchHashtag = (hashtag) => apiRequest(`/posts/search?hashtag=${encodeURIComponent(hashtag)}`);
export const getTrendingHashtags = () => apiRequest("/posts/trending");

export const getProfile = (id) => apiRequest(`/profile/${id}`);
export const updateProfile = (data) =>
    apiRequest("/profile", { method: "PUT", body: JSON.stringify(data) });
export const deleteAccount = (password) =>
    apiRequest(`/profile?password=${encodeURIComponent(password)}`, { method: "DELETE" });
export const searchUsers = (q) => apiRequest(`/profile/search?q=${encodeURIComponent(q)}`);

export const toggleFollow = (id) => apiRequest(`/users/${id}/follow`, { method: "POST" });
export const getFollowers = (id) => apiRequest(`/users/${id}/followers`);
export const getFollowing = (id) => apiRequest(`/users/${id}/following`);

export const getComments = (postId, page = 1) =>
    apiRequest(`/posts/${postId}/comments?page=${page}`);
export const createComment = (postId, content, parentComment) =>
    apiRequest(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, parentComment })
    });
export const editComment = (postId, id, content) =>
    apiRequest(`/posts/${postId}/comments/${id}`, {
        method: "PUT",
        body: JSON.stringify({ content })
    });
export const deleteComment = (postId, id) =>
    apiRequest(`/posts/${postId}/comments/${id}`, { method: "DELETE" });
export const toggleCommentLike = (postId, id) =>
    apiRequest(`/posts/${postId}/comments/${id}/like`, { method: "POST" });

export const createPostWithImage = (content, file) => {
    const fd = new FormData();
    fd.append("content", content);
    if (file) fd.append("image", file);
    return uploadRequest("/posts/image", fd).then((d) => d.post);
};
export const removePostImage = (id) =>
    apiRequest(`/posts/${id}/image`, { method: "DELETE" });

export const replacePostImage = (id, file) => {
    const fd = new FormData();
    fd.append("image", file);
    return uploadRequest(`/posts/${id}/image`, fd).then((d) => d.post);
};

export const getNotifications = (page = 1) =>
    apiRequest(`/notifications?page=${page}`);
export const markNotificationRead = (id) =>
    apiRequest(`/notifications/${id}/read`, { method: "PATCH" });
export const markAllNotificationsRead = () =>
    apiRequest("/notifications/read-all", { method: "PATCH" });
export const deleteNotification = (id) =>
    apiRequest(`/notifications/${id}`, { method: "DELETE" });

export const getConversations = () => apiRequest("/messages");
export const getUnreadMessageCount = () => apiRequest("/messages/unread-count");
export const markConversationRead = (convoId) =>
    apiRequest(`/messages/${convoId}/read`, { method: "PATCH" });
export const getOrCreateConversation = (userId) =>
    apiRequest(`/messages/user/${userId}`);
export const getMessages = (convoId, page = 1) =>
    apiRequest(`/messages/${convoId}/messages?page=${page}`);
export const sendMessage = (convoId, content) =>
    apiRequest(`/messages/${convoId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content })
    }).then((d) => d.data);

export const uploadAvatar = (file) => {
    const fd = new FormData();
    fd.append("image", file);
    return uploadRequest("/upload/avatar", fd);
};
export const uploadCover = (file) => {
    const fd = new FormData();
    fd.append("image", file);
    return uploadRequest("/upload/cover", fd);
};
export const deleteUploadedImage = (field) =>
    apiRequest(`/upload/${field}`, { method: "DELETE" });

export const MEDIA_URL = "http://localhost:3000";
export const mediaUrl = (path) =>
    !path ? null : path.startsWith("http") ? path : `${MEDIA_URL}${path}`;
