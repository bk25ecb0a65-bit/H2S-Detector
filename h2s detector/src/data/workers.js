import { fetchWorkersApi, saveWorkerApi, fetchScansApi, submitScanApi } from "../services/api.js";
// Centralized workers, badges, and exposure data helpers

export const INITIAL_WORKERS = [
    {
        id: "W-101",
        name: "Ravi Kumar",
        email: "ravi.kumar@petrogas.com",
        phone: "+91 98451 22341",
        badge: "H2S-00431",
        department: "Refining Unit B",
        role: "Senior Plant Operator",
        shift: "Morning",
        dose: 4.2,
        status: "Normal",
        lastScan: "Today, 10:30 AM"
    }
];

const REMOVED_DEMO_NAMES = new Set([
    "Arjun Rao",
    "Rahul Singh",
    "Vikram Patel",
    "Priya Sharma",
    "Suresh Menon",
    "Devendra Joshi",
    "Ananya Deshmukh"
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
        concentration: "1.0 ppm",
        dose: 4.2,
        status: "Normal",
        notes: "Routine shift inspection. Ventilation active."
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
        concentration: "0.3 ppm",
        dose: 3.1,
        status: "Normal",
        notes: "Catalyst changeover inspection."
    },
    {
        id: "EXP-8895",
        timestamp: "2026-09-07 09:15",
        worker: "Ravi Kumar",
        workerId: "W-101",
        badge: "H2S-00431",
        location: "Refining Unit B - Control Station",
        shift: "Morning",
        duration: "5 min scan",
        concentration: "~100–500 ppb",
        dose: 1.8,
        status: "Normal",
        notes: "Baseline shift startup monitoring."
    }
];

/**
 * Badge status helper (Normal / Active)
 */
export function getBadgeStatus() {
    return {
        status: "Active",
        label: "Active",
        color: "emerald",
        badgeClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    };
}

/**
 * Aggregates workforce and badge status metrics
 */
export function calculateBadgeStats(workers = []) {
    const totalWorkers = workers.length;
    let activeBadges = 0;
    let normalWorkers = 0;
    let reviewWorkers = 0;
    let warningWorkers = 0;

    workers.forEach(w => {
        if (w.badge) activeBadges++;
        if (w.status === "Warning") warningWorkers++;
        else if (w.status === "Review") reviewWorkers++;
        else normalWorkers++;
    });

    return {
        totalWorkers,
        activeBadges,
        expiredBadges: 0,
        expiringSoonBadges: 0,
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
                // Filter out only specific legacy demo records if present from older versions
                const filtered = parsed.filter(w =>
                    !REMOVED_DEMO_NAMES.has(w.name) &&
                    !w.email?.includes("arjun.rao") &&
                    !w.email?.includes("rahul.singh") &&
                    !w.email?.includes("vikram.patel") &&
                    !w.email?.includes("priya.sharma") &&
                    !w.email?.includes("suresh.menon") &&
                    !w.email?.includes("devendra.joshi") &&
                    !w.email?.includes("ananya.deshmukh")
                );
                if (filtered.length !== parsed.length) {
                    localStorage.setItem("h2s_workers_data", JSON.stringify(filtered));
                }
                return filtered;
            }
        }
        localStorage.setItem("h2s_workers_data", JSON.stringify(INITIAL_WORKERS));
        return INITIAL_WORKERS;
    } catch {
        return INITIAL_WORKERS;
    }
}

export function clearAllWorkers() {
    saveWorkers([]);
    return [];
}

export function resetWorkersToDefault() {
    localStorage.setItem("h2s_workers_data", JSON.stringify(INITIAL_WORKERS));
    window.dispatchEvent(new CustomEvent("h2s_workers_updated", { detail: INITIAL_WORKERS }));
    return INITIAL_WORKERS;
}

export function saveWorkers(workers) {
    try {
        localStorage.setItem("h2s_workers_data", JSON.stringify(workers));
        window.dispatchEvent(new CustomEvent("h2s_workers_updated", { detail: workers }));
        if (Array.isArray(workers)) {
            workers.forEach(w => saveWorkerApi(w).catch(() => {}));
        }
    } catch (e) {
        console.error("Failed to save workers:", e);
    }
}

export function getLogs(customWorkers) {
    try {
        const workers = customWorkers || getWorkers();
        const activeNames = new Set(workers.map(w => (w.name || "").trim().toLowerCase()));

        const saved = localStorage.getItem("h2s_exposure_logs");
        let parsedLogs = [];
        if (saved !== null) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                parsedLogs = parsed;
            }
        } else {
            // Only use INITIAL_LOGS if Ravi Kumar is actually in the active workers list
            if (activeNames.has("ravi kumar")) {
                parsedLogs = INITIAL_LOGS;
            }
        }

        // Strictly keep logs ONLY for workers whose name exists in the active workers list
        const filtered = parsedLogs.filter(l => {
            if (!l || !l.worker || REMOVED_DEMO_NAMES.has(l.worker)) return false;
            const wName = l.worker.trim().toLowerCase();
            return activeNames.has(wName);
        });

        if (saved !== null && filtered.length !== parsedLogs.length) {
            localStorage.setItem("h2s_exposure_logs", JSON.stringify(filtered));
        }

        return filtered;
    } catch {
        return [];
    }
}

export function saveLogs(logs) {
    try {
        localStorage.setItem("h2s_exposure_logs", JSON.stringify(logs));
        window.dispatchEvent(new CustomEvent("h2s_logs_updated", { detail: logs }));
        if (Array.isArray(logs) && logs.length > 0) {
            submitScanApi(logs[0]).catch(() => {});
        }
    } catch (e) {
        console.error("Failed to save logs:", e);
    }
}

/**
 * Helper to reassign or replace a worker's badge ID
 */
export function renewWorkerBadge(workerId, newBadgeId) {
    const workers = getWorkers();
    const updated = workers.map(w => {
        if (w.id === workerId) {
            return {
                ...w,
                badge: newBadgeId || w.badge
            };
        }
        return w;
    });

    saveWorkers(updated);
    return updated;
}

/**
 * Purges any exposure logs for workers not currently in the workers list
 */
export function purgeOrphanedLogs() {
    try {
        const workers = getWorkers();
        const activeNames = new Set(workers.map(w => (w.name || "").trim().toLowerCase()));
        const saved = localStorage.getItem("h2s_exposure_logs");
        if (saved !== null) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                const cleaned = parsed.filter(l => l && l.worker && activeNames.has(l.worker.trim().toLowerCase()));
                if (cleaned.length !== parsed.length) {
                    localStorage.setItem("h2s_exposure_logs", JSON.stringify(cleaned));
                    window.dispatchEvent(new CustomEvent("h2s_logs_updated", { detail: cleaned }));
                    return cleaned;
                }
                return parsed;
            }
        }
        return [];
    } catch {
        return [];
    }
}

// Automatic initialization sync with MongoDB backend
export function initMongoSync() {
    if (typeof window === "undefined") return;
    fetchWorkersApi().then(res => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            localStorage.setItem("h2s_workers_data", JSON.stringify(res.data));
            window.dispatchEvent(new CustomEvent("h2s_workers_updated", { detail: res.data }));
        }
    }).catch(() => {});

    fetchScansApi().then(res => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            localStorage.setItem("h2s_exposure_logs", JSON.stringify(res.data));
            window.dispatchEvent(new CustomEvent("h2s_logs_updated", { detail: res.data }));
        }
    }).catch(() => {});
}
initMongoSync();
