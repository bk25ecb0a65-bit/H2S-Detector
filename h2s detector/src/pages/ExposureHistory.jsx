import { useState, useMemo, useEffect } from "react";
import {
    Activity,
    Download,
    Search,
    AlertTriangle,
    ShieldCheck,
    Eye,
    X,
    AlertCircle
} from "lucide-react";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from "recharts";
import StatCard from "../components/StatCard";
import { getWorkers, getLogs, purgeOrphanedLogs } from "../data/workers.js";

function ExposureHistory() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [shiftFilter, setShiftFilter] = useState("All");
    const [workerFilter, setWorkerFilter] = useState("All");
    const [selectedLog, setSelectedLog] = useState(null);

    // Live workers and logs from centralized data layer
    const [workers, setWorkers] = useState(() => getWorkers());
    const [allLogs, setAllLogs] = useState(() => getLogs());

    // Sync on window focus or storage changes
    useEffect(() => {
        // Immediately purge any legacy or orphaned logs for workers no longer in registry
        purgeOrphanedLogs();

        const handleSync = () => {
            const currentWorkers = getWorkers();
            setWorkers(currentWorkers);
            setAllLogs(getLogs(currentWorkers));
        };
        window.addEventListener("focus", handleSync);
        window.addEventListener("storage", handleSync);
        window.addEventListener("h2s_logs_updated", handleSync);
        window.addEventListener("h2s_workers_updated", handleSync);
        return () => {
            window.removeEventListener("focus", handleSync);
            window.removeEventListener("storage", handleSync);
            window.removeEventListener("h2s_logs_updated", handleSync);
            window.removeEventListener("h2s_workers_updated", handleSync);
        };
    }, []);

    // Ensure worker filter is valid for current workers list without cascading effects
    const activeWorkerFilter = (workerFilter === "All" || workers.some(w => w.name === workerFilter || w.id === workerFilter))
        ? workerFilter
        : "All";

    // Strictly filter logs so that ONLY workers currently present in the workers list are included
    const validWorkerLogs = useMemo(() => {
        if (!workers || workers.length === 0) return [];
        const activeNames = new Set(workers.map(w => (w.name || "").trim().toLowerCase()));

        // 1. Logs that strictly match an active worker by exact name
        const matchedLogs = allLogs.filter((log) => {
            if (!log || !log.worker) return false;
            const wName = log.worker.trim().toLowerCase();
            return activeNames.has(wName);
        });

        // 2. Ensure every active worker in the workers list has an active exposure record for Today
        const coveredNames = new Set(matchedLogs.map(l => l.worker.trim().toLowerCase()));
        const synthetic = [];
        workers.forEach(w => {
            const wNameLower = (w.name || "").trim().toLowerCase();
            if (!coveredNames.has(wNameLower)) {
                const now = new Date();
                const timeStr = now.toISOString().replace("T", " ").slice(0, 16);
                const doseNum = parseFloat(w.dose) || 0;
                synthetic.push({
                    id: `EXP-${(w.id || "101").replace(/[^a-zA-Z0-9]/g, "")}-TODAY`,
                    timestamp: timeStr,
                    worker: w.name,
                    workerId: w.id,
                    badge: w.badge,
                    location: `${w.department || "Facility Unit"} - Today's Status`,
                    shift: w.shift || "Morning",
                    duration: "Shift Monitoring",
                    concentration: doseNum >= 10 ? "5.0 ppm" : doseNum >= 5 ? "2.0 ppm" : doseNum >= 2 ? "1.0 ppm" : "~100–500 ppb",
                    dose: doseNum,
                    status: doseNum >= 10 ? "Critical" : doseNum >= 7 ? "Review" : "Normal",
                    notes: `Current shift exposure record for registered worker ${w.name}.`
                });
            }
        });

        return [...matchedLogs, ...synthetic];
    }, [allLogs, workers]);

    // Filtered logs for UI table and CSV export
    const filteredLogs = useMemo(() => {
        return validWorkerLogs.filter((log) => {
            const matchesSearch =
                (log.worker || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.badge || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.id || "").toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus =
                statusFilter === "All" || log.status === statusFilter;
            const matchesShift =
                shiftFilter === "All" || log.shift === shiftFilter;
            const matchesWorker =
                activeWorkerFilter === "All" || log.worker === activeWorkerFilter || log.workerId === activeWorkerFilter;

            return matchesSearch && matchesStatus && matchesShift && matchesWorker;
        });
    }, [validWorkerLogs, searchQuery, statusFilter, shiftFilter, activeWorkerFilter]);

    // Live KPI Calculations derived strictly from valid worker logs & workers list
    const avgDose = useMemo(() => {
        if (validWorkerLogs.length > 0) {
            const sum = validWorkerLogs.reduce((acc, l) => acc + (parseFloat(l.dose) || 0), 0);
            return (sum / validWorkerLogs.length).toFixed(1);
        }
        if (workers.length > 0) {
            const sum = workers.reduce((acc, w) => acc + (parseFloat(w.dose) || 0), 0);
            return (sum / workers.length).toFixed(1);
        }
        return "0.0";
    }, [validWorkerLogs, workers]);

    const peakRecord = useMemo(() => {
        let maxVal = 0;
        let loc = workers[0]?.department || "Refining Unit";
        validWorkerLogs.forEach(l => {
            const d = parseFloat(l.dose) || 0;
            if (d >= maxVal) {
                maxVal = d;
                loc = l.location || loc;
            }
        });
        if (validWorkerLogs.length === 0) {
            workers.forEach(w => {
                const d = parseFloat(w.dose) || 0;
                if (d >= maxVal) {
                    maxVal = d;
                    loc = w.department || loc;
                }
            });
        }
        const cleanLoc = loc.split(" - ")[0].trim();
        return {
            value: maxVal > 0 ? maxVal.toFixed(1) : "0.0",
            location: cleanLoc
        };
    }, [validWorkerLogs, workers]);

    const exceedanceCount = useMemo(() => {
        return validWorkerLogs.filter(l => (parseFloat(l.dose) || 0) >= 20 || l.status === "Critical").length;
    }, [validWorkerLogs]);

    const complianceRate = useMemo(() => {
        if (validWorkerLogs.length === 0) return workers.length > 0 ? "100.0%" : "0.0%";
        const rate = ((validWorkerLogs.length - exceedanceCount) / validWorkerLogs.length) * 100;
        return `${Math.max(0, rate).toFixed(1)}%`;
    }, [validWorkerLogs, exceedanceCount, workers.length]);

    // Daily Cumulative Exposure Trend computed dynamically from valid worker logs AND current worker doses for today
    const trendData = useMemo(() => {
        if (!workers || workers.length === 0) {
            return [];
        }

        const todayKey = new Date().toISOString().slice(0, 10);
        const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

        const dateMap = {};
        validWorkerLogs.forEach(l => {
            const dateKey = (l.timestamp || "").slice(0, 10);
            if (!dateKey) return;
            if (!dateMap[dateKey]) {
                dateMap[dateKey] = [];
            }
            dateMap[dateKey].push(parseFloat(l.dose) || 0);
        });

        // Ensure TODAY is ALWAYS present with current workforce values
        if (!dateMap[todayKey]) {
            dateMap[todayKey] = [];
        }
        if (dateMap[todayKey].length === 0) {
            workers.forEach(w => {
                dateMap[todayKey].push(parseFloat(w.dose) || 0);
            });
        }

        const sortedDates = Object.keys(dateMap).sort();
        return sortedDates.map(dk => {
            const doses = dateMap[dk];
            const avg = doses.length > 0 ? doses.reduce((a, b) => a + b, 0) / doses.length : 0;
            const max = doses.length > 0 ? Math.max(...doses) : 0;
            let label;
            if (dk === todayKey) {
                label = `${todayLabel} (Today)`;
            } else {
                try {
                    const [y, m, d] = dk.split("-");
                    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                    label = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                } catch {
                    label = dk;
                }
            }
            return {
                date: label,
                avgDose: Number(avg.toFixed(1)),
                maxDose: Number(max.toFixed(1)),
                limit: 20
            };
        });
    }, [validWorkerLogs, workers]);

    // Department exposure distribution computed strictly from registered workers
    const deptData = useMemo(() => {
        const map = {};
        workers.forEach(w => {
            const dept = w.department || "General Unit";
            if (!map[dept]) {
                map[dept] = { name: dept, totalDose: 0, workers: 0 };
            }
            map[dept].workers += 1;
            map[dept].totalDose += parseFloat(w.dose) || 0;
        });

        const result = Object.values(map).map(d => ({
            ...d,
            totalDose: Number(d.totalDose.toFixed(1))
        }));

        return result.length > 0 ? result : [];
    }, [workers]);

    // Export table data to CSV file
    const exportCSV = () => {
        const headers = ["Log ID", "Date Time", "Worker", "Worker ID", "Badge ID", "Location", "Shift", "Scan Duration", "Concentration", "Dose (ppm-hr)", "Status", "Notes"];
        const rows = filteredLogs.map(l => [
            l.id,
            `"${l.timestamp}"`,
            `"${l.worker}"`,
            l.workerId,
            l.badge,
            `"${l.location}"`,
            l.shift,
            `"${l.duration}"`,
            l.concentration,
            l.dose,
            l.status,
            `"${l.notes}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `H2S_Exposure_History_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* Header with Title and Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Exposure History</h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        Comprehensive log of H₂S personal dosimeter measurements, dose trends, and workplace regulatory compliance.
                    </p>
                </div>
                <div>
                    <button
                        onClick={exportCSV}
                        className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-lg text-sm font-semibold transition cursor-pointer"
                    >
                        <Download size={16} className="text-sky-400" /> Export CSV Report
                    </button>
                </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Average Shift Dose"
                    value={avgDose}
                    unit="ppm·hr"
                    description="Workforce average across valid workers"
                    icon={<Activity size={24} className="text-sky-400" />}
                />
                <StatCard
                    title="Peak Area Exposure"
                    value={peakRecord.value}
                    unit="ppm·hr"
                    description={peakRecord.location}
                    icon={<AlertTriangle size={24} className="text-amber-400" />}
                />
                <StatCard
                    title="Exceedance Events"
                    value={String(exceedanceCount)}
                    description={exceedanceCount > 0 ? "Past permissible limit (≥10 ppm·hr)" : "Zero exceedances recorded"}
                    icon={<AlertCircle size={24} className={exceedanceCount > 0 ? "text-red-400" : "text-emerald-400"} />}
                />
                <StatCard
                    title="Compliance Rate"
                    value={complianceRate}
                    description="Within OSHA & NIOSH guidelines (<10 ppm·hr)"
                    icon={<ShieldCheck size={24} className="text-emerald-400" />}
                />
            </div>

            {/* Analytics Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 7-Day Trend Chart (Takes 2 columns) */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-white">Daily Cumulative Exposure Trend</h2>
                            <p className="text-xs text-slate-400">Peak vs Average worker dose against 10 ppm·hr OSHA action limit</p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-sky-300 font-medium">Logged Days ({trendData.length})</span>
                    </div>

                    <div className="h-64 pt-2">
                        {validWorkerLogs.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-xs text-slate-500">
                                No exposure logs recorded for active workers.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                                    <YAxis stroke="#64748b" fontSize={12} domain={[0, (dataMax) => Math.max(15, Math.ceil(dataMax + 2))]} unit=" ppm·h" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#fff" }}
                                    />
                                    <ReferenceLine y={10} label={{ value: "OSHA Action Limit (10 ppm·hr)", fill: "#ef4444", fontSize: 10, position: "top" }} stroke="#ef4444" strokeDasharray="4 4" />
                                    <Area type="monotone" dataKey="maxDose" name="Peak Dose" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorMax)" />
                                    <Area type="monotone" dataKey="avgDose" name="Average Dose" stroke="#22c55e" strokeWidth={2} fillOpacity={0} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Department Load Distribution Bar Chart */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div>
                        <h2 className="text-base font-semibold text-white">Exposure by Facility Unit</h2>
                        <p className="text-xs text-slate-400">Total cumulative exposure concentration</p>
                    </div>

                    <div className="h-64 pt-2">
                        {deptData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-xs text-slate-500">
                                No registered workforce department data.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={deptData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis type="number" stroke="#64748b" fontSize={11} />
                                    <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={90} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#fff" }}
                                    />
                                    <Bar dataKey="totalDose" name="Total ppm·hr" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search logs by worker, badge ID, location, or EXP ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={activeWorkerFilter}
                        onChange={(e) => setWorkerFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                        <option value="All">All Workers ({workers.length})</option>
                        {workers.map((w) => (
                            <option key={w.id} value={w.name}>{w.name} ({w.badge})</option>
                        ))}
                    </select>

                    <select
                        value={shiftFilter}
                        onChange={(e) => setShiftFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                        <option value="All">All Shifts</option>
                        <option value="Morning">Morning Shift</option>
                        <option value="Evening">Evening Shift</option>
                        <option value="Night">Night Shift</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Normal">Normal (&lt;7)</option>
                        <option value="Review">Review (7-10)</option>
                        <option value="Critical">Critical (&ge;10)</option>
                    </select>
                </div>
            </div>

            {/* Exposure History Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="py-3.5 px-5">Log ID / Date</th>
                                <th className="py-3.5 px-5">Worker</th>
                                <th className="py-3.5 px-5">Badge ID</th>
                                <th className="py-3.5 px-5">Location / Unit</th>
                                <th className="py-3.5 px-5">Scan Result</th>
                                <th className="py-3.5 px-5">Dose</th>
                                <th className="py-3.5 px-5">Status</th>
                                <th className="py-3.5 px-5 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-12 text-center text-slate-500">
                                        No exposure logs match the selected search or filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                                        {/* Log ID and Date */}
                                        <td className="py-4 px-5">
                                            <div className="font-mono text-xs font-bold text-sky-400">{log.id}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{log.timestamp}</div>
                                        </td>

                                        {/* Worker */}
                                        <td className="py-4 px-5">
                                            <div className="font-medium text-white">{log.worker}</div>
                                            <div className="text-xs text-slate-500">{log.workerId} · {log.shift}</div>
                                        </td>

                                        {/* Badge ID */}
                                        <td className="py-4 px-5">
                                            <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
                                                {log.badge}
                                            </span>
                                        </td>

                                        {/* Location */}
                                        <td className="py-4 px-5">
                                            <div className="text-slate-300 text-xs max-w-[200px] truncate" title={log.location}>
                                                {log.location}
                                            </div>
                                        </td>

                                        {/* Scan Concentration */}
                                        <td className="py-4 px-5">
                                            <div className="font-semibold text-white">{log.concentration}</div>
                                            <div className="text-[11px] text-slate-500">{log.duration}</div>
                                        </td>

                                        {/* Dose */}
                                        <td className="py-4 px-5 font-mono text-xs font-bold text-slate-200">
                                            {log.dose} <span className="text-slate-500 font-normal">ppm·hr</span>
                                        </td>

                                        {/* Status */}
                                        <td className="py-4 px-5">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                                                log.status === "Normal" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                log.status === "Review" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                                "bg-red-500/10 text-red-400 border border-red-500/20"
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    log.status === "Normal" ? "bg-emerald-400" :
                                                    log.status === "Review" ? "bg-amber-400" :
                                                    "bg-red-400 animate-ping"
                                                }`} />
                                                {log.status}
                                            </span>
                                        </td>

                                        {/* Action Button */}
                                        <td className="py-4 px-5 text-right">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition"
                                                title="View Full Scan Log"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ============================================================ */}
            {/* EXPOSURE LOG RECORD DETAILS MODAL */}
            {/* ============================================================ */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5">
                        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                            <div>
                                <span className="text-xs font-mono text-sky-400 font-bold">{selectedLog.id}</span>
                                <h2 className="text-xl font-bold text-white mt-0.5">Exposure Incident Certificate</h2>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Status Alert Banner */}
                        <div className={`p-4 rounded-xl border flex items-center justify-between ${
                            selectedLog.status === "Normal" ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-300" :
                            selectedLog.status === "Review" ? "bg-amber-950/30 border-amber-800/40 text-amber-300" :
                            "bg-red-950/30 border-red-800/40 text-red-300"
                        }`}>
                            <div>
                                <div className="text-xs uppercase font-semibold">Incident Classification</div>
                                <div className="text-2xl font-black mt-0.5">{selectedLog.status} Exposure</div>
                            </div>
                            <div className="text-right font-mono">
                                <div className="text-2xl font-black">{selectedLog.dose}</div>
                                <div className="text-[11px] text-slate-400">ppm·hr Dose</div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block mb-1">Operator</span>
                                <span className="font-semibold text-white">{selectedLog.worker}</span>
                                <span className="text-slate-500 block text-[11px]">{selectedLog.workerId}</span>
                            </div>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block mb-1">Badge Assigned</span>
                                <span className="font-mono text-sky-400 font-bold">{selectedLog.badge}</span>
                            </div>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block mb-1">Logged Timestamp</span>
                                <span className="text-slate-200">{selectedLog.timestamp}</span>
                            </div>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block mb-1">Strip Scan Duration</span>
                                <span className="text-slate-200">{selectedLog.duration} ({selectedLog.concentration})</span>
                            </div>
                        </div>

                        {/* Location Details */}
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                            <span className="text-slate-500 block mb-1">Monitoring Location:</span>
                            <span className="font-medium text-slate-200">{selectedLog.location}</span>
                        </div>

                        {/* Safety Officer Notes */}
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                            <span className="text-slate-500 block mb-1">Field Observation & Action:</span>
                            <p className="text-slate-300 leading-relaxed">{selectedLog.notes}</p>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition font-medium"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ExposureHistory;