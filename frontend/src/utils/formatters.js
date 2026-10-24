/**
 * Formatting and export utility functions for RoadSight
 */

export function formatDate(timestamp) {
  if (!timestamp) return 'Unknown date';
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatCoords(lat, lon) {
  if (lat == null || lon == null) return 'GPS unavailable';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lon).toFixed(5)}° ${lonDir}`;
}

export function getGoogleMapsUrl(lat, lon) {
  if (lat == null || lon == null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

/**
 * Downloads data as a file (JSON or CSV)
 */
export function exportToFile(data, filename, type = 'application/json') {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Converts array of pothole reports into CSV string
 */
export function reportsToCsv(reports) {
  const headers = ['TicketID', 'Date', 'Status', 'Authority', 'Latitude', 'Longitude', 'Severity', 'Confidence', 'PotholesCount', 'Address', 'TechnicalConditionNotes'];
  const rows = reports.map((r) => [
    r.ticketId || r.id,
    `"${new Date(r.timestamp).toISOString()}"`,
    r.status || 'REPORTED TO PWD',
    `"${(r.authority || 'State PWD').replace(/"/g, '""')}"`,
    r.coords?.latitude ?? '',
    r.coords?.longitude ?? '',
    r.severity?.label ?? r.severity ?? 'Medium',
    (r.confidence != null ? (r.confidence * 100).toFixed(1) + '%' : ''),
    r.potholesCount ?? 1,
    `"${(r.address || '').replace(/"/g, '""')}"`,
    `"${(r.technicalNote || r.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
