import React, { useState, useRef, useEffect } from "react";
import {
    Camera,
    Upload,
    Crop,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Info,
    Sliders,
    Video,
    SwitchCamera,
    X,
    SlidersHorizontal,
    Sparkles,
    UserCheck,
    SunMedium,
    Layers,
    RotateCcw
} from "lucide-react";

// ============================================================
// CALIBRATION DATABASE (Times 10s -> 60min, 100ppb -> 10ppm)
// Standard Laboratory Baseline Colors (Under Standard D65 Illuminant)
// ============================================================
const CALIBRATION_DATA = {
    "10s": [
        { level: "100 ppb", rgb: [235, 229, 211] },
        { level: "~100–500 ppb", rgb: [224, 220, 207] },
        { level: "1 ppm", rgb: [224, 220, 207] },
        { level: "2 ppm", rgb: [217, 213, 200] },
        { level: "4 ppm", rgb: [215, 211, 198] },
        { level: "8 ppm", rgb: [215, 211, 198] },
        { level: "10 ppm", rgb: [215, 211, 198] }
    ],
    "30s": [
        { level: "100 ppb", rgb: [234, 227, 207] },
        { level: "~100–500 ppb", rgb: [226, 222, 209] },
        { level: "1 ppm", rgb: [220, 216, 200] },
        { level: "2 ppm", rgb: [214, 208, 183] },
        { level: "4 ppm", rgb: [217, 200, 144] },
        { level: "8 ppm", rgb: [216, 194, 122] },
        { level: "10 ppm", rgb: [197, 184, 142] }
    ],
    "1min": [
        { level: "100 ppb", rgb: [223, 218, 199] },
        { level: "~100–500 ppb", rgb: [217, 212, 196] },
        { level: "1 ppm", rgb: [215, 211, 182] },
        { level: "2 ppm", rgb: [214, 209, 193] },
        { level: "4 ppm", rgb: [196, 183, 119] },
        { level: "8 ppm", rgb: [207, 171, 94] },
        { level: "10 ppm", rgb: [200, 188, 141] }
    ],
    "5min": [
        { level: "100 ppb", rgb: [225, 220, 194] },
        { level: "~100–500 ppb", rgb: [208, 206, 176] },
        { level: "1 ppm", rgb: [211, 207, 157] },
        { level: "2 ppm", rgb: [215, 202, 142] },
        { level: "4 ppm", rgb: [221, 172, 87] },
        { level: "8 ppm", rgb: [198, 159, 78] },
        { level: "10 ppm", rgb: [183, 168, 113] }
    ],
    "10min": [
        { level: "100 ppb", rgb: [222, 217, 171] },
        { level: "~100–500 ppb", rgb: [213, 205, 157] },
        { level: "1 ppm", rgb: [208, 191, 120] },
        { level: "2 ppm", rgb: [219, 207, 149] },
        { level: "4 ppm", rgb: [220, 176, 80] },
        { level: "8 ppm", rgb: [216, 173, 94] },
        { level: "10 ppm", rgb: [191, 180, 130] }
    ],
    "30min": [
        { level: "100 ppb", rgb: [219, 211, 153] },
        { level: "~100–500 ppb", rgb: [224, 211, 157] },
        { level: "1 ppm", rgb: [209, 182, 110] },
        { level: "2 ppm", rgb: [209, 183, 112] },
        { level: "4 ppm", rgb: [208, 169, 100] },
        { level: "8 ppm", rgb: [203, 171, 97] },
        { level: "10 ppm", rgb: [209, 162, 76] }
    ],
    "60min": [
        { level: "100 ppb", rgb: [218, 210, 154] },
        { level: "~100–500 ppb", rgb: [218, 209, 137] },
        { level: "1 ppm", rgb: [219, 179, 68] },
        { level: "2 ppm", rgb: [221, 177, 62] },
        { level: "4 ppm", rgb: [223, 163, 41] },
        { level: "8 ppm", rgb: [207, 165, 59] },
        { level: "10 ppm", rgb: [195, 145, 39] }
    ]
};

// ============================================================
// COLOR SPACE & CHROMATIC ADAPTATION (von Kries Normalization)
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
        // Skip over-exposed glare (>248) and extreme shadows (<20)
        if (brightness < 20 || brightness > 248) continue;
        reds.push(r); greens.push(g); blues.push(b);
    }

    if (reds.length === 0) {
        throw new Error("Selected area has too much glare or shadow. Move reticle directly over the colored strip.");
    }

    return {
        r: Math.round(getMedian(reds)),
        g: Math.round(getMedian(greens)),
        b: Math.round(getMedian(blues))
    };
}

// Convert level string to ppm for cumulative dose calculation
function getNumericalPpm(levelStr) {
    if (levelStr.includes("100 ppb")) return 0.1;
    if (levelStr.includes("100–500")) return 0.3;
    if (levelStr.includes("1 ppm")) return 1.0;
    if (levelStr.includes("2 ppm")) return 2.0;
    if (levelStr.includes("4 ppm")) return 4.0;
    if (levelStr.includes("8 ppm")) return 8.0;
    if (levelStr.includes("10 ppm")) return 10.0;
    return 1.0;
}

