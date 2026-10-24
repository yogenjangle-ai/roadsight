import React, { useState } from 'react';
import { Grid, Download, Trash2, ExternalLink, MapPin, Calendar, AlertTriangle, Search, FileSpreadsheet, Eye } from 'lucide-react';
import { formatDate, formatCoords, getGoogleMapsUrl, exportToFile, reportsToCsv } from '../utils/formatters';

export function GalleryView({ reports = [], onDeleteReport, onClearAll }) {
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReportModal, setActiveReportModal] = useState(null);

  // Filter and search
  const filteredReports = reports.filter((r) => {
    const matchesSev = filterSeverity === 'ALL' || r.severity?.label?.toUpperCase() === filterSeverity;
    const matchesSearch =
      !searchQuery.trim() ||
      (r.address && r.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSev && matchesSearch;
  });

  const handleExportCsv = () => {
    const csv = reportsToCsv(reports);
    exportToFile(csv, `roadsight_reports_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  };

  const handleExportJson = () => {
    const json = JSON.stringify(reports, null, 2);
    exportToFile(json, `roadsight_reports_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-16 pb-24 px-4 max-w-4xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Grid className="w-5 h-5 text-amber-400" />
            <span>Hazard Reports & Gallery</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Archived pothole captures with GPS coordinates, timestamps, and severity classifications.
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            disabled={reports.length === 0}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 border border-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all"
            title="Download CSV spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleExportJson}
            disabled={reports.length === 0}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 border border-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all"
            title="Download JSON export"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        {/* Severity Tabs */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 w-full sm:w-auto">
          {['ALL', 'LARGE', 'MEDIUM', 'SMALL'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterSeverity === sev
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by street name or notes..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <div className="border border-slate-800/80 rounded-2xl p-12 text-center bg-slate-900/30">
          <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-200 mb-1">No Pothole Reports Found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {reports.length === 0
              ? 'Use the Live Camera or Upload tool to detect road hazards and create reports.'
              : 'No reports match your current filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden flex flex-col transition-all group shadow-lg"
            >
              {/* Image Preview */}
              <div
                onClick={() => setActiveReportModal(report)}
                className="relative h-44 bg-slate-950 cursor-pointer overflow-hidden"
              >
                {report.imageData ? (
                  <img
                    src={report.imageData}
                    alt="Pothole capture"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                    No image data
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shadow-md"
                    style={{
                      backgroundColor: report.severity?.badgeBg,
                      color: report.severity?.color,
                    }}
                  >
                    {report.severity?.label}
                  </span>
                </div>
                <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-slate-300">
                  {(report.confidence * 100).toFixed(0)}% Conf
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">
                    {report.address || 'Roadway location'}
                  </h4>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{formatDate(report.timestamp)}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>{formatCoords(report.coords?.latitude, report.coords?.longitude)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => setActiveReportModal(report)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    {report.coords && (
                      <a
                        href={getGoogleMapsUrl(report.coords.latitude, report.coords.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="View in Google Maps"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => onDeleteReport(report.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                      title="Delete Report"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-view Modal */}
      {activeReportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 shadow-2xl">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full uppercase"
                  style={{
                    backgroundColor: activeReportModal.severity?.badgeBg,
                    color: activeReportModal.severity?.color,
                  }}
                >
                  {activeReportModal.severity?.label} Hazard
                </span>
                <h3 className="text-base font-bold text-white mt-1.5">
                  {activeReportModal.address}
                </h3>
              </div>
              <button
                onClick={() => setActiveReportModal(null)}
                className="text-slate-400 hover:text-white p-1 text-sm"
              >
                ✕
              </button>
            </div>

            {/* High-res Image */}
            {activeReportModal.imageData && (
              <img
                src={activeReportModal.imageData}
                alt="Pothole full view"
                className="w-full rounded-xl border border-slate-800 my-3"
              />
            )}

            {/* Telemetry info */}
            <div className="bg-slate-950 rounded-xl p-3 space-y-2 text-xs border border-slate-800/80 my-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Recorded:</span>
                <span className="text-slate-200 font-mono">{formatDate(activeReportModal.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">GPS Coordinates:</span>
                <span className="text-slate-200 font-mono">
                  {formatCoords(activeReportModal.coords?.latitude, activeReportModal.coords?.longitude)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Confidence Score:</span>
                <span className="text-amber-400 font-mono font-bold">
                  {(activeReportModal.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Potholes in View:</span>
                <span className="text-slate-200 font-mono">{activeReportModal.potholesCount || 1}</span>
              </div>
              {activeReportModal.notes && (
                <div className="pt-2 border-t border-slate-800 text-slate-300 italic">
                  "{activeReportModal.notes}"
                </div>
              )}
            </div>

            {/* Modal actions */}
            <div className="flex items-center space-x-2 pt-2">
              {activeReportModal.coords && (
                <a
                  href={getGoogleMapsUrl(activeReportModal.coords.latitude, activeReportModal.coords.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-amber-500/20"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Navigate with Google Maps</span>
                </a>
              )}
              <button
                onClick={() => {
                  onDeleteReport(activeReportModal.id);
                  setActiveReportModal(null);
                }}
                className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold text-xs rounded-xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
