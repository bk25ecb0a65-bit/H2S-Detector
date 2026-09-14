import express from "express";
import ExposureScan from "../models/ExposureScan.js";
import Worker from "../models/Worker.js";
import SafetyAlert from "../models/SafetyAlert.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const query = {};
        if (req.query.badge) query.badge = req.query.badge;
        if (req.query.workerId) query.workerId = req.query.workerId;
        const scans = await ExposureScan.find(query).sort({ timestamp: -1 });
        res.json(scans);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const scanData = req.body;
        if (!scanData.id) {
            scanData.id = "EXP-" + Math.floor(1000 + Math.random() * 9000);
        }
        if (!scanData.timestamp) {
            scanData.timestamp = new Date().toISOString().replace("T", " ").slice(0, 16);
        }

        const newScan = new ExposureScan(scanData);
        const savedScan = await newScan.save();

        let targetWorker = await Worker.findOne({ badge: scanData.badge });
        if (!targetWorker && scanData.workerId) {
            targetWorker = await Worker.findOne({ id: scanData.workerId });
        }

        if (targetWorker) {
            const doseIncrement = Number(scanData.doseIncrement || (scanData.exactPpm * 1.0) || 0);
            const currentDose = Number(targetWorker.dose || 0);
            const newTotalDose = Number((currentDose + doseIncrement).toFixed(1));
            targetWorker.dose = newTotalDose;
            targetWorker.status = newTotalDose >= 10 || scanData.isBlack || scanData.isGrey ? "Warning" : newTotalDose >= 7 ? "Review" : "Normal";
            targetWorker.lastScan = "Today, " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            await targetWorker.save();
        }

        if (scanData.exactPpm >= 10.0 || scanData.dose >= 10.0 || scanData.isGrey || scanData.isBlack) {
            const alertType = scanData.isBlack
                ? "BLACK_HAZARD_DETECTED"
                : scanData.isGrey
                ? "GREY_PBS_DETECTED"
                : "OSHA_10PPM_EXCEEDED";

            const newAlert = new SafetyAlert({
                alertId: "ALT-" + Math.floor(1000 + Math.random() * 9000),
                scanId: savedScan.id,
                workerId: scanData.workerId || targetWorker?.id || "W-UNKNOWN",
                workerName: scanData.worker || targetWorker?.name || "Operator",
                badge: scanData.badge,
                alertType,
                ppmMeasured: scanData.exactPpm,
                cumulativeDose: scanData.dose,
                timestamp: savedScan.timestamp,
                acknowledged: false,
                actionTaken: "Triggered automatically: Concentration >= 10.0 ppm OSHA limit."
            });
            await newAlert.save();
        }

        res.status(201).json(savedScan);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get("/stats/summary", async (req, res) => {
    try {
        const totalScans = await ExposureScan.countDocuments();
        const criticalScans = await ExposureScan.countDocuments({
            $or: [{ exactPpm: { $gte: 10 } }, { status: "Critical" }, { isGrey: true }, { isBlack: true }]
        });
        const activeWorkers = await Worker.countDocuments();
        res.json({
            totalScans,
            criticalScans,
            activeWorkers,
            universalThreshold: "10 ppm (OSHA Action Limit)"
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
