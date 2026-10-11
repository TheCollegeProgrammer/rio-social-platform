import { useCallback, useState } from "react";
import { ToastContext } from "./toast-context.js";

let nextId = 1;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const push = useCallback((type, message) => {
        const id = nextId++;
        setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
        setTimeout(() => dismiss(id), 3500);
    }, [dismiss]);

    const api = {
        success: (m) => push("success", m),
        error: (m) => push("error", m),
        info: (m) => push("info", m)
    };

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="toast-stack" role="status" aria-live="polite">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismiss(t.id)}>
                        <span className="toast-dot" />
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
