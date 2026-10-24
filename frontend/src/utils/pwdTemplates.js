/**
 * PWD (Public Works Department) & Civic Road Authority Integration Utilities
 * Formats official grievance letters, WhatsApp civic alerts, and technical road condition reports.
 */

export function generateTicketId(stateCode = 'PWD') {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `${stateCode}-${year}-${randomNum}`;
}

/**
 * Generates technical road damage notes based on pothole severity and dimensions
 */
export function generateTechnicalConditionNote(severity, potholesCount = 1) {
  const sev = severity?.label || 'Medium';

  if (sev === 'Large') {
    return `CRITICAL ROAD HAZARD: Severe asphalt depression/crater exceeding 40cm width and significant sub-base erosion. Poses high risk of two-wheeler rim damage, vehicular skidding, and fatal night-time accidents. Immediate cold-mix bitumen patching and barricading required by local PWD maintenance wing.`;
  } else if (sev === 'Medium') {
    return `MODERATE ROAD DAMAGE: Prominent pavement hollow (~20-40cm span) with dislodged aggregate. Causes vehicle jarring and sudden braking hazard. Requires leveling and asphalt resurfacing before monsoon water-logging causes structural road breakdown.`;
  } else {
    return `MINOR PAVEMENT DEFECT: Surface aggregate chipping and shallow depression (<20cm). Early-stage pothole that will rapidly deteriorate under heavy traffic if not sealed during routine PWD patch maintenance.`;
  }
}

/**
 * Generates an official PWD grievance email draft URL (mailto:)
 */
export function createPwdEmailDraft({
  ticketId,
  authority = 'State Public Works Department (PWD)',
  recipientEmail = 'pwd-grievance@gov.in',
  address = 'Unknown Road',
  coords = null,
  severity = { label: 'Large' },
  potholesCount = 1,
  notes = '',
}) {
  const lat = coords?.latitude ? coords.latitude.toFixed(6) : 'N/A';
  const lon = coords?.longitude ? coords.longitude.toFixed(6) : 'N/A';
  const mapsUrl = coords?.latitude ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : 'N/A';
  const dateStr = new Date().toLocaleString();

  const subject = `[URGENT ROAD REPAIR TICKET #${ticketId}] Pothole Hazard at ${address}`;

  const body = `To,
The Executive Engineer / Road Maintenance Officer,
${authority}
Department of Road Infrastructure & Municipal Works

SUBJECT: Official Citizen Grievance for Immediate Pothole Repair (Ticket #${ticketId})

Respected Authority,

This is a formal road safety notice regarding a hazardous pothole detected on a public road in your jurisdiction, requiring prompt repair and asphalt filling:

--------------------------------------------------
OFFICIAL GRIEVANCE DETAILS:
--------------------------------------------------
* Ticket Reference ID : ${ticketId}
* Date & Time of Record: ${dateStr}
* Target Jurisdiction   : ${authority}
* Exact Road / Location : ${address}
* GPS Coordinates       : Latitude: ${lat}, Longitude: ${lon}
* Direct Map Pin        : ${mapsUrl}
* Severity Level        : ${severity.label?.toUpperCase()} (${potholesCount} spot(s) identified)

ROAD CONDITION & SAFETY AUDIT:
${notes || generateTechnicalConditionNote(severity, potholesCount)}

CITIZEN ACTION DEMAND:
Under the National Road Safety Guidelines and Municipal Maintenance Standards, unaddressed potholes pose immediate peril to vehicular traffic, commuters, and pedestrians.

We request your department to:
1. Dispatch an on-site road inspection team to verify the coordinates.
2. Install interim reflective safety cones/warning markers.
3. Execute bitumen/asphalt patching within 48 to 72 hours.
4. Update the civic tracking portal once the repair work is completed.

Filed via RoadSight Civic AI (Road Hazard & PWD Rapid Dispatch Portal)
Citizen Grievance System.
`;

  return `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Generates pre-formatted WhatsApp message for PWD Helpline or Road Safety Cell
 */
export function createPwdWhatsAppMessage({
  ticketId,
  authority = 'PWD Road Cell',
  address = 'Unknown Road',
  coords = null,
  severity = { label: 'Large' },
  potholesCount = 1,
  notes = '',
}) {
  const lat = coords?.latitude ? coords.latitude.toFixed(6) : 'N/A';
  const lon = coords?.longitude ? coords.longitude.toFixed(6) : 'N/A';
  const mapsUrl = coords?.latitude ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : '';

  const message = `🚨 *URGENT ROAD HAZARD / POTHOLE REPORT* 🚨
*Ticket ID:* ${ticketId}
*Authority:* ${authority}

📍 *Location:* ${address}
🌐 *GPS:* ${lat}, ${lon}
🗺️ *Google Maps Pin:* ${mapsUrl}

⚠️ *Severity:* ${severity.label?.toUpperCase()} (${potholesCount} pothole(s))
📋 *Technical Condition:*
${notes || generateTechnicalConditionNote(severity, potholesCount)}

⚠️ *Action Required:* Please dispatch road repair team to fill and asphalt this pothole to prevent vehicle accidents.

_Reported via RoadSight Citizen Road Safety AI_`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

/**
 * Generates an official printable PDF-ready HTML / Text Grievance Notice
 */
export function generatePrintableNotice(report) {
  const lat = report.coords?.latitude ? report.coords.latitude.toFixed(6) : 'N/A';
  const lon = report.coords?.longitude ? report.coords.longitude.toFixed(6) : 'N/A';
  const dateStr = new Date(report.timestamp).toLocaleString();

  return `
================================================================================
              PUBLIC WORKS DEPARTMENT (PWD) / MUNICIPAL CORPORATION
                     OFFICIAL ROAD HAZARD GRIEVANCE DOCKET
================================================================================
TICKET ID      : ${report.ticketId || report.id}
DATE & TIME    : ${dateStr}
STATUS         : ${report.status || 'PENDING PWD ACTION'}
TARGET BODY    : ${report.authority || 'State Public Works Department (PWD)'}
LOCATION       : ${report.address || 'Roadway'}
COORDINATES    : ${lat}, ${lon}
MAPS LINK      : https://www.google.com/maps/search/?api=1&query=${lat},${lon}

HAZARD AUDIT:
- Potholes Count: ${report.potholesCount || 1}
- Severity      : ${report.severity?.label?.toUpperCase() || 'MEDIUM'}
- AI Confidence : ${(report.confidence * 100).toFixed(1)}%

TECHNICAL ROAD CONDITION REPORT:
${report.technicalNote || report.notes || 'Asphalt failure requiring immediate road patching.'}

RECOMMENDED ACTION:
1. Site verification and temporary barrier placement.
2. Asphalt cold-mix / hot-mix filling and roller compaction.
3. Close grievance docket with photographic post-repair verification.

Generated by RoadSight AI Civic Road Safety Engine.
================================================================================
`;
}
