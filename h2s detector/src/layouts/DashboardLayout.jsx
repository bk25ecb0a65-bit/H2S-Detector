import { Outlet } from "react-router-dom";
import Sidebar from "../components/sidebar.jsx";

function DashboardLayout() {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <Sidebar />

            <main className="ml-64 p-6">
                <Outlet />
            </main>
        </div>
    );
}

export default DashboardLayout;