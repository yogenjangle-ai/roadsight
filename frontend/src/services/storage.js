/**
 * Local IndexedDB Storage for RoadSight Reports
 * Offline-first, fast, handles high-res capture images reliably.
 */
import { openDB } from 'idb';

const DB_NAME = 'roadsight-db';
const DB_VERSION = 1;
const STORE_NAME = 'reports';

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('severity', 'severity.label');
        store.createIndex('synced', 'synced');
      }
    },
  });
}

export const storageService = {
  async saveReport(report) {
    const item = {
      id: report.id || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: report.timestamp || Date.now(),
      imageData: report.imageData || '',
      coords: report.coords || null,
      address: report.address || 'Locating...',
      severity: report.severity || { label: 'Medium', color: '#f97316', level: 2 },
      confidence: report.confidence || 0.85,
      potholesCount: report.potholesCount || (report.detections ? report.detections.length : 1),
      detections: report.detections || [],
      notes: report.notes || '',
      synced: report.synced || false,
    };

    try {
      const db = await getDB();
      await db.put(STORE_NAME, item);
      return item;
    } catch (e) {
      console.warn('IndexedDB write failed, falling back to localStorage:', e);
      // Fallback
      const current = JSON.parse(localStorage.getItem('roadsight_reports') || '[]');
      current.unshift(item);
      // Limit storage if keeping base64 images
      localStorage.setItem('roadsight_reports', JSON.stringify(current.slice(0, 30)));
      return item;
    }
  },

  async getReports() {
    try {
      const db = await getDB();
      const all = await db.getAllFromIndex(STORE_NAME, 'timestamp');
      return all.reverse(); // newest first
    } catch (e) {
      console.warn('IndexedDB read failed, falling back to localStorage:', e);
      return JSON.parse(localStorage.getItem('roadsight_reports') || '[]');
    }
  },

  async getReportById(id) {
    try {
      const db = await getDB();
      return await db.get(STORE_NAME, id);
    } catch (e) {
      const reports = await this.getReports();
      return reports.find((r) => r.id === id);
    }
  },

  async deleteReport(id) {
    try {
      const db = await getDB();
      await db.delete(STORE_NAME, id);
    } catch (e) {
      const current = JSON.parse(localStorage.getItem('roadsight_reports') || '[]');
      const filtered = current.filter((r) => r.id !== id);
      localStorage.setItem('roadsight_reports', JSON.stringify(filtered));
    }
    return true;
  },

  async markSynced(id) {
    try {
      const db = await getDB();
      const item = await db.get(STORE_NAME, id);
      if (item) {
        item.synced = true;
        await db.put(STORE_NAME, item);
      }
    } catch (e) {
      console.warn('markSynced error:', e);
    }
  },

  async clearAll() {
    try {
      const db = await getDB();
      await db.clear(STORE_NAME);
    } catch (e) {
      localStorage.removeItem('roadsight_reports');
    }
  },
};
