import React, { useState, useEffect, useCallback } from 'react';
import { StartScreen } from './components/StartScreen';
import { LiveScanner } from './components/LiveScanner';
import { StoredPotholesModal } from './components/StoredPotholesModal';
import { storageService } from './services/storage';
import { detectorService } from './services/detector';
import { exportToFile, reportsToCsv } from './utils/formatters';

export default function App() {
  const [view, setView] = useState('start'); // 'start' | 'camera'
  const [reports, setReports] = useState([]);
  const [isStoredOpen, setIsStoredOpen] = useState(false);

  // Load saved reports from local storage on mount
  useEffect(() => {
    storageService.getReports().then((data) => {
      setReports(data || []);
    });

    // Initialize AI detection engine
    detectorService.loadModel();
  }, []);

  const handleRefreshReports = useCallback(async () => {
    const data = await storageService.getReports();
    setReports(data || []);
  }, []);

  const handleDeleteReport = useCallback(async (id) => {
    await storageService.deleteReport(id);
    setReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleClearAllReports = useCallback(async () => {
    await storageService.clearAll();
    setReports([]);
  }, []);

  const handleExportCsv = useCallback(() => {
    const csv = reportsToCsv(reports);
    exportToFile(csv, `RoadSight_Pothole_Reports_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  }, [reports]);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-amber-500 selection:text-black">
      {/* View 1: Start Screen with 2 Big Options */}
      {view === 'start' && (
        <StartScreen
          onStartCamera={() => {
            handleRefreshReports();
            setView('camera');
          }}
          onOpenStored={() => {
            handleRefreshReports();
            setIsStoredOpen(true);
          }}
          storedCount={reports.length}
          onExportCsv={handleExportCsv}
        />
      )}

      {/* View 2: Live Camera Scanner */}
      {view === 'camera' && (
        <LiveScanner
          onBack={() => {
            handleRefreshReports();
            setView('start');
          }}
          onOpenStored={() => {
            handleRefreshReports();
            setIsStoredOpen(true);
          }}
          storedCount={reports.length}
        />
      )}

      {/* Stored Potholes & Export Modal */}
      <StoredPotholesModal
        isOpen={isStoredOpen}
        onClose={() => {
          handleRefreshReports();
          setIsStoredOpen(false);
        }}
        reports={reports}
        onDelete={handleDeleteReport}
        onClearAll={handleClearAllReports}
      />
    </div>
  );
}
