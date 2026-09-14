import mongoose from "mongoose";

const WorkerSchema = new mongoose.Schema(
    {
        id: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true },
        email: { type: String, default: "" },
        phone: { type: String, default: "" },
        badge: { type: String, required: true, index: true },
        department: { type: String, default: "Refining Unit B" },
        role: { type: String, default: "Plant Operator" },
        shift: { type: String, default: "Morning" },
        dose: { type: Number, default: 0.0 },
        status: { type: String, enum: ["Normal", "Review", "Warning", "Critical"], default: "Normal" },
        lastScan: { type: String, default: "" }
    },
    { timestamps: true }
);

export default mongoose.model("Worker", WorkerSchema);
