import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, CheckCircle, AlertTriangle, Building2, MapPin, Sparkles, RefreshCw, Send, FileText } from 'lucide-react';
import { detectorService } from '../services/detector';
import { storageService } from '../services/storage';
import { apiService } from '../services/api';
import { geoService } from '../services/geo';
import { generateTicketId, generateTechnicalConditionNote } from '../utils/pwdTemplates';

export function UploadView({ onReportSaved, onOpenDispatch }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [detections, setDetections] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const fileInputRef = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target.result);
      setDetections([]);
    };
    reader.readAsDataURL(file);
  };

  const runDetectionOnImage = async () => {
    if (!imgRef.current) return;
    setIsProcessing(true);

    try {
      const img = imgRef.current;
      const { detections: results } = await detectorService.detect(img);
      setDetections(results);

      // Render annotations to canvas
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth || 640;
        canvas.height = img.naturalHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        results.forEach((det) => {
          const [x1, y1, x2, y2] = det.box;
          const color = det.severity?.color || '#ef4444';
          ctx.lineWidth = Math.max(3.5, Math.round(canvas.width / 240));
          ctx.strokeStyle = color;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

          // Badge
          ctx.fillStyle = color;
          const label = `POTHOLE ${(det.score * 100).toFixed(0)}% • ${det.severity?.label?.toUpperCase() || 'CRITICAL'}`;
          ctx.font = `bold ${Math.max(14, Math.round(canvas.width / 42))}px sans-serif`;
          const textWidth = ctx.measureText(label).width;
          const badgeH = Math.max(24, Math.round(canvas.width / 28));
          ctx.fillRect(x1, Math.max(0, y1 - badgeH), textWidth + 14, badgeH);

          ctx.fillStyle = '#0a0d14';
          ctx.fillText(label, x1 + 7, Math.max(badgeH - 7, y1 - 7));
        });
      }
    } catch (err) {
      console.error('Upload detection failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispatchGrievance = async () => {
    if (!canvasRef.current || detections.length === 0) return;

    const coords = await geoService.getCurrentPosition();
    const address = customAddress.trim() || (await geoService.reverseGeocode(coords?.latitude, coords?.longitude));

    let maxSeverity = { label: 'Small', color: '#eab308', level: 1 };
    detections.forEach((d) => {
      if (d.severity?.level > maxSeverity.level) {
        maxSeverity = d.severity;
      }
    });

    const ticketId = generateTicketId('PWD');
    const technicalNote = customNotes.trim() || generateTechnicalConditionNote(maxSeverity, detections.length);

    const report = {
      id: `rep_${Date.now()}`,
      ticketId,
      timestamp: Date.now(),
      imageData: canvasRef.current.toDataURL('image/jpeg', 0.85),
      coords,
      address,
      severity: maxSeverity,
      confidence: Math.max(...detections.map((d) => d.score)),
      potholesCount: detections.length,
      detections,
      technicalNote,
      notes: technicalNote,
      authority: 'State Public Works Department (PWD)',
      status: 'PENDING PWD DISPATCH',
    };

    await storageService.saveReport(report);
    apiService.syncReport(report).then((res) => {
      if (res) storageService.markSynced(report.id);
    });

    if (onReportSaved) onReportSaved(report);
    if (onOpenDispatch) onOpenDispatch(report);
  };

  // Preset demo test road image
  const loadSampleRoadImage = () => {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 640;
    sampleCanvas.height = 480;
    const ctx = sampleCanvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 480);
    grad.addColorStop(0, '#334155');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 6;
    ctx.setLineDash([30, 25]);
    ctx.beginPath();
    ctx.moveTo(320, 0);
    ctx.lineTo(320, 480);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(320, 310, 85, 45, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.stroke();

    setImageSrc(sampleCanvas.toDataURL());
    setDetections([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-16 pb-24 px-4 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Upload className="w-5 h-5 text-amber-400" />
          <span>Upload Road Photo & Audit</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Upload an existing highway or street photo from your phone or dashcam to detect potholes and notify the PWD.
        </p>
      </div>

      {!imageSrc ? (
        <div className="border-2 border-dashed border-slate-800 hover:border-amber-500/60 rounded-2xl p-8 text-center transition-all bg-slate-900/40">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-200 mb-1">Upload Road Photo</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
            Select a photo from your gallery, dashcam storage, or civic road survey
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20"
            >
              Browse Photo
            </button>
            <button
              onClick={loadSampleRoadImage}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Demo Test Image</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800">
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Uploaded road"
              className={`w-full max-h-[460px] object-contain mx-auto ${detections.length > 0 ? 'hidden' : 'block'}`}
              onLoad={runDetectionOnImage}
            />

            <canvas
              ref={canvasRef}
              className={`w-full max-h-[460px] object-contain mx-auto ${detections.length > 0 ? 'block' : 'hidden'}`}
            />

            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center space-x-2 text-amber-400 font-mono text-sm">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>AI Analyzing Road Asphalt...</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setImageSrc(null);
                setDetections([]);
              }}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Upload different photo
            </button>
            <button
              onClick={runDetectionOnImage}
              disabled={isProcessing}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Re-run AI Detection</span>
            </button>
          </div>

          {detections.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {detections.length} Pothole Hazard{detections.length > 1 ? 's' : ''} Detected
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Highest confidence: {(Math.max(...detections.map((d) => d.score)) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  CRITICAL DEFECT
                </span>
              </div>

              {/* Form to submit PWD grievance */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Street Address / Highway Location
                  </label>
                  <input
                    type="text"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    placeholder="e.g. Ring Road, Near Metro Pillar 142"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Road Condition & Urgency Note
                  </label>
                  <textarea
                    rows={2}
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="Describe depth, water logging, or road hazard..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  onClick={handleDispatchGrievance}
                  className="w-full py-3 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center space-x-2 transition-all shadow-xl shadow-red-500/30"
                >
                  <Building2 className="w-4 h-4 text-slate-950" />
                  <span>🚨 File Official PWD Grievance Now</span>
                  <Send className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
