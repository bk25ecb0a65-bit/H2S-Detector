// Centralized workers, badges, and exposure data helpers

export const INITIAL_WORKERS = [
    {
        id: "W-101",
        name: "Ravi Kumar",
        email: "ravi.kumar@petrogas.com",
        phone: "+91 98451 22341",
        badge: "H2S-00431",
        badgeExpiry: "2026-11-30", // Active (> 30 days)
        department: "Refining Unit B",
        role: "Senior Plant Operator",
        shift: "Morning",
        dose: 14.3,
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
        concentration: "2 ppm",
        dose: 14.3,
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
        concentration: "1 ppm",
        dose: 11.2,
        status: "Normal",
        notes: "Catalyst changeover inspection."
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
    } catch (e) {
        console.error("Failed to save workers:", e);
    }
}

export function getLogs() {
    try {
        const saved = localStorage.getItem("h2s_exposure_logs");
        if (saved !== null) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                // Filter out logs for removed demo workers
                const filtered = parsed.filter(l =>
                    !REMOVED_DEMO_NAMES.has(l.worker)
                );
                if (filtered.length !== parsed.length) {
                    localStorage.setItem("h2s_exposure_logs", JSON.stringify(filtered));
                }
                return filtered;
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
