import { useState, useRef, useEffect } from "react";
import {
    Camera,
    Upload,
    Crop,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Info,
    Video,
    SlidersHorizontal,
    Sparkles,
    UserCheck,
    Palette,
    ShieldAlert,
    Target,
    Zap,
    Grid,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { getWorkers, saveWorkers, getLogs, saveLogs } from "../data/workers.js";

// ============================================================
// 1. CONSTANT 7-BLOCK PHYSICAL REFERENCE CALIBRATION STRIP
// Sourced from vector reference scale in PDF.
// This physical strip is placed next to the dosimeter strip during scanning
// strictly for ambient lighting, shadow, and color-balance normalization.
// ============================================================
const CALIBRATION_REFERENCE_STRIP = [
    {
        id: 0,
        level: "0.0 ppm",
        ppm: 0.0,
        colorCategory: "Blank Substrate",
        rgb: [236, 231, 212],
        hex: "#ece7d4",
        desc: "Unexposed Baseline Paper Substrate",
        status: "Normal"
    },
    {
        id: 1,
        level: "0.3 ppm",
        ppm: 0.3,
        colorCategory: "Trace Cream",
        rgb: [212, 204, 157],
        hex: "#d4cc9d",
        desc: "Trace Substrate Calibrator",
        status: "Normal"
    },
    {
        id: 2,
        level: "1.0 ppm",
        ppm: 1.0,
        colorCategory: "Yellow",
        rgb: [209, 174, 92],
        hex: "#d1ae5c",
        desc: "Mid-Range Yellow Calibrator",
        status: "Normal"
    },
    {
        id: 3,
        level: "2.0 ppm",
        ppm: 2.0,
        colorCategory: "Amber",
        rgb: [217, 173, 76],
        hex: "#d9ad4c",
        desc: "Moderate Amber Calibrator",
        status: "Normal"
    },
    {
        id: 4,
        level: "5.0 ppm",
        ppm: 5.0,
        colorCategory: "Deep Amber",
        rgb: [204, 156, 48],
        hex: "#cc9c30",
        desc: "High Tone Deep Amber Calibrator",
        status: "Review"
    },
    {
        id: 5,
        level: "10.0 ppm",
        ppm: 10.0,
        colorCategory: "Grey",
        rgb: [142, 132, 122],
        hex: "#8e847a",
        desc: "OSHA Action Limit Grey Calibrator",
        status: "Critical"
    },
    {
        id: 6,
        level: "20.0 ppm",
        ppm: 20.0,
        colorCategory: "Black",
        rgb: [42, 38, 35],
        hex: "#2a2623",
        desc: "High Saturation PbS Black Calibrator",
        status: "Critical"
    }
];

// ============================================================
// 2. EMPIRICAL DOSIMETER EXPOSURE MATRIX (From Figure a)
// Sourced directly by pixel-grid sampling from the empirical paper dataset.
// 7 Concentration Tiers x 6 Exposure Durations (30s, 1m, 5m, 10m, 30m, 60m).
// The app uses this empirical data corresponding to the selected exposure
// duration to find the match and calculate exact ppm.
// ============================================================
const EMPIRICAL_CALIBRATION_MATRIX = {
    "30s": [
        { label: "200 ppb", ppm: 0.2, rgb: [234, 228, 208], hex: "#eae4d0", note: "Subtle Cream" },
        { label: "500 ppb", ppm: 0.5, rgb: [227, 223, 211], hex: "#e3dfd3", note: "Trace Cream" },
        { label: "1 ppm", ppm: 1.0, rgb: [219, 216, 201], hex: "#dbd8c9", note: "Pale Yellow" },
        { label: "2 ppm", ppm: 2.0, rgb: [213, 207, 182], hex: "#d5cfb6", note: "Light Yellow" },
        { label: "4 ppm", ppm: 4.0, rgb: [217, 201, 145], hex: "#d9c991", note: "Yellow / Amber" },
        { label: "8 ppm", ppm: 8.0, rgb: [214, 194, 123], hex: "#d6c27b", note: "Warm Amber" },
        { label: "10 ppm", ppm: 10.0, rgb: [198, 185, 142], hex: "#c6b98e", note: "Muted Grey / Olive" }
    ],
    "1min": [
        { label: "200 ppb", ppm: 0.2, rgb: [223, 218, 199], hex: "#dfdac7", note: "Trace Cream" },
        { label: "500 ppb", ppm: 0.5, rgb: [217, 214, 197], hex: "#d9d6c5", note: "Light Beige" },
        { label: "1 ppm", ppm: 1.0, rgb: [216, 211, 184], hex: "#d8d3b8", note: "Pale Yellow" },
        { label: "2 ppm", ppm: 2.0, rgb: [214, 210, 192], hex: "#d6d2c0", note: "Light Yellow" },
        { label: "4 ppm", ppm: 4.0, rgb: [197, 183, 122], hex: "#c5b77a", note: "Amber / Ochre" },
        { label: "8 ppm", ppm: 8.0, rgb: [208, 170, 92], hex: "#d0aa5c", note: "Deep Amber" },
        { label: "10 ppm", ppm: 10.0, rgb: [201, 188, 142], hex: "#c9bc8e", note: "Slate Grey / Olive" }
    ],
    "5min": [
        { label: "200 ppb", ppm: 0.2, rgb: [225, 220, 196], hex: "#e1dcc4", note: "Trace Cream" },
        { label: "500 ppb", ppm: 0.5, rgb: [209, 207, 178], hex: "#d1cfb2", note: "Pale Yellow-Grey" },
        { label: "1 ppm", ppm: 1.0, rgb: [211, 208, 161], hex: "#d3d0a1", note: "Yellow" },
        { label: "2 ppm", ppm: 2.0, rgb: [216, 202, 145], hex: "#d8ca91", note: "Warm Yellow" },
        { label: "4 ppm", ppm: 4.0, rgb: [220, 171, 85], hex: "#dcab55", note: "Amber / Ochre" },
        { label: "8 ppm", ppm: 8.0, rgb: [198, 159, 75], hex: "#c69f4b", note: "Golden Brown" },
        { label: "10 ppm", ppm: 10.0, rgb: [184, 169, 115], hex: "#b8a973", note: "Dark Slate Grey / Olive" }
    ],
    "10min": [
        { label: "200 ppb", ppm: 0.2, rgb: [221, 217, 171], hex: "#ddd9ab", note: "Pale Yellow" },
        { label: "500 ppb", ppm: 0.5, rgb: [214, 206, 159], hex: "#d6ce9f", note: "Yellow" },
        { label: "1 ppm", ppm: 1.0, rgb: [209, 191, 122], hex: "#d1bf7a", note: "Amber Yellow" },
        { label: "2 ppm", ppm: 2.0, rgb: [219, 208, 152], hex: "#dbd098", note: "Warm Amber" },
        { label: "4 ppm", ppm: 4.0, rgb: [220, 175, 79], hex: "#dcaf4f", note: "Deep Amber" },
        { label: "8 ppm", ppm: 8.0, rgb: [215, 171, 92], hex: "#d7ab5c", note: "Brown Amber" },
        { label: "10 ppm", ppm: 10.0, rgb: [193, 182, 131], hex: "#c1b683", note: "Dark Olive Grey" }
    ],
    "30min": [
        { label: "200 ppb", ppm: 0.2, rgb: [218, 211, 153], hex: "#dad399", note: "Yellow" },
        { label: "500 ppb", ppm: 0.5, rgb: [224, 211, 157], hex: "#e0d39d", note: "Warm Yellow" },
        { label: "1 ppm", ppm: 1.0, rgb: [211, 184, 113], hex: "#d3b871", note: "Amber" },
        { label: "2 ppm", ppm: 2.0, rgb: [209, 185, 114], hex: "#d1b972", note: "Deep Amber" },
        { label: "4 ppm", ppm: 4.0, rgb: [209, 168, 99], hex: "#d1a863", note: "Golden Brown" },
        { label: "8 ppm", ppm: 8.0, rgb: [204, 172, 96], hex: "#ccac60", note: "Dark Brown" },
        { label: "10 ppm", ppm: 10.0, rgb: [208, 163, 77], hex: "#d0a34d", note: "Saturated Amber-Brown" }
    ],
    "60min": [
        { label: "200 ppb", ppm: 0.2, rgb: [219, 210, 155], hex: "#dbd29b", note: "Yellow" },
        { label: "500 ppb", ppm: 0.5, rgb: [218, 209, 140], hex: "#dad18c", note: "Golden Yellow" },
        { label: "1 ppm", ppm: 1.0, rgb: [219, 180, 69], hex: "#dbb445", note: "Deep Amber" },
        { label: "2 ppm", ppm: 2.0, rgb: [223, 177, 64], hex: "#dfb140", note: "Deep Ochre" },
        { label: "4 ppm", ppm: 4.0, rgb: [223, 164, 40], hex: "#dfa428", note: "Dark Brown" },
        { label: "8 ppm", ppm: 8.0, rgb: [208, 163, 58], hex: "#d0a33a", note: "Heavy Brown" },
        { label: "10 ppm", ppm: 10.0, rgb: [196, 147, 40], hex: "#c49328", note: "Intense Brown / Black onset" }
    ]
};
// 10s fallback maps to 30s curve
EMPIRICAL_CALIBRATION_MATRIX["10s"] = EMPIRICAL_CALIBRATION_MATRIX["30s"];

// ============================================================
// COLOR SPACE UTILITIES (sRGB -> Linear -> CIE Lab & Delta E)
// ============================================================
function srgbToLinear(c) {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function rgbToLab(r, g, b) {
    const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
    const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
    const Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
    const Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;

    const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
    const delta = 6 / 29;
    const f = (t) => (t > Math.pow(delta, 3) ? Math.cbrt(t) : t / (3 * Math.pow(delta, 2)) + 4 / 29);

    const fx = f(X / Xn), fy = f(Y / Yn), fz = f(Z / Zn);
    return {
        L: 116 * fy - 16,
        a: 500 * (fx - fy),
        b: 200 * (fy - fz)
    };
}

function calculateDeltaE(lab1, lab2) {
    return Math.sqrt(
        Math.pow(lab1.L - lab2.L, 2) +
        Math.pow(lab1.a - lab2.a, 2) +
        Math.pow(lab1.b - lab2.b, 2)
    );
}

// ============================================================
// ENVIRONMENTAL CORRECTION ENGINE (Temperature & Humidity)
// Derived from lead acetate–H2S Arrhenius reaction kinetics:
// Reference Conditions: T_ref = 27.5 °C (range 25-30 °C), RH_ref = 62.5 % (range 55-70 %)
// Coefficients: alpha_T = 0.03 / °C, alpha_H = 0.010 / % RH
// FT = 1 + alpha_T * (T_ref - T)
// FH = 1 + alpha_H * (RH_ref - RH)
// Net Environmental Multiplier = FT * FH
// Corrected Dose / Exposure = Raw Dose / Exposure * FT * FH
// ============================================================
const T_REF = 27.5; // °C
const ALPHA_T = 0.03; // per °C
const RH_REF = 62.5; // %
const ALPHA_H = 0.010; // per % RH

function computeEnvironmentalFactors(tempInput, humidityInput) {
    const T = typeof tempInput === "number" ? tempInput : parseFloat(String(tempInput).trim()) || T_REF;
    const RH = typeof humidityInput === "number" ? humidityInput : parseFloat(String(humidityInput).trim()) || RH_REF;

    // FT = 1 + 0.03 * (27.5 - T)
    const rawFt = 1 + ALPHA_T * (T_REF - T);
    const fT = Number(Math.max(0.1, rawFt).toFixed(3));

    // FH = 1 + 0.010 * (62.5 - RH)
    const rawFh = 1 + ALPHA_H * (RH_REF - RH);
    const fH = Number(Math.max(0.1, rawFh).toFixed(3));

    const fEnv = Number((fT * fH).toFixed(3));

    return {
        T,
        RH,
        fT,
        fH,
        fEnv
    };
}

function getMedian(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function extractRobustColor(canvas, rect) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const x = Math.max(0, Math.floor(rect.x));
    const y = Math.max(0, Math.floor(rect.y));
    const w = Math.min(canvas.width - x, Math.max(1, Math.floor(rect.width)));
    const h = Math.min(canvas.height - y, Math.max(1, Math.floor(rect.height)));

    const imgData = ctx.getImageData(x, y, w, h).data;
    const reds = [], greens = [], blues = [];

    for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i], g = imgData[i + 1], b = imgData[i + 2];
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        if (brightness < 10 || brightness > 253) continue;
        reds.push(r); greens.push(g); blues.push(b);
    }

    if (reds.length === 0) {
        for (let i = 0; i < imgData.length; i += 4) {
            reds.push(imgData[i]);
            greens.push(imgData[i + 1]);
            blues.push(imgData[i + 2]);
        }
    }

    return {
        r: Math.round(getMedian(reds)),
        g: Math.round(getMedian(greens)),
        b: Math.round(getMedian(blues))
    };
}

