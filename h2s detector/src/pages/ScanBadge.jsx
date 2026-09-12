import React, { useState, useRef, useEffect } from "react";
import {
    Camera,
    Upload,
    Crop,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    Clock,
    Activity,
    Info,
    Sliders,
    Video,
    SwitchCamera,
    X,
    SlidersHorizontal,
    Sparkles,
    UserCheck
} from "lucide-react";

// ============================================================
// CALIBRATION DATABASE (Times 10s -> 60min, 100ppb -> 10ppm)
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
// COLOR SPACE UTILS (sRGB -> CIE Lab & Delta E)
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
        if (brightness < 20 || brightness > 248) continue;
        reds.push(r); greens.push(g); blues.push(b);
    }

    if (reds.length === 0) {
        throw new Error("The selected crop region has too much glare or shadow. Move the crop box directly over the strip paper.");
    }

    return {
        r: Math.round(getMedian(reds)),
        g: Math.round(getMedian(greens)),
        b: Math.round(getMedian(blues))
    };
}

// Map level string to numerical PPM estimate for cumulative dose
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
// SCAN BADGE MAIN COMPONENT
// ============================================================
function ScanBadge() {
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const cameraSectionRef = useRef(null);

    // Measurement Parameters State (from User's Interface)
    const [badgeId, setBadgeId] = useState("H2S-2026-00431");
    const [temperature, setTemperature] = useState("32");
    const [humidity, setHumidity] = useState("64");

    // Camera & Image Processing State
    const [selectedTime, setSelectedTime] = useState("5min");
    const [imageObj, setImageObj] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [facingMode, setFacingMode] = useState("environment");

    const [cropRect, setCropRect] = useState({ x: 50, y: 50, width: 80, height: 80 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const [scanResult, setScanResult] = useState(null);
    const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    // Find if the entered Badge ID corresponds to an existing worker
    const [workersList, setWorkersList] = useState([]);
    useEffect(() => {
        const saved = localStorage.getItem("h2s_workers_data");
        if (saved) {
            try { setWorkersList(JSON.parse(saved)); } catch (e) {}
        }
    }, []);

    const matchedWorker = workersList.find(w =>
        w.badge.toLowerCase().includes(badgeId.trim().toLowerCase()) ||
        badgeId.trim().toLowerCase().includes(w.badge.toLowerCase())
    );

    // ============================================================
    // CAMERA STREAM CONTROLS
    // ============================================================
    const startCamera = async (mode = facingMode) => {
        try {
            setErrorMsg(null);
            stopCamera();

            const constraints = {
                video: {
                    facingMode: mode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = mediaStream;

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                await videoRef.current.play();
            }

            setIsCameraActive(true);
            setImageObj(null);
            setScanResult(null);
        } catch (err) {
            setIsCameraActive(false);
            setErrorMsg(`Camera access failed: ${err.message}. Please allow camera permissions or upload an image.`);
        }
    };

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

    const toggleFacingMode = () => {
        const nextMode = facingMode === "environment" ? "user" : "environment";
        setFacingMode(nextMode);
        startCamera(nextMode);
    };

    const captureFromCamera = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        const offCanvas = document.createElement("canvas");
        offCanvas.width = video.videoWidth;
        offCanvas.height = video.videoHeight;
        const offCtx = offCanvas.getContext("2d");
        offCtx.drawImage(video, 0, 0, offCanvas.width, offCanvas.height);

        const img = new Image();
        img.onload = () => {
            setImageObj(img);
            stopCamera();
            const initialSize = Math.max(50, Math.floor(img.width * 0.22));
            setCropRect({
                x: Math.floor((img.width - initialSize) / 2),
                y: Math.floor((img.height - initialSize) / 2),
                width: initialSize,
                height: initialSize
            });
            setScanResult(null);
            setErrorMsg(null);
        };
        img.src = offCanvas.toDataURL("image/png");
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
                const initialSize = Math.max(50, Math.floor(img.width * 0.22));
                setCropRect({
                    x: Math.floor((img.width - initialSize) / 2),
                    y: Math.floor((img.height - initialSize) / 2),
                    width: initialSize,
                    height: initialSize
                });
                setScanResult(null);
                setErrorMsg(null);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // Draw canvas with interactive crop box
    useEffect(() => {
        if (!imageObj || !canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = imageObj.width;
        canvas.height = imageObj.height;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(imageObj, 0, 0);

        // Dim background outside
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Clear crop box
        ctx.drawImage(
            imageObj,
            cropRect.x, cropRect.y, cropRect.width, cropRect.height,
            cropRect.x, cropRect.y, cropRect.width, cropRect.height
        );

        // Neon border
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = Math.max(2, Math.floor(canvas.width / 350));
        ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);

        // Corner resize handle
        const handleSize = Math.max(12, Math.floor(canvas.width / 45));
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(
            cropRect.x + cropRect.width - handleSize,
            cropRect.y + cropRect.height - handleSize,
            handleSize,
            handleSize
        );

        // Central crosshairs
        const cx = cropRect.x + cropRect.width / 2;
        const cy = cropRect.y + cropRect.height / 2;
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy);
        ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 2;
        ctx.stroke();
    }, [imageObj, cropRect]);

    // Canvas pointer drag/resize logic
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

        const cornerX = cropRect.x + cropRect.width;
        const cornerY = cropRect.y + cropRect.height;
        if (Math.abs(x - cornerX) < handleSize && Math.abs(y - cornerY) < handleSize) {
            setIsResizing(true);
            setDragStart({ x, y });
            return;
        }

        if (
            x >= cropRect.x &&
            x <= cropRect.x + cropRect.width &&
            y >= cropRect.y &&
            y <= cropRect.y + cropRect.height
        ) {
            setIsDragging(true);
            setDragStart({ x: x - cropRect.x, y: y - cropRect.y });
            return;
        }

        setCropRect(prev => ({
            ...prev,
            x: Math.max(0, Math.min(imageObj.width - prev.width, x - prev.width / 2)),
            y: Math.max(0, Math.min(imageObj.height - prev.height, y - prev.height / 2))
        }));
    };

    const handlePointerMove = (e) => {
        if (!imageObj || (!isDragging && !isResizing)) return;
        const { x, y } = getCanvasCoords(e);

        if (isDragging) {
            setCropRect(prev => ({
                ...prev,
                x: Math.max(0, Math.min(imageObj.width - prev.width, x - dragStart.x)),
                y: Math.max(0, Math.min(imageObj.height - prev.height, y - dragStart.y))
            }));
        } else if (isResizing) {
            const newWidth = Math.max(30, Math.min(imageObj.width - cropRect.x, x - cropRect.x));
            const newHeight = Math.max(30, Math.min(imageObj.height - cropRect.y, y - cropRect.y));
            setCropRect(prev => ({ ...prev, width: newWidth, height: newHeight }));
        }
    };

    const handlePointerUp = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    // ============================================================
    // CORE ANALYSIS & STORAGE TO WORKER PROFILE
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
            // 1. Extract color and compute Delta E against calibration references
            const sampled = extractRobustColor(canvasRef.current, cropRect);
            const sampleLab = rgbToLab(sampled.r, sampled.g, sampled.b);

            const refList = CALIBRATION_DATA[selectedTime];
            if (!refList) throw new Error("No calibration references for selected time.");

            const ranked = refList.map(ref => {
                const refLab = rgbToLab(ref.rgb[0], ref.rgb[1], ref.rgb[2]);
                const deltaE = calculateDeltaE(sampleLab, refLab);
                return {
                    ...ref,
                    deltaE: Number(deltaE.toFixed(2))
                };
            }).sort((a, b) => a.deltaE - b.deltaE);

            const best = ranked[0];

            // 2. Calculate incremental dose (ppm·hr)
            const ppmVal = getNumericalPpm(best.level);
            const doseIncrement = Number((ppmVal * 1.5).toFixed(1)); // Standardized shift increment

            // 3. Update or Register Worker in localStorage (h2s_workers_data)
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
                    email: "field.operator@petrogas.com",
                    phone: "+91 98000 11223",
                    badge: badgeId.trim(),
                    badgeExpiry: "2026-12-31",
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
            setWorkersList(updatedWorkers);

            // 4. Save to Exposure History Logs (h2s_exposure_logs)
            const existingLogs = JSON.parse(localStorage.getItem("h2s_exposure_logs") || "[]");
            const newLogEntry = {
                id: `EXP-${Math.floor(1000 + Math.random() * 9000)}`,
                timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
                worker: assignedName,
                workerId: targetWorker?.id || `W-${100 + updatedWorkers.length}`,
                badge: badgeId.trim(),
                location: targetWorker ? `${targetWorker.department}` : "Monitoring Unit",
                shift: targetWorker ? targetWorker.shift : "Current Shift",
                duration: `${selectedTime} scan (${temperature}°C, ${humidity}% RH)`,
                concentration: best.level,
                dose: newTotalDose,
                status: newTotalDose >= 25 ? "Critical" : newTotalDose >= 18 ? "Review" : "Normal",
                notes: `Environmental: Temp ${temperature}°C, RH ${humidity}%. Analyzed with Lead-Acetate calibration curve.`
            };
            localStorage.setItem("h2s_exposure_logs", JSON.stringify([newLogEntry, ...existingLogs]));

            // 5. Update UI states
            setScanResult({
                sampledRgb: sampled,
                bestMatch: best,
                rankings: ranked,
                assignedWorkerName: assignedName,
                doseIncrement,
                newTotalDose
            });

            setSaveSuccessMsg(
                `✓ Scan complete! Concentration of ${best.level} recorded to ${assignedName} (${badgeId}). Cumulative exposure updated to ${newTotalDose} ppm·hr.`
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
                    Enter measurement parameters, capture or upload the exposed badge, and store the reading to the worker's exposure profile.
                </p>
            </div>

            {/* ============================================================ */}
            {/* MEASUREMENT PARAMETERS INTERFACE (From User's Design)       */}
            {/* ============================================================ */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 text-white font-bold text-lg">
                    <SlidersHorizontal className="text-sky-400" size={20} />
                    <span>Measurement Parameters</span>
                </div>

                <div className="space-y-4">
                    {/* Badge ID Input with live worker matching */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                            Badge ID
                        </label>
                        <input
                            type="text"
                            value={badgeId}
                            onChange={(e) => setBadgeId(e.target.value)}
                            placeholder="H2S-2026-00431"
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
                                Unregistered Badge ID: Will automatically create/link a new personnel record on analysis.
                            </p>
                        )}
                    </div>

                    {/* Temperature (°C) Input */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                            Temperature (°C)
                        </label>
                        <input
                            type="number"
                            value={temperature}
                            onChange={(e) => setTemperature(e.target.value)}
                            placeholder="32"
                            className="w-full bg-[#0d1527] border border-slate-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-sky-500 transition"
                        />
                    </div>

                    {/* Relative Humidity (%) Input */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                            Relative Humidity (%)
                        </label>
                        <input
                            type="number"
                            value={humidity}
                            onChange={(e) => setHumidity(e.target.value)}
                            placeholder="64"
                            className="w-full bg-[#0d1527] border border-slate-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-sky-500 transition"
                        />
                    </div>

                    {/* Analyze Badge Button (Styling directly from user's image) */}
                    <button
                        type="button"
                        onClick={runAnalysisAndSave}
                        className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 text-base shadow-lg shadow-blue-600/30"
                    >
                        <Sparkles size={18} /> Analyze Badge
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
            {/* CAMERA & IMAGE PROCESSING SECTION                            */}
            {/* ============================================================ */}
            <div ref={cameraSectionRef} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
                {/* Duration selector */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                        <Clock size={16} className="text-sky-400" />
                        Select Strip Exposure Duration:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                        {[
                            { key: "10s", label: "10s" },
                            { key: "30s", label: "30s" },
                            { key: "1min", label: "1 min" },
                            { key: "5min", label: "5 min" },
                            { key: "10min", label: "10 min" },
                            { key: "30min", label: "30 min" },
                            { key: "60min", label: "60 min" },
                        ].map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setSelectedTime(t.key)}
                                className={`py-2 px-3 text-sm font-medium rounded-lg border transition ${
                                    selectedTime === t.key
                                        ? "bg-sky-500 border-sky-400 text-slate-950 font-bold shadow-md shadow-sky-500/20"
                                        : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Choice: Live Camera or File Upload */}
                {!imageObj && !isCameraActive && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => startCamera()}
                            className="p-8 border-2 border-dashed border-slate-700 hover:border-sky-500/70 rounded-xl bg-slate-950/40 hover:bg-slate-950/80 transition flex flex-col items-center justify-center gap-3 group text-center"
                        >
                            <div className="p-4 bg-sky-500/10 group-hover:bg-sky-500/20 text-sky-400 rounded-full transition">
                                <Video size={36} />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-200 text-base">Open Live Camera</p>
                                <p className="text-xs text-slate-400 mt-1">Capture live strip through webcam or smartphone lens</p>
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
                                <p className="font-semibold text-slate-200 text-base">Upload Image File</p>
                                <p className="text-xs text-slate-400 mt-1">Select PNG, JPG, or snapshot from gallery</p>
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
                )}

                {/* Live Camera Viewfinder */}
                {isCameraActive && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-300">
                            <span className="flex items-center gap-2 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                Live Viewfinder Active
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleFacingMode}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs"
                                >
                                    <SwitchCamera size={14} /> Flip Camera
                                </button>
                                <button
                                    type="button"
                                    onClick={stopCamera}
                                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-red-950 text-red-400 rounded-lg border border-slate-700 text-xs"
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
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="w-44 h-44 border-2 border-dashed border-sky-400/80 rounded-lg flex items-center justify-center">
                                    <span className="text-[11px] bg-slate-950/80 text-sky-300 px-2 py-0.5 rounded">
                                        Center Strip Pad Here
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={captureFromCamera}
                                className="flex-1 py-3 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2 text-base shadow-lg shadow-sky-500/20"
                            >
                                <Camera size={20} /> Snap Photo & Proceed
                            </button>
                            <button
                                type="button"
                                onClick={stopCamera}
                                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Cropping Canvas Workspace */}
                {imageObj && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800 text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                                <Crop size={15} className="text-sky-400" />
                                <span><strong>Drag</strong> box over strip pad · <strong>Drag bottom-right handle</strong> to resize</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => startCamera()}
                                    className="flex items-center gap-1 text-sky-400 hover:text-sky-300 px-2.5 py-1 bg-slate-800 rounded border border-slate-700"
                                >
                                    <Video size={13} /> Retake with Camera
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-1 text-slate-300 hover:text-white px-2.5 py-1 bg-slate-800 rounded border border-slate-700"
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

                        <div
                            className="relative w-full overflow-hidden rounded-xl bg-black border border-slate-800 flex justify-center items-center select-none cursor-crosshair max-h-[500px]"
                            onMouseDown={handlePointerDown}
                            onMouseMove={handlePointerMove}
                            onMouseUp={handlePointerUp}
                            onTouchStart={handlePointerDown}
                            onTouchMove={handlePointerMove}
                            onTouchEnd={handlePointerUp}
                        >
                            <canvas
                                ref={canvasRef}
                                className="max-w-full max-h-[500px] h-auto object-contain block"
                            />
                        </div>

                        {/* Slider to fine-tune box size */}
                        <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-sm">
                            <Sliders size={16} className="text-sky-400 shrink-0" />
                            <span className="text-xs text-slate-400 whitespace-nowrap">Crop Size:</span>
                            <input
                                type="range"
                                min="30"
                                max={Math.min(imageObj.width, imageObj.height, 450)}
                                value={cropRect.width}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setCropRect(prev => ({ ...prev, width: val, height: val }));
                                }}
                                className="w-full accent-sky-400 cursor-pointer"
                            />
                            <span className="text-xs font-mono text-slate-300 shrink-0">{cropRect.width}px</span>
                        </div>
                    </div>
                )}
            </div>

            {/* ============================================================ */}
            {/* RESULTS SECTION                                              */}
            {/* ============================================================ */}
            {scanResult && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 animate-fade-in">
                    <div className="p-6 rounded-xl border border-sky-500/40 bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider">
                                <CheckCircle2 size={16} /> Measured Exposure Result
                            </div>
                            <div className="text-4xl font-black text-white mt-1">
                                {scanResult.bestMatch.level}
                            </div>
                            <div className="text-xs text-slate-400 mt-2 space-y-1">
                                <div>
                                    Badge: <span className="font-mono text-sky-300 font-semibold">{badgeId}</span> · Operator: <span className="text-white font-medium">{scanResult.assignedWorkerName}</span>
                                </div>
                                <div>
                                    Incremental Dose: <span className="text-emerald-400 font-bold">+{scanResult.doseIncrement} ppm·hr</span> · Updated Total: <span className="text-white font-bold">{scanResult.newTotalDose} ppm·hr</span>
                                </div>
                            </div>
                        </div>

                        {/* Side-by-Side Color Swatches */}
                        <div className="flex items-center gap-4 bg-slate-950/70 p-3 rounded-lg border border-slate-800 shrink-0">
                            <div className="text-center">
                                <div
                                    className="w-14 h-14 rounded-lg border border-white/20 shadow-inner"
                                    style={{
                                        backgroundColor: `rgb(${scanResult.sampledRgb.r}, ${scanResult.sampledRgb.g}, ${scanResult.sampledRgb.b})`
                                    }}
                                />
                                <div className="text-[10px] text-slate-400 mt-1 font-mono">Sampled</div>
                            </div>
                            <div className="text-slate-600 font-bold text-lg">vs</div>
                            <div className="text-center">
                                <div
                                    className="w-14 h-14 rounded-lg border border-white/20 shadow-inner"
                                    style={{
                                        backgroundColor: `rgb(${scanResult.bestMatch.rgb.join(",")})`
                                    }}
                                />
                                <div className="text-[10px] text-slate-400 mt-1 font-mono">Reference</div>
                            </div>
                        </div>
                    </div>

                    {/* Calibration scale ranking */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                            <Info size={16} className="text-sky-400" />
                            Reference Comparison Table ({selectedTime}):
                        </h3>
                        <div className="overflow-x-auto rounded-lg border border-slate-800">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                                    <tr>
                                        <th className="py-3 px-4">PPM / Concentration</th>
                                        <th className="py-3 px-4">Calibration Color</th>
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