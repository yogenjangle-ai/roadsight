import React from 'react';
import { Camera, Upload, MapPin, Building2, Settings, Volume2, VolumeX, ShieldCheck } from 'lucide-react';

export function Navbar({ activeTab, setActiveTab, isMuted, setIsMuted, isGpsActive, modelSource, onOpenSettings }) {
  const tabs = [
    { id: 'camera', label: 'Live Scanner', icon: Camera },
    { id: 'registry', label: 'PWD Grievances', icon: Building2 },
    { id: 'map', label: 'Repair Map', icon: MapPin },
    { id: 'upload', label: 'Photo Audit', icon: Upload },
  ];

  return (
    <>
      {/* Top HUD status bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-slate-950 font-black text-xs shadow-md shadow-amber-500/20">
            PWD
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-sm font-black tracking-wider text-slate-100 uppercase">RoadSight PWD</h1>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                GOVT DISPATCH
              </span>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center space-x-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${isGpsActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{isGpsActive ? 'GPS Triangulated' : 'Locating Road...'}</span>
              <span>•</span>
              <span className="text-slate-300 font-mono text-[9px] uppercase">
                {modelSource === 'onnx' ? 'YOLO-AI' : 'Sim-Engine'}
              </span>
            </p>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg border transition-all ${
              isMuted
                ? 'bg-slate-900 border-slate-800 text-slate-500'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-sm shadow-amber-500/20'
            }`}
            title={isMuted ? 'Unmute Audio Warning' : 'Mute Audio Warning'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            title="Settings & Model Config"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Bottom mobile thumb navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/90 px-2 py-1.5 max-w-lg mx-auto md:max-w-none">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all relative ${
                  isActive
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <span className="absolute -top-1 w-8 h-1 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                )}
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'scale-110 text-amber-400' : 'text-slate-400'}`} />
                <span className="text-[11px] tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
