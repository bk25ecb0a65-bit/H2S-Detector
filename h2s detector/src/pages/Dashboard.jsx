import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users,
    ShieldCheck,
    ScanLine,
    UserPlus
} from "lucide-react";
import ExposureChart from "../components/ExposureChart";
import StatCard from "../components/StatCard";
import RecentExposure from "../components/RecentExposure";
import {
    getWorkers,
    getLogs,
    calculateBadgeStats
} from "../data/workers.js";

function Dashboard() {
    const navigate = useNavigate();

    // Live state from data layer
    const [workers, setWorkers] = useState(() => getWorkers());
    const [logs, setLogs] = useState(() => getLogs());

    // Synchronize data on window focus, custom events, or storage updates
    useEffect(() => {
        const refreshData = () => {
            setWorkers(getWorkers());
            setLogs(getLogs());
        };
        window.addEventListener("focus", refreshData);
        window.addEventListener("storage", refreshData);
        window.addEventListener("h2s_workers_updated", refreshData);
        window.addEventListener("h2s_logs_updated", refreshData);

        return () => {
            window.removeEventListener("focus", refreshData);
            window.removeEventListener("storage", refreshData);
            window.removeEventListener("h2s_workers_updated", refreshData);
            window.removeEventListener("h2s_logs_updated", refreshData);
        };
    }, []);

    // Calculated badge & worker metrics
    const stats = useMemo(() => {
        return calculateBadgeStats(workers);
    }, [workers]);

    // Calculate today's scans count from logs
    const todayScansCount = useMemo(() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const count = logs.filter(log => log.timestamp && log.timestamp.startsWith(todayStr)).length;
        return count > 0 ? count : logs.length;
    }, [logs]);

    return (
        <div className="space-y-6">
            {/* Header with Title & Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">
                        H₂S Exposure Dashboard
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        Live workplace dosimeter monitoring and occupational exposure limits.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => navigate("/scan")}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow-md shadow-blue-600/20"
                    >
                        <ScanLine size={16} /> Scan Badge
                    </button>
                    <button
                        onClick={() => navigate("/workers")}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition"
                    >
                        <UserPlus size={16} className="text-sky-400" /> Manage Workers
                    </button>
                </div>
            </div>

            {/* Dynamic KPI Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <StatCard
                    title="Total Workers"
                    value={stats.totalWorkers}
                    description="Registered personnel in registry"
                    icon={<Users className="text-sky-400" size={24} />}
                    onClick={() => navigate("/workers")}
                    badge="Directory"
                />

                <StatCard
                    title="Active Badges"
                    value={stats.activeBadges}
                    description="Assigned dosimeter badges"
                    icon={<ShieldCheck className="text-emerald-400" size={24} />}
                    onClick={() => navigate("/badges")}
                    badge="Circulating"
                />

                <StatCard
                    title="Safe Personnel"
                    value={stats.normalWorkers}
                    description="Cumulative dose < 18 ppm·hr"
                    icon={<ShieldCheck className="text-emerald-400" size={24} />}
                    onClick={() => navigate("/workers")}
                    badge={stats.atRiskWorkers > 0 ? `${stats.atRiskWorkers} At Risk` : "All Safe"}
                />

                <StatCard
                    title="Today's Scans"
                    value={todayScansCount}
                    description="Dosimeter exposure measurements"
                    icon={<ScanLine className="text-indigo-400" size={24} />}
                    onClick={() => navigate("/exposure")}
                    badge="Logged"
                />
            </div>

            {/* Worker Exposure Bar Chart */}
            <div className="mt-6">
                <ExposureChart workers={workers} />
            </div>

            {/* Recent Exposure Measurements Table */}
            <RecentExposure workers={workers} logs={logs} />
        </div>
    );
}

export default Dashboard;
