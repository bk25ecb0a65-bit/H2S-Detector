import mongoose from "mongoose";

const CalibrationStandardSchema = new mongoose.Schema(
    {
        blockId: { type: Number, required: true, unique: true },
        level: { type: String, required: true },
        ppm: { type: Number, required: true },
        colorCategory: { type: String, required: true },
        rgb: { type: [Number], required: true },
        hex: { type: String, required: true },
        desc: { type: String, default: "" },
        status: { type: String, default: "Normal" }
    },
    { timestamps: true }
);

export default mongoose.model("CalibrationStandard", CalibrationStandardSchema);
