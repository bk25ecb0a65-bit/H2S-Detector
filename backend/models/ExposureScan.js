import mongoose from "mongoose";

const ExposureScanSchema = new mongoose.Schema(
    {
        id: { type: String, required: true, unique: true, index: true },
        timestamp: { type: String, required: true, index: true },
        worker: { type: String, required: true },
        workerId: { type: String, required: true, index: true },
        badge: { type: String, required: true, index: true },
        location: { type: String, default: "Refining Unit B - Badge Scan Station" },
        shift: { type: String, default: "Morning" },
        duration: { type: String, default: "5 min" },
        temperature: { type: Number, default: 32 },
        humidity: { type: Number, default: 64 },
        rawPpm: { type: Number, default: 0.0 },
        tempFactor: { type: Number, default: 1.0 },
        humidityFactor: { type: Number, default: 1.0 },
        concentration: { type: String, default: "0.0 ppm" },
        exactPpm: { type: Number, required: true },
        dose: { type: Number, required: true },
        doseIncrement: { type: Number, default: 0.0 },
        status: { type: String, enum: ["Normal", "Review", "Warning", "Critical"], default: "Normal" },
        detectedColor: { type: String, default: "Blank / Unexposed" },
        isGrey: { type: Boolean, default: false },
        isBlack: { type: Boolean, default: false },
        rawStripRgb: { type: [Number], default: [] },
        calibratedStripRgb: { type: [Number], default: [] },
        measuredBlocks: { type: Array, default: [] },
        notes: { type: String, default: "" },
        imageUrl: { type: String, default: "" }
    },
    { timestamps: true }
);

export default mongoose.model("ExposureScan", ExposureScanSchema);
