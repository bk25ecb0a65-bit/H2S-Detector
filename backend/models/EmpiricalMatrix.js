import mongoose from "mongoose";

const EmpiricalMatrixSchema = new mongoose.Schema(
    {
        durationKey: { type: String, required: true, index: true },
        label: { type: String, required: true },
        ppm: { type: Number, required: true },
        rgb: { type: [Number], required: true },
        hex: { type: String, required: true },
        note: { type: String, default: "" }
    },
    { timestamps: true }
);

export default mongoose.model("EmpiricalMatrix", EmpiricalMatrixSchema);
