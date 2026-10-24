import React, { useState } from 'react';
import { Download, FileSpreadsheet, Trash2, ExternalLink, MapPin, Calendar, Mail, MessageCircle, AlertTriangle, Send } from 'lucide-react';
import { formatDate, formatCoords, getGoogleMapsUrl, exportToFile, reportsToCsv } from '../utils/formatters';
import { createPwdEmailDraft, createPwdWhatsAppMessage } from '../utils/pwdTemplates';

export function StoredPotholesModal({ isOpen, onClose, reports = [], onDelete, onClearAll }) {
  if (!isOpen) return null;

  const [activeDispatchReport, setActiveDispatchReport] = useState(null);

  const handleExportCsv = () => {
    const csv = reportsToCsv(reports);
    exportToFile(csv, `RoadSight_Pothole_Reports_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  };

  const handleExportJson = () => {
    const json = JSON.stringify(reports, null, 2);
    exportToFile(json, `RoadSight_Pothole_Reports_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  };

  const handleSendEmail = (report) => {
    const url = createPwdEmailDraft({
      ticketId: report.ticketId || report.id,
      address: report.address,
      coords: report.coords,
      severity: report.severity,
      potholesCount: report.potholesCount,
      notes: report.technicalNote || report.notes,
    });
    window.open(url, '_blank');
  };

  const handleSendWhatsApp = (report) => {
    const url = createPwdWhatsAppMessage({
      ticketId: report.ticketId || report.id,
      address: report.address,
      coords: report.coords,
      severity: report.severity,
      potholesCount: report.potholesCount,
      notes: report.technicalNote || report.notes,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
              <span>Stored Potholes & Hazards</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold">
                {reports.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Geo-tagged evidence stored offline. Export or send directly to road authorities.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 text-base font-bold"
          >
            ✕
          </button>
        </div>

        {/* Toolbar: Export CSV, JSON & Clear */}
        <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCsv}
              disabled={reports.length === 0}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-600/20"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportJson}
              disabled={reports.length === 0}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export JSON</span>
            </button>
          </div>

          {reports.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Delete all stored pothole records?')) {
                  onClearAll();
                }
              }}
              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>

        {/* Content List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {reports.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold">No Potholes Stored Yet</p>
              <p className="text-xs max-w-xs mx-auto text-slate-400">
                Turn on the live camera and tap "Capture & Save Pothole" to store road defect evidence.
              </p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="bg-slate-950 border border-slate-800/90 rounded-2xl p-3.5 flex flex-col sm:flex-row gap-3.5"
              >
                {/* Photo Thumbnail */}
                <div className="w-full sm:w-44 h-32 rounded-xl overflow-hidden bg-black shrink-0 relative border border-slate-800">
                  {report.imageData ? (
                    <img
                      src={report.imageData}
                      alt="Pothole capture"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                      No Photo
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shadow-md"
                      style={{
                        backgroundColor: report.severity?.badgeBg || 'rgba(239,68,68,0.2)',
                        color: report.severity?.color || '#ef4444',
                      }}
                    >
                      {report.severity?.label || 'Medium'}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {report.ticketId || report.id}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(report.timestamp)}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mt-1">
                      {report.address || 'Roadway location'}
                    </h4>

                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                      <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{formatCoords(report.coords?.latitude, report.coords?.longitude)}</span>
                      {report.coords && (
                        <a
                          href={getGoogleMapsUrl(report.coords.latitude, report.coords.longitude)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:underline flex items-center ml-1 font-sans font-semibold"
                        >
                          <span>Map</span>
                          <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                        </a>
                      )}
                    </div>

                    {report.technicalNote && (
                      <p className="text-[11px] text-slate-300 mt-1.5 line-clamp-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        {report.technicalNote}
                      </p>
                    )}
                  </div>

                  {/* Action Dispatch Buttons */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSendEmail(report)}
                        className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-lg flex items-center space-x-1"
                        title="Send grievance email to PWD"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Email PWD</span>
                      </button>

                      <button
                        onClick={() => handleSendWhatsApp(report)}
                        className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-lg flex items-center space-x-1"
                        title="Send WhatsApp alert"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>
                    </div>

                    <button
                      onClick={() => onDelete(report.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
