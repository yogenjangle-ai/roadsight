import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, Zap, ZapOff, ArrowLeft, MapPin, AlertTriangle, ShieldCheck, Sparkles, FolderDown } from 'lucide-react';
import { detectorService } from '../services/detector';
import { soundAlert } from '../services/audio';
import { geoService } from '../services/geo';
import { storageService } from '../services/storage';
import { apiService } from '../services/api';
import { formatCoords } from '../utils/formatters';
import { generateTicketId, generateTechnicalConditionNote } from '../utils/pwdTemplates';

export function LiveScanner({ onBack, onOpenStored, storedCount = 0 }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  const [facingMode, setFacingMode] = useState('environment'); // default: rear camera
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [fps, setFps] = useState(0);
  const [detections, setDetections] = useState([]);
  const [autoSave, setAutoSave] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  const frameCount = useRef(0);
  const lastFpsUpdate = useRef(performance.now());
  const isDetecting = useRef(false);
  const lastAutoSaveTime = useRef(0);

  // Start device camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
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
        errorMsg = 'Camera on phones requires HTTPS. Please access via the secure tunnel link or open localhost.';
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

  // Capture frame, calculate damage, and store
  const captureAndStorePothole = useCallback(async (currentDetections = detections) => {
    if (!videoRef.current || isCapturing) return;
    setIsCapturing(true);
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    try {
      const video = videoRef.current;
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      const snapshotCanvas = document.createElement('canvas');
      snapshotCanvas.width = width;
      snapshotCanvas.height = height;
      const ctx = snapshotCanvas.getContext('2d');

      // 1. Draw raw video
      ctx.drawImage(video, 0, 0, width, height);

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

      // 3. Official GPS timestamp watermark banner
      ctx.fillStyle = 'rgba(10, 13, 20, 0.85)';
      ctx.fillRect(0, height - 36, width, 36);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px monospace';
      const gpsStr = gpsCoords ? formatCoords(gpsCoords.latitude, gpsCoords.longitude) : 'GPS Acquired';
      ctx.fillText(`ROADSIGHT AI • ${new Date().toLocaleString()} • ${gpsStr}`, 12, height - 13);

      const imageData = snapshotCanvas.toDataURL('image/jpeg', 0.85);

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
        status: 'REPORTED TO PWD',
      };

      await storageService.saveReport(reportItem);
      apiService.syncReport(reportItem);

      setSaveSuccessMsg(`Saved Pothole (${ticketId})!`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setIsCapturing(false);
    }
  }, [detections, gpsCoords, isCapturing]);

  // Main Detection Loop
  const renderLoop = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      requestRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
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
        const { detections: results } = await detectorService.detect(video);
        setDetections(results);

        // Sound Alert on hazard
        if (results.length > 0) {
          const maxLevel = Math.max(...results.map((r) => r.severity?.level || 1));
          const label = maxLevel === 3 ? 'Large' : maxLevel === 2 ? 'Medium' : 'Small';
          soundAlert.playHazardAlert(label);
        }

        // Auto-save logic
        if (autoSave && results.length > 0 && now - lastAutoSaveTime.current > 5000) {
          const highConf = results.some((r) => r.score >= 0.8);
          if (highConf) {
            lastAutoSaveTime.current = now;
            captureAndStorePothole(results);
          }
        }
      } catch (err) {
        console.error('Inference loop error:', err);
      } finally {
        isDetecting.current = false;
      }
    }

    // Draw bounding boxes on canvas
    detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.box;
      const width = x2 - x1;
      const height = y2 - y1;
      const color = det.severity?.color || '#ef4444';

      ctx.save();
      ctx.fillStyle = `${color}25`;
      ctx.fillRect(x1, y1, width, height);

      // Corner brackets
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      const cornerLength = Math.min(width, height) * 0.28;

      ctx.beginPath();
      ctx.moveTo(x1, y1 + cornerLength);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1 + cornerLength, y1);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x2 - cornerLength, y1);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x2, y1 + cornerLength);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x1, y2 - cornerLength);
      ctx.lineTo(x1, y2);
      ctx.lineTo(x1 + cornerLength, y2);
      ctx.stroke();

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
  }, [detections, autoSave, captureAndStorePothole]);

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

  useEffect(() => {
    geoService.startTracking((coords) => {
      setGpsCoords(coords);
    });
    return () => geoService.stopTracking();
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center select-none">
      {/* Flash effect on snap */}
      {flashEffect && <div className="absolute inset-0 z-30 bg-white opacity-80 pointer-events-none transition-opacity" />}

      {/* Real Camera Video Stream */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Canvas Detection Bounding Boxes */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
      />

      {/* Camera Error Message */}
      {cameraError && (
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
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Camera</span>
            </button>
            <button
              onClick={onBack}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
            >
              Back to Start
            </button>
          </div>
        </div>
      )}

      {/* Top Floating HUD */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <button
          onClick={onBack}
          className="pointer-events-auto px-3.5 py-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 active:scale-95 shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit</span>
        </button>

        {/* Hazard alert or GPS */}
        <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 text-right pointer-events-auto shadow-lg">
          <div className="text-[10px] text-slate-300 font-mono flex items-center justify-end space-x-1">
            <MapPin className="w-3 h-3 text-emerald-400" />
            <span>{gpsCoords ? `${gpsCoords.latitude.toFixed(4)}, ${gpsCoords.longitude.toFixed(4)}` : 'Locating GPS...'}</span>
          </div>
          <div className="text-[10px] text-amber-400 font-mono font-bold">
            {detections.length} Pothole{detections.length !== 1 ? 's' : ''} in view • {fps} FPS
          </div>
        </div>
      </div>

      {/* Save Success Toast */}
      {saveSuccessMsg && (
        <div className="absolute top-20 z-30 bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-full shadow-2xl flex items-center space-x-1.5 animate-bounce">
          <ShieldCheck className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex flex-col items-center px-4 space-y-3">
        {/* Main Capture Button */}
        <button
          onClick={() => captureAndStorePothole()}
          disabled={isCapturing}
          className={`relative group py-3.5 px-7 rounded-full transition-all active:scale-90 flex items-center space-x-3 shadow-2xl ${
            detections.length > 0
              ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/50 animate-pulse'
              : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/40'
          }`}
        >
          <Camera className="w-5 h-5 font-black" />
          <span className="text-sm font-black tracking-wide uppercase">
            Capture & Save Pothole
          </span>
        </button>

        {/* Action icons row */}
        <div className="flex items-center space-x-2.5">
          {/* Flip camera */}
          <button
            onClick={switchCamera}
            className="w-11 h-11 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700 text-slate-200 flex items-center justify-center active:scale-95 shadow-lg"
            title="Switch Camera (Rear/Front)"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Torch toggle */}
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                torchOn ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900/90 border-slate-700 text-slate-200'
              }`}
              title="Toggle Flashlight"
            >
              {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {/* Auto-save toggle */}
          <button
            onClick={() => setAutoSave(!autoSave)}
            className={`px-3 py-2.5 rounded-full backdrop-blur-md border text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-lg active:scale-95 ${
              autoSave
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                : 'bg-slate-900/90 border-slate-700 text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{autoSave ? 'Auto-Save ON' : 'Auto-Save'}</span>
          </button>

          {/* Stored drawer button */}
          <button
            onClick={onOpenStored}
            className="px-3.5 py-2.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700 text-amber-400 text-xs font-bold flex items-center space-x-1.5 active:scale-95 shadow-lg"
          >
            <FolderDown className="w-3.5 h-3.5" />
            <span>Stored ({storedCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
