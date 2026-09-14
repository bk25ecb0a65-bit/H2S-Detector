import mongoose from "mongoose";

const BadgeSchema = new mongoose.Schema(
    {
        badgeId: { type: String, required: true, unique: true, index: true },
        assignedWorkerId: { type: String, default: "" },
        status: { type: String, enum: ["Active", "Replaced", "Expired"], default: "Active" },
        batchNumber: { type: String, default: "BATCH-2026-Q3-H2S" },
        issuedDate: { type: Date, default: Date.now },
        expiryDate: { type: Date }
    },
    { timestamps: true }
);

export default mongoose.model("Badge", BadgeSchema);
