import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
    ShieldCheck,
    Search,
    RefreshCw,
    X,
    CheckCircle2,
    Users,
    Layers,
    Activity
} from "lucide-react";
import StatCard from "../components/StatCard";
import {
    getWorkers,
    calculateBadgeStats,
    renewWorkerBadge
} from "../data/workers.js";

function generateReplacementBadgeId(workerId, count) {
    const num = ((parseInt(String(workerId).replace(/\D/g, ""), 10) || 1) * 17 + count) % 900 + 100;
    return `H2S-00${num}`;
}

function Badges() {
    const [workers, setWorkers] = useState(() => getWorkers());
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    // Modal for Reassigning/Replacing Badge
    const [renewingWorker, setRenewingWorker] = useState(null);
    const [newBadgeId, setNewBadgeId] = useState("");
    const [successMessage, setSuccessMessage] = useState(null);

    // Sync on focus or update
    useEffect(() => {
        const handleSync = () => setWorkers(getWorkers());
        window.addEventListener("focus", handleSync);
        window.addEventListener("storage", handleSync);
        window.addEventListener("h2s_workers_updated", handleSync);
        return () => {
            window.removeEventListener("focus", handleSync);
            window.removeEventListener("storage", handleSync);
            window.removeEventListener("h2s_workers_updated", handleSync);
        };
    }, []);

    const stats = useMemo(() => {
        return calculateBadgeStats(workers);
    }, [workers]);

    // Build badge items list
    const badgeItems = useMemo(() => {
        return workers.map(worker => ({
            id: worker.id,
            badge: worker.badge,
            workerName: worker.name,
            department: worker.department,
            shift: worker.shift,
            dose: worker.dose,
            status: worker.status || "Normal"
        }));
    }, [workers]);

    const filteredBadges = useMemo(() => {
        return badgeItems.filter(item => {
            const matchesSearch =
                item.badge.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.department.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === "All" || item.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [badgeItems, searchQuery, statusFilter]);

    const openRenewModal = (item) => {
        setRenewingWorker(item);
        setNewBadgeId(generateReplacementBadgeId(item.id, workers.length));
    };

    const confirmRenewal = (e) => {
        e.preventDefault();
        if (!renewingWorker) return;

        const updated = renewWorkerBadge(renewingWorker.id, newBadgeId);
        setWorkers(updated);
        setSuccessMessage(`✓ Badge for ${renewingWorker.workerName} successfully updated to ${newBadgeId}.`);
        setRenewingWorker(null);

        setTimeout(() => setSuccessMessage(null), 4000);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Badge Inventory & Assignments</h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        Track dosimeter badge assignments across personnel, active departments, and cumulative H₂S exposure.
                    </p>
                </div>
                <Link
                    to="/workers"
                    className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-lg text-xs font-semibold transition shrink-0"
                >
                    <Users size={16} className="text-sky-400" /> Go to Workers Dashboard
                </Link>
            </div>

            {/* Notification */}
            {successMessage && (
                <div className="flex items-center gap-3 p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl text-emerald-300 text-sm">
                    <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <StatCard
                    title="Total Assigned Badges"
                    value={stats.totalWorkers}
                    description="Dosimeters in active circulation"
                    icon={<Layers size={24} className="text-sky-400" />}
                    badge="Inventory"
                />

                <StatCard
                    title="Active Dosimeters"
                    value={stats.activeBadges}
                    description="Assigned dosimeter strips"
                    icon={<ShieldCheck size={24} className="text-emerald-400" />}
                    badge="Active"
                />

                <StatCard
                    title="Safe Exposure"
                    value={stats.normalWorkers}
                    description="Dose within normal limits (<18 ppm·hr)"
                    icon={<ShieldCheck size={24} className="text-emerald-400" />}
                    onClick={() => setStatusFilter("Normal")}
                    badge={stats.atRiskWorkers > 0 ? `${stats.atRiskWorkers} At Risk` : "All Safe"}
                />

                <StatCard
                    title="At-Risk Personnel"
                    value={stats.atRiskWorkers}
                    description="Approaching safety limit (>=18 ppm·hr)"
                    icon={<Activity size={24} className="text-amber-400" />}
                    onClick={() => setStatusFilter("Review")}
                    badge={stats.atRiskWorkers > 0 ? "Monitor" : "Safe"}
                />
            </div>

            {/* Search and Filters */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search badges by ID, assigned worker, or department..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setStatusFilter("All")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            statusFilter === "All" ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                    >
                        All ({badgeItems.length})
                    </button>
                    <button
                        onClick={() => setStatusFilter("Normal")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            statusFilter === "Normal" ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-emerald-400 hover:bg-slate-700"
                        }`}
                    >
                        Normal ({stats.normalWorkers})
                    </button>
                    <button
                        onClick={() => setStatusFilter("Review")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            statusFilter === "Review" ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-amber-300 hover:bg-slate-700"
                        }`}
                    >
                        Review ({stats.reviewWorkers})
                    </button>
                    <button
                        onClick={() => setStatusFilter("Warning")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            statusFilter === "Warning" ? "bg-red-500 text-white" : "bg-slate-800 text-red-400 hover:bg-slate-700"
                        }`}
                    >
                        Warning ({stats.warningWorkers})
                    </button>
                </div>
            </div>

            {/* Badges Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="py-3.5 px-5">Badge ID</th>
                                <th className="py-3.5 px-5">Assigned Worker</th>
                                <th className="py-3.5 px-5">Department & Shift</th>
                                <th className="py-3.5 px-5">Cumulative Dose</th>
                                <th className="py-3.5 px-5">Exposure Status</th>
                                <th className="py-3.5 px-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                            {filteredBadges.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-slate-500">
                                        No badges match the selected filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredBadges.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                                        {/* Badge ID */}
                                        <td className="py-4 px-5">
                                            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-sky-300">
                                                {item.badge}
                                            </span>
                                        </td>

                                        {/* Worker */}
                                        <td className="py-4 px-5">
                                            <div className="font-semibold text-white">{item.workerName}</div>
                                            <div className="text-xs text-slate-500">{item.id}</div>
                                        </td>

                                        {/* Department & Shift */}
                                        <td className="py-4 px-5">
                                            <div className="text-slate-200">{item.department}</div>
                                            <div className="text-xs text-slate-500">{item.shift} Shift</div>
                                        </td>

                                        {/* Dose */}
                                        <td className="py-4 px-5 font-mono text-xs font-bold text-slate-200">
                                            {item.dose} <span className="text-slate-500 font-normal">ppm·hr</span>
                                        </td>

                                        {/* Exposure Status */}
                                        <td className="py-4 px-5">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                                                item.status === "Normal" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                item.status === "Review" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                                "bg-red-500/10 text-red-400 border border-red-500/20"
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    item.status === "Normal" ? "bg-emerald-400" :
                                                    item.status === "Review" ? "bg-amber-400" :
                                                    "bg-red-400 animate-ping"
                                                }`} />
                                                {item.status}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="py-4 px-5 text-right">
                                            <button
                                                onClick={() => openRenewModal(item)}
                                                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                                            >
                                                <RefreshCw size={13} /> Replace Badge
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Replace / Reassign Badge Modal */}
            {renewingWorker && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <h2 className="text-lg font-bold text-white">Replace Dosimeter Badge</h2>
                            <button
                                onClick={() => setRenewingWorker(null)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={confirmRenewal} className="space-y-4 text-sm">
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                                <span className="text-slate-500 block">Worker:</span>
                                <span className="font-bold text-white text-sm">{renewingWorker.workerName} ({renewingWorker.id})</span>
                                <span className="text-slate-400 block mt-0.5">Current Assigned Badge: {renewingWorker.badge}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">
                                    New Replacement Badge ID
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={newBadgeId}
                                    onChange={(e) => setNewBadgeId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sky-300 font-mono text-sm focus:outline-none focus:border-sky-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setRenewingWorker(null)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition shadow-md shadow-sky-500/20"
                                >
                                    Update Badge
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Badges;
