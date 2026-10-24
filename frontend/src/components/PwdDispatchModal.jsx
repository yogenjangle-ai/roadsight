import React, { useState } from 'react';
import { Mail, MessageCircle, Download, CheckCircle2, Building2, MapPin, ExternalLink, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';
import { createPwdEmailDraft, createPwdWhatsAppMessage, generatePrintableNotice } from '../utils/pwdTemplates';
import { exportToFile, formatCoords, getGoogleMapsUrl } from '../utils/formatters';

export function PwdDispatchModal({ report, isOpen, onClose, onUpdateStatus }) {
  if (!isOpen || !report) return null;

  const [authority, setAuthority] = useState(report.authority || 'State Public Works Department (PWD)');
  const [recipientEmail, setRecipientEmail] = useState('pwd-grievance@gov.in');
  const [notes, setNotes] = useState(report.technicalNote || report.notes || '');
  const [isCopied, setIsCopied] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState(report.status || 'PENDING DISPATCH');

  const handleSendEmail = () => {
    const url = createPwdEmailDraft({
      ticketId: report.ticketId || report.id,
      authority,
      recipientEmail,
      address: report.address,
      coords: report.coords,
      severity: report.severity,
      potholesCount: report.potholesCount,
      notes,
    });
    window.open(url, '_blank');
    markAsReported('REPORTED TO PWD');
  };

  const handleSendWhatsApp = () => {
    const url = createPwdWhatsAppMessage({
      ticketId: report.ticketId || report.id,
      authority,
      address: report.address,
      coords: report.coords,
      severity: report.severity,
      potholesCount: report.potholesCount,
      notes,
    });
    window.open(url, '_blank');
    markAsReported('REPORTED TO PWD');
  };

  const handleDownloadNotice = () => {
    const content = generatePrintableNotice({
      ...report,
      authority,
      technicalNote: notes,
      status: 'OFFICIALLY FILED TO PWD',
    });
    exportToFile(content, `PWD_Grievance_${report.ticketId || report.id}.txt`, 'text/plain');
    markAsReported('REPORTED TO PWD');
  };

  const markAsReported = (newStatus) => {
    setSubmittedStatus(newStatus);
    if (onUpdateStatus) {
      onUpdateStatus(report.id, {
        status: newStatus,
        authority,
        technicalNote: notes,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full my-auto shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600/30 via-slate-900 to-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                  Official PWD Grievance Dispatch
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {report.ticketId || report.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Direct notification to municipal and state road repair departments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Photographic Proof Card */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black">
            {report.imageData ? (
              <img
                src={report.imageData}
                alt="Pothole proof"
                className="w-full h-44 object-cover"
              />
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-500 text-xs">
                No photo capture
              </div>
            )}
            <div className="absolute top-2 left-2 flex items-center space-x-1.5">
              <span
                className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase shadow-md"
                style={{
                  backgroundColor: report.severity?.badgeBg || 'rgba(239,68,68,0.3)',
                  color: report.severity?.color || '#ef4444',
                }}
              >
                {report.severity?.label || 'Large'} Hazard
              </span>
              <span className="bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-slate-300">
                {report.potholesCount || 1} Pothole(s) Identified
              </span>
            </div>

            <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-md rounded-lg px-2.5 py-1 flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-mono text-[10px]">{new Date(report.timestamp).toLocaleString()}</span>
              {report.coords && (
                <span className="text-amber-400 font-mono text-[10px]">
                  {formatCoords(report.coords.latitude, report.coords.longitude)}
                </span>
              )}
            </div>
          </div>

          {/* Target Authority Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Target Road Authority Jurisdiction:</span>
            </label>
            <select
              value={authority}
              onChange={(e) => setAuthority(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="State Public Works Department (PWD)">State Public Works Department (PWD)</option>
              <option value="Municipal Corporation / City Council">Municipal Corporation (City Council)</option>
              <option value="National Highways Authority of India (NHAI)">National Highways Authority (NHAI)</option>
              <option value="Rural Road Development Agency (PMGSY / Zilla Parishad)">Rural Roads (Zilla Parishad / Gram Panchayat)</option>
              <option value="Smart City Road Maintenance Cell">Smart City Road Maintenance Cell</option>
            </select>
          </div>

          {/* Location & GPS Info */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-slate-400 text-[11px]">Street / Road Location:</span>
                <p className="text-white font-semibold text-xs mt-0.5">
                  {report.address || 'Roadway location detected'}
                </p>
              </div>
              {report.coords && (
                <a
                  href={getGoogleMapsUrl(report.coords.latitude, report.coords.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg flex items-center space-x-1 border border-slate-700"
                >
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span>Google Maps Pin</span>
                  <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                </a>
              )}
            </div>
          </div>

          {/* Technical Road Condition Note (Auto-generated & Editable) */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Technical Damage Condition Report (Sent to Engineers):</span>
              </span>
              <span className="text-[10px] text-amber-400 font-normal">Auto-Generated by AI</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
              placeholder="Describe road defect, pothole depth, water logging, danger to two-wheelers..."
            />
          </div>

          {/* Recipient Email for Authority */}
          <div>
            <label className="text-[11px] text-slate-400 font-medium block mb-1">
              PWD / Municipal Grievance Officer Email:
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="e.g. complaints@pwd.gov.in"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Dispatch Status Badge */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  submittedStatus.includes('REPORTED') ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-xs font-semibold text-slate-200">
                Action Status: <strong className="text-amber-400 uppercase">{submittedStatus}</strong>
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Govt Response Standard: 48 Hrs
            </span>
          </div>
        </div>

        {/* Action Dispatch Toolbar */}
        <div className="bg-slate-950 border-t border-slate-800 p-4 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Email Dispatch */}
            <button
              onClick={handleSendEmail}
              className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-amber-500/20 active:scale-98"
            >
              <Mail className="w-4 h-4" />
              <span>Email Official Grievance</span>
            </button>

            {/* WhatsApp Helpline Dispatch */}
            <button
              onClick={handleSendWhatsApp}
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-600/20 active:scale-98"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Send via WhatsApp Helpline</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleDownloadNotice}
              className="text-xs text-slate-300 hover:text-white font-semibold flex items-center space-x-1.5 py-1 px-2"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download Printable Docket (.txt)</span>
            </button>

            <button
              onClick={() => {
                markAsReported('REPORTED TO PWD');
                onClose();
              }}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700"
            >
              Save & Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