// ============================================================
// FULL 7-BLOCK REFERENCE SCALE SAMPLER
// Slices the reference bounding box into 7 discrete vertical blocks
// ============================================================
function sampleAll7ReferenceBlocks(canvas, rect) {
    const blockHeight = rect.height / 7;
    const measuredBlocks = [];

    for (let i = 0; i < 7; i++) {
        const blockY = rect.y + i * blockHeight;
        const subRect = {
            x: rect.x + rect.width * 0.15,
            y: blockY + blockHeight * 0.18,
            width: Math.max(2, rect.width * 0.7),
            height: Math.max(2, blockHeight * 0.64)
        };

        const sampledColor = extractRobustColor(canvas, subRect);
        const known = CALIBRATION_REFERENCE_STRIP[i];
        const sampledLab = rgbToLab(sampledColor.r, sampledColor.g, sampledColor.b);
        const knownLab = rgbToLab(known.rgb[0], known.rgb[1], known.rgb[2]);
        const deltaE = calculateDeltaE(sampledLab, knownLab);

        measuredBlocks.push({
            id: i,
            level: known.level,
            ppm: known.ppm,
            colorCategory: known.colorCategory,
            knownRgb: known.rgb,
            knownHex: known.hex,
            measuredRgb: [sampledColor.r, sampledColor.g, sampledColor.b],
            deltaE: Number(deltaE.toFixed(2)),
            subRect
        });
    }

    return measuredBlocks;
}

// ============================================================
// MULTI-POINT COLOR TRANSFER & LIGHTING NORMALIZATION
// Uses all 7 measured reference points to build a tone transfer function
// ============================================================
function computeMultiPointTransfer(measuredBlocks, sampleMeasured) {
    const channels = ["r", "g", "b"];
    const sampleCorrected = { r: 0, g: 0, b: 0 };
    const gainsPerStep = [];

    for (let i = 0; i < 7; i++) {
        const m = measuredBlocks[i].measuredRgb;
        const k = measuredBlocks[i].knownRgb;
        gainsPerStep.push({
            r: Number((k[0] / Math.max(1, m[0])).toFixed(2)),
            g: Number((k[1] / Math.max(1, m[1])).toFixed(2)),
            b: Number((k[2] / Math.max(1, m[2])).toFixed(2))
        });
    }

    for (let c = 0; c < 3; c++) {
        const key = channels[c];
        const val = sampleMeasured[key];

        const pairs = measuredBlocks.map((b) => ({
            m: b.measuredRgb[c],
            k: b.knownRgb[c]
        })).sort((a, b) => a.m - b.m);

        if (val <= pairs[0].m) {
            const gain = pairs[0].m > 0 ? pairs[0].k / pairs[0].m : 1;
            sampleCorrected[key] = Math.max(0, Math.min(255, Math.round(val * gain)));
        } else if (val >= pairs[pairs.length - 1].m) {
            const last = pairs[pairs.length - 1];
            const gain = last.m > 0 ? last.k / last.m : 1;
            sampleCorrected[key] = Math.max(0, Math.min(255, Math.round(val * gain)));
        } else {
            for (let i = 0; i < pairs.length - 1; i++) {
                if (val >= pairs[i].m && val <= pairs[i + 1].m) {
                    const span = pairs[i + 1].m - pairs[i].m;
                    const frac = span === 0 ? 0 : (val - pairs[i].m) / span;
                    sampleCorrected[key] = Math.max(0, Math.min(255, Math.round(pairs[i].k + frac * (pairs[i + 1].k - pairs[i].k))));
                    break;
                }
            }
        }
    }

    const highlightGain = {
        r: Number((measuredBlocks[0].knownRgb[0] / Math.max(1, measuredBlocks[0].measuredRgb[0])).toFixed(3)),
        g: Number((measuredBlocks[0].knownRgb[1] / Math.max(1, measuredBlocks[0].measuredRgb[1])).toFixed(3)),
        b: Number((measuredBlocks[0].knownRgb[2] / Math.max(1, measuredBlocks[0].measuredRgb[2])).toFixed(3))
    };

    return {
        sampleCorrected,
        highlightGain,
        gainsPerStep
    };
}

