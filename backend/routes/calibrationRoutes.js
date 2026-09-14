import express from "express";
import CalibrationStandard from "../models/CalibrationStandard.js";
import EmpiricalMatrix from "../models/EmpiricalMatrix.js";

const router = express.Router();

router.get("/reference-strip", async (req, res) => {
    try {
        const blocks = await CalibrationStandard.find().sort({ blockId: 1 });
        res.json(blocks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/empirical-matrix", async (req, res) => {
    try {
        const items = await EmpiricalMatrix.find().sort({ durationKey: 1, ppm: 1 });
        const matrix = {};
        items.forEach(item => {
            if (!matrix[item.durationKey]) matrix[item.durationKey] = [];
            matrix[item.durationKey].push({
                label: item.label,
                ppm: item.ppm,
                rgb: item.rgb,
                hex: item.hex,
                note: item.note
            });
        });
        res.json(matrix);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
