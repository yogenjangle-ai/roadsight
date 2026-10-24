import React, { useState } from 'react';
import { Camera, Smartphone, QrCode, Copy, Check, ExternalLink, ShieldAlert, FileSpreadsheet, ArrowRight } from 'lucide-react';

export function StartScreen({ onStartCamera, onOpenStored, storedCount = 0, onExportCsv }) {
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Local Wi-Fi URL and current origin
  const localUrl = `http://192.168.1.3:5173`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(localUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(localUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between p-4 sm:p-6 max-w-4xl mx-auto selection:bg-amber-500 selection:text-black">
      {/* Header */}
      <header className="pt-4 pb-2 text-center">
        <div className="inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3 text-xs font-semibold tracking-wide uppercase">
          <ShieldAlert className="w-4 h-4" />
          <span>Real-Time Pothole Detection & PWD Logger</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          RoadSight <span className="text-amber-400">AI</span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-md mx-auto">
          Scan road potholes in real time using your camera, save geo-tagged evidence, and export reports for road repairs.
        </p>
      </header>

      {/* Main 2 Options */}
      <main className="my-auto py-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl w-full mx-auto">
        {/* Option 1: Use Camera */}
        <div
          onClick={onStartCamera}
          className="group relative bg-slate-900/80 hover:bg-slate-900 border-2 border-slate-800 hover:border-amber-400 rounded-3xl p-6 sm:p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-amber-500/20 active:scale-[0.98]"
        >
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                Option 1 • Instant Scanner
              </span>
              <h2 className="text-2xl font-bold text-white mt-1 group-hover:text-amber-400 transition-colors">
                Use Camera
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
                Connect directly to your device camera (phone rear camera or laptop webcam) to scan and detect potholes live on screen.
              </p>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Launch Live Camera</span>
            <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-4 h-4 font-bold" />
            </div>
          </div>
        </div>

        {/* Option 2: Connect Phone */}
        <div
          onClick={() => setShowPhoneModal(true)}
          className="group relative bg-slate-900/80 hover:bg-slate-900 border-2 border-slate-800 hover:border-sky-400 rounded-3xl p-6 sm:p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-sky-500/20 active:scale-[0.98]"
        >
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Smartphone className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                Option 2 • Mount on Dashboard
              </span>
              <h2 className="text-2xl font-bold text-white mt-1 group-hover:text-sky-400 transition-colors">
                Connect to Phone
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
                Open on your mobile phone to use it as an in-car windshield dashcam with GPS tracking and rear camera road detection.
              </p>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Show Phone QR & Link</span>
            <div className="w-9 h-9 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <QrCode className="w-4 h-4 font-bold" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Stored Potholes Bar */}
      <footer className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          onClick={onOpenStored}
          className="text-xs text-slate-300 hover:text-white font-medium flex items-center space-x-2 py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Stored Potholes: <strong className="text-amber-400 font-mono text-sm">{storedCount}</strong></span>
        </button>

        <div className="flex items-center space-x-2">
          {storedCount > 0 && (
            <button
              onClick={onExportCsv}
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 flex items-center space-x-1.5 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
          <span className="text-[11px] text-slate-500">RoadSight PWD v2.0 • Offline Ready</span>
        </div>
      </footer>

      {/* Connect to Phone Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white">Connect Phone Camera</h3>
              </div>
              <button
                onClick={() => setShowPhoneModal(false)}
                className="text-slate-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* QR Code */}
            <div className="p-3 bg-white rounded-2xl inline-block mx-auto shadow-md">
              <img
                src={qrCodeUrl}
                alt="Scan to open on phone"
                className="w-44 h-44 object-contain mx-auto"
              />
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Scan this QR code with your phone camera to open RoadSight directly.
            </p>

            {/* Direct URL */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
              <span className="text-xs font-mono text-amber-300 truncate max-w-[200px]">
                {localUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center space-x-1 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed text-left bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              💡 <strong>Note:</strong> Make sure your phone and Mac are connected to the same Wi-Fi. If using a remote tunnel, enter your IP <code className="text-amber-400">103.106.103.217</code>.
            </p>

            <button
              onClick={() => setShowPhoneModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