// ============================================================
// EMPIRICAL MATCHING & CONTINUOUS INTERPOLATION ENGINE
// Matches lighting-corrected strip against the empirical dataset from Chart 1
// for the user-selected duration, and detects Grey and Black colors.
// ============================================================
function matchEmpiricalExposure(sampleLab, durationKey = "5min") {
    const rawTierList = EMPIRICAL_CALIBRATION_MATRIX[durationKey] || EMPIRICAL_CALIBRATION_MATRIX["5min"];

    // Build the full continuous curve:
    // [0.0 ppm Baseline Substrate] -> [200 ppb] -> [500 ppb] -> [1 ppm] -> [2 ppm] -> [4 ppm] -> [8 ppm] -> [10 ppm]
    // -> [15 ppm Saturated Grey] -> [20 ppm Saturated Black]
    const curve = [
        {
            id: "base_0ppm",
            label: "0 ppm (Baseline)",
            ppm: 0.0,
            rgb: [220, 216, 204],
            hex: "#dcd8cc",
            colorCategory: "Blank Substrate",
            status: "Normal"
        }
    ];

    rawTierList.forEach(t => {
        let category = "Trace Cream";
        if (t.ppm >= 10.0) category = "Grey / Dark Olive";
        else if (t.ppm >= 8.0) category = "Deep Amber";
        else if (t.ppm >= 4.0) category = "Amber";
        else if (t.ppm >= 1.0) category = "Yellow";

        curve.push({
            id: t.label,
            label: t.label,
            ppm: t.ppm,
            rgb: t.rgb,
            hex: t.hex,
            colorCategory: category,
            status: t.ppm >= 10.0 ? "Critical" : t.ppm >= 5.0 ? "Review" : "Normal",
            note: t.note
        });
    });

    // High hazard saturation anchors beyond chart
    curve.push({
        id: "grey_sat_15",
        label: "15 ppm (Grey Saturation)",
        ppm: 15.0,
        rgb: [142, 132, 122],
        hex: "#8e847a",
        colorCategory: "Grey",
        status: "Critical"
    });
    curve.push({
        id: "black_sat_20",
        label: "20 ppm (Black Hazard)",
        ppm: 20.0,
        rgb: [42, 38, 35],
        hex: "#2a2623",
        colorCategory: "Black",
        status: "Critical"
    });

    const curveLabs = curve.map(pt => rgbToLab(pt.rgb[0], pt.rgb[1], pt.rgb[2]));

    // 1. Continuous projection along segments
    let bestDist = Infinity;
    let bestPpm = 0.0;
    let bestSegment = { from: curve[0], to: curve[1], t: 0 };

    for (let i = 0; i < curve.length - 1; i++) {
        const labA = curveLabs[i];
        const labB = curveLabs[i + 1];
        const ppmA = curve[i].ppm;
        const ppmB = curve[i + 1].ppm;

        const vx = labB.L - labA.L;
        const vy = labB.a - labA.a;
        const vz = labB.b - labA.b;
        const vSq = vx * vx + vy * vy + vz * vz;
        if (vSq === 0) continue;

        const wx = sampleLab.L - labA.L;
        const wy = sampleLab.a - labA.a;
        const wz = sampleLab.b - labA.b;

        const t = Math.max(0, Math.min(1, (wx * vx + wy * vy + wz * vz) / vSq));
        const projL = labA.L + t * vx;
        const proja = labA.a + t * vy;
        const projb = labA.b + t * vz;

        const dist = Math.sqrt(
            Math.pow(sampleLab.L - projL, 2) +
            Math.pow(sampleLab.a - proja, 2) +
            Math.pow(sampleLab.b - projb, 2)
        );

        if (dist < bestDist) {
            bestDist = dist;
            bestPpm = ppmA + t * (ppmB - ppmA);
            bestSegment = {
                from: curve[i],
                to: curve[i + 1],
                t: Number(t.toFixed(2))
            };
        }
    }

    const exactPpm = Number(Math.max(0, bestPpm).toFixed(2));

    // 2. Rank individual empirical tiers for the selected duration
    const rankedTiers = rawTierList.map(item => {
        const itemLab = rgbToLab(item.rgb[0], item.rgb[1], item.rgb[2]);
        const deltaE = calculateDeltaE(sampleLab, itemLab);
        return {
            ...item,
            deltaE: Number(deltaE.toFixed(2))
        };
    }).sort((a, b) => a.deltaE - b.deltaE);

    // Also check distance to saturated Grey and Black anchors
    const greyLab = rgbToLab(142, 132, 122);
    const blackLab = rgbToLab(42, 38, 35);
    const distToGrey = calculateDeltaE(sampleLab, greyLab);
    const distToBlack = calculateDeltaE(sampleLab, blackLab);

    // 3. Robust Grey and Black Detection
    const chroma = Math.sqrt(sampleLab.a * sampleLab.a + sampleLab.b * sampleLab.b);
    const lightness = sampleLab.L;

    let isGrey = false;
    let isBlack = false;
    let detectedColor = "Blank / Unexposed";

    if (distToBlack < 14 || lightness < 32 || (exactPpm >= 18.0 && chroma < 18)) {
        isBlack = true;
        detectedColor = "Black (Critical Hazard)";
    } else if (
        distToGrey < 16 ||
        exactPpm >= 9.8 ||
        rankedTiers[0].ppm >= 10.0 ||
        (chroma < 18 && lightness < 72)
    ) {
        isGrey = true;
        detectedColor = "Grey / Slate-Olive (OSHA 10 ppm Action Limit)";
    } else if (exactPpm >= 7.5) {
        detectedColor = "Deep Amber / Dark Olive";
    } else if (exactPpm >= 3.5) {
        detectedColor = "Amber / Ochre";
    } else if (exactPpm >= 0.8) {
        detectedColor = "Yellow";
    } else if (exactPpm >= 0.15) {
        detectedColor = "Trace Cream";
    }

    return {
        exactPpm,
        deltaE: Number(bestDist.toFixed(2)),
        segment: bestSegment,
        rankedTiers,
        nearestTier: rankedTiers[0],
        detectedColor,
        isGrey,
        isBlack,
        distToGrey: Number(distToGrey.toFixed(2)),
        distToBlack: Number(distToBlack.toFixed(2))
    };
}

