// Centralized workers, badges, and exposure data helpers

export const INITIAL_WORKERS = [];

const DEFAULT_WORKER_NAMES = new Set([
    "Ravi Kumar",
    "Arjun Rao",
    "Rahul Singh",
    "Vikram Patel",
    "Priya Sharma",
    "Suresh Menon",
    "Devendra Joshi",
    "Ananya Deshmukh"
]);

const DEFAULT_WORKER_IDS = new Set([
    "W-101", "W-102", "W-103", "W-104", "W-105", "W-106", "W-107", "W-108"
]);

export const INITIAL_LOGS = [
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

/**
 * Calculates badge validity status based on expiration date.
 * Returns: { status: 'Active' | 'Expired' | 'Expiring Soon', label, daysLeft, color, badgeClass }
 */
export function getBadgeStatus(expiryDate) {
    if (!expiryDate) {
        return {
            status: "Active",
            label: "Active",
            daysLeft: null,
            color: "emerald",
            badgeClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
        return {
            status: "Expired",
            label: "Expired",
            daysLeft,
            daysPassed: Math.abs(daysLeft),
            color: "red",
            badgeClass: "bg-red-500/15 text-red-400 border border-red-500/30"
        };
    }

    if (daysLeft <= 30) {
        return {
            status: "Expiring Soon",
            label: daysLeft === 0 ? "Expires Today" : `Expires in ${daysLeft}d`,
            daysLeft,
            color: "amber",
            badgeClass: "bg-amber-500/15 text-amber-300 border border-amber-500/30"
        };
    }

    return {
        status: "Active",
        label: "Active",
        daysLeft,
        color: "emerald",
        badgeClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    };
}

/**
 * Aggregates workforce and badge status metrics
 */
export function calculateBadgeStats(workers = []) {
    let totalWorkers = workers.length;
    let activeBadges = 0;
    let expiredBadges = 0;
    let expiringSoonBadges = 0;
    let normalWorkers = 0;
    let reviewWorkers = 0;
    let warningWorkers = 0;

    workers.forEach(w => {
        const badgeInfo = getBadgeStatus(w.badgeExpiry);
        if (badgeInfo.status === "Expired") {
            expiredBadges++;
        } else {
            activeBadges++;
            if (badgeInfo.status === "Expiring Soon") {
                expiringSoonBadges++;
            }
        }

        if (w.status === "Warning") warningWorkers++;
        else if (w.status === "Review") reviewWorkers++;
        else normalWorkers++;
    });

    return {
        totalWorkers,
        activeBadges,
        expiredBadges,
        expiringSoonBadges,
        normalWorkers,
        reviewWorkers,
        warningWorkers,
        atRiskWorkers: reviewWorkers + warningWorkers
    };
}

export function getWorkers() {
    try {
        const saved = localStorage.getItem("h2s_workers_data");
        if (saved !== null) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                // One-time purge of previously loaded default demo workers
                const hasPurged = localStorage.getItem("h2s_default_workers_purged_v1");
                if (!hasPurged) {
                    localStorage.setItem("h2s_default_workers_purged_v1", "true");
                    const cleaned = parsed.filter(w =>
                        !DEFAULT_WORKER_IDS.has(w.id) &&
                        !DEFAULT_WORKER_NAMES.has(w.name) &&
                        !w.email?.endsWith("@petrogas.com")
                    );
                    localStorage.setItem("h2s_workers_data", JSON.stringify(cleaned));
                    return cleaned;
                }
                return parsed;
            }
        }
        localStorage.setItem("h2s_workers_data", JSON.stringify([]));
        return [];
    } catch {
        return [];
    }
}

export function clearAllWorkers() {
    saveWorkers([]);
    return [];
}

export function resetWorkersToDefault() {
    return clearAllWorkers();
}

export function saveWorkers(workers) {
    try {
        localStorage.setItem("h2s_workers_data", JSON.stringify(workers));
        window.dispatchEvent(new CustomEvent("h2s_workers_updated", { detail: workers }));
    } catch (e) {
        console.error("Failed to save workers:", e);
    }
}

export function getLogs() {
    try {
        const saved = localStorage.getItem("h2s_exposure_logs");
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
        localStorage.setItem("h2s_exposure_logs", JSON.stringify(INITIAL_LOGS));
        return INITIAL_LOGS;
    } catch {
        return INITIAL_LOGS;
    }
}

export function saveLogs(logs) {
    try {
        localStorage.setItem("h2s_exposure_logs", JSON.stringify(logs));
        window.dispatchEvent(new CustomEvent("h2s_logs_updated", { detail: logs }));
    } catch (e) {
        console.error("Failed to save logs:", e);
    }
}

/**
 * Helper to replace or renew a worker's badge with a new badge ID and validity period
 */
export function renewWorkerBadge(workerId, newBadgeId, daysValid = 90) {
    const workers = getWorkers();
    const expiryDate = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    const updated = workers.map(w => {
        if (w.id === workerId) {
            return {
                ...w,
                badge: newBadgeId || w.badge,
                badgeExpiry: expiryDate
            };
        }
        return w;
    });

    saveWorkers(updated);
    return updated;
}
