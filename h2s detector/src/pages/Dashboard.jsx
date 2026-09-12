import React, { useState, useEffect } from "react";
import {
    Users,
    ShieldCheck,
    AlertTriangle,
    ScanLine
} from "lucide-react";
import ExposureChart from "../components/ExposureChart";
import StatCard from "../components/StatCard";
import RecentExposure from "../components/RecentExposure";
import { getWorkers, getLogs } from "../data/workers";

function Dashboard() {
    const [workers, setWorkers] = useState([]);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        setWorkers(getWorkers());
        setLogs(getLogs());
    }, []);

    const today = new Date().toISOString().split("T")[0];

    // 1. Total registered workers
    const totalWorkers = workers.length;

    // 2. Expired badges count (badgeExpiry date is in the past)
    const expiredBadges = workers.filter((worker) => {
        if (!worker.badgeExpiry) return false;
        return worker.badgeExpiry < today;
    }).length;

    // 3. Active badges (currently valid / not expired)
    const activeBadges = Math.max(0, totalWorkers - expiredBadges);

    // 4. Scans count (today's scans or total fallback)
    const todayScans = logs.filter((log) => {
        return log.timestamp && log.timestamp.startsWith(today);
    }).length;
    const totalScansCount = logs.length;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">
                    H₂S Exposure Dashboard
                </h1>
                <p className="text-slate-400 mt-2">
                    Monitor cumulative exposure, badge validity, and real-time personnel safety.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <StatCard
                    title="Total Workers"
                    value={totalWorkers}
                    description="Registered personnel"
                    icon={<Users size={22} className="text-sky-400" />}
                />

                <StatCard
                    title="Active Badges"
                    value={activeBadges}
                    description="Currently valid & monitored"
                    icon={<ShieldCheck size={22} className="text-emerald-400" />}
                />

                <StatCard
                    title="Expired Badges"
                    value={expiredBadges}
                    description="Require immediate replacement"
                    icon={<AlertTriangle size={22} className="text-amber-400" />}
                />

                <StatCard
                    title="Today's Scans"
                    value={todayScans || totalScansCount}
                    description={`${totalScansCount} total measurements`}
                    icon={<ScanLine size={22} className="text-blue-400" />}
                />
            </div>

            <div className="mt-6">
                <ExposureChart />
            </div>

            <RecentExposure />
        </div>
    );
}

export default Dashboard;