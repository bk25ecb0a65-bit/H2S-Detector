import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import Worker from "../models/Worker.js";
import Badge from "../models/Badge.js";
import ExposureScan from "../models/ExposureScan.js";
import CalibrationStandard from "../models/CalibrationStandard.js";
import EmpiricalMatrix from "../models/EmpiricalMatrix.js";
import SafetyAlert from "../models/SafetyAlert.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
    try {
        const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/h2s_detector";
        console.log(`[Seeder] Connecting to ${uri}...`);
        await mongoose.connect(uri);

        // 1. Seed Workers
        console.log("[Seeder] Clearing old workers...");
        await Worker.deleteMany({});
        const initialWorker = {
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
        };
        await Worker.create(initialWorker);
        console.log("[Seeder] Seeded active worker: Ravi Kumar (W-101)");

        // 2. Seed Badges
        console.log("[Seeder] Clearing old badges...");
        await Badge.deleteMany({});
        await Badge.create({
            badgeId: "H2S-00431",
            assignedWorkerId: "W-101",
            status: "Active",
            batchNumber: "BATCH-2026-Q3-PbS"
        });
        console.log("[Seeder] Seeded badge: H2S-00431");

        // 3. Seed Exposure Logs
        console.log("[Seeder] Clearing old exposure scans...");
        await ExposureScan.deleteMany({});
        const initialLogs = [
            {
                id: "EXP-8901",
                timestamp: "2026-09-12 14:35",
                worker: "Ravi Kumar",
                workerId: "W-101",
                badge: "H2S-00431",
                location: "Refining Unit B - Flare Header",
                shift: "Morning",
                duration: "5 min",
                concentration: "1.0 ppm",
                exactPpm: 1.0,
                dose: 4.2,
                doseIncrement: 1.0,
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
                duration: "5 min",
                concentration: "0.3 ppm",
                exactPpm: 0.3,
                dose: 3.1,
                doseIncrement: 0.3,
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
                duration: "5 min",
                concentration: "~100–500 ppb",
                exactPpm: 0.2,
                dose: 1.8,
                doseIncrement: 0.2,
                status: "Normal",
                notes: "Baseline shift startup monitoring."
            }
        ];
        await ExposureScan.insertMany(initialLogs);
        console.log(`[Seeder] Seeded ${initialLogs.length} exposure scans.`);

        // 4. Seed 7-Block Reference Scale Standards
        console.log("[Seeder] Clearing old calibration standards...");
        await CalibrationStandard.deleteMany({});
        const standards = [
            { blockId: 0, level: "0.0 ppm", ppm: 0.0, colorCategory: "Blank Substrate", rgb: [236, 231, 212], hex: "#ece7d4", desc: "Unexposed Baseline Paper Substrate" },
            { blockId: 1, level: "0.3 ppm", ppm: 0.3, colorCategory: "Trace Cream", rgb: [212, 204, 157], hex: "#d4cc9d", desc: "Trace Substrate Calibrator" },
            { blockId: 2, level: "1.0 ppm", ppm: 1.0, colorCategory: "Yellow", rgb: [209, 174, 92], hex: "#d1ae5c", desc: "Mid-Range Yellow Calibrator" },
            { blockId: 3, level: "2.0 ppm", ppm: 2.0, colorCategory: "Amber", rgb: [217, 173, 76], hex: "#d9ad4c", desc: "Moderate Amber Calibrator" },
            { blockId: 4, level: "5.0 ppm", ppm: 5.0, colorCategory: "Deep Amber", rgb: [204, 156, 48], hex: "#cc9c30", desc: "High Tone Deep Amber Calibrator" },
            { blockId: 5, level: "10.0 ppm", ppm: 10.0, colorCategory: "Grey", rgb: [142, 132, 122], hex: "#8e847a", desc: "OSHA Action Limit Grey Calibrator", status: "Critical" },
            { blockId: 6, level: "20.0 ppm", ppm: 20.0, colorCategory: "Black", rgb: [42, 38, 35], hex: "#2a2623", desc: "High Saturation PbS Black Calibrator", status: "Critical" }
        ];
        await CalibrationStandard.insertMany(standards);
        console.log(`[Seeder] Seeded ${standards.length} calibration standards (all 7 blocks).`);

        // 5. Seed Empirical Exposure Matrix (42 Patches from Figure a)
        console.log("[Seeder] Clearing old empirical matrix...");
        await EmpiricalMatrix.deleteMany({});
        const matrixPath = path.resolve(__dirname, "../../database/empirical_exposure_matrix.json");
        const rawJson = JSON.parse(fs.readFileSync(matrixPath, "utf8"));

        const empiricalDocs = [];
        for (const [durationKey, rows] of Object.entries(rawJson)) {
            for (const r of rows) {
                empiricalDocs.push({
                    durationKey,
                    label: r.label,
                    ppm: r.ppm,
                    rgb: r.rgb,
                    hex: r.hex,
                    note: r.note || (r.ppm >= 10 ? "OSHA Action Limit" : r.ppm >= 5 ? "Elevated" : "Normal")
                });
            }
        }
        await EmpiricalMatrix.insertMany(empiricalDocs);
        console.log(`[Seeder] Seeded ${empiricalDocs.length} empirical matrix patches across durations.`);

        console.log("[Seeder] Database successfully seeded with full production datasets!");
        process.exit(0);
    } catch (err) {
        console.error("[Seeder] Error seeding database:", err);
        process.exit(1);
    }
}

seed();
