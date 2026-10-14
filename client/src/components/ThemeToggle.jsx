import { useState } from "react";
import { Moon, Sun } from "lucide-react";

const currentTheme = () => document.documentElement.getAttribute("data-theme") || "dark";

function ThemeToggle() {
    const [theme, setTheme] = useState(currentTheme);

    const toggle = () => {
        const next = theme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try { localStorage.setItem("rio-theme", next); } catch { /* ignore */ }
        setTheme(next);
    };

    return (
        <button
            className="nav-icon-link theme-toggle"
            onClick={toggle}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            aria-label="Toggle theme"
        >
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
        </button>
    );
}

export default ThemeToggle;
