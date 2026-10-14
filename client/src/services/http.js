const API_URL = "http://localhost:3000/api";

const handleError = (data) => {
    if (data.errors && Array.isArray(data.errors)) {
        throw new Error(data.errors.join(", "));
    }
    throw new Error(data.message || "Something went wrong");
};

export const apiRequest = async (path, options = {}) => {
    try {
        const response = await fetch(`${API_URL}${path}`, {
            credentials: "include",
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers
            }
        });
        const data = await response.json();
        if (!response.ok) handleError(data);
        return data;
    } catch (error) {
        if (error.message === "Failed to fetch") {
            throw new Error("Cannot connect to server");
        }
        throw error;
    }
};

export const uploadRequest = async (path, formData) => {
    try {
        const response = await fetch(`${API_URL}${path}`, {
            method: "POST",
            credentials: "include",
            body: formData
        });
        const data = await response.json();
        if (!response.ok) handleError(data);
        return data;
    } catch (error) {
        if (error.message === "Failed to fetch") {
            throw new Error("Cannot connect to server");
        }
        throw error;
    }
};