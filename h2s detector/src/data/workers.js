// Shared workers and scans data helpers
export const INITIAL_WORKERS = [
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

export function getWorkers() {
    try {
        const saved = localStorage.getItem("h2s_workers_data");
        return saved ? JSON.parse(saved) : INITIAL_WORKERS;
    } catch (e) {
        return INITIAL_WORKERS;
    }
}

export function saveWorkers(workers) {
    localStorage.setItem("h2s_workers_data", JSON.stringify(workers));
}

export function getLogs() {
    try {
        const saved = localStorage.getItem("h2s_exposure_logs");
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
}
