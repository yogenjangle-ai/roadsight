import React, { useState, useRef } from 'react';
import { Settings, Cpu, Sliders, Volume2, Database, Trash2, CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';
import { detectorService } from '../services/detector';
import { apiService } from '../services/api';

export function SettingsModal({
  isOpen,
  onClose,
  confThreshold,
  setConfThreshold,
  iouThreshold,
  setIouThreshold,
  isMuted,
  setIsMuted,
  modelSource,
  onModelLoaded,
  onClearAllReports,
}) {
  const [backendUrl, setBackendUrl] = useState(apiService.getBaseUrl());
  const [backendStatus, setBackendStatus] = useState(null); // 'connected' | 'error' | null
  const [isTestingBackend, setIsTestingBackend] = useState(false);
  const [modelLoadMsg, setModelLoadMsg] = useState(null);
  const modelInputRef = useRef(null);

  if (!isOpen) return null;

  const handleCustomModelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setModelLoadMsg('Loading ONNX model into WebGL/WASM runtime...');
    try {
      const buffer = await file.arrayBuffer();
      const res = await detectorService.loadModel(buffer);
      if (res.success && res.mode === 'onnx') {
        setModelLoadMsg(`✅ Successfully loaded custom model: ${file.name}`);
        if (onModelLoaded) onModelLoaded('onnx');
      } else {
        setModelLoadMsg(`⚠️ Failed to parse ONNX: ${res.error || 'Unknown error'}`);
      }
    } catch (err) {
      setModelLoadMsg(`❌ Error: ${err.message}`);
    }
  };

  const handleTestBackend = async () => {
    setIsTestingBackend(true);
    setBackendStatus(null);
    apiService.setBaseUrl(backendUrl);
    const ok = await apiService.checkHealth();
    setIsTestingBackend(false);
    setBackendStatus(ok ? 'connected' : 'error');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">RoadSight Configuration</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm p-1">
            ✕
          </button>
        </div>

        {/* Section 1: AI Model Engine */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>Computer Vision Inference Engine</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200">Active Engine:</span>
                <p className="text-[11px] text-slate-400">
                  {modelSource === 'onnx' ? 'Fine-Tuned YOLOv8/11 (ONNX Runtime Web)' : 'Interactive Heuristic Simulator'}
                </p>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase border ${
                  modelSource === 'onnx'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}
              >
                {modelSource === 'onnx' ? 'YOLO-ONNX' : 'Sim-Engine'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Default path: <code className="text-amber-300 font-mono text-[10px]">/public/models/best.onnx</code>.
              Or select your trained <code className="text-slate-300 font-mono text-[10px]">.onnx</code> file below:
            </p>

            <input
              type="file"
              ref={modelInputRef}
              onChange={handleCustomModelUpload}
              accept=".onnx"
              className="hidden"
            />
            <button
              onClick={() => modelInputRef.current?.click()}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 transition-all"
            >
              <UploadCloud className="w-4 h-4 text-amber-400" />
              <span>Load Custom .onnx Model File</span>
            </button>

            {modelLoadMsg && (
              <p className="text-[11px] text-amber-300 font-mono mt-1 break-words">
                {modelLoadMsg}
              </p>
            )}
          </div>
        </div>

        {/* Section 2: Detection Sensitivity */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Detection Sensitivity</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300">Confidence Threshold:</span>
                <span className="text-amber-400 font-mono font-bold">{Math.round(confThreshold * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.90"
                step="0.05"
                value={confThreshold}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setConfThreshold(val);
                  detectorService.setThresholds(val, null);
                }}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Lower = detect more faint depressions, Higher = fewer false positives
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300">NMS IoU Threshold:</span>
                <span className="text-amber-400 font-mono font-bold">{Math.round(iouThreshold * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.80"
                step="0.05"
                value={iouThreshold}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setIouThreshold(val);
                  detectorService.setThresholds(null, val);
                }}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Suppresses duplicate overlapping bounding boxes
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Audio & Alerts */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span>Driver Hazard Sound Alerts</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <h5 className="text-xs font-semibold text-white">Audio Warning Chimes</h5>
              <p className="text-[10px] text-slate-400">Plays synthesized frequencies when potholes enter camera view</p>
            </div>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isMuted
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {!isMuted ? 'ENABLED' : 'MUTED'}
            </button>
          </div>
        </div>

        {/* Section 4: Backend API Integration */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Database className="w-4 h-4 text-amber-400" />
            <span>FastAPI Backend Server</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <label className="text-[11px] text-slate-400 font-medium block">
              Server API URL
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleTestBackend}
                disabled={isTestingBackend}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700"
              >
                {isTestingBackend ? 'Testing...' : 'Test'}
              </button>
            </div>

            {backendStatus === 'connected' && (
              <div className="flex items-center space-x-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>FastAPI backend online & reachable!</span>
              </div>
            )}
            {backendStatus === 'error' && (
              <div className="flex items-center space-x-1.5 text-xs text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Backend offline. Running in local IndexedDB mode.</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Data Reset */}
        <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete all saved pothole reports?')) {
                onClearAllReports();
              }
            }}
            className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center space-x-1.5 p-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Local Hazard Data</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
