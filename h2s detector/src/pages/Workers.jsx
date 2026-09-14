import { useState, useEffect, useMemo } from "react";
import {
    Users,
    UserPlus,
    Search,
    ShieldCheck,
    Activity,
    Eye,
    Edit2,
    Trash2,
    X,
    Clock,
    Briefcase,
    Phone,
    RotateCcw,
    CheckCircle2,
    Mail
} from "lucide-react";
import StatCard from "../components/StatCard";
import {
    getWorkers,
    saveWorkers,
    calculateBadgeStats,
    resetWorkersToDefault,
    saveLogs,
    INITIAL_LOGS
} from "../data/workers.js";

function Workers() {
    // Load workers from centralized data layer
    const [workers, setWorkers] = useState(() => getWorkers());

    // Filtering & Searching State
    const [searchQuery, setSearchQuery] = useState("");
    const [shiftFilter, setShiftFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [deptFilter, setDeptFilter] = useState("All");

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingWorker, setEditingWorker] = useState(null);
    const [selectedWorkerDetails, setSelectedWorkerDetails] = useState(null);
    const [workerToDelete, setWorkerToDelete] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);

    // Form state for Add/Edit
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        badge: "",
        department: "Refining Unit B",
        role: "",
        shift: "Morning",
        dose: 0
    });

    // Listen for storage / custom updates so changes sync across components
    useEffect(() => {
        const handleSync = () => {
            setWorkers(getWorkers());
        };
        window.addEventListener("focus", handleSync);
        window.addEventListener("storage", handleSync);
        window.addEventListener("h2s_workers_updated", handleSync);
        return () => {
            window.removeEventListener("focus", handleSync);
            window.removeEventListener("storage", handleSync);
            window.removeEventListener("h2s_workers_updated", handleSync);
        };
    }, []);

    // Summary KPI Calculations
    const stats = useMemo(() => {
        return calculateBadgeStats(workers);
    }, [workers]);

    // Filtered worker list
    const filteredWorkers = useMemo(() => {
        return workers.filter(worker => {
            const matchesSearch =
                worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                worker.badge.toLowerCase().includes(searchQuery.toLowerCase()) ||
                worker.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                worker.id.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesShift = shiftFilter === "All" || worker.shift === shiftFilter;
            const matchesStatus = statusFilter === "All" || worker.status === statusFilter;
            const matchesDept = deptFilter === "All" || worker.department === deptFilter;

            return matchesSearch && matchesShift && matchesStatus && matchesDept;
        });
    }, [workers, searchQuery, shiftFilter, statusFilter, deptFilter]);

    // Handle Open Add Modal
    const handleOpenAdd = () => {
        setEditingWorker(null);
        const maxNum = workers.reduce((max, w) => {
            const n = parseInt(String(w.id || "").match(/\d+/)?.[0] || "0", 10);
            return n > max ? n : max;
        }, 100);

        setFormData({
            name: "",
            email: "",
            phone: "",
            badge: `H2S-00${430 + (maxNum - 100) + 1}`,
            department: "Refining Unit B",
            role: "Plant Operator",
            shift: "Morning",
            dose: 0
        });
        setIsAddModalOpen(true);
    };

    // Handle Open Edit Modal
    const handleOpenEdit = (worker) => {
        setEditingWorker(worker);
        setFormData({
            name: worker.name,
            email: worker.email || "",
            phone: worker.phone || "",
            badge: worker.badge,
            department: worker.department,
            role: worker.role,
            shift: worker.shift,
            dose: worker.dose
        });
        setIsAddModalOpen(true);
    };

    // Save Worker (Add or Edit)
    const handleSaveWorker = (e) => {
        e.preventDefault();
        let updatedList;
        if (editingWorker) {
            const doseNum = parseFloat(formData.dose) || 0;
            let status = "Normal";
            if (doseNum >= 10) status = "Warning";
            else if (doseNum >= 7) status = "Review";

            const updatedWorker = {
                ...editingWorker,
                ...formData,
                dose: doseNum,
                status
            };
            updatedList = workers.map(w => w.id === editingWorker.id ? updatedWorker : w);
            setToastMessage(`✓ Worker ${formData.name} updated successfully.`);
            if (selectedWorkerDetails?.id === editingWorker.id) {
                setSelectedWorkerDetails(updatedWorker);
            }
        } else {
            const maxNum = workers.reduce((max, w) => {
                const n = parseInt(String(w.id || "").match(/\d+/)?.[0] || "0", 10);
                return n > max ? n : max;
            }, 100);
            const newWorker = {
                id: `W-${maxNum + 1}`,
                ...formData,
                dose: 0.0,
                status: "Normal",
                lastScan: "Just now"
            };
            updatedList = [newWorker, ...workers];
            setToastMessage(`✓ Worker ${newWorker.name} created successfully.`);
            setSelectedWorkerDetails(newWorker);
        }

        setWorkers(updatedList);
        saveWorkers(updatedList);
        setIsAddModalOpen(false);
        setTimeout(() => setToastMessage(null), 4000);
    };

    // Delete Worker with reliable custom confirmation
    const confirmDeleteWorker = () => {
        if (!workerToDelete) return;
        const deletedName = workerToDelete.name;
        const deletedId = workerToDelete.id;
        const deletedBadge = workerToDelete.badge;

        const updated = workers.filter(w => w.id !== deletedId);
        setWorkers(updated);
        saveWorkers(updated);

        // Also purge logs for this deleted worker from exposure history
        try {
            const rawLogs = JSON.parse(localStorage.getItem("h2s_exposure_logs") || "[]");
            const updatedLogs = rawLogs.filter(l =>
                l.workerId !== deletedId &&
                l.worker !== deletedName &&
                (!deletedBadge || l.badge !== deletedBadge)
            );
            saveLogs(updatedLogs);
        } catch (e) {
            console.error("Failed to clean up logs on worker delete:", e);
        }

        if (selectedWorkerDetails?.id === deletedId) {
            setSelectedWorkerDetails(null);
        }

        setToastMessage(`✓ Worker ${deletedName} (${deletedId}) permanently removed.`);
        setWorkerToDelete(null);
        setTimeout(() => setToastMessage(null), 4000);
    };

    // Reset workforce to single default worker
    const handleResetDefault = () => {
        if (window.confirm("Reset workforce to standard default profile (1 worker)? Any custom workers will be replaced.")) {
            const defaults = resetWorkersToDefault();
            setWorkers(defaults);
            saveLogs(INITIAL_LOGS);
            setSelectedWorkerDetails(null);
            setToastMessage("✓ Workforce reset to 1 standard default worker (Ravi Kumar).");
            setTimeout(() => setToastMessage(null), 4000);
        }
    };

    // Clear all workers from registry
    const handleClearAll = () => {
        if (window.confirm("Are you sure you want to remove all workers from the registry?")) {
            saveWorkers([]);
            saveLogs([]);
            setWorkers([]);
            setSelectedWorkerDetails(null);
            setToastMessage("✓ All worker records cleared.");
            setTimeout(() => setToastMessage(null), 4000);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Title & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Worker Management</h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        Workforce registry, dosimeter badge assignments, and cumulative H₂S exposure records.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleResetDefault}
                        title="Reset to 1 default worker"
                        className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                        <RotateCcw size={15} /> Reset Default
                    </button>
                    {workers.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            title="Remove all workers from registry"
                            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-800/80 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                            <Trash2 size={15} /> Clear All
                        </button>
                    )}
                    <button
                        onClick={handleOpenAdd}
                        className="inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2.5 rounded-lg transition shadow-md shadow-sky-500/20 text-sm shrink-0 cursor-pointer"
                    >
                        <UserPlus size={18} /> Add New Worker
                    </button>
                </div>
            </div>

            {/* Notification Toast */}
            {toastMessage && (
                <div className="flex items-center gap-3 p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl text-emerald-300 text-sm shadow-lg">
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <StatCard
                    title="Total Registered Workers"
                    value={stats.totalWorkers}
                    description="Active personnel in safety registry"
                    icon={<Users size={24} className="text-sky-400" />}
                    badge="Directory"
                />

                <StatCard
                    title="Active Badges"
                    value={stats.activeBadges}
                    description="Assigned dosimeter badges"
                    icon={<ShieldCheck size={24} className="text-emerald-400" />}
                    badge="Circulating"
                />

                <StatCard
                    title="Safe Personnel"
                    value={stats.normalWorkers}
                    description="Cumulative dose < 7 ppm·hr"
                    icon={<ShieldCheck size={24} className="text-emerald-400" />}
                    badge={stats.atRiskWorkers > 0 ? `${stats.atRiskWorkers} At Risk` : "All Safe"}
                />

                <StatCard
                    title="At-Risk / In Review"
                    value={stats.atRiskWorkers}
                    description="Approaching safety limit (≥7 ppm·hr)"
                    icon={<Activity size={24} className="text-amber-400" />}
                    onClick={() => setStatusFilter("Review")}
                    badge={stats.atRiskWorkers > 0 ? "Monitor" : "Safe"}
                />
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by worker name, badge ID, department, or employee ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Department Filter */}
                    <select
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                        <option value="All">All Departments</option>
                        <option value="Refining Unit B">Refining Unit B</option>
                        <option value="Sulfur Recovery Unit">Sulfur Recovery Unit</option>
                        <option value="Pipeline Maintenance">Pipeline Maintenance</option>
                        <option value="Drilling Platform 4">Drilling Platform 4</option>
                        <option value="Chemical Analysis Lab">Chemical Analysis Lab</option>
                        <option value="Gas Processing Facility">Gas Processing Facility</option>
                    </select>

                    {/* Shift Filter */}
                    <select
                        value={shiftFilter}
                        onChange={(e) => setShiftFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                        <option value="All">All Shifts</option>
                        <option value="Morning">Morning</option>
                        <option value="Evening">Evening</option>
                        <option value="Night">Night</option>
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                        <option value="All">All Dose Statuses</option>
                        <option value="Normal">Normal (&lt;7)</option>
                        <option value="Review">Review (7-10)</option>
                        <option value="Warning">Warning (&ge;10)</option>
                    </select>

                    {/* Reset Filters */}
                    {(deptFilter !== "All" || shiftFilter !== "All" || statusFilter !== "All" || searchQuery) && (
                        <button
                            onClick={() => {
                                setDeptFilter("All");
                                setShiftFilter("All");
                                setStatusFilter("All");
                                setSearchQuery("");
                            }}
                            className="px-2.5 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
                            title="Reset all filters"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Workers Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="py-3.5 px-5">Worker Details</th>
                                <th className="py-3.5 px-5">Badge ID</th>
                                <th className="py-3.5 px-5">Department & Role</th>
                                <th className="py-3.5 px-5">Shift</th>
                                <th className="py-3.5 px-5">Cumulative Dose</th>
                                <th className="py-3.5 px-5">Exposure Status</th>
                                <th className="py-3.5 px-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                            {filteredWorkers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-slate-500">
                                        No workers found in registry. Click "Add New Worker" to register personnel.
                                    </td>
                                </tr>
                            ) : (
                                filteredWorkers.map((worker) => (
                                    <tr key={worker.id} className="hover:bg-slate-800/40 transition">
                                        {/* Worker Avatar & Name */}
                                        <td className="py-4 px-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
                                                    {(worker.name || "Worker").trim().split(/\s+/).map(n => n[0]).filter(Boolean).join("").toUpperCase().slice(0, 2) || "W"}
                                                </div>
                                                <div>
                                                    <div
                                                        className="font-semibold text-white hover:text-sky-400 transition cursor-pointer"
                                                        onClick={() => setSelectedWorkerDetails(worker)}
                                                    >
                                                        {worker.name}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{worker.id}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Badge ID */}
                                        <td className="py-4 px-5">
                                            <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-sky-300 font-semibold">
                                                {worker.badge}
                                            </span>
                                        </td>

                                        {/* Department & Role */}
                                        <td className="py-4 px-5">
                                            <div className="text-slate-200">{worker.department}</div>
                                            <div className="text-xs text-slate-500">{worker.role}</div>
                                        </td>

                                        {/* Shift */}
                                        <td className="py-4 px-5">
                                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                                worker.shift === "Morning" ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" :
                                                worker.shift === "Evening" ? "bg-purple-500/10 text-purple-300 border border-purple-500/20" :
                                                "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                                            }`}>
                                                {worker.shift}
                                            </span>
                                        </td>

                                        {/* Cumulative Dose with progress indicator */}
                                        <td className="py-4 px-5">
                                            <div className="w-32">
                                                <div className="flex justify-between text-xs mb-1 font-mono">
                                                    <span className="font-semibold text-slate-200">{worker.dose}</span>
                                                    <span className="text-slate-500">/ 10 ppm·hr</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            worker.dose >= 10 ? "bg-red-500" :
                                                            worker.dose >= 7 ? "bg-amber-400" :
                                                            "bg-emerald-400"
                                                        }`}
                                                        style={{ width: `${Math.min(100, (worker.dose / 10) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        {/* Exposure Status */}
                                        <td className="py-4 px-5">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                                                worker.status === "Normal" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                worker.status === "Review" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                                "bg-red-500/10 text-red-400 border border-red-500/20"
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    worker.status === "Normal" ? "bg-emerald-400" :
                                                    worker.status === "Review" ? "bg-amber-400" :
                                                    "bg-red-400 animate-ping"
                                                }`} />
                                                {worker.status}
                                            </span>
                                        </td>

                                        {/* Action buttons */}
                                        <td className="py-4 px-5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setSelectedWorkerDetails(worker)}
                                                    title="View Profile & Dose Details"
                                                    className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEdit(worker)}
                                                    title="Edit Worker Details"
                                                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setWorkerToDelete(worker)}
                                                    title="Delete Worker Record"
                                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ============================================================ */}
            {/* ADD / EDIT WORKER MODAL                                      */}
            {/* ============================================================ */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {editingWorker ? "Edit Worker Details" : "Add New Worker"}
                                </h2>
                                <p className="text-xs text-slate-400">
                                    {editingWorker ? "Update employee information and dosimeter badge" : "Register employee into dosimeter monitoring system"}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveWorker} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Worker Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Rahul Verma"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Assigned Badge ID</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.badge}
                                        onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                                        placeholder="e.g. H2S-00438"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-sky-300 focus:outline-none focus:border-sky-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="name@petrogas.com"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+91 98000 00000"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Department</label>
                                    <select
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                                    >
                                        <option value="Refining Unit B">Refining Unit B</option>
                                        <option value="Sulfur Recovery Unit">Sulfur Recovery Unit</option>
                                        <option value="Pipeline Maintenance">Pipeline Maintenance</option>
                                        <option value="Drilling Platform 4">Drilling Platform 4</option>
                                        <option value="Chemical Analysis Lab">Chemical Analysis Lab</option>
                                        <option value="Gas Processing Facility">Gas Processing Facility</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Role / Job Title</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        placeholder="e.g. Plant Operator"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                                    />
                                </div>
                            </div>

                            <div className={`grid grid-cols-1 ${editingWorker ? "sm:grid-cols-2" : ""} gap-4`}>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Shift</label>
                                    <select
                                        value={formData.shift}
                                        onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                                    >
                                        <option value="Morning">Morning Shift</option>
                                        <option value="Evening">Evening Shift</option>
                                        <option value="Night">Night Shift</option>
                                    </select>
                                </div>
                                {editingWorker && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1">Cumulative Dose (ppm·hr)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={formData.dose}
                                            onChange={(e) => setFormData({ ...formData, dose: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition shadow-md shadow-sky-500/20"
                                >
                                    {editingWorker ? "Save Changes" : "Create Worker"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* WORKER DETAILS MODAL                                         */}
            {/* ============================================================ */}
            {selectedWorkerDetails && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-5">
                        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-base">
                                    {(selectedWorkerDetails.name || "Worker").trim().split(/\s+/).map(n => n[0]).filter(Boolean).join("").toUpperCase().slice(0, 2) || "W"}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{selectedWorkerDetails.name}</h2>
                                    <p className="text-xs text-slate-400">{selectedWorkerDetails.role} · {selectedWorkerDetails.department}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedWorkerDetails(null)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Exposure Banner */}
                        <div className={`p-4 rounded-xl border ${
                            selectedWorkerDetails.status === "Normal" ? "bg-emerald-950/20 border-emerald-800/40" :
                            selectedWorkerDetails.status === "Review" ? "bg-amber-950/20 border-amber-800/40" :
                            "bg-red-950/20 border-red-800/40"
                        }`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Total Cumulative Dose
                                </span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    selectedWorkerDetails.status === "Normal" ? "bg-emerald-500/20 text-emerald-400" :
                                    selectedWorkerDetails.status === "Review" ? "bg-amber-500/20 text-amber-400" :
                                    "bg-red-500/20 text-red-400"
                                }`}>
                                    {selectedWorkerDetails.status}
                                </span>
                            </div>
                            <div className="text-3xl font-black text-white font-mono">
                                {selectedWorkerDetails.dose} <span className="text-sm font-sans font-normal text-slate-400">ppm·hr</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                                {selectedWorkerDetails.dose >= 10
                                    ? "⚠️ ALERT: Exposure exceeds 10 ppm·hr action limit. Immediate zone rotation and medical evaluation required."
                                    : selectedWorkerDetails.dose >= 7
                                    ? "⚠️ ATTENTION: Approaching 10 ppm·hr OSHA action limit. Monitor closely on subsequent shifts."
                                    : "✓ SAFE: Cumulative exposure is well within occupational safety standards (<7 ppm·hr)."}
                            </p>
                        </div>

                        {/* Contact & Employee Details */}
                        <div className="text-xs space-y-2.5 bg-slate-950/40 p-4 rounded-lg border border-slate-800 text-slate-300">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                                <span className="text-slate-400 font-medium">Assigned Badge ID:</span>
                                <span className="font-mono text-sky-400 font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                                    {selectedWorkerDetails.badge}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail size={14} className="text-slate-500" />
                                <span>{selectedWorkerDetails.email || "No email listed"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone size={14} className="text-slate-500" />
                                <span>{selectedWorkerDetails.phone || "No phone listed"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Briefcase size={14} className="text-slate-500" />
                                <span>Employee ID: {selectedWorkerDetails.id} · Shift: {selectedWorkerDetails.shift}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <Clock size={14} className="text-slate-500" />
                                <span>Last Badge Scan: {selectedWorkerDetails.lastScan || "Recently"}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => {
                                    const target = selectedWorkerDetails;
                                    setSelectedWorkerDetails(null);
                                    handleOpenEdit(target);
                                }}
                                className="px-4 py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs rounded-lg transition font-semibold flex items-center gap-1.5"
                            >
                                <Edit2 size={13} /> Edit Worker
                            </button>
                            <button
                                onClick={() => setSelectedWorkerDetails(null)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* DELETE WORKER CONFIRMATION MODAL                             */}
            {/* ============================================================ */}
            {workerToDelete && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-red-950/60 rounded-xl border border-red-800/40 text-red-400">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Delete Worker Record</h2>
                                <p className="text-xs text-slate-400">Permanently remove personnel from registry</p>
                            </div>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Worker Name:</span>
                                <span className="font-bold text-white">{workerToDelete.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Employee ID:</span>
                                <span className="font-mono text-slate-300">{workerToDelete.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Assigned Badge:</span>
                                <span className="font-mono text-sky-400">{workerToDelete.badge}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Department:</span>
                                <span className="text-slate-200">{workerToDelete.department}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Cumulative Dose:</span>
                                <span className="font-mono text-slate-200">{workerToDelete.dose} ppm·hr</span>
                            </div>
                        </div>

                        <p className="text-xs text-slate-400">
                            Are you sure you want to delete this worker? Their dosimeter badge assignments and records will be removed from the registry.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setWorkerToDelete(null)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteWorker}
                                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition shadow-lg shadow-red-600/30 flex items-center gap-1.5"
                            >
                                <Trash2 size={14} /> Delete Worker
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Workers;