// ============================================================
// MAIN SCAN BADGE COMPONENT WITH DUAL-RETICLE LIGHTING ENGINE
// ============================================================
function ScanBadge() {
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const cameraSectionRef = useRef(null);

    // Measurement Parameters
    const [badgeId, setBadgeId] = useState("H2S-2026-00431");
    const [temperature, setTemperature] = useState("32");
    const [humidity, setHumidity] = useState("64");

    // Camera & Image States
    const [selectedTime, setSelectedTime] = useState("5min");
    const [imageObj, setImageObj] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [facingMode, setFacingMode] = useState("environment");

    // Dual Reticles: Sample Box (Cyan) & Reference Strip Box (Amber)
    const [sampleRect, setSampleRect] = useState({ x: 120, y: 180, width: 90, height: 90 });
    const [refRect, setRefRect] = useState({ x: 320, y: 180, width: 90, height: 90 });
    const [activeTarget, setActiveTarget] = useState("sample"); // "sample" or "ref"
    const [refBlockLevel, setRefBlockLevel] = useState("100 ppb"); // Reference strip block framed by amber box
    const [enableLightingCorrection, setEnableLightingCorrection] = useState(true);

    // Drag / Resize interaction states
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragTarget, setDragTarget] = useState(null); // "sample" or "ref"
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const [scanResult, setScanResult] = useState(null);
    const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    // Worker synchronization
    const [workersList, setWorkersList] = useState(() => {
        try {
            const saved = localStorage.getItem("h2s_workers_data");
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        const handleSync = () => {
            try {
                const saved = localStorage.getItem("h2s_workers_data");
                if (saved) setWorkersList(JSON.parse(saved));
            } catch {}
        };
        window.addEventListener("storage", handleSync);
        window.addEventListener("h2s_workers_updated", handleSync);
        return () => {
            window.removeEventListener("storage", handleSync);
            window.removeEventListener("h2s_workers_updated", handleSync);
        };
    }, []);

    const matchedWorker = workersList.find(w =>
        w.badge.toLowerCase().includes(badgeId.trim().toLowerCase()) ||
        badgeId.trim().toLowerCase().includes(w.badge.toLowerCase())
    );

    // ============================================================
    // CAMERA CONTROLS
    // ============================================================
    const startCamera = async (mode = facingMode) => {
        try {
            setErrorMsg(null);
            stopCamera();

            let mediaStream;
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false
                });
            } catch {
                mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
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
            setErrorMsg(`Camera access failed: ${err.message}. Please allow camera permissions or upload an image.`);
        }
    };

    useEffect(() => {
        if (isCameraActive && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
        }
    }, [isCameraActive]);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    const toggleFacingMode = () => {
        const next = facingMode === "environment" ? "user" : "environment";
        setFacingMode(next);
        startCamera(next);
    };

    const captureFromCamera = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;

        const offCanvas = document.createElement("canvas");
        offCanvas.width = w;
        offCanvas.height = h;
        offCanvas.getContext("2d").drawImage(video, 0, 0, w, h);

        const img = new Image();
        img.onload = () => {
            setImageObj(img);
            stopCamera();
            initDualReticles(img.width, img.height);
            setScanResult(null);
            setErrorMsg(null);
        };
        img.src = offCanvas.toDataURL("image/png");
    };

    // Position initial dual reticles side-by-side
    const initDualReticles = (imgW, imgH) => {
        const size = Math.max(60, Math.floor(imgW * 0.18));
        const midY = Math.floor((imgH - size) / 2);
        const centerX = Math.floor(imgW / 2);

        setSampleRect({
            x: Math.max(20, centerX - size - 40),
            y: midY,
            width: size,
            height: size
        });
        setRefRect({
            x: Math.min(imgW - size - 20, centerX + 40),
            y: midY,
            width: size,
            height: size
        });
    };

    // Load Physical Demo Badge + Calibration Card Side-by-Side
    const loadSampleBadge = () => {
        stopCamera();
        setErrorMsg(null);
        setScanResult(null);

        const sampleCanvas = document.createElement("canvas");
        sampleCanvas.width = 800;
        sampleCanvas.height = 650;
        const sCtx = sampleCanvas.getContext("2d");

        // Background desk surface with realistic warm ambient cast
        sCtx.fillStyle = "#1e2433";
        sCtx.fillRect(0, 0, 800, 650);

        // LEFT: Worker's H2S Dosimeter Badge
        sCtx.fillStyle = "#0f172a";
        sCtx.strokeStyle = "#334155";
        sCtx.lineWidth = 3;
        sCtx.beginPath();
        sCtx.roundRect(50, 60, 310, 520, 16);
        sCtx.fill();
        sCtx.stroke();

        sCtx.fillStyle = "#38bdf8";
        sCtx.font = "bold 15px sans-serif";
        sCtx.fillText("WORKER DOSIMETER BADGE", 75, 105);
        sCtx.font = "12px monospace";
        sCtx.fillStyle = "#94a3b8";
        sCtx.fillText(`Badge ID: ${badgeId}`, 75, 130);

        // Active Lead-Acetate Test Strip Pad (Simulated 4 ppm exposure under warm lighting: R:235, G:188, B:98)
        sCtx.fillStyle = "#020617";
        sCtx.fillRect(105, 170, 200, 340);

        sCtx.fillStyle = "rgb(235, 188, 98)"; // Warm shifted sample
        sCtx.beginPath();
        sCtx.arc(205, 340, 75, 0, Math.PI * 2);
        sCtx.fill();

        sCtx.fillStyle = "#e2e8f0";
        sCtx.font = "bold 13px sans-serif";
        sCtx.fillText("Active Pb(Ac)2 Sensor Pad", 115, 545);

        // RIGHT: Manufacturer Reference Strip Card (From the Physical PDF Card)
        sCtx.fillStyle = "#ffffff";
        sCtx.strokeStyle = "#94a3b8";
        sCtx.lineWidth = 2;
        sCtx.beginPath();
        sCtx.roundRect(430, 60, 320, 520, 16);
        sCtx.fill();
        sCtx.stroke();

        sCtx.fillStyle = "#0f172a";
        sCtx.font = "bold 15px sans-serif";
        sCtx.fillText("H2S REFERENCE SCALE STRIP", 455, 95);
        sCtx.font = "11px sans-serif";
        sCtx.fillStyle = "#64748b";
        sCtx.fillText(`Standard Calibrated Ladder (${selectedTime})`, 455, 115);

        // Draw the 7 standard blocks of the ladder with warm ambient shift applied
        const ladderLevels = CALIBRATION_DATA[selectedTime];
        ladderLevels.forEach((item, idx) => {
            const blockY = 140 + idx * 56;
            // Draw square block with same warm ambient lighting shift
            const warmR = Math.min(255, Math.round(item.rgb[0] * 1.06));
            const warmG = Math.min(255, Math.round(item.rgb[1] * 1.02));
            const warmB = Math.max(0, Math.round(item.rgb[2] * 0.88));

            sCtx.fillStyle = `rgb(${warmR}, ${warmG}, ${warmB})`;
            sCtx.strokeStyle = "#334155";
            sCtx.lineWidth = 1.5;
            sCtx.fillRect(460, blockY, 50, 48);
            sCtx.strokeRect(460, blockY, 50, 48);

            sCtx.fillStyle = "#0f172a";
            sCtx.font = idx === 0 ? "bold 12px sans-serif" : "12px sans-serif";
            sCtx.fillText(`${item.level} ${idx === 0 ? "← 100 ppb (Ref)" : ""}`, 525, blockY + 28);
        });

        const img = new Image();
        img.onload = () => {
            setImageObj(img);
            // Position Cyan box over test strip, Amber box over the Top 100 ppb Reference block
            setSampleRect({ x: 130, y: 265, width: 150, height: 150 });
            setRefRect({ x: 450, y: 135, width: 70, height: 60 });
            setRefBlockLevel("100 ppb");
        };
        img.src = sampleCanvas.toDataURL("image/png");
    };

    useEffect(() => {
        return () => stopCamera();
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        stopCamera();
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                setImageObj(img);
                initDualReticles(img.width, img.height);
                setScanResult(null);
                setErrorMsg(null);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // ============================================================
    // CANVAS DUAL RETICLE RENDERING
    // ============================================================
    useEffect(() => {
        if (!imageObj || !canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = imageObj.width;
        canvas.height = imageObj.height;
        const ctx = canvas.getContext("2d");

        // 1. Base photo
        ctx.drawImage(imageObj, 0, 0);

        // 2. Dim background outside reticles
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 3. Clear Sample Box
        ctx.drawImage(
            imageObj,
            sampleRect.x, sampleRect.y, sampleRect.width, sampleRect.height,
            sampleRect.x, sampleRect.y, sampleRect.width, sampleRect.height
        );

        // 4. Clear Reference Box
        ctx.drawImage(
            imageObj,
            refRect.x, refRect.y, refRect.width, refRect.height,
            refRect.x, refRect.y, refRect.width, refRect.height
        );

        const lineWidth = Math.max(2, Math.floor(canvas.width / 350));
        const handleSize = Math.max(12, Math.floor(canvas.width / 45));

        // ----------------------------------------------------
        // DRAW CYAN RETICLE: Sample Strip
        // ----------------------------------------------------
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(sampleRect.x, sampleRect.y, sampleRect.width, sampleRect.height);

        // Sample Label Badge
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(sampleRect.x, Math.max(0, sampleRect.y - 24), Math.min(140, sampleRect.width), 24);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText("🔵 Active Test Strip", sampleRect.x + 6, Math.max(16, sampleRect.y - 8));

        // Resize Handle (bottom-right)
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(sampleRect.x + sampleRect.width - handleSize, sampleRect.y + sampleRect.height - handleSize, handleSize, handleSize);

        // Center Crosshairs
        const scx = sampleRect.x + sampleRect.width / 2;
        const scy = sampleRect.y + sampleRect.height / 2;
        ctx.beginPath();
        ctx.moveTo(scx - 10, scy); ctx.lineTo(scx + 10, scy);
        ctx.moveTo(scx, scy - 10); ctx.lineTo(scx, scy + 10);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // ----------------------------------------------------
        // DRAW AMBER RETICLE: Reference Strip
        // ----------------------------------------------------
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(refRect.x, refRect.y, refRect.width, refRect.height);

        // Reference Label Badge
        ctx.fillStyle = "#d97706";
        ctx.fillRect(refRect.x, Math.max(0, refRect.y - 24), Math.min(160, refRect.width), 24);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(`🟠 Reference (${refBlockLevel})`, refRect.x + 6, Math.max(16, refRect.y - 8));

        // Resize Handle (bottom-right)
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(refRect.x + refRect.width - handleSize, refRect.y + refRect.height - handleSize, handleSize, handleSize);

        // Center Crosshairs
        const rcx = refRect.x + refRect.width / 2;
        const rcy = refRect.y + refRect.height / 2;
        ctx.beginPath();
        ctx.moveTo(rcx - 10, rcy); ctx.lineTo(rcx + 10, rcy);
        ctx.moveTo(rcx, rcy - 10); ctx.lineTo(rcx, rcy + 10);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }, [imageObj, sampleRect, refRect, refBlockLevel]);

    // Canvas pointer drag/resize logic for dual boxes
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

        // 1. Check Sample Box resize handle
        if (
            Math.abs(x - (sampleRect.x + sampleRect.width)) < handleSize &&
            Math.abs(y - (sampleRect.y + sampleRect.height)) < handleSize
        ) {
            setIsResizing(true);
            setDragTarget("sample");
            setActiveTarget("sample");
            setDragStart({ x, y });
            return;
        }

        // 2. Check Reference Box resize handle
        if (
            Math.abs(x - (refRect.x + refRect.width)) < handleSize &&
            Math.abs(y - (refRect.y + refRect.height)) < handleSize
        ) {
            setIsResizing(true);
            setDragTarget("ref");
            setActiveTarget("ref");
            setDragStart({ x, y });
            return;
        }

        // 3. Check inside Reference Box (drag)
        if (
            x >= refRect.x && x <= refRect.x + refRect.width &&
            y >= refRect.y && y <= refRect.y + refRect.height
        ) {
            setIsDragging(true);
            setDragTarget("ref");
            setActiveTarget("ref");
            setDragStart({ x: x - refRect.x, y: y - refRect.y });
            return;
        }

        // 4. Check inside Sample Box (drag)
        if (
            x >= sampleRect.x && x <= sampleRect.x + sampleRect.width &&
            y >= sampleRect.y && y <= sampleRect.y + sampleRect.height
        ) {
            setIsDragging(true);
            setDragTarget("sample");
            setActiveTarget("sample");
            setDragStart({ x: x - sampleRect.x, y: y - sampleRect.y });
            return;
        }

        // 5. Clicked outside: reposition whichever target is currently selected
        if (activeTarget === "sample") {
            setSampleRect(prev => ({
                ...prev,
                x: Math.max(0, Math.min(imageObj.width - prev.width, x - prev.width / 2)),
                y: Math.max(0, Math.min(imageObj.height - prev.height, y - prev.height / 2))
            }));
        } else {
            setRefRect(prev => ({
                ...prev,
                x: Math.max(0, Math.min(imageObj.width - prev.width, x - prev.width / 2)),
                y: Math.max(0, Math.min(imageObj.height - prev.height, y - prev.height / 2))
            }));
        }
    };

    const handlePointerMove = (e) => {
        if (!imageObj || (!isDragging && !isResizing) || !dragTarget) return;
        const { x, y } = getCanvasCoords(e);

        if (dragTarget === "sample") {
            if (isDragging) {
                setSampleRect(prev => ({
                    ...prev,
                    x: Math.max(0, Math.min(imageObj.width - prev.width, x - dragStart.x)),
                    y: Math.max(0, Math.min(imageObj.height - prev.height, y - dragStart.y))
                }));
            } else if (isResizing) {
                const nw = Math.max(30, Math.min(imageObj.width - sampleRect.x, x - sampleRect.x));
                const nh = Math.max(30, Math.min(imageObj.height - sampleRect.y, y - sampleRect.y));
                setSampleRect(prev => ({ ...prev, width: nw, height: nh }));
            }
        } else if (dragTarget === "ref") {
            if (isDragging) {
                setRefRect(prev => ({
                    ...prev,
                    x: Math.max(0, Math.min(imageObj.width - prev.width, x - dragStart.x)),
                    y: Math.max(0, Math.min(imageObj.height - prev.height, y - dragStart.y))
                }));
            } else if (isResizing) {
                const nw = Math.max(30, Math.min(imageObj.width - refRect.x, x - refRect.x));
                const nh = Math.max(30, Math.min(imageObj.height - refRect.y, y - refRect.y));
                setRefRect(prev => ({ ...prev, width: nw, height: nh }));
            }
        }
    };

    const handlePointerUp = () => {
        setIsDragging(false);
        setIsResizing(false);
        setDragTarget(null);
    };

    // ============================================================
    // LIGHTING CORRECTION & DUAL-RETICLE ANALYSIS ENGINE
    // ============================================================
    const runAnalysisAndSave = () => {
        setErrorMsg(null);
        setSaveSuccessMsg(null);

        if (!badgeId.trim()) {
            setErrorMsg("Please provide a valid Badge ID.");
            return;
        }

        if (!canvasRef.current || !imageObj) {
            setErrorMsg("Please open the live camera or upload an image of the badge below first.");
            cameraSectionRef.current?.scrollIntoView({ behavior: "smooth" });
            return;
        }

        try {
            // STEP 1: Extract Raw Sample Color
            const rawSample = extractRobustColor(canvasRef.current, sampleRect);

            // STEP 2: Extract Measured Reference Color from the same photo
            const measuredRef = extractRobustColor(canvasRef.current, refRect);

            // STEP 3: Get Known Standard Laboratory RGB for the framed reference level
            let targetRefRGB = [235, 229, 211]; // default 100 ppb
            if (refBlockLevel === "White Card") {
                targetRefRGB = [248, 248, 248];
            } else {
                const matchedRefConfig = CALIBRATION_DATA[selectedTime].find(l => l.level === refBlockLevel);
                if (matchedRefConfig) targetRefRGB = matchedRefConfig.rgb;
            }

            // STEP 4: Compute von Kries Channel Multipliers
            let kR = targetRefRGB[0] / Math.max(1, measuredRef.r);
            let kG = targetRefRGB[1] / Math.max(1, measuredRef.g);
            let kB = targetRefRGB[2] / Math.max(1, measuredRef.b);

            // Clamp multipliers to safe bounds (0.4x - 2.5x) to avoid extreme artifacts
            kR = Math.min(2.5, Math.max(0.4, kR));
            kG = Math.min(2.5, Math.max(0.4, kG));
            kB = Math.min(2.5, Math.max(0.4, kB));

            // STEP 5: Apply Lighting Normalization
            const correctedSample = enableLightingCorrection ? {
                r: Math.round(Math.min(255, Math.max(0, rawSample.r * kR))),
                g: Math.round(Math.min(255, Math.max(0, rawSample.g * kG))),
                b: Math.round(Math.min(255, Math.max(0, rawSample.b * kB)))
            } : rawSample;

            // STEP 6: Convert to CIE Lab and Match against Calibration Database
            const correctedLab = rgbToLab(correctedSample.r, correctedSample.g, correctedSample.b);
            const refList = CALIBRATION_DATA[selectedTime];

            const ranked = refList.map(ref => {
                const refLab = rgbToLab(ref.rgb[0], ref.rgb[1], ref.rgb[2]);
                const deltaE = calculateDeltaE(correctedLab, refLab);
                return {
                    ...ref,
                    deltaE: Number(deltaE.toFixed(2))
                };
            }).sort((a, b) => a.deltaE - b.deltaE);

            const best = ranked[0];

            // Ambient lighting diagnostics
            const avgMultiplier = (kR + kG + kB) / 3;
            const brightnessShiftPct = Math.round((avgMultiplier - 1) * 100);
            let colorCastDesc = "Neutral balanced daylight";
            if (kB / kR > 1.12) {
                colorCastDesc = "Warm / Incandescent lighting cast (Compensated)";
            } else if (kR / kB > 1.12) {
                colorCastDesc = "Cool / Fluorescent lighting cast (Compensated)";
            }

            // STEP 7: Save to Worker & Exposure Logs
            const ppmVal = getNumericalPpm(best.level);
            const doseIncrement = Number((ppmVal * 1.5).toFixed(1));

            let updatedWorkers = [...workersList];
            let targetWorker = updatedWorkers.find(w =>
                w.badge.toLowerCase().includes(badgeId.trim().toLowerCase()) ||
                badgeId.trim().toLowerCase().includes(w.badge.toLowerCase())
            );

            let assignedName = "";
            let newTotalDose = 0;

            if (targetWorker) {
                newTotalDose = Number((targetWorker.dose + doseIncrement).toFixed(1));
                targetWorker.dose = newTotalDose;
                targetWorker.status = newTotalDose >= 25 ? "Warning" : newTotalDose >= 18 ? "Review" : "Normal";
                targetWorker.lastScan = `Today, ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                assignedName = targetWorker.name;
            } else {
                newTotalDose = doseIncrement;
                assignedName = `Operator (${badgeId.trim()})`;
                const newRecord = {
                    id: `W-${100 + updatedWorkers.length + 1}`,
                    name: assignedName,
                    email: "operator@petrogas.com",
                    phone: "+91 98000 11223",
                    badge: badgeId.trim(),
                    department: "Field Monitoring",
                    role: "Badge Holder",
                    shift: "Current Shift",
                    dose: newTotalDose,
                    status: newTotalDose >= 25 ? "Warning" : newTotalDose >= 18 ? "Review" : "Normal",
                    lastScan: "Just now"
                };
                updatedWorkers.unshift(newRecord);
            }

            localStorage.setItem("h2s_workers_data", JSON.stringify(updatedWorkers));
            window.dispatchEvent(new CustomEvent("h2s_workers_updated", { detail: updatedWorkers }));
            setWorkersList(updatedWorkers);

            const existingLogs = JSON.parse(localStorage.getItem("h2s_exposure_logs") || "[]");
            const newLogEntry = {
                id: `EXP-${Math.floor(1000 + Math.random() * 9000)}`,
                timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
                worker: assignedName,
                workerId: targetWorker?.id || `W-${100 + updatedWorkers.length}`,
                badge: badgeId.trim(),
                location: targetWorker ? targetWorker.department : "Monitoring Post",
                shift: targetWorker ? targetWorker.shift : "Current Shift",
                duration: `${selectedTime} scan (${temperature}°C, ${humidity}% RH)`,
                concentration: best.level,
                dose: newTotalDose,
                status: newTotalDose >= 25 ? "Critical" : newTotalDose >= 18 ? "Review" : "Normal",
                notes: `Dual-strip normalized. ${colorCastDesc}. Brightness adj: ${brightnessShiftPct > 0 ? "+" : ""}${brightnessShiftPct}%.`
            };
            const updatedLogs = [newLogEntry, ...existingLogs];
            localStorage.setItem("h2s_exposure_logs", JSON.stringify(updatedLogs));
            window.dispatchEvent(new CustomEvent("h2s_logs_updated", { detail: updatedLogs }));

            // Update State
            setScanResult({
                rawSample,
                measuredRef,
                targetRefRGB,
                correctedSample,
                lightingMultipliers: { kR: +kR.toFixed(3), kG: +kG.toFixed(3), kB: +kB.toFixed(3) },
                brightnessShiftPct,
                colorCastDesc,
                bestMatch: best,
                rankings: ranked,
                assignedWorkerName: assignedName,
                doseIncrement,
                newTotalDose
            });

            setSaveSuccessMsg(
                `✓ Calibrated Scan Complete! Normalized concentration of ${best.level} recorded to ${assignedName} (${badgeId}). Cumulative exposure updated to ${newTotalDose} ppm·hr.`
            );
        } catch (err) {
            setErrorMsg(err.message);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Scan H₂S Badge</h1>
                <p className="text-slate-400 mt-1 text-sm">
                    Dual-reticle optical scanner with reference strip lighting compensation for true laboratory-grade PPM accuracy.
                </p>
            </div>

            {/* ============================================================ */}
            {/* MEASUREMENT PARAMETERS CARD                                  */}
            {/* ============================================================ */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 text-white font-bold text-lg">
                    <SlidersHorizontal className="text-sky-400" size={20} />
                    <span>Measurement Parameters</span>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Badge ID</label>
                        <input
                            type="text"
                            value={badgeId}
                            onChange={(e) => setBadgeId(e.target.value)}
                            placeholder="H2S-2026-00431"
                            className="w-full bg-[#0d1527] border border-slate-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-sky-500 transition"
                        />
                        {matchedWorker && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                                <UserCheck size={14} />
                                <span>Assigned to: <strong>{matchedWorker.name}</strong> ({matchedWorker.department} · Current: {matchedWorker.dose} ppm·hr)</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Temperature (°C)</label>
                            <input
                                type="number"
                                value={temperature}
                                onChange={(e) => setTemperature(e.target.value)}
                                placeholder="32"
                                className="w-full bg-[#0d1527] border border-slate-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-sky-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Relative Humidity (%))</label>
                            <input
                                type="number"
                                value={humidity}
                                onChange={(e) => setHumidity(e.target.value)}
                                placeholder="64"
                                className="w-full bg-[#0d1527] border border-slate-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-sky-500 transition"
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={runAnalysisAndSave}
                        className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 text-base shadow-lg shadow-blue-600/30 cursor-pointer"
                    >
                        <Sparkles size={18} /> Analyze Badge (Lighting-Corrected)
                    </button>
                </div>
            </div>

            {/* Notification & Alerts */}
            {saveSuccessMsg && (
                <div className="flex items-center gap-3 p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl text-emerald-300 text-sm">
                    <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                </div>
            )}

            {errorMsg && (
                <div className="flex items-center gap-3 p-4 bg-red-950/40 border border-red-800/80 rounded-xl text-red-300 text-sm">
                    <AlertTriangle size={20} className="text-red-400 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* ============================================================ */}
            {/* CAMERA & DUAL RETICLE CALIBRATION VIEWPORT                   */}
            {/* ============================================================ */}
            <div ref={cameraSectionRef} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
                {/* Duration & Reference Block Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-800">
                    <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
                            <Clock size={15} className="text-sky-400" />
                            Badge Exposure Duration:
                        </label>
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                            {["10s", "30s", "1min", "5min", "10min", "30min", "60min"].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setSelectedTime(t)}
                                    className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition ${
                                        selectedTime === t
                                            ? "bg-sky-500 border-sky-400 text-slate-950 font-bold"
                                            : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-amber-300 mb-2">
                            <SunMedium size={15} className="text-amber-400" />
                            Reference Strip Block (Framed by 🟠 Amber Box):
                        </label>
                        <select
                            value={refBlockLevel}
                            onChange={(e) => setRefBlockLevel(e.target.value)}
                            className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-2 text-xs text-amber-200 focus:outline-none focus:border-amber-400 font-medium"
                        >
                            <option value="100 ppb">Top Block: 100 ppb (Clean Baseline Standard)</option>
                            <option value="~100–500 ppb">Block 2: ~100–500 ppb Standard</option>
                            <option value="1 ppm">Block 3: 1 ppm Standard</option>
                            <option value="2 ppm">Block 4: 2 ppm Standard</option>
                            <option value="4 ppm">Block 5: 4 ppm Standard</option>
                            <option value="8 ppm">Block 6: 8 ppm Standard</option>
                            <option value="10 ppm">Bottom Block: 10 ppm Standard</option>
                            <option value="White Card">White Card Background (R:248, G:248, B:248)</option>
                        </select>
                    </div>
                </div>

                {/* Ingestion Choice */}
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
                                    <p className="font-semibold text-slate-200 text-base">Open Live Camera</p>
                                    <p className="text-xs text-slate-400 mt-1">Capture badge next to reference card via camera</p>
                                </div>
                                <span className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-sky-500 text-slate-950 rounded-lg text-sm font-semibold">
                                    Start Camera
                                </span>
                            </button>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="p-8 border-2 border-dashed border-slate-700 hover:border-emerald-500/70 rounded-xl bg-slate-950/40 hover:bg-slate-950/80 transition flex flex-col items-center justify-center gap-3 group text-center cursor-pointer"
                            >
                                <div className="p-4 bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-400 rounded-full transition">
                                    <Upload size={36} />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-200 text-base">Upload Photo</p>
                                    <p className="text-xs text-slate-400 mt-1">Select badge + reference strip image from files</p>
                                </div>
                                <span className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-sm font-semibold">
                                    Browse Files
                                </span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {/* Demo Badge with Reference Card */}
                        <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                            <div className="flex items-center gap-2.5">
                                <Sparkles size={18} className="text-amber-400 shrink-0" />
                                <span>No physical reference strip right now? Load a simulated badge side-by-side with the physical calibration ladder.</span>
                            </div>
                            <button
                                type="button"
                                onClick={loadSampleBadge}
                                className="whitespace-nowrap px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold rounded-lg transition cursor-pointer"
                            >
                                Load Test Card
                            </button>
                        </div>
                    </div>
                )}

                {/* Camera Viewfinder */}
                {isCameraActive && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-300">
                            <span className="flex items-center gap-2 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                Camera Live · Hold badge next to calibration card
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleFacingMode}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs cursor-pointer"
                                >
                                    <SwitchCamera size={14} /> Flip Camera
                                </button>
                                <button
                                    type="button"
                                    onClick={stopCamera}
                                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-red-950 text-red-400 rounded-lg border border-slate-700 text-xs cursor-pointer"
                                >
                                    <X size={14} /> Close
                                </button>
                            </div>
                        </div>

                        <div className="relative w-full max-h-[480px] overflow-hidden rounded-xl bg-black flex items-center justify-center border border-slate-800">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-auto max-h-[480px] object-contain"
                            />
                            {/* Dual Guide Outline */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center gap-6">
                                <div className="w-36 h-48 border-2 border-dashed border-sky-400/80 rounded-lg flex items-center justify-center">
                                    <span className="text-[10px] bg-slate-950/80 text-sky-300 px-2 py-0.5 rounded">
                                        Active Badge Strip
                                    </span>
                                </div>
                                <div className="w-36 h-48 border-2 border-dashed border-amber-400/80 rounded-lg flex items-center justify-center">
                                    <span className="text-[10px] bg-slate-950/80 text-amber-300 px-2 py-0.5 rounded">
                                        Reference Card
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
                                <Camera size={20} /> Snap Photo with Reference Strip
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

                {/* Interactive Dual-Reticle Canvas */}
                {imageObj && (
                    <div className="space-y-4">
                        {/* Control Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 text-xs">
                            <div className="flex items-center gap-3">
                                <span className="text-slate-400">Position Reticle:</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveTarget("sample")}
                                    className={`px-3 py-1.5 rounded-lg border font-semibold transition cursor-pointer ${
                                        activeTarget === "sample"
                                            ? "bg-sky-500 border-sky-400 text-slate-950 shadow-sm"
                                            : "bg-slate-800 border-slate-700 text-sky-300 hover:bg-slate-700"
                                    }`}
                                >
                                    🔵 Active Test Strip
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTarget("ref")}
                                    className={`px-3 py-1.5 rounded-lg border font-semibold transition cursor-pointer ${
                                        activeTarget === "ref"
                                            ? "bg-amber-500 border-amber-400 text-slate-950 shadow-sm"
                                            : "bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700"
                                    }`}
                                >
                                    🟠 Reference Strip
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
                                    <Upload size={13} /> Upload New
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

                        {/* Canvas */}
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

                        {/* Reticle Size Adjustment */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
                            <div className="flex items-center gap-3">
                                <span className="text-sky-300 font-semibold whitespace-nowrap">🔵 Test Box:</span>
                                <input
                                    type="range"
                                    min="30"
                                    max="300"
                                    value={sampleRect.width}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setSampleRect(prev => ({ ...prev, width: val, height: val }));
                                    }}
                                    className="w-full accent-sky-400 cursor-pointer"
                                />
                                <span className="font-mono text-slate-400 shrink-0">{sampleRect.width}px</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-amber-300 font-semibold whitespace-nowrap">🟠 Ref Box:</span>
                                <input
                                    type="range"
                                    min="30"
                                    max="300"
                                    value={refRect.width}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setRefRect(prev => ({ ...prev, width: val, height: val }));
                                    }}
                                    className="w-full accent-amber-400 cursor-pointer"
                                />
                                <span className="font-mono text-slate-400 shrink-0">{refRect.width}px</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ============================================================ */}
            {/* LIGHTING CORRECTION DIAGNOSTICS & RESULTS                    */}
            {/* ============================================================ */}
            {scanResult && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 animate-fade-in">
                    {/* Calibrated Winner Banner */}
                    <div className="p-6 rounded-xl border border-sky-500/40 bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                                <CheckCircle2 size={16} /> Calibrated Exposure Measurement
                            </div>
                            <div className="text-4xl font-black text-white mt-1">
                                {scanResult.bestMatch.level}
                            </div>
                            <div className="text-xs text-slate-400 mt-2 space-y-1">
                                <div>
                                    Badge: <span className="font-mono text-sky-300 font-semibold">{badgeId}</span> · Operator: <span className="text-white font-medium">{scanResult.assignedWorkerName}</span>
                                </div>
                                <div>
                                    Incremental Dose: <span className="text-emerald-400 font-bold">+{scanResult.doseIncrement} ppm·hr</span> · New Total: <span className="text-white font-bold">{scanResult.newTotalDose} ppm·hr</span>
                                </div>
                            </div>
                        </div>

                        {/* Quad Swatch Comparison */}
                        <div className="flex items-center gap-2.5 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 shrink-0">
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 rounded-lg border border-white/20 shadow-inner"
                                    style={{ backgroundColor: `rgb(${scanResult.rawSample.r}, ${scanResult.rawSample.g}, ${scanResult.rawSample.b})` }}
                                />
                                <div className="text-[10px] text-slate-400 mt-1">Raw Photo</div>
                            </div>
                            <div className="text-slate-600 font-bold text-xs">→</div>
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 rounded-lg border border-amber-400/40 shadow-inner"
                                    style={{ backgroundColor: `rgb(${scanResult.measuredRef.r}, ${scanResult.measuredRef.g}, ${scanResult.measuredRef.b})` }}
                                />
                                <div className="text-[10px] text-amber-300 mt-1">Ref Strip</div>
                            </div>
                            <div className="text-slate-600 font-bold text-xs">→</div>
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 rounded-lg border-2 border-emerald-400 shadow-lg shadow-emerald-500/20"
                                    style={{ backgroundColor: `rgb(${scanResult.correctedSample.r}, ${scanResult.correctedSample.g}, ${scanResult.correctedSample.b})` }}
                                />
                                <div className="text-[10px] text-emerald-300 font-semibold mt-1">Corrected</div>
                            </div>
                            <div className="text-slate-600 font-bold text-xs">vs</div>
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 rounded-lg border border-white/20 shadow-inner"
                                    style={{ backgroundColor: `rgb(${scanResult.bestMatch.rgb.join(",")})` }}
                                />
                                <div className="text-[10px] text-sky-300 font-semibold mt-1">Target Lab</div>
                            </div>
                        </div>
                    </div>

                    {/* Optical Normalization Report Card */}
                    <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                                <SunMedium size={16} className="text-amber-400" />
                                <span>Optical Lighting Compensation Diagnostics:</span>
                            </div>
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                                Normalized to D65 Standard
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                                <span className="text-slate-400 block mb-1">Color Temperature Shift:</span>
                                <span className="text-white font-medium">{scanResult.colorCastDesc}</span>
                            </div>
                            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                                <span className="text-slate-400 block mb-1">Luminance Compensation:</span>
                                <span className="text-white font-medium font-mono">
                                    {scanResult.brightnessShiftPct > 0 ? "+" : ""}{scanResult.brightnessShiftPct}% Illumination
                                </span>
                            </div>
                            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                                <span className="text-slate-400 block mb-1">Channel Multipliers:</span>
                                <span className="text-sky-300 font-mono">
                                    R×{scanResult.lightingMultipliers.kR} · G×{scanResult.lightingMultipliers.kG} · B×{scanResult.lightingMultipliers.kB}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Calibration scale rankings */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                            <Info size={16} className="text-sky-400" />
                            Calibrated Reference Scale Comparison ({selectedTime}):
                        </h3>
                        <div className="overflow-x-auto rounded-lg border border-slate-800">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                                    <tr>
                                        <th className="py-3 px-4">PPM / Level</th>
                                        <th className="py-3 px-4">Standard Color</th>
                                        <th className="py-3 px-4">ΔE Distance</th>
                                        <th className="py-3 px-4">Rank / Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                                    {scanResult.rankings.map((item, idx) => (
                                        <tr
                                            key={item.level + idx}
                                            className={
                                                idx === 0
                                                    ? "bg-sky-500/10 text-sky-200 font-semibold"
                                                    : "text-slate-300 hover:bg-slate-800/30"
                                            }
                                        >
                                            <td className="py-3 px-4 flex items-center gap-2">
                                                {idx === 0 && <CheckCircle2 size={15} className="text-sky-400" />}
                                                {item.level}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="w-4 h-4 rounded-full border border-white/30 inline-block"
                                                        style={{ backgroundColor: `rgb(${item.rgb.join(",")})` }}
                                                    />
                                                    <span className="font-mono text-xs text-slate-400">
                                                        rgb({item.rgb.join(", ")})
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-mono text-xs">
                                                {item.deltaE}
                                            </td>
                                            <td className="py-3 px-4 text-xs">
                                                {idx === 0 ? (
                                                    <span className="px-2.5 py-0.5 rounded-full bg-sky-500 text-slate-950 font-bold">
                                                        Best Match
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500">#{idx + 1}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ScanBadge;