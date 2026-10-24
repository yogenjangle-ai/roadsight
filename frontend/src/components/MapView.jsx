import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, ExternalLink, AlertTriangle, Building2, Calendar, Send } from 'lucide-react';
import { formatDate, formatCoords, getGoogleMapsUrl } from '../utils/formatters';

export function MapView({ reports = [], onOpenDispatchModal, onDeleteReport }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const filteredReports = reports.filter((r) => {
    if (filterSeverity === 'ALL') return true;
    return r.severity?.label?.toUpperCase() === filterSeverity;
  });

  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const defaultLat = reports[0]?.coords?.latitude || 37.7749;
      const defaultLon = reports[0]?.coords?.longitude || -122.4194;

      const map = window.L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLon],
        zoom: 14,
        zoomControl: false,
      });

      window.L.control.zoom({ position: 'bottomright' }).addTo(map);

      // CartoDB Dark Matter tiles
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    filteredReports.forEach((report) => {
      const lat = report.coords?.latitude;
      const lon = report.coords?.longitude;
      if (!lat || !lon) return;

      const isRepaired = report.status === 'REPAIRED & FILLED';
      const color = isRepaired
        ? '#10b981'
        : report.severity?.color || '#ef4444';

      const iconHtml = `
        <div style="
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: ${color};
          border: 3px solid #0a0d14;
          box-shadow: 0 0 16px ${color}bb;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #0a0d14;"></div>
        </div>
      `;

      const customIcon = window.L.divIcon({
        className: 'custom-pwd-pin',
        html: iconHtml,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = window.L.marker([lat, lon], { icon: customIcon }).addTo(map);
      marker.on('click', () => setSelectedReport(report));
      markersRef.current.push(marker);
    });

    if (markersRef.current.length > 0) {
      const group = new window.L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.2));
    }
  }, [filteredReports]);

  const recenterToUser = () => {
    if (navigator.geolocation && mapInstanceRef.current) {
      navigator.geolocation.getCurrentPosition((pos) => {
        mapInstanceRef.current.setView([pos.coords.latitude, pos.coords.longitude], 15);
      });
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] pt-14 pb-16 bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Controls */}
      <div className="absolute top-16 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-1 flex space-x-1 pointer-events-auto shadow-lg">
          {['ALL', 'LARGE', 'MEDIUM', 'SMALL'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                filterSeverity === sev ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-amber-400 flex items-center space-x-1.5 pointer-events-auto shadow-lg">
          <Building2 className="w-3.5 h-3.5" />
          <span>{filteredReports.length} PWD Grievances Mapped</span>
        </div>
      </div>

      <button
        onClick={recenterToUser}
        className="absolute bottom-20 right-4 z-10 w-11 h-11 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700 text-slate-200 flex items-center justify-center shadow-xl active:scale-95"
        title="Recenter location"
      >
        <Navigation className="w-5 h-5 text-amber-400" />
      </button>

      {/* Selected Grievance Card Bottom Sheet */}
      {selectedReport && (
        <div className="absolute bottom-20 left-4 right-4 z-20 max-w-sm mx-auto bg-slate-900/95 backdrop-blur-lg border border-slate-800 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {selectedReport.ticketId || selectedReport.id}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                  style={{
                    backgroundColor: selectedReport.severity?.badgeBg,
                    color: selectedReport.severity?.color,
                  }}
                >
                  {selectedReport.severity?.label}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1.5">
                {selectedReport.address || 'Road hazard location'}
              </h4>
            </div>
            <button
              onClick={() => setSelectedReport(null)}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          </div>

          {selectedReport.imageData && (
            <img
              src={selectedReport.imageData}
              alt="Pothole capture"
              className="w-full h-32 object-cover rounded-xl my-2 border border-slate-800"
            />
          )}

          <div className="text-[11px] text-slate-400 space-y-1 my-2">
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>{formatDate(selectedReport.timestamp)}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span>{formatCoords(selectedReport.coords?.latitude, selectedReport.coords?.longitude)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-3 pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                if (onOpenDispatchModal) onOpenDispatchModal(selectedReport);
                setSelectedReport(null);
              }}
              className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-amber-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch PWD Notice</span>
            </button>

            {selectedReport.coords && (
              <a
                href={getGoogleMapsUrl(selectedReport.coords.latitude, selectedReport.coords.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
                title="Google Maps Navigation"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
