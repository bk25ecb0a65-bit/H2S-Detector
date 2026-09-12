import React, { useState, useMemo, useEffect } from "react";
import {
    Activity,
    Calendar,
    Download,
    Filter,
    Search,
    AlertTriangle,
    ShieldCheck,
    TrendingUp,
    Clock,
    FileSpreadsheet,
    Eye,
    X,
    Building2,
    CheckCircle2,
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

// Comprehensive mock historical exposure log dataset
const INITIAL_LOGS = [
    {
        id: "EXP-8901",
        timestamp: "2026-09-12 14:35",
        worker: "Ravi Kumar",
        workerId: "W-101",
        badge: "H2S-00431",
        location: "Refining Unit B - Flare Header",
        shift: "Morning",
        duration: "5 min scan",
        concentration: "2 ppm",
        dose: 14.3,
        status: "Normal",
        notes: "Routine shift inspection. Ventilation active."
    },
    {
        id: "EXP-8902",
        timestamp: "2026-09-12 09:15",
        worker: "Arjun Rao",
        workerId: "W-102",
        badge: "H2S-00432",
        location: "Sulfur Recovery Unit - Condenser",
        shift: "Night",
        duration: "10 min scan",
        concentration: "4 ppm",
        dose: 21.7,
        status: "Review",
        notes: "Faint odor reported. Worker rotated to clean zone."
    },
    {
        id: "EXP-8903",
        timestamp: "2026-09-11 16:40",
        worker: "Suresh Menon",
        workerId: "W-106",
        badge: "H2S-00436",
        location: "Gas Processing Facility - Compressor",
        shift: "Evening",
        duration: "30 min scan",
        concentration: "8 ppm",
        dose: 27.8,
        status: "Critical",
        notes: "Valve seal leak detected and isolated. Medical check cleared."
    },
    {
        id: "EXP-8904",
        timestamp: "2026-09-11 11:20",
        worker: "Rahul Singh",
        workerId: "W-103",
        badge: "H2S-00433",
        location: "Pipeline Maintenance - Valve Station 3",
        shift: "Morning",
        duration: "1 min scan",
        concentration: "100 ppb",
        dose: 6.2,
        status: "Normal",
        notes: "Pipeline flange torque verification completed."
    },
    {
        id: "EXP-8905",
        timestamp: "2026-09-10 17:05",
        worker: "Vikram Patel",
        workerId: "W-104",
        badge: "H2S-00434",
        location: "Drilling Platform 4 - Mud Pit Area",
        shift: "Evening",
        duration: "5 min scan",
        concentration: "4 ppm",
        dose: 18.5,
        status: "Review",
        notes: "Degasser operational. Dose monitored during pipe trip."
    },
    {
        id: "EXP-8906",
        timestamp: "2026-09-10 10:10",
        worker: "Priya Sharma",
        workerId: "W-105",
        badge: "H2S-00435",
        location: "Chemical Analysis Lab - Sample Fume Hood",
        shift: "Morning",
        duration: "10 min scan",
        concentration: "100 ppb",
        dose: 3.1,
        status: "Normal",
        notes: "Quarterly crude sample distillation testing."
    },
    {
        id: "EXP-8907",
        timestamp: "2026-09-09 15:30",
        worker: "Ravi Kumar",
        workerId: "W-101",
        badge: "H2S-00431",
        location: "Refining Unit B - Desulfurization",
        shift: "Morning",
        duration: "5 min scan",
        concentration: "1 ppm",
        dose: 11.2,
        status: "Normal",
        notes: "Catalyst changeover inspection."
    },
    {
        id: "EXP-8908",
        timestamp: "2026-09-08 21:45",
        worker: "Arjun Rao",
        workerId: "W-102",
        badge: "H2S-00432",
        location: "Sulfur Recovery Unit - Tail Gas Unit",
        shift: "Night",
        duration: "30 min scan",
        concentration: "2 ppm",
        dose: 16.4,
        status: "Normal",
        notes: "Incinerator burner check."
    },
    {
        id: "EXP-8909",
        timestamp: "2026-09-07 13:00",
        worker: "Vikram Patel",
        workerId: "W-104",
        badge: "H2S-00434",
        location: "Drilling Platform 4 - Wellhead Area",
        shift: "Evening",
        duration: "5 min scan",
        concentration: "8 ppm",
        dose: 24.1,
        status: "Review",
        notes: "Circulation fluid treatment adjusted."
    }
];

// 7-day cumulative trend data
const TREND_DATA = [
    { date: "Sep 06", avgDose: 9.4, maxDose: 14.2, limit: 20 },
    { date: "Sep 07", avgDose: 13.8, maxDose: 24.1, limit: 20 },
    { date: "Sep 08", avgDose: 10.1, maxDose: 16.4, limit: 20 },
    { date: "Sep 09", avgDose: 8.7, maxDose: 11.2, limit: 20 },
    { date: "Sep 10", avgDose: 14.5, maxDose: 18.5, limit: 20 },
    { date: "Sep 11", avgDose: 18.2, maxDose: 27.8, limit: 20 },
    { date: "Sep 12", avgDose: 12.9, maxDose: 21.7, limit: 20 }
];

// Department exposure distribution data
const DEPT_DATA = [
    { name: "Refining B", totalDose: 38.6, workers: 4 },
    { name: "Sulfur Rec.", totalDose: 54.3, workers: 5 },
    { name: "Pipeline", totalDose: 18.4, workers: 3 },
    { name: "Drilling 4", totalDose: 42.6, workers: 4 },
    { name: "Chem Lab", totalDose: 8.2, workers: 2 },
    { name: "Gas Proc.", totalDose: 49.1, workers: 3 }
];

function ExposureHistory() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [shiftFilter, setShiftFilter] = useState("All");
    const [timeRange, setTimeRange] = useState("7d");
    const [selectedLog, setSelectedLog] = useState(null);

    // Read logs from localStorage to pick up real-time scans
    const [allLogs, setAllLogs] = useState(() => {
        const saved = localStorage.getItem("h2s_exposure_logs");
        return saved ? JSON.parse(saved) : INITIAL_LOGS;
    });

    // Sync on window focus or storage changes
    useEffect(() => {
        const handleSync = () => {
            const saved = localStorage.getItem("h2s_exposure_logs");
            if (saved) setAllLogs(JSON.parse(saved));
        };
        window.addEventListener("focus", handleSync);
        return () => window.removeEventListener("focus", handleSync);
    }, []);

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return allLogs.filter((log) => {
            const matchesSearch =
                log.worker.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.badge.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.id.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus =
                statusFilter === "All" || log.status === statusFilter;
            const matchesShift =
                shiftFilter === "All" || log.shift === shiftFilter;

            return matchesSearch && matchesStatus && matchesShift;
        });
    }, [searchQuery, statusFilter, shiftFilter]);

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
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">H₂S Exposure History</h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        Comprehensive log of badge readings, dosimeter scans, and cumulative workplace exposure.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={exportCSV}
                        className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-lg text-sm font-semibold transition"
                    >
                        <Download size={16} className="text-sky-400" /> Export CSV Report
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <StatCard
                    title="Average Daily Dose"
                    value="12.9"
                    description="ppm·hr per worker"
                    icon={<Activity size={24} className="text-sky-400" />}
                />
                <StatCard
                    title="Peak Recorded Level"
                    value="27.8"
                    description="ppm·hr (Gas Processing Facility)"
                    icon={<AlertTriangle size={24} className="text-amber-400" />}
                />
                <StatCard
                    title="Exceedance Events"
                    value="3"
                    description="Past permissible limit (>20 ppm·hr)"
                    icon={<AlertCircle size={24} className="text-red-400" />}
                />
                <StatCard
                    title="Compliance Rate"
                    value="96.7%"
                    description="Within OSHA & NIOSH guidelines"
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
                            <p className="text-xs text-slate-400">Peak vs Average worker dose against 20 ppm·hr OSHA action limit</p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-sky-300 font-medium">Last 7 Days</span>
                    </div>

                    <div className="h-64 pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={TREND_DATA}>
                                <defs>
                                    <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} domain={[0, 32]} unit=" ppm·h" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#fff" }}
                                />
                                <ReferenceLine y={20} label={{ value: "OSHA Action Limit (20 ppm·hr)", fill: "#ef4444", fontSize: 10, position: "top" }} stroke="#ef4444" strokeDasharray="4 4" />
                                <Area type="monotone" dataKey="maxDose" name="Peak Dose" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorMax)" />
                                <Area type="monotone" dataKey="avgDose" name="Average Dose" stroke="#22c55e" strokeWidth={2} fillOpacity={0} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Department Load Distribution Bar Chart */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div>
                        <h2 className="text-base font-semibold text-white">Exposure by Facility Unit</h2>
                        <p className="text-xs text-slate-400">Total cumulative exposure concentration</p>
                    </div>

                    <div className="h-64 pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={DEPT_DATA} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis type="number" stroke="#64748b" fontSize={11} />
                                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={75} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#fff" }}
                                />
                                <Bar dataKey="totalDose" name="Total ppm·hr" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
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
                        <option value="Normal">Normal (&lt;18)</option>
                        <option value="Review">Review (18-25)</option>
                        <option value="Critical">Critical (&gt;25)</option>
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