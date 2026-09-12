import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, Clock } from "lucide-react";
import { getWorkers, getLogs } from "../data/workers.js";

function RecentExposure({ workers: propWorkers, logs: propLogs }) {
    const [searchQuery, setSearchQuery] = useState("");

    const workers = useMemo(() => {
        return propWorkers || getWorkers();
    }, [propWorkers]);

    const logs = useMemo(() => {
        return propLogs || getLogs();
    }, [propLogs]);

    // Build recent exposure list from actual workers and logs
    const exposureItems = useMemo(() => {
        return workers.map(worker => {
            // Find most recent log if available
            const workerLog = logs.find(l => l.workerId === worker.id || l.badge === worker.badge);

            return {
                id: worker.id,
                worker: worker.name,
                badge: worker.badge,
                department: worker.department,
                shift: worker.shift,
                dose: worker.dose,
                status: worker.status,
                lastScan: worker.lastScan || (workerLog ? workerLog.timestamp : "Recently"),
                location: workerLog ? workerLog.location : worker.department
            };
        });
    }, [workers, logs]);

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return exposureItems;
        const q = searchQuery.toLowerCase();
        return exposureItems.filter(item =>
            item.worker.toLowerCase().includes(q) ||
            item.badge.toLowerCase().includes(q) ||
            item.department.toLowerCase().includes(q)
        );
    }, [exposureItems, searchQuery]);

    return (
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-white">
                        Recent Exposure Measurements
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Active personnel dosimeter readings and exposure status
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Filter by name or badge..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                        />
                    </div>
                    <Link
                        to="/exposure"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition"
                    >
                        View Full History <ArrowRight size={14} />
                    </Link>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-3">Worker</th>
                            <th className="py-3 px-3">Badge ID</th>
                            <th className="py-3 px-3">Shift & Dept</th>
                            <th className="py-3 px-3">Cumulative Dose</th>
                            <th className="py-3 px-3">Exposure Status</th>
                            <th className="py-3 px-3 text-right">Last Scan</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="py-8 text-center text-slate-500">
                                    {searchQuery
                                        ? `No measurements found matching "${searchQuery}".`
                                        : "No registered personnel or measurements found. Add workers to start monitoring."}
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-800/40 transition">
                                    {/* Worker */}
                                    <td className="py-3.5 px-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center font-bold text-white text-[11px] shrink-0">
                                                {(item.worker || "Worker").trim().split(/\s+/).map(n => n[0]).filter(Boolean).join("").toUpperCase().slice(0, 2) || "W"}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-white">{item.worker}</div>
                                                <div className="text-[11px] text-slate-500">{item.id}</div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Badge ID */}
                                    <td className="py-3.5 px-3">
                                        <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-sky-300 font-semibold">
                                            {item.badge}
                                        </span>
                                    </td>

                                    {/* Shift & Dept */}
                                    <td className="py-3.5 px-3">
                                        <div className="text-slate-200">{item.department}</div>
                                        <div className="text-[11px] text-slate-500">{item.shift} Shift</div>
                                    </td>

                                    {/* Dose with visual bar */}
                                    <td className="py-3.5 px-3">
                                        <div className="w-28">
                                            <div className="flex justify-between text-[11px] mb-1 font-mono">
                                                <span className="font-semibold text-white">{item.dose}</span>
                                                <span className="text-slate-500">/ 10 ppm·hr</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${
                                                        item.dose >= 10 ? "bg-red-500" :
                                                        item.dose >= 7 ? "bg-amber-400" :
                                                        "bg-emerald-400"
                                                    }`}
                                                    style={{ width: `${Math.min(100, (item.dose / 10) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>

                                    {/* Exposure Status */}
                                    <td className="py-3.5 px-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 ${
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

                                    {/* Last Scan */}
                                    <td className="py-3.5 px-3 text-right text-slate-400 font-mono text-[11px]">
                                        <div className="flex items-center justify-end gap-1 text-slate-400">
                                            <Clock size={12} className="text-slate-500" />
                                            {item.lastScan}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default RecentExposure;
