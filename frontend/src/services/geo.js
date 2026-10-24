/**
 * Geolocation and Reverse-Geocoding Service for RoadSight
 */

class GeoService {
  constructor() {
    this.currentPosition = null;
    this.watchId = null;
    this.addressCache = new Map();
    this.isTracking = false;
  }

  /**
   * Starts tracking current device position
   * @param {Function} onUpdate - callback when coordinates update
   */
  startTracking(onUpdate) {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported in browser');
      return;
    }

    this.isTracking = true;

    // Get immediate position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.currentPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          timestamp: pos.timestamp,
        };
        if (onUpdate) onUpdate(this.currentPosition);
      },
      (err) => {
        console.warn('Initial geolocation warning:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    // Watch position as vehicle moves
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.currentPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          timestamp: pos.timestamp,
        };
        if (onUpdate) onUpdate(this.currentPosition);
      },
      (err) => {
        console.warn('WatchPosition update error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );
  }

  stopTracking() {
    if (this.watchId != null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
  }

  /**
   * Gets current location once (Promise)
   */
  async getCurrentPosition() {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        // Fallback default coordinates (San Francisco Market St)
        resolve({ latitude: 37.7749, longitude: -122.4194, accuracy: 15, isFallback: true });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            isFallback: false,
          };
          this.currentPosition = coords;
          resolve(coords);
        },
        () => {
          // Fallback if denied or unavailable
          resolve(this.currentPosition || { latitude: 37.7749, longitude: -122.4194, accuracy: 50, isFallback: true });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    });
  }

  /**
   * Reverse geocodes lat/lon into street / city name using OpenStreetMap Nominatim
   */
  async reverseGeocode(lat, lon) {
    if (lat == null || lon == null) return 'Unknown Location';
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (this.addressCache.has(key)) {
      return this.addressCache.get(key);
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'RoadSight-PotholeDetector/1.0' } }
      );
      if (!res.ok) throw new Error('Geocoding failed');
      const data = await res.json();
      const addr = data.address || {};
      const road = addr.road || addr.street || addr.neighbourhood || addr.suburb || '';
      const city = addr.city || addr.town || addr.county || addr.state || '';
      const formatted = [road, city].filter(Boolean).join(', ') || data.display_name?.split(',')[0] || 'Roadway';

      this.addressCache.set(key, formatted);
      return formatted;
    } catch {
      return `Lat ${lat.toFixed(4)}, Lon ${lon.toFixed(4)}`;
    }
  }
}

export const geoService = new GeoService();
