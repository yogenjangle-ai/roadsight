/**
 * Backend API Client for RoadSight
 * Interacts with FastAPI backend when available.
 */

const DEFAULT_API_BASE = import.meta.env.VITE_API_URL || '';

class ApiService {
  constructor() {
    this.baseUrl = localStorage.getItem('roadsight_backend_url') !== null 
      ? localStorage.getItem('roadsight_backend_url') 
      : DEFAULT_API_BASE;
  }

  setBaseUrl(url) {
    this.baseUrl = url.replace(/\/+$/, '');
    localStorage.setItem('roadsight_backend_url', this.baseUrl);
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  async checkHealth() {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async syncReport(report) {
    try {
      const res = await fetch(`${this.baseUrl}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: report.id,
          ticket_id: report.ticketId || report.id,
          timestamp: report.timestamp,
          latitude: report.coords?.latitude,
          longitude: report.coords?.longitude,
          severity: report.severity?.label || 'Medium',
          confidence: report.confidence || 0.8,
          potholes_count: report.potholesCount || 1,
          address: report.address || '',
          authority: report.authority || 'State Public Works Department (PWD)',
          status: report.status || 'REPORTED TO PWD',
          notes: report.notes || '',
          technical_note: report.technicalNote || report.notes || '',
          image_data: report.imageData || '',
        }),
      });
      if (!res.ok) throw new Error('Failed to sync report');
      return await res.json();
    } catch (err) {
      console.warn('Backend sync failed (running offline):', err.message);
      return null;
    }
  }

  async fetchReports() {
    try {
      const res = await fetch(`${this.baseUrl}/api/reports`);
      if (!res.ok) throw new Error('Failed to fetch reports');
      return await res.json();
    } catch (err) {
      console.warn('Backend fetch failed:', err.message);
      return null;
    }
  }

  async fetchStats() {
    try {
      const res = await fetch(`${this.baseUrl}/api/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return await res.json();
    } catch (err) {
      return null;
    }
  }

  async deleteReport(id) {
    try {
      const res = await fetch(`${this.baseUrl}/api/reports/${id}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
