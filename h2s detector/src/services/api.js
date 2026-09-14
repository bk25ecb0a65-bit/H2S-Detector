// Centralized API service connecting frontend to Express/MongoDB backend
// Includes transparent offline fallback to localStorage

const API_BASE_URL = "http://localhost:5000/api";

export async function checkBackendHealth() {
    try {
        const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
            const data = await res.json();
            return { online: true, ...data };
        }
        return { online: false };
    } catch {
        return { online: false };
    }
}

export async function fetchWorkersApi() {
    try {
        const res = await fetch(`${API_BASE_URL}/workers`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            const data = await res.json();
            return { success: true, data };
        }
        return { success: false };
    } catch {
        return { success: false };
    }
}

export async function saveWorkerApi(worker) {
    try {
        const res = await fetch(`${API_BASE_URL}/workers/${worker.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(worker),
            signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
            const data = await res.json();
            return { success: true, data };
        }
        return { success: false };
    } catch {
        return { success: false };
    }
}

export async function fetchScansApi(params = {}) {
    try {
        const query = new URLSearchParams(params).toString();
        const url = query ? `${API_BASE_URL}/scans?${query}` : `${API_BASE_URL}/scans`;
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            const data = await res.json();
            return { success: true, data };
        }
        return { success: false };
    } catch {
        return { success: false };
    }
}

export async function submitScanApi(scanData) {
    try {
        const res = await fetch(`${API_BASE_URL}/scans`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scanData),
            signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
            const data = await res.json();
            return { success: true, data };
        }
        return { success: false };
    } catch {
        return { success: false };
    }
}

export async function fetchAlertsApi() {
    try {
        const res = await fetch(`${API_BASE_URL}/alerts`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            const data = await res.json();
            return { success: true, data };
        }
        return { success: false };
    } catch {
        return { success: false };
    }
}

export async function acknowledgeAlertApi(alertId, actionTaken) {
    try {
        const res = await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ actionTaken }),
            signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
            const data = await res.json();
            return { success: true, data };
        }
        return { success: false };
    } catch {
        return { success: false };
    }
}
