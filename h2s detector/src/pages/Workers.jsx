import React, { useState, useEffect } from "react";
import {
    Users,
    UserPlus,
    Search,
    ShieldCheck,
    AlertTriangle,
    Activity,
    Eye,
    Edit2,
    Trash2,
    X,
    CheckCircle2,
    Clock,
    Briefcase,
    Phone,
    SlidersHorizontal,
    ChevronDown
} from "lucide-react";
import StatCard from "../components/StatCard";

// Initial default workforce data
const INITIAL_WORKERS = [
    {
        id: "W-101",
        name: "Ravi Kumar",
        email: "ravi.kumar@petrogas.com",
        phone: "+91 98451 22341",
        badge: "H2S-00431",
        badgeExpiry: "2026-11-30",
        department: "Refining Unit B",
        role: "Senior Plant Operator",
        shift: "Morning",
        dose: 14.3,
        status: "Normal",
        lastScan: "Today, 10:30 AM"
    },
    {
        id: "W-102",
        name: "Arjun Rao",
        email: "arjun.rao@petrogas.com",
        phone: "+91 97120 44512",
        badge: "H2S-00432",
        badgeExpiry: "2026-10-15",
        department: "Sulfur Recovery Unit",
        role: "Field Technician",
        shift: "Night",
        dose: 21.7,
        status: "Review",
        lastScan: "Today, 06:15 AM"
    },
    {
        id: "W-103",
        name: "Rahul Singh",
        email: "rahul.singh@petrogas.com",
        phone: "+91 94560 88712",
        badge: "H2S-00433",
        badgeExpiry: "2026-12-05",
        department: "Pipeline Maintenance",
        role: "Maintenance Engineer",
        shift: "Morning",
        dose: 6.2,
        status: "Normal",
        lastScan: "Yesterday, 04:45 PM"
    },
    {
        id: "W-104",
        name: "Vikram Patel",
        email: "vikram.patel@petrogas.com",
        phone: "+91 98230 11904",
        badge: "H2S-00434",
        badgeExpiry: "2026-09-28",
        department: "Drilling Platform 4",
        role: "Drilling Specialist",
        shift: "Evening",
        dose: 18.5,
        status: "Review",
        lastScan: "Today, 02:20 PM"
    },
    {
        id: "W-105",
        name: "Priya Sharma",
        email: "priya.sharma@petrogas.com",
        phone: "+91 99120 77341",
        badge: "H2S-00435",
        badgeExpiry: "2027-01-15",
        department: "Chemical Analysis Lab",
        role: "Lab Chemist",
        shift: "Morning",
        dose: 3.1,
        status: "Normal",
        lastScan: "Today, 11:00 AM"
    },
    {
        id: "W-106",
        name: "Suresh Menon",
        email: "suresh.menon@petrogas.com",
        phone: "+91 96540 33219",
        badge: "H2S-00436",
        badgeExpiry: "2026-10-01",
        department: "Gas Processing Facility",
        role: "Safety Supervisor",
        shift: "Evening",
        dose: 27.8,
        status: "Warning",
        lastScan: "Today, 03:50 PM"
    }
];

