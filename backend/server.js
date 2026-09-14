import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

import workerRoutes from "./routes/workerRoutes.js";
import scanRoutes from "./routes/scanRoutes.js";
import calibrationRoutes from "./routes/calibrationRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import badgeRoutes from "./routes/badgeRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
    next();
});

app.use("/api/workers", workerRoutes);
app.use("/api/scans", scanRoutes);
app.use("/api/calibration", calibrationRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/badges", badgeRoutes);

app.get("/api/health", (req, res) => {
    res.json({
        status: "ONLINE",
        database: "MongoDB Connected",
        service: "H2S Colorimetric Dosimeter Backend",
        timestamp: new Date().toISOString()
    });
});

app.use((err, req, res, next) => {
    console.error("[Server Error]:", err.stack);
    res.status(500).json({ error: err.message || "Internal Server Error" });
});

app.listen(PORT, () => {
    console.log(`[Server] H2S Detector Backend running on http://localhost:${PORT}`);
});
