import mongoose from "mongoose";

const SafetyAlertSchema = new mongoose.Schema(
    {
        alertId: { type: String, required: true, unique: true, index: true },
        scanId: { type: String, required: true, index: true },
        workerId: { type: String, required: true },
        workerName: { type: String, required: true },
        badge: { type: String, required: true },
        alertType: { type: String, enum: ["OSHA_10PPM_EXCEEDED", "GREY_PBS_DETECTED", "BLACK_HAZARD_DETECTED"], default: "OSHA_10PPM_EXCEEDED" },
        ppmMeasured: { type: Number, required: true },
        cumulativeDose: { type: Number, required: true },
        timestamp: { type: String, required: true },
        acknowledged: { type: Boolean, default: false },
        actionTaken: { type: String, default: "" }
    },
    { timestamps: true }
);

export default mongoose.model("SafetyAlert", SafetyAlertSchema);