function Workers() {
    // Load workers from localStorage or fallback to default
    const [workers, setWorkers] = useState(() => {
        const saved = localStorage.getItem("h2s_workers_data");
        return saved ? JSON.parse(saved) : INITIAL_WORKERS;
    });

    // Filtering & Searching State
    const [searchQuery, setSearchQuery] = useState("");
    const [shiftFilter, setShiftFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [deptFilter, setDeptFilter] = useState("All");

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingWorker, setEditingWorker] = useState(null);
    const [selectedWorkerDetails, setSelectedWorkerDetails] = useState(null);

    // Form state for Add/Edit
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        badge: "",
        badgeExpiry: "",
        department: "Refining Unit B",
        role: "",
        shift: "Morning",
        dose: 0
    });

    // Save to localStorage when workers change
    useEffect(() => {
        localStorage.setItem("h2s_workers_data", JSON.stringify(workers));
    }, [workers]);

    // Summary KPI Calculations
    const totalWorkers = workers.length;
    const activeOnShift = workers.filter(w => w.shift === "Morning" || w.shift === "Evening").length;
    const reviewCount = workers.filter(w => w.status === "Review" || w.status === "Warning").length;
    const normalCount = workers.filter(w => w.status === "Normal").length;

    // Filtered worker list
    const filteredWorkers = workers.filter(worker => {
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

    // Handle Open Add Modal
    const handleOpenAdd = () => {
        setEditingWorker(null);
        setFormData({
            name: "",
            email: "",
            phone: "",
            badge: `H2S-00${430 + workers.length + 1}`,
            badgeExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            department: "Refining Unit B",
            role: "Operator",
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
            email: worker.email,
            phone: worker.phone,
            badge: worker.badge,
            badgeExpiry: worker.badgeExpiry,
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
        const doseNum = parseFloat(formData.dose) || 0;
        let status = "Normal";
        if (doseNum >= 25) status = "Warning";
        else if (doseNum >= 18) status = "Review";

        if (editingWorker) {
            setWorkers(prev => prev.map(w => w.id === editingWorker.id ? {
                ...w,
                ...formData,
                dose: doseNum,
                status
            } : w));
        } else {
            const newWorker = {
                id: `W-${100 + workers.length + 1}`,
                ...formData,
                dose: doseNum,
                status,
                lastScan: "Just now"
            };
            setWorkers(prev => [newWorker, ...prev]);
        }
        setIsAddModalOpen(false);
    };

    // Delete Worker
    const handleDeleteWorker = (id) => {
        if (window.confirm("Are you sure you want to remove this worker from the registry?")) {
            setWorkers(prev => prev.filter(w => w.id !== id));
            if (selectedWorkerDetails?.id === id) setSelectedWorkerDetails(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Title & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Worker Management</h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        Track industrial personnel, assigned dosimeter badges, and cumulative H₂S exposure limits.
                    </p>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2.5 rounded-lg transition shadow-md shadow-sky-500/20 text-sm shrink-0"
                >
                    <UserPlus size={18} /> Add New Worker
                </button>
            </div>

            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <StatCard
                    title="Total Registered Workers"
                    value={totalWorkers}
                    description="All personnel in registry"
                    icon={<Users size={24} className="text-sky-400" />}
                />
                <StatCard
                    title="Active on Duty"
                    value={activeOnShift}
                    description="Morning & Evening shifts"
                    icon={<Clock size={24} className="text-emerald-400" />}
                />
                <StatCard
                    title="At-Risk / In Review"
                    value={reviewCount}
                    description="Exceeding threshold (>18 ppm·hr)"
                    icon={<AlertTriangle size={24} className="text-amber-400" />}
                />
                <StatCard
                    title="Safe Exposure Status"
                    value={normalCount}
                    description="Within permissible safety limits"
                    icon={<ShieldCheck size={24} className="text-green-400" />}
                />
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by worker name, badge ID, department..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
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
                        <option value="All">All Exposure Status</option>
                        <option value="Normal">Normal (&lt;18)</option>
                        <option value="Review">Review (18-25)</option>
                        <option value="Warning">Warning (&gt;25)</option>
                    </select>
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
                                <th className="py-3.5 px-5">Status</th>
                                <th className="py-3.5 px-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                            {filteredWorkers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-10 text-center text-slate-500">
                                        No workers match your search or filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredWorkers.map((worker) => (
                                    <tr key={worker.id} className="hover:bg-slate-800/40 transition">
                                        {/* Worker Avatar & Name */}
                                        <td className="py-4 px-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
                                                    {worker.name.split(" ").map(n => n[0]).join("")}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-white hover:text-sky-400 transition cursor-pointer" onClick={() => setSelectedWorkerDetails(worker)}>
                                                        {worker.name}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{worker.id}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Badge ID */}
                                        <td className="py-4 px-5">
                                            <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-sky-300">
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
                                                    <span className="text-slate-500">/ 30 ppm·hr</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            worker.dose >= 25 ? "bg-red-500" :
                                                            worker.dose >= 18 ? "bg-amber-400" :
                                                            "bg-emerald-400"
                                                        }`}
                                                        style={{ width: `${Math.min(100, (worker.dose / 30) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status */}
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
                                                    title="Edit Worker Info"
                                                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteWorker(worker.id)}
                                                    title="Remove Worker"
                                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
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
            {/* ADD / EDIT WORKER MODAL */}
            {/* ============================================================ */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <h2 className="text-lg font-bold text-white">
                                {editingWorker ? "Edit Worker Details" : "Register New Worker"}
                            </h2>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveWorker} className="space-y-4 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Ramesh Chandra"
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Current Cumulative Dose (ppm·hr)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={formData.dose}
                                        onChange={(e) => setFormData({ ...formData, dose: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                                    />
                                </div>
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
            {/* WORKER DETAILS & EXPOSURE HISTORY MODAL */}
            {/* ============================================================ */}
            {selectedWorkerDetails && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-5">
                        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-base">
                                    {selectedWorkerDetails.name.split(" ").map(n => n[0]).join("")}
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

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block mb-1">Assigned Badge</span>
                                <span className="font-mono text-sky-400 font-bold">{selectedWorkerDetails.badge}</span>
                            </div>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block mb-1">Badge Expiry</span>
                                <span className="text-slate-200 font-medium">{selectedWorkerDetails.badgeExpiry || "2026-12-31"}</span>
                            </div>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block mb-1">Assigned Shift</span>
                                <span className="text-slate-200 font-medium">{selectedWorkerDetails.shift}</span>
                            </div>
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
                                {selectedWorkerDetails.dose >= 25
                                    ? "⚠️ ALERT: Exposure exceeds safety limits. Immediate zone rotation and medical evaluation required."
                                    : selectedWorkerDetails.dose >= 18
                                    ? "⚠️ ATTENTION: Approaching OSHA exposure limit. Monitor closely on subsequent shifts."
                                    : "✓ SAFE: Cumulative exposure is well within occupational safety standards."}
                            </p>
                        </div>

                        {/* Contact details */}
                        <div className="text-xs space-y-2 bg-slate-950/40 p-3 rounded-lg border border-slate-800 text-slate-300">
                            <div className="flex items-center gap-2">
                                <Phone size={14} className="text-slate-500" />
                                <span>{selectedWorkerDetails.phone || "No phone listed"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Briefcase size={14} className="text-slate-500" />
                                <span>Employee ID: {selectedWorkerDetails.id}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <Clock size={14} className="text-slate-500" />
                                <span>Last Badge Scan: {selectedWorkerDetails.lastScan || "Recently"}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
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
        </div>
    );
}

export default Workers;