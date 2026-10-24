import React, { useState } from 'react';
import { Building2, Search, Filter, ExternalLink, Mail, MessageCircle, CheckCircle, Clock, AlertTriangle, FileSpreadsheet, Download, Trash2, Send, Wrench } from 'lucide-react';
import { formatDate, formatCoords, getGoogleMapsUrl, exportToFile, reportsToCsv } from '../utils/formatters';

export function GrievanceRegistry({
  reports = [],
  onOpenDispatchModal,
  onUpdateStatus,
  onDeleteReport,
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Status transitions
  const STATUSES = ['REPORTED TO PWD', 'INSPECTION SCHEDULED', 'WORK ORDER ISSUED', 'REPAIRED & FILLED'];

  // Calculate statistics
  const totalCount = reports.length;
  const pendingCount = reports.filter((r) => !r.status || r.status.includes('REPORTED') || r.status.includes('PENDING')).length;
  const inProgressCount = reports.filter((r) => r.status === 'INSPECTION SCHEDULED' || r.status === 'WORK ORDER ISSUED').length;
  const repairedCount = reports.filter((r) => r.status === 'REPAIRED & FILLED').length;

  const filteredReports = reports.filter((r) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && (!r.status || r.status.includes('REPORTED') || r.status.includes('PENDING'))) ||
      (statusFilter === 'IN_PROGRESS' && (r.status === 'INSPECTION SCHEDULED' || r.status === 'WORK ORDER ISSUED')) ||
      (statusFilter === 'REPAIRED' && r.status === 'REPAIRED & FILLED');

    const matchesSeverity =
      severityFilter === 'ALL' || r.severity?.label?.toUpperCase() === severityFilter;

    const matchesSearch =
      !searchQuery.trim() ||
      (r.ticketId && r.ticketId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.address && r.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.technicalNote && r.technicalNote.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.authority && r.authority.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSeverity && matchesSearch;
  });

  const cycleStatus = (report) => {
    const current = report.status || 'REPORTED TO PWD';
    const nextIdx = (STATUSES.indexOf(current) + 1) % STATUSES.length;
    const nextStatus = STATUSES[nextIdx];
    if (onUpdateStatus) {
      onUpdateStatus(report.id, { status: nextStatus });
    }
  };

  const handleExportCsv = () => {
    const csv = reportsToCsv(reports);
    exportToFile(csv, `PWD_Grievance_Docket_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  };

  const handleExportJson = () => {
    const json = JSON.stringify(reports, null, 2);
    exportToFile(json, `PWD_Grievance_Docket_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-16 pb-24 px-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              PWD Grievance & Road Repair Registry
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Official municipal tracking portal for reported potholes, repair work orders, and road filling status.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            disabled={reports.length === 0}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 border border-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5"
            title="Download official PWD grievance CSV docket"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportJson}
            disabled={reports.length === 0}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 border border-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5"
            title="Download JSON docket"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
          <span className="text-[11px] text-slate-400 font-medium">Total Grievances</span>
          <div className="text-2xl font-bold font-mono text-white mt-0.5">{totalCount}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
          <span className="text-[11px] text-amber-400 font-medium flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Reported / Pending</span>
          </span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-0.5">{pendingCount}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
          <span className="text-[11px] text-sky-400 font-medium flex items-center space-x-1">
            <Wrench className="w-3 h-3" />
            <span>Work In Progress</span>
          </span>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-0.5">{inProgressCount}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
          <span className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Filled & Repaired</span>
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">{repairedCount}</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        {/* Status Filter Tabs */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PENDING', label: 'Pending PWD' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'REPAIRED', label: 'Repaired' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ticket #, street name, PWD authority..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-sans"
          />
        </div>
      </div>

      {/* Grievance Ticket Cards */}
      {filteredReports.length === 0 ? (
        <div className="border border-slate-800/80 rounded-2xl p-12 text-center bg-slate-900/30">
          <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-200 mb-1">No Grievances Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {reports.length === 0
              ? 'Connect your phone camera or upload a road photo to detect potholes and notify the government.'
              : 'No grievances match your current search or filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const isRepaired = report.status === 'REPAIRED & FILLED';
            const statusColor = isRepaired
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : report.status === 'WORK ORDER ISSUED' || report.status === 'INSPECTION SCHEDULED'
              ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
              : 'bg-amber-500/20 text-amber-400 border-amber-500/30';

            return (
              <div
                key={report.id}
                className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all shadow-lg flex flex-col md:flex-row gap-4"
              >
                {/* Photo Thumbnail */}
                <div className="w-full md:w-52 h-44 rounded-xl overflow-hidden bg-black shrink-0 relative border border-slate-800">
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

                {/* Ticket Details */}
                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {report.ticketId || report.id}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(report.timestamp)}
                        </span>
                      </div>

                      {/* Interactive Status Pill (Click to advance state) */}
                      <button
                        onClick={() => cycleStatus(report)}
                        className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase border flex items-center space-x-1.5 transition-all hover:scale-105 ${statusColor}`}
                        title="Click to cycle status: Reported -> Inspection -> Work Order -> Repaired"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        <span>{report.status || 'REPORTED TO PWD'}</span>
                      </button>
                    </div>

                    {/* Road Location */}
                    <h4 className="text-sm font-bold text-white mt-2">
                      {report.address || 'Public Roadway'}
                    </h4>

                    {/* GPS Coordinates */}
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono mt-1">
                      <span>{formatCoords(report.coords?.latitude, report.coords?.longitude)}</span>
                      {report.coords && (
                        <a
                          href={getGoogleMapsUrl(report.coords.latitude, report.coords.longitude)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 flex items-center space-x-0.5 font-sans"
                        >
                          <span>Open Map</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      )}
                    </div>

                    {/* Technical Condition Note */}
                    <div className="mt-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 text-xs text-slate-300 leading-relaxed font-sans">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Technical Road Audit:
                      </div>
                      <p className="line-clamp-2">
                        {report.technicalNote || report.notes || 'Asphalt failure requiring immediate road patching.'}
                      </p>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">
                      Authority: <strong className="text-slate-300">{report.authority || 'State PWD'}</strong>
                    </span>

                    <div className="flex items-center space-x-2">
                      {/* Re-Dispatch to PWD Button */}
                      <button
                        onClick={() => onOpenDispatchModal(report)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all shadow-md shadow-amber-500/20"
                      >
                        <Send className="w-3 h-3" />
                        <span>Dispatch to PWD</span>
                      </button>

                      <button
                        onClick={() => onDeleteReport(report.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                        title="Delete Grievance Docket"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