// ============================================================
// MAIN COMPONENT
// ============================================================
function ScanBadge() {
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const cameraSectionRef = useRef(null);

    // Live workers dataset
    const [workersList, setWorkersList] = useState(() => getWorkers());

    // Measurement Parameters
    const [badgeId, setBadgeId] = useState(() => {
        const workers = getWorkers();
        return workers[0]?.badge || "H2S-00431";
    });
    const [temperature, setTemperature] = useState("32");
    const [humidity, setHumidity] = useState("64");
    const [selectedTime, setSelectedTime] = useState("5min");

    // Real-time environmental multipliers from lead acetate kinetics model
    const liveEnv = computeEnvironmentalFactors(temperature, humidity);

    // Camera & Image Processing State
    const [imageObj, setImageObj] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [facingMode] = useState("environment");

    // Dual-Region Crop: Sample Spot (Cyan) & Full 7-Step Reference Strip (Amber)
    const [sampleCrop, setSampleCrop] = useState({ x: 70, y: 150, width: 140, height: 140 });
    const [refCrop, setRefCrop] = useState({ x: 380, y: 70, width: 110, height: 280 });
    const [activeCropTarget, setActiveCropTarget] = useState("sample"); // "sample" | "ref"

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const [scanResult, setScanResult] = useState(null);
    const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [showFullMatrix, setShowFullMatrix] = useState(false);

    useEffect(() => {
        const handleSync = () => {
            setWorkersList(getWorkers());
        };
        window.addEventListener("focus", handleSync);
        window.addEventListener("storage", handleSync);
        window.addEventListener("h2s_workers_updated", handleSync);
        return () => {
            window.removeEventListener("focus", handleSync);
            window.removeEventListener("storage", handleSync);
            window.removeEventListener("h2s_workers_updated", handleSync);
        };
    }, []);

    const matchedWorker = workersList.find(w =>
        w.badge?.toLowerCase().trim() === badgeId.trim().toLowerCase() ||
        w.badge?.toLowerCase().includes(badgeId.trim().toLowerCase()) ||
        badgeId.trim().toLowerCase().includes(w.badge?.toLowerCase())
    );

    // ============================================================
    // CAMERA CONTROLS
    // ============================================================
    const startCamera = async (mode = facingMode) => {
        try {
            setErrorMsg(null);
            stopCamera();

            if (!navigator?.mediaDevices?.getUserMedia) {
                throw new Error("Camera API is not supported in this browser. Ensure HTTPS or localhost is used.");
            }

            let mediaStream;
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: mode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                });
            } catch (err) {
                console.warn("Preferred camera constraints failed, attempting fallback:", err);
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });
            }

            streamRef.current = mediaStream;
            setIsCameraActive(true);
            setImageObj(null);
            setScanResult(null);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play().catch(() => {});
            }
        } catch (err) {
            setIsCameraActive(false);
            setErrorMsg(`Camera access failed: ${err.message}. Please allow camera permissions, or upload an image / use the simulated reference badge.`);
        }
    };

    useEffect(() => {
        if (isCameraActive && videoRef.current && streamRef.current) {
            const video = videoRef.current;
            if (video.srcObject !== streamRef.current) {
                video.srcObject = streamRef.current;
            }
            video.onloadedmetadata = () => {
                video.play().catch(() => {});
            };
            video.play().catch(() => {});
        }
    }, [isCameraActive]);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    const captureFromCamera = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const width = video.videoWidth || video.clientWidth || 640;
        const height = video.videoHeight || video.clientHeight || 480;

        if (width === 0 || height === 0) {
            setErrorMsg("Camera feed is still loading. Please wait a moment and try again.");
            return;
        }

        const offCanvas = document.createElement("canvas");
        offCanvas.width = width;
        offCanvas.height = height;
        const offCtx = offCanvas.getContext("2d");
        offCtx.drawImage(video, 0, 0, width, height);

        const img = new Image();
        img.onload = () => {
            setImageObj(img);
            stopCamera();
            const w = img.width;
            const h = img.height;
            setSampleCrop({
                x: Math.floor(w * 0.15),
                y: Math.floor(h * 0.25),
                width: Math.floor(w * 0.25),
                height: Math.floor(w * 0.25)
            });
            setRefCrop({
                x: Math.floor(w * 0.55),
                y: Math.floor(h * 0.15),
                width: Math.floor(w * 0.22),
                height: Math.floor(h * 0.7)
            });
            setScanResult(null);
            setErrorMsg(null);
        };
        img.src = offCanvas.toDataURL("image/png");
    };

    // ============================================================
    // SIMULATED BADGE GENERATOR WITH CONSTANT 7-BLOCK REF SCALE
    // Generates a dosimeter badge with chemical strip + 7-block reference strip
    // ============================================================
    const loadSampleBadgeWithColor = (stripColorRgb = [220, 171, 85], label = "Amber (4 ppm)") => {
        stopCamera();
        setErrorMsg(null);
        setScanResult(null);

        const canvas = document.createElement("canvas");
        canvas.width = 740;
        canvas.height = 490;
        const ctx = canvas.getContext("2d");

        // Outer casing
        ctx.fillStyle = "#0b1120";
        ctx.fillRect(0, 0, 740, 490);

        // Badge housing
        ctx.fillStyle = "#1e293b";
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(20, 20, 700, 450, 16);
        ctx.fill();
        ctx.stroke();

        // Header
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 15px monospace";
        ctx.fillText("H2S COLORIMETRIC DOSIMETER · TWO-TIER CALIBRATION", 40, 56);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px sans-serif";
        ctx.fillText(`Badge ID: ${badgeId} · Constant 7-Block Ref Scale · Empirical Exposure Database`, 40, 78);

        // Top Divider
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(40, 92);
        ctx.lineTo(700, 92);
        ctx.stroke();

        // ----------------------------------------------------
        // LEFT: Chemical Test Strip Window
        // ----------------------------------------------------
        ctx.fillStyle = "#090d16";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(40, 110, 260, 335, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("1. SENSING PAD (TEST STRIP)", 58, 138);

        // Substrate Paper
        ctx.fillStyle = "#ece7d4";
        ctx.beginPath();
        ctx.roundRect(75, 160, 190, 255, 8);
        ctx.fill();

        // Chemically exposed circle
        ctx.fillStyle = `rgb(${stripColorRgb.join(",")})`;
        ctx.beginPath();
        ctx.arc(170, 287, 72, 0, Math.PI * 2);
        ctx.fill();

        // Target spot center marker
        ctx.fillStyle = stripColorRgb[0] < 80 ? "#e2e8f0" : "#0f172a";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(label.toUpperCase(), 170, 291);
        ctx.textAlign = "left";

        // ----------------------------------------------------
        // RIGHT: Adjacent 7-Block Reference Scale (Lighting Calibrator)
        // ----------------------------------------------------
        ctx.fillStyle = "#090d16";
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(330, 110, 370, 335, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("2. REFERENCE SCALE (7 CONSTANT BLOCKS)", 350, 138);

        const startY = 160;
        const blockHeight = 35;
        const gap = 3;

        CALIBRATION_REFERENCE_STRIP.forEach((step, idx) => {
            const y = startY + idx * (blockHeight + gap);

            ctx.fillStyle = `rgb(${step.rgb.join(",")})`;
            ctx.fillRect(350, y, 75, blockHeight);
            ctx.strokeStyle = "#475569";
            ctx.lineWidth = 1;
            ctx.strokeRect(350, y, 75, blockHeight);

            const isGreyOrBlack = step.id === 5 || step.id === 6;
            ctx.fillStyle = isGreyOrBlack ? "#ef4444" : step.ppm >= 5 ? "#f59e0b" : "#e2e8f0";
            ctx.font = isGreyOrBlack ? "bold 12px sans-serif" : "11px sans-serif";
            const tag = step.id === 5 ? " ◄ GREY (10 ppm ACTION LIMIT)" : step.id === 6 ? " ◄ BLACK (CRITICAL)" : "";
            ctx.fillText(`[${step.id}] ${step.level} (${step.colorCategory})${tag}`, 435, y + 22);
        });

        const img = new Image();
        img.onload = () => {
            setImageObj(img);
            setSampleCrop({ x: 90, y: 195, width: 160, height: 160 });
            setRefCrop({ x: 345, y: 155, width: 85, height: 275 });
        };
        img.src = canvas.toDataURL("image/png");
    };

    useEffect(() => {
        return () => stopCamera();
    }, []);

    // File Upload Handler
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        stopCamera();
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                setImageObj(img);
                const w = img.width;
                const h = img.height;
                setSampleCrop({
                    x: Math.floor(w * 0.15),
                    y: Math.floor(h * 0.25),
                    width: Math.floor(w * 0.25),
                    height: Math.floor(w * 0.25)
                });
                setRefCrop({
                    x: Math.floor(w * 0.55),
                    y: Math.floor(h * 0.15),
                    width: Math.floor(w * 0.22),
                    height: Math.floor(h * 0.7)
                });
                setScanResult(null);
                setErrorMsg(null);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // ============================================================
    // CANVAS RENDERING WITH 7-BLOCK GUIDELINE TICKS
    // ============================================================
    useEffect(() => {
        if (!imageObj || !canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = imageObj.width;
        canvas.height = imageObj.height;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(imageObj, 0, 0);

        ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Sample Crop Box (Cyan)
        ctx.drawImage(
            imageObj,
            sampleCrop.x, sampleCrop.y, sampleCrop.width, sampleCrop.height,
            sampleCrop.x, sampleCrop.y, sampleCrop.width, sampleCrop.height
        );
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = activeCropTarget === "sample" ? 3 : 2;
        ctx.strokeRect(sampleCrop.x, sampleCrop.y, sampleCrop.width, sampleCrop.height);

        const scx = sampleCrop.x + sampleCrop.width / 2;
        const scy = sampleCrop.y + sampleCrop.height / 2;
        ctx.beginPath();
        ctx.moveTo(scx - 10, scy); ctx.lineTo(scx + 10, scy);
        ctx.moveTo(scx, scy - 10); ctx.lineTo(scx, scy + 10);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(sampleCrop.x, Math.max(0, sampleCrop.y - 22), 140, 22);
        ctx.fillStyle = "#090d16";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText("1. Test Strip (Sample)", sampleCrop.x + 6, Math.max(12, sampleCrop.y - 6));

        if (activeCropTarget === "sample") {
            const hs = Math.max(14, Math.floor(canvas.width / 45));
            ctx.fillStyle = "#38bdf8";
            ctx.fillRect(sampleCrop.x + sampleCrop.width - hs, sampleCrop.y + sampleCrop.height - hs, hs, hs);
        }

        // 2. Draw Reference Scale Crop Box (Amber) with 7-Block Division Guides
        ctx.drawImage(
            imageObj,
            refCrop.x, refCrop.y, refCrop.width, refCrop.height,
            refCrop.x, refCrop.y, refCrop.width, refCrop.height
        );
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = activeCropTarget === "ref" ? 3 : 2;
        ctx.strokeRect(refCrop.x, refCrop.y, refCrop.width, refCrop.height);

        const subH = refCrop.height / 7;
        for (let i = 1; i < 7; i++) {
            const dy = refCrop.y + i * subH;
            ctx.beginPath();
            ctx.moveTo(refCrop.x, dy);
            ctx.lineTo(refCrop.x + refCrop.width, dy);
            ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(refCrop.x, Math.max(0, refCrop.y - 22), 160, 22);
        ctx.fillStyle = "#090d16";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText("2. Ref Scale (7 Blocks)", refCrop.x + 6, Math.max(12, refCrop.y - 6));

        if (activeCropTarget === "ref") {
            const hs = Math.max(14, Math.floor(canvas.width / 45));
            ctx.fillStyle = "#f59e0b";
            ctx.fillRect(refCrop.x + refCrop.width - hs, refCrop.y + refCrop.height - hs, hs, hs);
        }
    }, [imageObj, sampleCrop, refCrop, activeCropTarget]);

    const getCanvasCoords = (e) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const handlePointerDown = (e) => {
        if (!imageObj) return;
        const { x, y } = getCanvasCoords(e);
        const handleSize = Math.max(24, Math.floor(imageObj.width / 30));

        const targetRect = activeCropTarget === "sample" ? sampleCrop : refCrop;
        const cornerX = targetRect.x + targetRect.width;
        const cornerY = targetRect.y + targetRect.height;

        if (Math.abs(x - cornerX) < handleSize && Math.abs(y - cornerY) < handleSize) {
            setIsResizing(true);
            setDragStart({ x, y });
            return;
        }

        if (
            x >= sampleCrop.x &&
            x <= sampleCrop.x + sampleCrop.width &&
            y >= sampleCrop.y &&
            y <= sampleCrop.y + sampleCrop.height
        ) {
            setActiveCropTarget("sample");
            setIsDragging(true);
            setDragStart({ x: x - sampleCrop.x, y: y - sampleCrop.y });
            return;
        }

        if (
            x >= refCrop.x &&
            x <= refCrop.x + refCrop.width &&
            y >= refCrop.y &&
            y <= refCrop.y + refCrop.height
        ) {
            setActiveCropTarget("ref");
            setIsDragging(true);
            setDragStart({ x: x - refCrop.x, y: y - refCrop.y });
            return;
        }

        if (activeCropTarget === "sample") {
            setSampleCrop(prev => ({
                ...prev,
                x: Math.max(0, Math.min(imageObj.width - prev.width, x - prev.width / 2)),
                y: Math.max(0, Math.min(imageObj.height - prev.height, y - prev.height / 2))
            }));
        } else {
            setRefCrop(prev => ({
                ...prev,
                x: Math.max(0, Math.min(imageObj.width - prev.width, x - prev.width / 2)),
                y: Math.max(0, Math.min(imageObj.height - prev.height, y - prev.height / 2))
            }));
        }
    };

    const handlePointerMove = (e) => {
        if (!imageObj || (!isDragging && !isResizing)) return;
        const { x, y } = getCanvasCoords(e);

        if (activeCropTarget === "sample") {
            if (isDragging) {
                setSampleCrop(prev => ({
                    ...prev,
                    x: Math.max(0, Math.min(imageObj.width - prev.width, x - dragStart.x)),
                    y: Math.max(0, Math.min(imageObj.height - prev.height, y - dragStart.y))
                }));
            } else if (isResizing) {
                const newWidth = Math.max(30, Math.min(imageObj.width - sampleCrop.x, x - sampleCrop.x));
                const newHeight = Math.max(30, Math.min(imageObj.height - sampleCrop.y, y - sampleCrop.y));
                setSampleCrop(prev => ({ ...prev, width: newWidth, height: newHeight }));
            }
        } else {
            if (isDragging) {
                setRefCrop(prev => ({
                    ...prev,
                    x: Math.max(0, Math.min(imageObj.width - prev.width, x - dragStart.x)),
                    y: Math.max(0, Math.min(imageObj.height - prev.height, y - dragStart.y))
                }));
            } else if (isResizing) {
                const newWidth = Math.max(30, Math.min(imageObj.width - refCrop.x, x - refCrop.x));
                const newHeight = Math.max(30, Math.min(imageObj.height - refCrop.y, y - refCrop.y));
                setRefCrop(prev => ({ ...prev, width: newWidth, height: newHeight }));
            }
        }
    };

    const handlePointerUp = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    // ============================================================
    // CORE DUAL-TIER ANALYSIS:
    // 1. Normalizes lighting via adjacent 7-block physical reference scale
    // 2. Matches corrected color against the empirical database (Chart 1) for selected exposure time
    // 3. Accurately identifies exact ppm and detects Grey / Black
    // ============================================================
    const runAnalysisAndSave = () => {
        setErrorMsg(null);
        setSaveSuccessMsg(null);

        if (!badgeId.trim()) {
            setErrorMsg("Please enter a valid Badge ID.");
            return;
        }

        if (!canvasRef.current || !imageObj) {
            setErrorMsg("Please capture or upload an image of the badge below first.");
            cameraSectionRef.current?.scrollIntoView({ behavior: "smooth" });
            return;
        }

        try {
            // Step 1: Simultaneously measure all 7 blocks from the reference scale strip
            const measuredBlocks = sampleAll7ReferenceBlocks(canvasRef.current, refCrop);

            // Step 2: Sample raw color of the chemical test strip
            const sampleRaw = extractRobustColor(canvasRef.current, sampleCrop);

            // Step 3: Compute & apply multi-point lighting compensation
            const transfer = computeMultiPointTransfer(measuredBlocks, sampleRaw);
            const sampleCorrected = transfer.sampleCorrected;

            // Step 4: CIE Lab of lighting-corrected strip
            const sampleLab = rgbToLab(sampleCorrected.r, sampleCorrected.g, sampleCorrected.b);

            // Step 5: Match against empirical exposure database for selected duration
            const matchResult = matchEmpiricalExposure(sampleLab, selectedTime);
            const rawPpm = matchResult.exactPpm;

            // Step 5b: Apply Lead Acetate Arrhenius Temperature & Humidity Compensation
            // Formulas:
            //   FT = 1 + 0.03 * (27.5 - T)
            //   FH = 1 + 0.010 * (62.5 - RH)
            //   Corrected Exposure = Raw Exposure * FT * FH
            const env = computeEnvironmentalFactors(temperature, humidity);
            const exactPpm = rawPpm <= 0 ? 0.0 : Number(Math.max(0, rawPpm * env.fEnv).toFixed(2));
            const doseIncrement = Number((exactPpm * 1.0).toFixed(2));

            // Step 6: Centralized Worker Dose Tracking
            let updatedWorkers = [...workersList];
            let targetWorker = updatedWorkers.find(w =>
                w.badge?.toLowerCase().trim() === badgeId.trim().toLowerCase() ||
                w.badge?.toLowerCase().includes(badgeId.trim().toLowerCase()) ||
                badgeId.trim().toLowerCase().includes(w.badge?.toLowerCase())
            );

            let assignedName = "";
            let newTotalDose = 0;

            // Universal 10 ppm OSHA Thresholds: >= 10 Warning/Critical, >= 7 Review, < 7 Normal
            if (targetWorker) {
                newTotalDose = Number(((parseFloat(targetWorker.dose) || 0) + doseIncrement).toFixed(1));
                targetWorker.dose = newTotalDose;
                targetWorker.status = newTotalDose >= 10 ? "Warning" : newTotalDose >= 7 ? "Review" : "Normal";
                targetWorker.lastScan = `Today, ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                assignedName = targetWorker.name;
            } else {
                newTotalDose = doseIncrement;
                assignedName = `Operator (${badgeId.trim()})`;
                const newRecord = {
                    id: `W-${100 + updatedWorkers.length + 1}`,
                    name: assignedName,
                    email: `operator.${badgeId.trim().toLowerCase().replace(/[^a-z0-9]/g, "")}@petrogas.com`,
                    phone: "+91 98000 11223",
                    badge: badgeId.trim(),
                    department: "Refining Unit B",
                    role: "Field Operator",
                    shift: "Morning",
                    dose: newTotalDose,
                    status: newTotalDose >= 10 ? "Warning" : newTotalDose >= 7 ? "Review" : "Normal",
                    lastScan: `Today, ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                };
                updatedWorkers.push(newRecord);
                targetWorker = newRecord;
            }

            saveWorkers(updatedWorkers);
            setWorkersList(updatedWorkers);

            // Step 7: Record into centralized exposure history
            const existingLogs = getLogs();
            const newLogEntry = {
                id: `EXP-${Math.floor(1000 + Math.random() * 9000)}`,
                timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
                worker: assignedName,
                workerId: targetWorker?.id || `W-${100 + updatedWorkers.length}`,
                badge: badgeId.trim(),
                location: `${targetWorker?.department || "Refining Unit B"} - Badge Scan Station`,
                shift: targetWorker?.shift || "Morning",
                duration: `${selectedTime} exposure scan (${env.T}°C, ${env.RH}% RH)`,
                temperature: env.T,
                humidity: env.RH,
                rawPpm,
                tempFactor: env.fT,
                humidityFactor: env.fH,
                concentration: `${exactPpm} ppm (${matchResult.detectedColor})`,
                dose: newTotalDose,
                doseIncrement,
                status: newTotalDose >= 10 || matchResult.isGrey || matchResult.isBlack ? "Critical" : newTotalDose >= 7 ? "Review" : "Normal",
                notes: `Environmental compensation: T=${env.T}°C (FT=${env.fT}×), RH=${env.RH}% (FH=${env.fH}×), Net=${env.fEnv}×. Raw=${rawPpm} ppm → Corrected=${exactPpm} ppm.`
            };
            saveLogs([newLogEntry, ...existingLogs]);

            // Step 8: Update state for UI display
            setScanResult({
                rawPpm,
                exactPpm,
                doseIncrement,
                newTotalDose,
                envFactors: env,
                fT: env.fT,
                fH: env.fH,
                fEnv: env.fEnv,
                temperature: env.T,
                humidity: env.RH,
                assignedWorkerName: assignedName,
                sampleRaw,
                sampleCorrected,
                measuredBlocks,
                transfer,
                matchResult,
                selectedTime,
                nearestTier: matchResult.nearestTier,
                rankedTiers: matchResult.rankedTiers,
                detectedColor: matchResult.detectedColor,
                isGrey: matchResult.isGrey,
                isBlack: matchResult.isBlack
            });

            setSaveSuccessMsg(
                `✓ Calibration complete! Raw optical ${rawPpm} ppm corrected to ${exactPpm} ppm (FT=${env.fT}×, FH=${env.fH}×) for ${assignedName} (${badgeId}) under ${selectedTime} exposure curve. Cumulative dose: ${newTotalDose} ppm·hr.`
            );
        } catch (err) {
            setErrorMsg(err.message);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Scan H₂S Badge</h1>
                <p className="text-slate-400 mt-1 text-sm">
                    Two-Tier Colorimetric Engine: Ambient lighting normalization via 7-block reference scale + exact ppm interpolation against empirical exposure dataset (Chart 1). Detects yellow, amber, grey (10 ppm), and black (20 ppm).
                </p>
            </div>

            {/* ============================================================ */}
            {/* MEASUREMENT PARAMETERS INTERFACE                             */}
            {/* ============================================================ */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 text-white font-bold text-lg">
                    <SlidersHorizontal className="text-sky-400" size={20} />
                    <span>Measurement Parameters</span>
                </div>

                <div className="space-y-4">
                    {/* Badge ID Input */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                            Badge ID
                        </label>
                        <input
                            type="text"
                            value={badgeId}
                            onChange={(e) => setBadgeId(e.target.value)}
                            placeholder="H2S-00431"
                            className="w-full bg-[#0d1527] border border-slate-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-sky-500 transition"
                        />
                        {matchedWorker ? (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                                <UserCheck size={14} />
                                <span>
                                    Assigned to: <strong>{matchedWorker.name}</strong> ({matchedWorker.department} · Current: {matchedWorker.dose} ppm·hr)
                                </span>
                            </div>
                        ) : (
                            <p className="mt-1.5 text-xs text-slate-500">
                                Unregistered Badge ID: A new personnel record will be created and linked automatically upon analysis.
                            </p>
                        )}
                    </div>

                    {/* Temperature (°C) with Live FT Badge */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-slate-400">
                                Temperature (°C)
                            </label>
                            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                                liveEnv.fT > 1.05 ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                                liveEnv.fT < 0.95 ? "bg-sky-500/20 text-sky-300 border-sky-500/30" :
                                "bg-slate-800 text-slate-300 border-slate-700"
                            }`}>
                                F_T: {liveEnv.fT}×
                            </span>
                        </div>
                        <input
                            type="number"
                            step="0.5"
                            value={temperature}
                            onChange={(e) => setTemperature(e.target.value)}
                            placeholder="27.5"
                            className="w-full bg-[#0d1527] border border-slate-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-sky-500 transition"
                        />
                        <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                            <span>Ref: 27.5 °C (α_T = 0.03)</span>
                            <span className="font-mono">F_T = 1 + 0.03 × (27.5 - T)</span>
                        </div>
                    </div>

                    {/* Relative Humidity (%) with Live FH Badge */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-slate-400">
                                Relative Humidity (%)
                            </label>
                            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                                liveEnv.fH > 1.05 ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                                liveEnv.fH < 0.95 ? "bg-sky-500/20 text-sky-300 border-sky-500/30" :
                                "bg-slate-800 text-slate-300 border-slate-700"
                            }`}>
                                F_H: {liveEnv.fH}×
                            </span>
                        </div>
                        <input
                            type="number"
                            step="1"
                            value={humidity}
                            onChange={(e) => setHumidity(e.target.value)}
                            placeholder="62.5"
                            className="w-full bg-[#0d1527] border border-slate-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-sky-500 transition"
                        />
                        <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                            <span>Ref: 62.5 % RH (α_H = 0.010)</span>
                            <span className="font-mono">F_H = 1 + 0.010 × (62.5 - RH)</span>
                        </div>
                    </div>

                    {/* Combined Environmental Factor Summary Badge */}
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-400">
                            <SlidersHorizontal size={14} className="text-sky-400" />
                            <span>Net Environmental Multiplier:</span>
                        </div>
                        <div className="font-mono font-bold text-sky-300">
                            F_T ({liveEnv.fT}×) × F_H ({liveEnv.fH}×) = <span className="text-amber-400 text-sm">{liveEnv.fEnv}×</span>
                        </div>
                    </div>

                    {/* Analyze Badge Button */}
                    <button
                        type="button"
                        onClick={runAnalysisAndSave}
                        className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2 text-base cursor-pointer"
                    >
                        <Zap size={18} />
                        Analyze Badge with 7-Block Reference & Empirical Dataset
                    </button>
                </div>
            </div>

            {/* Notification Messages */}
            {saveSuccessMsg && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3 text-emerald-300 text-sm">
                    <CheckCircle2 size={20} className="shrink-0 text-emerald-400 mt-0.5" />
                    <div className="font-medium">{saveSuccessMsg}</div>
                </div>
            )}

            {errorMsg && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-300 text-sm">
                    <AlertTriangle size={20} className="shrink-0 text-red-400 mt-0.5" />
                    <div>{errorMsg}</div>
                </div>
            )}

            {/* ============================================================ */}
            {/* BADGE PHOTO ACQUISITION & DUAL-CROP ALIGNMENT SECTION        */}
            {/* ============================================================ */}
            <div ref={cameraSectionRef} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Camera className="text-sky-400" />
                        Badge Photo & Reference Scale Alignment
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Select the strip's exposure duration. Position the cyan box over the chemical test strip, and the amber box over all 7 blocks of the reference scale strip.
                    </p>
                </div>

                {/* Strip Exposure Duration Selector */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                        <Clock size={16} className="text-sky-400" />
                        Select Strip Exposure Duration (Matches Chart 1 Dataset):
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                            { key: "30s", label: "30 s", note: "Rapid check" },
                            { key: "1min", label: "1 min", note: "Short duration" },
                            { key: "5min", label: "5 min", note: "Standard test" },
                            { key: "10min", label: "10 min", note: "Extended shift" },
                            { key: "30min", label: "30 min", note: "Work shift" },
                            { key: "60min", label: "60 min", note: "Full TWA" }
                        ].map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setSelectedTime(t.key)}
                                className={`py-2.5 px-3 text-sm font-medium rounded-lg border transition cursor-pointer text-center ${
                                    selectedTime === t.key
                                        ? "bg-sky-500 border-sky-400 text-slate-950 font-bold shadow-md shadow-sky-500/20"
                                        : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                                }`}
                            >
                                <div className="font-bold">{t.label}</div>
                                <div className={`text-[10px] ${selectedTime === t.key ? "text-slate-900" : "text-slate-400"}`}>
                                    {t.note}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input Options: Camera, File Upload, or Quick Simulated Badges */}
                {!imageObj && !isCameraActive && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => startCamera()}
                                className="p-8 border-2 border-dashed border-slate-700 hover:border-sky-500/70 rounded-xl bg-slate-950/40 hover:bg-slate-950/80 transition flex flex-col items-center justify-center gap-3 group text-center cursor-pointer"
                            >
                                <div className="p-4 bg-sky-500/10 group-hover:bg-sky-500/20 text-sky-400 rounded-full transition">
                                    <Video size={36} />
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-200">Start Video Camera</div>
                                    <div className="text-xs text-slate-400 mt-1">Live capture of badge with adjacent reference scale</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-8 border-2 border-dashed border-slate-700 hover:border-sky-500/70 rounded-xl bg-slate-950/40 hover:bg-slate-950/80 transition flex flex-col items-center justify-center gap-3 group text-center cursor-pointer"
                            >
                                <div className="p-4 bg-sky-500/10 group-hover:bg-sky-500/20 text-sky-400 rounded-full transition">
                                    <Upload size={36} />
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-200">Upload Badge Photo</div>
                                    <div className="text-xs text-slate-400 mt-1">PNG, JPG, or JPEG containing badge and reference strip</div>
                                </div>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>

                        {/* Quick Presets for Demonstration */}
                        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4">
                            <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                                <Sparkles size={14} className="text-amber-400" />
                                Or Test with Reference Calibration Presets (Simulates strip + adjacent 7-block reference):
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                <button
                                    type="button"
                                    onClick={() => loadSampleBadgeWithColor([184, 169, 115], "Grey (10 ppm) ◄ OSHA Limit")}
                                    className="py-2 px-3 rounded-lg border border-red-500/40 bg-red-950/30 text-red-300 hover:bg-red-900/50 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    <span className="w-3 h-3 rounded-full bg-[#b8a973] inline-block border border-white/40" />
                                    Grey (10 ppm Limit)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => loadSampleBadgeWithColor([42, 38, 35], "Black (20 ppm) ◄ Saturated")}
                                    className="py-2 px-3 rounded-lg border border-purple-500/40 bg-purple-950/30 text-purple-300 hover:bg-purple-900/50 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    <span className="w-3 h-3 rounded-full bg-[#2a2623] inline-block border border-white/40" />
                                    Black (20 ppm Hazard)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => loadSampleBadgeWithColor([220, 171, 85], "Amber (4 ppm)")}
                                    className="py-2 px-3 rounded-lg border border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-900/50 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    <span className="w-3 h-3 rounded-full bg-[#dcab55] inline-block border border-white/40" />
                                    Amber (4 ppm)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => loadSampleBadgeWithColor([211, 208, 161], "Yellow (1 ppm)")}
                                    className="py-2 px-3 rounded-lg border border-yellow-500/40 bg-yellow-950/30 text-yellow-300 hover:bg-yellow-900/50 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    <span className="w-3 h-3 rounded-full bg-[#d3d0a1] inline-block border border-white/40" />
                                    Yellow (1 ppm)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => loadSampleBadgeWithColor([235, 230, 211], "Blank Baseline (0 ppm)")}
                                    className="py-2 px-3 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    <span className="w-3 h-3 rounded-full bg-[#ebe6d3] inline-block border border-white/40" />
                                    Blank (0 ppm)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Live Camera View */}
                {isCameraActive && (
                    <div className="space-y-4">
                        <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-auto max-h-[480px] object-contain"
                            />
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center gap-6">
                                <div className="w-36 h-36 border-2 border-dashed border-sky-400/80 rounded-lg flex items-center justify-center">
                                    <span className="text-[10px] bg-slate-950/80 text-sky-300 px-2 py-0.5 rounded">
                                        Test Strip
                                    </span>
                                </div>
                                <div className="w-28 h-52 border-2 border-dashed border-amber-400/80 rounded-lg flex items-center justify-center">
                                    <span className="text-[10px] bg-slate-950/80 text-amber-300 px-2 py-0.5 rounded">
                                        7-Block Ref Strip
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={captureFromCamera}
                                className="flex-1 py-3 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2 text-base shadow-lg shadow-sky-500/20 cursor-pointer"
                            >
                                <Camera size={20} /> Snap Photo & Analyze
                            </button>
                            <button
                                type="button"
                                onClick={stopCamera}
                                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Cropping Canvas Workspace */}
                {imageObj && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 font-medium">Select Region to Adjust:</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveCropTarget("sample")}
                                    className={`px-3 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                        activeCropTarget === "sample"
                                            ? "bg-sky-500/20 text-sky-300 border-sky-500"
                                            : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                                    }`}
                                >
                                    <Target size={13} className="text-sky-400" />
                                    [1] Test Strip (Cyan)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveCropTarget("ref")}
                                    className={`px-3 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                        activeCropTarget === "ref"
                                            ? "bg-amber-500/20 text-amber-300 border-amber-500"
                                            : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                                    }`}
                                >
                                    <Palette size={13} className="text-amber-400" />
                                    [2] 7-Block Ref Scale (Amber)
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => startCamera()}
                                    className="flex items-center gap-1 text-sky-400 hover:text-sky-300 px-2.5 py-1 bg-slate-800 rounded border border-slate-700 cursor-pointer"
                                >
                                    <Video size={13} /> Retake
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-1 text-slate-300 hover:text-white px-2.5 py-1 bg-slate-800 rounded border border-slate-700 cursor-pointer"
                                >
                                    <Upload size={13} /> Upload Another
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {/* Canvas Element */}
                        <div
                            className="relative w-full overflow-hidden rounded-xl bg-black border border-slate-800 flex justify-center items-center select-none cursor-crosshair max-h-[520px]"
                            onMouseDown={handlePointerDown}
                            onMouseMove={handlePointerMove}
                            onMouseUp={handlePointerUp}
                            onTouchStart={handlePointerDown}
                            onTouchMove={handlePointerMove}
                            onTouchEnd={handlePointerUp}
                        >
                            <canvas
                                ref={canvasRef}
                                className="max-w-full max-h-[520px] h-auto object-contain block"
                            />
                        </div>

                        {/* Active Box Size Sliders */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-xs">
                            <div className="flex items-center gap-3">
                                <Crop size={14} className="text-sky-400 shrink-0" />
                                <span className="text-slate-400 whitespace-nowrap">Test Strip Size:</span>
                                <input
                                    type="range"
                                    min="30"
                                    max={Math.min(imageObj.width, 350)}
                                    value={sampleCrop.width}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setSampleCrop(prev => ({ ...prev, width: val, height: val }));
                                    }}
                                    className="w-full accent-sky-400 cursor-pointer"
                                />
                                <span className="font-mono text-slate-300 w-12 text-right">{sampleCrop.width}px</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <Crop size={14} className="text-amber-400 shrink-0" />
                                <span className="text-slate-400 whitespace-nowrap">Ref Scale Height:</span>
                                <input
                                    type="range"
                                    min="40"
                                    max={Math.min(imageObj.height, 450)}
                                    value={refCrop.height}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setRefCrop(prev => ({ ...prev, height: val }));
                                    }}
                                    className="w-full accent-amber-400 cursor-pointer"
                                />
                                <span className="font-mono text-slate-300 w-12 text-right">{refCrop.height}px</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ============================================================ */}
            {/* TWO-TIER CALIBRATION RESULTS DISPLAY                         */}
            {/* ============================================================ */}
            {scanResult && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 animate-fade-in">
                    {/* Hero Result Banner */}
                    <div className="p-6 rounded-xl border border-sky-500/40 bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider">
                                <CheckCircle2 size={16} /> Two-Tier Calibrated Exposure Result
                            </div>

                            {/* Detected Color and Exact PPM */}
                            <div className="flex flex-wrap items-baseline gap-3 mt-1">
                                <div className="text-5xl font-black text-white font-mono">
                                    {scanResult.exactPpm} <span className="text-2xl font-normal text-sky-300">ppm</span>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                    scanResult.isBlack
                                        ? "bg-red-950/80 text-red-300 border-red-600 animate-pulse"
                                        : scanResult.isGrey || scanResult.exactPpm >= 10.0
                                        ? "bg-amber-950/80 text-amber-300 border-amber-600"
                                        : "bg-sky-950/60 text-sky-300 border-sky-700"
                                }`}>
                                    Detected Color: {scanResult.detectedColor}
                                </span>
                                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                    Env Multiplier: {scanResult.fEnv}× (T: {scanResult.temperature}°C, RH: {scanResult.humidity}%)
                                </span>
                            </div>

                            <div className="text-xs text-slate-400 mt-2 space-y-1">
                                <div>
                                    Badge: <span className="font-mono text-sky-300 font-semibold">{badgeId}</span> · Worker: <span className="text-white font-medium">{scanResult.assignedWorkerName}</span>
                                </div>
                                <div>
                                    Raw Optical: <span className="font-mono text-slate-300 font-bold">{scanResult.rawPpm} ppm</span> · Env Corrected: <span className="font-mono text-sky-400 font-bold">{scanResult.exactPpm} ppm</span>
                                </div>
                                <div>
                                    Exposure Curve: <strong className="text-sky-400 font-bold">{scanResult.selectedTime} empirical dataset</strong> · Matched Tier: <strong className="text-white font-bold">{scanResult.nearestTier.label}</strong>
                                </div>
                                <div>
                                    Dose Added: <span className="text-emerald-400 font-bold">+{scanResult.doseIncrement} ppm·hr</span> · Total Dose: <strong className="text-white font-bold">{scanResult.newTotalDose} ppm·hr</strong>
                                </div>
                            </div>

                            {/* Universal 10 ppm OSHA Limit Status */}
                            <div className="mt-3">
                                {scanResult.newTotalDose >= 10 || scanResult.exactPpm >= 10 || scanResult.isBlack || scanResult.isGrey ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                                        <ShieldAlert size={14} /> EXCEEDS OSHA 10 ppm ACTION LIMIT (CRITICAL HAZARD)
                                    </span>
                                ) : scanResult.newTotalDose >= 7 || scanResult.exactPpm >= 5 ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                        <AlertTriangle size={14} /> WARNING: APPROACHING 10 ppm ACTION LIMIT
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                        <CheckCircle2 size={14} /> COMPLIANT WITH OSHA 10 ppm LIMIT
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Tri-Color Swatch Display: Raw -> Corrected -> Calibrated Empirical Match */}
                        <div className="flex items-center gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800 shrink-0">
                            {/* Raw Sample */}
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 rounded-lg border border-white/20 shadow-inner"
                                    style={{
                                        backgroundColor: `rgb(${scanResult.sampleRaw.r}, ${scanResult.sampleRaw.g}, ${scanResult.sampleRaw.b})`
                                    }}
                                />
                                <div className="text-[10px] text-slate-400 mt-1 font-mono">1. Raw Strip</div>
                            </div>

                            <span className="text-slate-600 font-bold">→</span>

                            {/* Lighting Corrected Sample */}
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 rounded-lg border-2 border-sky-400 shadow-inner"
                                    style={{
                                        backgroundColor: `rgb(${scanResult.sampleCorrected.r}, ${scanResult.sampleCorrected.g}, ${scanResult.sampleCorrected.b})`
                                    }}
                                />
                                <div className="text-[10px] text-sky-400 mt-1 font-mono font-semibold">2. Calibrated</div>
                            </div>

                            <span className="text-slate-600 font-bold">≈</span>

                            {/* Nearest Empirical Tier Match from Chart 1 */}
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 rounded-lg border border-amber-400/60 shadow-inner"
                                    style={{
                                        backgroundColor: scanResult.nearestTier.hex
                                    }}
                                />
                                <div className="text-[10px] text-amber-400 mt-1 font-mono">3. Chart Match</div>
                            </div>
                        </div>
                    </div>

                    {/* Tier 1: 7-Block Reference Scale Lighting Verification */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs">
                                <Palette size={15} className="text-amber-400" /> Tier 1: Adjacent 7-Block Reference Scale (Measured in Photo vs Known Standard):
                            </span>
                            <span className="text-emerald-400 text-xs font-mono">Lighting Normalization Active</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
                            {scanResult.measuredBlocks.map((b) => (
                                <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center space-y-1">
                                    <div className="text-[10px] font-semibold text-slate-300 truncate" title={b.level}>
                                        [{b.id}] {b.level}
                                    </div>
                                    <div className="flex items-center justify-center gap-1.5">
                                        <div
                                            className="w-6 h-6 rounded border border-white/20"
                                            title={`Measured in photo: rgb(${b.measuredRgb.join(",")})`}
                                            style={{ backgroundColor: `rgb(${b.measuredRgb.join(",")})` }}
                                        />
                                        <span className="text-[10px] text-slate-500 font-bold">vs</span>
                                        <div
                                            className="w-6 h-6 rounded border border-white/20"
                                            title={`Known Ground Truth: ${b.knownHex}`}
                                            style={{ backgroundColor: b.knownHex }}
                                        />
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-mono">
                                        ΔE: {b.deltaE}
                                    </div>
                                    <div className={`text-[9px] font-bold truncate ${
                                        b.id === 5 ? "text-red-400" : b.id === 6 ? "text-purple-400" : "text-slate-400"
                                    }`}>
                                        {b.colorCategory}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Environmental Correction Breakdown: Temperature (F_T) & Humidity (F_H) */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal size={16} className="text-amber-400" />
                                <h3 className="text-sm font-bold text-white">
                                    Environmental Correction Factors (Lead Acetate Arrhenius Kinetics)
                                </h3>
                            </div>
                            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-sky-950 text-sky-300 border border-sky-800 font-semibold self-start sm:self-auto">
                                Net Multiplier: {scanResult.fEnv}×
                            </span>
                        </div>

                        {/* 4-Column Step-by-Step Calculation Breakdown */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Step 1: Raw Optical Reading */}
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1">
                                <div className="text-[11px] text-slate-400 font-medium">1. Raw Optical PPM</div>
                                <div className="text-xl font-bold font-mono text-slate-200">
                                    {scanResult.rawPpm} <span className="text-xs font-normal text-slate-400">ppm</span>
                                </div>
                                <div className="text-[10px] text-slate-500">
                                    Uncorrected empirical curve reading
                                </div>
                            </div>

                            {/* Step 2: Temperature Correction F_T */}
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400 font-medium">2. Temperature Factor (F_T)</span>
                                    <span className="font-mono font-bold text-amber-400">{scanResult.fT}×</span>
                                </div>
                                <div className="text-xs font-mono text-slate-300">
                                    T = {scanResult.temperature} °C <span className="text-[10px] text-slate-500">(Ref: 27.5 °C)</span>
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                    1 + 0.03 × (27.5 - {scanResult.temperature})
                                </div>
                            </div>

                            {/* Step 3: Humidity Correction F_H */}
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400 font-medium">3. Humidity Factor (F_H)</span>
                                    <span className="font-mono font-bold text-sky-400">{scanResult.fH}×</span>
                                </div>
                                <div className="text-xs font-mono text-slate-300">
                                    RH = {scanResult.humidity} % <span className="text-[10px] text-slate-500">(Ref: 62.5 %)</span>
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                    1 + 0.010 × (62.5 - {scanResult.humidity})
                                </div>
                            </div>

                            {/* Step 4: Environmentally Corrected Exposure */}
                            <div className="bg-sky-950/40 border border-sky-700/60 rounded-lg p-3 space-y-1">
                                <div className="text-[11px] text-sky-300 font-medium">4. Corrected Exposure</div>
                                <div className="text-xl font-bold font-mono text-white">
                                    {scanResult.exactPpm} <span className="text-xs font-normal text-sky-300">ppm</span>
                                </div>
                                <div className="text-[10px] font-mono text-sky-200">
                                    {scanResult.rawPpm} × {scanResult.fT} × {scanResult.fH}
                                </div>
                            </div>
                        </div>

                        {/* Scientific Methodology / Presentation Rationale (From Image 5) */}
                        <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800/80 text-xs text-slate-300 space-y-1">
                            <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles size={13} /> Scientific Methodology (Reaction Kinetics Model)
                            </div>
                            <p className="text-slate-400 italic text-[11px] leading-relaxed">
                                "We modelled the temperature and humidity effects using linear correction factors derived from the known kinetics of the lead acetate–H₂S reaction. Reference conditions were taken as 27.5 °C and 62.5 % RH. The coefficients α_T = 0.03 and α_H = 0.010 were chosen based on typical sensitivity reported for lead acetate papers and adjusted for the range of our laboratory tests."
                            </p>
                        </div>
                    </div>

                    {/* Tier 2: Empirical Dataset Response Table for Selected Duration */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                <Info size={16} className="text-sky-400" />
                                Tier 2: Empirical Calibration Curve for {scanResult.selectedTime} Exposure Duration (Chart 1):
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowFullMatrix(!showFullMatrix)}
                                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer font-medium"
                            >
                                <Grid size={13} />
                                {showFullMatrix ? "Hide Full 7x6 Matrix" : "View Full 7x6 Matrix"}
                                {showFullMatrix ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-slate-800">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                                    <tr>
                                        <th className="py-3 px-4">Concentration Tier</th>
                                        <th className="py-3 px-4">PPM Value</th>
                                        <th className="py-3 px-4">Empirical Patch Color</th>
                                        <th className="py-3 px-4">Color Distance (ΔE)</th>
                                        <th className="py-3 px-4">Description</th>
                                        <th className="py-3 px-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                                    {scanResult.rankedTiers.map((item, idx) => {
                                        const isBest = idx === 0;
                                        return (
                                            <tr
                                                key={item.label}
                                                className={
                                                    isBest
                                                        ? "bg-sky-500/10 text-sky-200 font-semibold"
                                                        : item.ppm >= 10.0
                                                        ? "bg-red-500/5 text-slate-300"
                                                        : "text-slate-300 hover:bg-slate-800/30"
                                                }
                                            >
                                                <td className="py-3 px-4 flex items-center gap-2">
                                                    {isBest && <CheckCircle2 size={15} className="text-sky-400 shrink-0" />}
                                                    <span>{item.label}</span>
                                                </td>
                                                <td className="py-3 px-4 font-mono">
                                                    {item.ppm} ppm
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="w-5 h-5 rounded border border-white/30 inline-block shadow-sm"
                                                            style={{ backgroundColor: item.hex }}
                                                        />
                                                        <span className="font-mono text-xs text-slate-400">
                                                            {item.hex} (rgb: {item.rgb.join(", ")})
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 font-mono text-xs">
                                                    {item.deltaE}
                                                </td>
                                                <td className="py-3 px-4 text-xs text-slate-400">
                                                    {item.note}
                                                </td>
                                                <td className="py-3 px-4 text-xs">
                                                    {isBest ? (
                                                        <span className="px-2.5 py-0.5 rounded-full bg-sky-500 text-slate-950 font-bold text-[11px]">
                                                            Closest Match
                                                        </span>
                                                    ) : item.ppm >= 10.0 ? (
                                                        <span className="px-2.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 font-bold text-[10px]">
                                                            OSHA 10 ppm Action Limit
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500">Rank #{idx + 1}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Collapsible Full 7x6 Empirical Matrix Explorer */}
                    {showFullMatrix && (
                        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div>
                                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                        <Grid size={16} className="text-sky-400" />
                                        Full Empirical Dosimeter Database (Figure a: 7 Concentrations × 6 Exposure Durations)
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Exact RGB colors sampled directly from the empirical paper dataset.
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-center text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-slate-400">
                                            <th className="py-2.5 px-3 text-left font-semibold">Concentration</th>
                                            {["30s", "1min", "5min", "10min", "30min", "60min"].map(d => (
                                                <th key={d} className={`py-2.5 px-3 font-semibold ${selectedTime === d ? "text-sky-400 font-bold bg-sky-950/40" : ""}`}>
                                                    {d === "30s" ? "30 s" : d === "1min" ? "1 min" : d === "5min" ? "5 min" : d === "10min" ? "10 min" : d === "30min" ? "30 min" : "60 min"}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {["200 ppb", "500 ppb", "1 ppm", "2 ppm", "4 ppm", "8 ppm", "10 ppm"].map((concLabel, rIdx) => (
                                            <tr key={concLabel} className="hover:bg-slate-900/60">
                                                <td className="py-2.5 px-3 text-left font-semibold text-slate-300">
                                                    {concLabel}
                                                </td>
                                                {["30s", "1min", "5min", "10min", "30min", "60min"].map(d => {
                                                    const patch = EMPIRICAL_CALIBRATION_MATRIX[d][rIdx];
                                                    const isSelectedCol = selectedTime === d;
                                                    return (
                                                        <td key={d} className={`py-2.5 px-3 ${isSelectedCol ? "bg-sky-950/20" : ""}`}>
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div
                                                                    className="w-7 h-7 rounded border border-white/20 shadow-sm"
                                                                    style={{ backgroundColor: patch.hex }}
                                                                    title={`${concLabel} @ ${d}: ${patch.hex}`}
                                                                />
                                                                <span className="font-mono text-[9px] text-slate-400">
                                                                    {patch.hex}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


export default ScanBadge;