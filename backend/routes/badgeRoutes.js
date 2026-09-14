import express from "express";
import Badge from "../models/Badge.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const badges = await Badge.find().sort({ badgeId: 1 });
        res.json(badges);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const newBadge = new Badge(req.body);
        const saved = await newBadge.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
