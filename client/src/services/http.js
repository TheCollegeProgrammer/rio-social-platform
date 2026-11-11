const base = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/+$/, "");
const API_URL = base.endsWith("/api") ? base : `${base}/api`;
export const API_ORIGIN = API_URL.replace(/\/api$/, "");
export const MEDIA_URL = API_ORIGIN;

// Refresh/login endpoints themselves must not trigger a refresh loop.
const NO_REFRESH = [
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/auth/logout",
    "/auth/forgot-password",
    "/auth/reset-password"
];
const needsRefresh = (path) => !NO_REFRESH.some((p) => path.startsWith(p));

const readCsrf = () => {
    const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
};

const handleError = (data) => {
    if (data.errors && Array.isArray(data.errors)) {
        throw new Error(data.errors.join(", "));
    }
    throw new Error(data.message || "Something went wrong");
};

// Single-flight: concurrent 401s share one refresh request (the server also
// accepts a short rotation grace window for multi-tab races).
let refreshing = null;
const refreshSession = () => {
    if (!refreshing) {
        refreshing = fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
            headers: { "X-CSRF-Token": readCsrf() }
        })
            .then((r) => {
                if (!r.ok) throw new Error("Session refresh failed");
                return r.json();
            })
            .finally(() => {
                refreshing = null;
            });
    }
    return refreshing;
};

const buildHeaders = (options) => {
    const headers = { ...options.headers };
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }
    const method = (options.method || "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
        const csrf = readCsrf();
        if (csrf) headers["X-CSRF-Token"] = csrf;
    }
    return headers;
};

const request = async (path, options, isRetry) => {
    const response = await fetch(`${API_URL}${path}`, {
        credentials: "include",
        ...options,
        headers: buildHeaders(options)
    });
    const data = await response.json();
    if (!response.ok) {
        if (response.status === 401 && !isRetry && needsRefresh(path)) {
            try {
                await refreshSession();
                return await request(path, options, true);
            } catch {
                // fall through to the original 401
            }
        }
        handleError(data);
    }
    return data;
};

const withNetworkFallback = async (fn) => {
    try {
        return await fn();
    } catch (error) {
        if (error.message === "Failed to fetch") {
            throw new Error("Cannot connect to server");
        }
        throw error;
    }
};

export const apiRequest = (path, options = {}) =>
    withNetworkFallback(() => request(path, options, false));

export const uploadRequest = (path, formData) =>
    withNetworkFallback(() =>
        request(path, { method: "POST", body: formData }, false)
    );
