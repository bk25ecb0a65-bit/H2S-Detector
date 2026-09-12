import { useState, useMemo } from "react";
import {
    BarChart,
    Bar,
    Cell,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from "recharts";
import { Users, TrendingUp, BarChart3, ShieldCheck, AlertTriangle } from "lucide-react";
import { getWorkers, getLogs } from "../data/workers.js";

// Custom Tooltip for Worker Bar Chart
function WorkerCustomTooltip({ active, payload }) {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const dose = data.dose;
    const isOverLimit = dose >= 20;

    return (
        <div className="bg-slate-950/95 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 min-w-[200px]">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div>
                    <div className="font-bold text-white text-sm">{data.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{data.id} · {data.badge}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    data.status === "Warning" ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                    data.status === "Review" ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" :
                    "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                }`}>
                    {data.status}
                </span>
            </div>

            <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                    <span className="text-slate-400">Department:</span>
                    <span className="font-medium text-slate-200">{data.department}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Shift:</span>
                    <span className="font-medium text-slate-200">{data.shift}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400 font-medium">Cumulative Dose:</span>
                    <span className="font-mono font-bold text-sky-400 text-sm">{dose} ppm·hr</span>
                </div>
            </div>

            {/* OSHA threshold comparison bar */}
            <div className="pt-1">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Threshold Usage</span>
                    <span>{Math.round((dose / 20) * 100)}% of 20 ppm·hr</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${
                            dose >= 25 ? "bg-red-500" :
                            dose >= 18 ? "bg-amber-400" :
                            "bg-emerald-400"
                        }`}
                        style={{ width: `${Math.min(100, (dose / 20) * 100)}%` }}
                    />
                </div>
            </div>

            {isOverLimit && (
                <div className="flex items-center gap-1.5 text-red-400 text-[11px] font-semibold pt-1">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>Exceeds OSHA Action Limit (20 ppm·hr)</span>
                </div>
            )}
        </div>
    );
}

function ExposureChart({ workers: propWorkers, logs: propLogs }) {
    const [viewMode, setViewMode] = useState("workers"); // "workers" | "timeline"

    const workers = useMemo(() => {
        return propWorkers || getWorkers();
    }, [propWorkers]);

    const logs = useMemo(() => {
        return propLogs || getLogs();
    }, [propLogs]);

    // Live Metrics calculated strictly from workers information
    const { totalWorkers, avgDose, peakDose, atRiskCount } = useMemo(() => {
        if (!workers || workers.length === 0) {
            return { totalWorkers: 0, avgDose: 0, peakDose: 0, atRiskCount: 0 };
        }
        const doses = workers.map(w => parseFloat(w.dose) || 0);
        const sum = doses.reduce((a, b) => a + b, 0);
        const avg = Number((sum / doses.length).toFixed(1));
        const peak = Number(Math.max(...doses, 0).toFixed(1));
        const atRisk = workers.filter(w => (parseFloat(w.dose) || 0) >= 18).length;
        return {
            totalWorkers: workers.length,
            avgDose: avg,
            peakDose: peak,
            atRiskCount: atRisk
        };
    }, [workers]);

    // Worker bar chart points
    const workerChartData = useMemo(() => {
        if (!workers || workers.length === 0) return [];
        return workers.map(w => {
            const dose = parseFloat(w.dose) || 0;
            let barColor = "#38bdf8"; // sky blue
            if (dose >= 25) {
                barColor = "#ef4444"; // red
            } else if (dose >= 18) {
                barColor = "#f59e0b"; // amber
            }
            return {
                id: w.id,
                name: w.name,
                displayName: w.name.length > 15 ? `${w.name.slice(0, 13)}…` : w.name,
                badge: w.badge,
                department: w.department,
                shift: w.shift,
                dose,
                status: w.status || (dose >= 25 ? "Warning" : dose >= 18 ? "Review" : "Normal"),
                barColor
            };
        });
    }, [workers]);

    // 7-day timeline trend computed from registered workers and logs
    const timelineData = useMemo(() => {
        const dayMap = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateKey = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            dayMap[dateKey] = { date: dateKey, doses: [] };
        }

        const workerBadgeSet = new Set(workers.map(w => w.badge));
        const workerIdSet = new Set(workers.map(w => w.id));

        logs.forEach(log => {
            if (!log.timestamp) return;
            const matchesWorker = workerBadgeSet.has(log.badge) || workerIdSet.has(log.workerId);
            if (workers.length > 0 && !matchesWorker) return;

            const logDate = new Date(log.timestamp);
            if (isNaN(logDate.getTime())) return;
            const dateKey = logDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const doseVal = parseFloat(log.dose) || 0;

            if (dayMap[dateKey]) {
                dayMap[dateKey].doses.push(doseVal);
            } else {
                dayMap[dateKey] = { date: dateKey, doses: [doseVal] };
            }
        });

        // Ensure today represents current workers if no logs recorded today
        const todayKey = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (dayMap[todayKey] && dayMap[todayKey].doses.length === 0 && workers.length > 0) {
            workers.forEach(w => {
                dayMap[todayKey].doses.push(parseFloat(w.dose) || 0);
            });
        }

        return Object.values(dayMap).map(item => {
            const count = item.doses.length;
            const sum = item.doses.reduce((a, b) => a + b, 0);
            const avg = count > 0 ? Number((sum / count).toFixed(1)) : 0;
            const max = count > 0 ? Number(Math.max(...item.doses).toFixed(1)) : 0;
            return {
                date: item.date,
                avgDose: avg,
                maxDose: max,
                limit: 20
            };
        });
    }, [workers, logs]);

    const yMax = Math.max(30, peakDose + 5);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            {/* Header: Title, Controls, and Summary Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-lg font-semibold text-white">
                            Worker Exposure Monitoring
                        </h2>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold inline-flex items-center gap-1">
                            <Users size={12} /> {totalWorkers} {totalWorkers === 1 ? "Worker" : "Workers"}
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        Live dosimeter exposure readings calibrated against OSHA 20 ppm·hr action threshold
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* View mode toggle */}
                    <div className="bg-slate-950/80 border border-slate-800 p-0.5 rounded-lg flex items-center text-xs">
                        <button
                            type="button"
                            onClick={() => setViewMode("workers")}
                            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 cursor-pointer ${
                                viewMode === "workers"
                                    ? "bg-sky-500 text-slate-950 font-bold shadow-sm"
                                    : "text-slate-400 hover:text-white"
                            }`}
                        >
                            <BarChart3 size={14} /> By Worker
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("timeline")}
                            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 cursor-pointer ${
                                viewMode === "timeline"
                                    ? "bg-sky-500 text-slate-950 font-bold shadow-sm"
                                    : "text-slate-400 hover:text-white"
                            }`}
                        >
                            <TrendingUp size={14} /> 7-Day Trend
                        </button>
                    </div>

                    {/* KPI badges */}
                    <div className="flex items-center gap-2 text-xs bg-slate-950/60 border border-slate-800/80 px-3 py-1.5 rounded-lg">
                        <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
                            <span className="w-2 h-2 rounded-full bg-sky-400" />
                            <span className="text-slate-400">Peak:</span>
                            <strong className="text-white font-mono">{peakDose} <span className="text-[10px] text-slate-400">ppm·hr</span></strong>
                        </div>
                        <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-slate-400">Avg:</span>
                            <strong className="text-white font-mono">{avgDose} <span className="text-[10px] text-slate-400">ppm·hr</span></strong>
                        </div>
                        <div className="flex items-center gap-1">
                            {atRiskCount > 0 ? (
                                <span className="text-amber-400 font-semibold flex items-center gap-1">
                                    <AlertTriangle size={13} /> {atRiskCount} at risk
                                </span>
                            ) : (
                                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                    <ShieldCheck size={13} /> All within limits
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart Body */}
            {workers.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
                    <Users size={36} className="text-slate-600 mb-2" />
                    <p className="text-slate-400 text-sm font-medium">No workers currently registered</p>
                    <p className="text-slate-600 text-xs mt-1">Register workers or scan badges to monitor exposure levels here.</p>
                </div>
            ) : viewMode === "workers" ? (
                /* Primary Mode: Worker-by-Worker Bar Chart */
                <div className="h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={workerChartData}
                            margin={{ top: 15, right: 15, left: -15, bottom: 5 }}
                            barCategoryGap={workerChartData.length === 1 ? "60%" : "25%"}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis
                                dataKey="displayName"
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={{ stroke: "#334155" }}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={11}
                                tickLine={false}
                                axisLine={{ stroke: "#334155" }}
                                unit=" ppm·h"
                                domain={[0, yMax]}
                            />
                            <Tooltip content={<WorkerCustomTooltip />} />
                            <ReferenceLine
                                y={20}
                                stroke="#ef4444"
                                strokeDasharray="4 4"
                                label={{
                                    value: "OSHA 20 ppm·hr Action Limit",
                                    fill: "#f87171",
                                    fontSize: 10,
                                    position: "top"
                                }}
                            />
                            <ReferenceLine
                                y={10}
                                stroke="#10b981"
                                strokeDasharray="3 3"
                                strokeOpacity={0.5}
                                label={{
                                    value: "TWA 10 ppm Target",
                                    fill: "#34d399",
                                    fontSize: 10,
                                    position: "insideBottomLeft"
                                }}
                            />
                            <Bar
                                dataKey="dose"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={workerChartData.length === 1 ? 90 : 54}
                            >
                                {workerChartData.map((entry) => (
                                    <Cell key={`cell-${entry.id}`} fill={entry.barColor} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                /* Secondary Mode: 7-Day Timeline Trend */
                <div className="h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timelineData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                            <defs>
                                <linearGradient id="dashboardColorMax" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={{ stroke: "#334155" }}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={11}
                                tickLine={false}
                                axisLine={{ stroke: "#334155" }}
                                unit=" ppm·h"
                                domain={[0, yMax]}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#0f172a",
                                    borderColor: "#334155",
                                    borderRadius: "8px",
                                    color: "#fff",
                                    fontSize: "12px",
                                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)"
                                }}
                            />
                            <ReferenceLine
                                y={20}
                                stroke="#ef4444"
                                strokeDasharray="4 4"
                                label={{
                                    value: "OSHA Action Limit (20 ppm·hr)",
                                    fill: "#f87171",
                                    fontSize: 10,
                                    position: "top"
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="maxDose"
                                name="Peak Exposure"
                                stroke="#38bdf8"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#dashboardColorMax)"
                            />
                            <Area
                                type="monotone"
                                dataKey="avgDose"
                                name="Average Dose"
                                stroke="#10b981"
                                strokeWidth={2}
                                fillOpacity={0}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

export default ExposureChart;
