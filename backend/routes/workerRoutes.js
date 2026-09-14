import express from "express";
import Worker from "../models/Worker.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const workers = await Worker.find().sort({ id: 1 });
        res.json(workers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const worker = await Worker.findOne({ id: req.params.id });
        if (!worker) return res.status(404).json({ error: "Worker not found" });
        res.json(worker);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const newWorker = new Worker(req.body);
        const saved = await newWorker.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const updated = await Worker.findOneAndUpdate(
            { id: req.params.id },
            req.body,
            { new: true, upsert: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        await Worker.findOneAndDelete({ id: req.params.id });
        res.json({ message: "Worker deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
