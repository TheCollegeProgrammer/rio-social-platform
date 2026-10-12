const CHANNEL_NAME = "rio-auth";

let channel = null;

const getChannel = () => {
    if (typeof BroadcastChannel === "undefined") return null;
    if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
    return channel;
};

export const notifyAuthChange = (type) => {
    const ch = getChannel();
    if (ch) ch.postMessage({ type, at: Date.now() });
};

export const onAuthChange = (callback) => {
    const ch = getChannel();
    if (!ch) return () => { };
    const handler = (event) => {
        if (event.data?.type === "login" || event.data?.type === "logout") {
            callback(event.data.type);
        }
    };
    ch.addEventListener("message", handler);
    return () => ch.removeEventListener("message", handler);
};
