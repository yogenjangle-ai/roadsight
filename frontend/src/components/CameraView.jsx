import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, Zap, ZapOff, Crosshair, AlertTriangle, Building2, MapPin, Sparkles, Send, Play, Square } from 'lucide-react';
import { detectorService } from '../services/detector';
import { soundAlert } from '../services/audio';
import { geoService } from '../services/geo';
import { storageService } from '../services/storage';
import { apiService } from '../services/api';
import { formatCoords } from '../utils/formatters';
import { generateTicketId, generateTechnicalConditionNote } from '../utils/pwdTemplates';

export function CameraView({ isMuted, onReportSaved, onOpenDispatch }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const simCanvasRef = useRef(null);
  const requestRef = useRef(null);

  const [facingMode, setFacingMode] = useState('environment'); // Default: rear camera
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isSimulatingRoad, setIsSimulatingRoad] = useState(false);
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [detections, setDetections] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);

  const frameCount = useRef(0);
  const lastFpsUpdate = useRef(performance.now());
  const isDetecting = useRef(false);
  const simOffset = useRef(0);

  // Initialize real camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsSimulatingRoad(false);

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }

    try {
      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        setHasTorch(Boolean(capabilities.torch));
      }
    } catch (err) {
      console.error('Camera access error:', err);
      let errorMsg = 'Unable to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission was denied. Please allow camera permissions in browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera found on this device.';
      } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        errorMsg = 'Mobile camera requires HTTPS. Please access via ngrok or deploy to Vercel/Netlify.';
      }
      setCameraError(errorMsg);
    }
  }, [facingMode]);

  const toggleTorch = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const track = videoRef.current.srcObject.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: nextState }] });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Toggle Road Drive Simulator (Allows full testing indoors or on desktop without a car)
  const toggleRoadSimulator = () => {
    if (!isSimulatingRoad) {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setCameraError(null);
      setIsSimulatingRoad(true);
    } else {
      setIsSimulatingRoad(false);
      startCamera();
    }
  };

  // Capture frame, calculate damage, format PWD ticket, and dispatch
  const captureAndDispatchGrievance = useCallback(async (currentDetections = detections) => {
    if (isCapturing) return;
    setIsCapturing(true);
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    try {
      const sourceElement = isSimulatingRoad ? simCanvasRef.current : videoRef.current;
      if (!sourceElement) return;

      const width = sourceElement.videoWidth || sourceElement.width || 640;
      const height = sourceElement.videoHeight || sourceElement.height || 480;

      // Render high-res snapshot with annotations & GPS docket banner
      const snapshotCanvas = document.createElement('canvas');
      snapshotCanvas.width = width;
      snapshotCanvas.height = height;
      const ctx = snapshotCanvas.getContext('2d');

      // 1. Draw source frame
      ctx.drawImage(sourceElement, 0, 0, width, height);

      // 2. Draw bounding boxes
      currentDetections.forEach((det) => {
        const [x1, y1, x2, y2] = det.box;
        const color = det.severity?.color || '#ef4444';

        ctx.lineWidth = 4;
        ctx.strokeStyle = color;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        // Badge
        ctx.fillStyle = color;
        const label = `POTHOLE ${(det.score * 100).toFixed(0)}% • ${det.severity?.label?.toUpperCase() || 'CRITICAL'}`;
        ctx.font = 'bold 16px -apple-system, sans-serif';
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(x1, Math.max(0, y1 - 28), textWidth + 14, 28);

        ctx.fillStyle = '#0a0d14';
        ctx.fillText(label, x1 + 7, Math.max(20, y1 - 8));
      });

      // 3. Official PWD watermark footer
      ctx.fillStyle = 'rgba(10, 13, 20, 0.88)';
      ctx.fillRect(0, height - 38, width, 38);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px monospace';
      const gpsStr = gpsCoords ? formatCoords(gpsCoords.latitude, gpsCoords.longitude) : 'GPS Acquired';
      ctx.fillText(`PWD ROAD SAFETY AUDIT • ${new Date().toLocaleString()} • ${gpsStr}`, 12, height - 14);

      const imageData = snapshotCanvas.toDataURL('image/jpeg', 0.85);

      // Determine highest severity
      let maxSeverity = { label: 'Small', color: '#eab308', level: 1 };
      currentDetections.forEach((d) => {
        if (d.severity?.level > maxSeverity.level) {
          maxSeverity = d.severity;
        }
      });

      const maxConfidence = currentDetections.length > 0
        ? Math.max(...currentDetections.map((d) => d.score))
        : 0.88;

      const coords = gpsCoords || (await geoService.getCurrentPosition());
      const address = await geoService.reverseGeocode(coords?.latitude, coords?.longitude);
      const ticketId = generateTicketId('PWD');
      const technicalNote = generateTechnicalConditionNote(maxSeverity, Math.max(1, currentDetections.length));

      const reportItem = {
        id: `rep_${Date.now()}`,
        ticketId,
        timestamp: Date.now(),
        imageData,
        coords,
        address,
        severity: maxSeverity,
        confidence: maxConfidence,
        potholesCount: Math.max(1, currentDetections.length),
        detections: currentDetections,
        technicalNote,
        notes: technicalNote,
        authority: 'State Public Works Department (PWD)',
        status: 'PENDING PWD DISPATCH',
      };

      // Save locally to IndexedDB
      await storageService.saveReport(reportItem);

      // Sync to FastAPI backend
      apiService.syncReport(reportItem).then((res) => {
        if (res) storageService.markSynced(reportItem.id);
      });

      if (onReportSaved) {
        onReportSaved(reportItem);
      }

      // Automatically open the Official PWD Dispatch Drawer
      if (onOpenDispatch) {
        onOpenDispatch(reportItem);
      }
    } catch (e) {
      console.error('Capture and dispatch error:', e);
    } finally {
      setIsCapturing(false);
    }
  }, [detections, gpsCoords, isCapturing, isSimulatingRoad, onReportSaved, onOpenDispatch]);

  // Main Detection Loop
  const renderLoop = useCallback(async () => {
    let sourceMedia = null;

    if (isSimulatingRoad) {
      // Animate driving road simulator canvas
      const simCanvas = simCanvasRef.current;
      if (simCanvas) {
        const sCtx = simCanvas.getContext('2d');
        const w = simCanvas.width;
        const h = simCanvas.height;

        // Asphalt Road Gradient
        const grad = sCtx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(0.5, '#0f172a');
        grad.addColorStop(1, '#020617');
        sCtx.fillStyle = grad;
        sCtx.fillRect(0, 0, w, h);

        // Moving lane divider stripes
        simOffset.current = (simOffset.current + 8) % 60;
        sCtx.strokeStyle = '#e2e8f0';
        sCtx.lineWidth = 6;
        sCtx.setLineDash([35, 25]);
        sCtx.lineDashOffset = -simOffset.current;
        sCtx.beginPath();
        sCtx.moveTo(w / 2, 0);
        sCtx.lineTo(w / 2, h);
        sCtx.stroke();

        // Draw animated road pothole crater in driving lane
        sCtx.setLineDash([]);
        sCtx.fillStyle = '#05070a';
        sCtx.beginPath();
        sCtx.ellipse(w * 0.48, h * 0.65, 80, 42, 0.15, 0, Math.PI * 2);
        sCtx.fill();

        // Jagged depth shadow
        sCtx.strokeStyle = '#334155';
        sCtx.lineWidth = 5;
        sCtx.stroke();

        sourceMedia = simCanvas;
      }
    } else if (videoRef.current && videoRef.current.readyState >= 2) {
      sourceMedia = videoRef.current;
    }

    if (!sourceMedia) {
      requestRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const sourceW = sourceMedia.videoWidth || sourceMedia.width || 640;
    const sourceH = sourceMedia.videoHeight || sourceMedia.height || 480;

    if (canvas.width !== sourceW || canvas.height !== sourceH) {
      canvas.width = sourceW;
      canvas.height = sourceH;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate real-time FPS
    const now = performance.now();
    frameCount.current++;
    if (now - lastFpsUpdate.current >= 1000) {
      setFps(Math.round((frameCount.current * 1000) / (now - lastFpsUpdate.current)));
      frameCount.current = 0;
      lastFpsUpdate.current = now;
    }

    // Run inference
    if (!isDetecting.current) {
      isDetecting.current = true;
      try {
        const { detections: results, latencyMs } = await detectorService.detect(sourceMedia);
        setDetections(results);
        setLatency(latencyMs);

        // Audio Alert on hazard
        if (!isMuted && results.length > 0) {
          const maxLevel = Math.max(...results.map((r) => r.severity?.level || 1));
          const label = maxLevel === 3 ? 'Large' : maxLevel === 2 ? 'Medium' : 'Small';
          soundAlert.playHazardAlert(label);
        }
      } catch (err) {
        console.error('Inference loop error:', err);
      } finally {
        isDetecting.current = false;
      }
    }

    // Draw high-tech HUD brackets & reticles
    detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.box;
      const width = x2 - x1;
      const height = y2 - y1;
      const color = det.severity?.color || '#ef4444';

      ctx.save();
      ctx.fillStyle = `${color}25`;
      ctx.fillRect(x1, y1, width, height);

      // Sci-fi / Road-safety corner brackets
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      const cornerLength = Math.min(width, height) * 0.28;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(x1, y1 + cornerLength);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1 + cornerLength, y1);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(x2 - cornerLength, y1);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x2, y1 + cornerLength);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(x1, y2 - cornerLength);
      ctx.lineTo(x1, y2);
      ctx.lineTo(x1 + cornerLength, y2);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(x2 - cornerLength, y2);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2, y2 - cornerLength);
      ctx.stroke();

      // Badge
      const labelText = `POTHOLE ${(det.score * 100).toFixed(0)}% • ${det.severity?.label?.toUpperCase() || 'CRITICAL'}`;
      ctx.font = 'bold 13px monospace';
      const textMetrics = ctx.measureText(labelText);
      const badgeW = textMetrics.width + 12;
      const badgeH = 22;
      const badgeY = Math.max(0, y1 - badgeH - 4);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x1, badgeY, badgeW, badgeH, 4);
      ctx.fill();

      ctx.fillStyle = '#0a0d14';
      ctx.fillText(labelText, x1 + 6, badgeY + 15);
      ctx.restore();
    });

    requestRef.current = requestAnimationFrame(renderLoop);
  }, [detections, isMuted, isSimulatingRoad]);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [startCamera]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [renderLoop]);

  // GPS tracking
  useEffect(() => {
    geoService.startTracking((coords) => {
      setGpsCoords(coords);
    });
    return () => geoService.stopTracking();
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-black overflow-hidden flex items-center justify-center pt-14 pb-16">
      {/* Flash effect on snap */}
      {flashEffect && <div className="absolute inset-0 z-30 bg-white opacity-85 pointer-events-none transition-opacity" />}

      {/* Hidden Simulation Canvas (Active during Drive Simulator) */}
      <canvas
        ref={simCanvasRef}
        width={640}
        height={480}
        className={`absolute inset-0 w-full h-full object-cover ${isSimulatingRoad ? 'block' : 'hidden'}`}
      />

      {/* Real Camera Video Stream */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover ${!isSimulatingRoad ? 'block' : 'hidden'}`}
      />

      {/* Detection Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
      />

      {/* Camera Permission / Error Fallback */}
      {cameraError && !isSimulatingRoad && (
        <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500 text-amber-400 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Camera Unavailable</h2>
          <p className="text-slate-300 text-xs max-w-sm mb-6 leading-relaxed">
            {cameraError}
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={startCamera}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-amber-500/30"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Camera Permission</span>
            </button>

            <button
              onClick={toggleRoadSimulator}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl flex items-center justify-center space-x-2 border border-slate-700"
            >
              <Play className="w-4 h-4 text-emerald-400" />
              <span>Launch Live Road Simulator</span>
            </button>
          </div>
        </div>
      )}

      {/* Top HUD Telemetry */}
      <div className="absolute top-16 left-3 right-3 z-20 flex items-start justify-between pointer-events-none">
        {/* Left: FPS & Latency */}
        <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-xl p-2 px-3 text-left space-y-0.5 pointer-events-auto shadow-lg">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-slate-200">{fps} FPS</span>
            <span className="text-[10px] text-slate-400 font-mono">({latency}ms)</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center space-x-1">
            <Crosshair className="w-3 h-3 text-amber-400" />
            <span>Target: {detections.length} Pothole{detections.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Center: Live Hazard & Condition Ticker */}
        {detections.length > 0 && (
          <div className="animate-pulse bg-red-600/90 backdrop-blur-md text-white text-xs font-bold py-1.5 px-3.5 rounded-full shadow-xl shadow-red-600/40 flex items-center space-x-1.5 pointer-events-auto">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>CRITICAL ROAD HAZARD SPOTTED</span>
          </div>
        )}

        {/* Right: GPS Location HUD */}
        <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-xl p-2 px-3 text-right pointer-events-auto shadow-lg">
          <div className="text-[10px] text-slate-200 font-mono flex items-center justify-end space-x-1">
            <MapPin className="w-3 h-3 text-emerald-400" />
            <span>{gpsCoords ? `${gpsCoords.latitude.toFixed(4)}, ${gpsCoords.longitude.toFixed(4)}` : 'Acquiring GPS...'}</span>
          </div>
          <div className="text-[9px] text-amber-400 font-mono">
            {isSimulatingRoad ? 'DEMO SIMULATOR' : 'LIVE DASHCAM'}
          </div>
        </div>
      </div>

      {/* Floating Bottom Primary Controls */}
      <div className="absolute bottom-20 left-0 right-0 z-20 flex flex-col items-center px-4 space-y-3">
        {/* Instant Action Button: "Send to Government / PWD" */}
        <button
          onClick={() => captureAndDispatchGrievance()}
          disabled={isCapturing}
          className="relative group py-3 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:brightness-110 text-slate-950 font-black text-sm tracking-wide uppercase flex items-center space-x-2.5 shadow-2xl shadow-red-500/50 active:scale-95 transition-all"
        >
          <Building2 className="w-5 h-5 text-slate-950" />
          <span>🚨 File Official PWD Grievance</span>
          <Send className="w-4 h-4 ml-1" />
        </button>

        {/* Secondary controls row */}
        <div className="flex items-center space-x-3">
          {/* Flip camera */}
          <button
            onClick={switchCamera}
            disabled={isSimulatingRoad}
            className="w-10 h-10 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700 text-slate-300 flex items-center justify-center active:scale-95 transition-all shadow-lg"
            title="Switch Rear/Front Camera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Torch toggle */}
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`w-10 h-10 rounded-xl backdrop-blur-md border transition-all active:scale-95 flex items-center justify-center shadow-lg ${
                torchOn ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900/85 border-slate-700 text-slate-300'
              }`}
              title="Toggle Flashlight"
            >
              {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {/* Drive Simulator Toggle */}
          <button
            onClick={toggleRoadSimulator}
            className={`px-3 py-2 rounded-xl backdrop-blur-md border text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-lg ${
              isSimulatingRoad
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-slate-900/85 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Toggle Continuous Road Simulator for testing"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isSimulatingRoad ? 'Exit Simulator' : 'Test Drive Sim'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
