import express from "express";
import SafetyAlert from "../models/SafetyAlert.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const alerts = await SafetyAlert.find().sort({ timestamp: -1 });
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch("/:id/acknowledge", async (req, res) => {
    try {
        const alert = await SafetyAlert.findOneAndUpdate(
            { alertId: req.params.id },
            { acknowledged: true, actionTaken: req.body.actionTaken || "Acknowledged by safety officer" },
            { new: true }
        );
        if (!alert) return res.status(404).json({ error: "Alert not found" });
        res.json(alert);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
