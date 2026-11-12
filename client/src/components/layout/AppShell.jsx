import { Outlet } from "react-router-dom";
import LeftNav from "./LeftNav";
import BottomNav from "./BottomNav";
import "./Shell.css";

function AppShell() {
    return (
        <div className="shell">
            <LeftNav />
            <main className="shell-main" id="main-content">
                <Outlet />
            </main>
            <BottomNav />
        </div>
    );
}

export default AppShell;
