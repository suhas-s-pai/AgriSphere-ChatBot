/**
 * AgriSphere Real User Location & Weather Service
 * Resolves verified device coordinates from the browser Geolocation API,
 * reverse-geocodes those exact coordinates with BigDataCloud,
 * and requests weather for those exact same coordinates from Open-Meteo.
 * 
 * Strict requirements:
 * - Never returns or defaults to any hardcoded location (e.g. Bantval, Mangaluru, Bengaluru).
 * - Never marks a location as GPS-verified unless browser geolocation succeeded.
 * - If geolocation fails, is denied, or times out, returns error with working Retry.
 * - Checks and reports browser location permission status.
 * - Provides development diagnostics without leaking sensitive coordinates in production logs.
 */

const LOCATION_MODE_KEY = 'agrisphere_location_mode';

// Purge any legacy or stale location cache keys across storage mechanisms
export function purgeStaleLocationCaches() {
  const staleKeys = [
    'agrisphere_user_location_cache',
    'agrisphere_cached_location',
    'agrisphere_location_cache',
    'agrisphere_location'
  ];
  staleKeys.forEach((key) => {
    try { localStorage.removeItem(key); } catch (e) {}
    try { sessionStorage.removeItem(key); } catch (e) {}
  });
}

function getWeatherConditionText(code) {
  if (code === 0) return 'Clear Sky';
  if (code >= 1 && code <= 3) return 'Partly Cloudy';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 67) return 'Rainy';
  if (code >= 71 && code <= 77) return 'Snowy';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Weather unavailable';
}

export const getStoredLocationMode = () => {
  try {
    const saved = localStorage.getItem(LOCATION_MODE_KEY);
    if (saved === 'global' || saved === 'current') return saved;
  } catch (e) {}
  return 'current';
};

export const setStoredLocationMode = (mode) => {
  try { localStorage.setItem(LOCATION_MODE_KEY, mode); } catch (e) {}
};

/**
 * Check browser geolocation permission status using the Permissions API if supported
 */
export async function checkGeolocationPermission() {
  if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
    return 'unknown';
  }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state; // 'granted' | 'prompt' | 'denied'
  } catch (e) {
    return 'unknown';
  }
}

async function reverseGeocode(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Coordinates are required for reverse geocoding.');
  }

  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('localityLanguage', 'en');

  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Could not look up the city for your device location.');
  const data = await response.json();

  const administrative = data.localityInfo?.administrative || [];
  const city = data.city || data.locality || administrative.find(a => a.order >= 8)?.name || administrative[2]?.name || '';
  const state = data.principalSubdivision || administrative[1]?.name || '';
  const country = data.countryName || data.countryCode || '';

  if (!city && !state && !country) {
    throw new Error('Could not identify the region for your device coordinates.');
  }

  const parts = [city, state, country].filter(Boolean);
  const formattedLocation = parts.length > 0
    ? parts.join(', ')
    : `Lat ${latitude.toFixed(2)}°, Lng ${longitude.toFixed(2)}°`;

  return {
    city: city || state || 'Farm Location',
    state,
    country,
    formattedLocation,
    lookupSource: data.lookupSource || 'coordinates'
  };
}

async function fetchWeather(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { temp: null, condition: null, weatherUnavailable: true };
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
    url.searchParams.set('current', 'temperature_2m,weather_code');
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Weather lookup failed.');
    const data = await response.json();
    const current = data.current;
    if (!current || !Number.isFinite(current.temperature_2m)) throw new Error('Weather data is unavailable.');
    return {
      temp: Math.round(current.temperature_2m),
      condition: getWeatherConditionText(current.weather_code)
    };
  } catch (error) {
    console.warn('Weather fetch warning:', error);
    return { temp: null, condition: null, weatherUnavailable: true };
  }
}

/**
 * Attempts to retrieve user's real browser/device coordinates.
 * Returns success ONLY if navigator.geolocation actually succeeded.
 */
export const fetchRealUserLocation = async () => {
  // Purge any stale location cache keys immediately
  purgeStaleLocationCaches();

  const permissionState = await checkGeolocationPermission();

  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const res = {
        success: false,
        mode: 'current',
        error: 'This browser does not support device location.',
        permissionDenied: false,
        isGpsVerified: false,
        permissionState: 'unsupported'
      };
      logDiagnostics(res, permissionState);
      resolve(res);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (!position || !position.coords) {
          const res = {
            success: false,
            mode: 'current',
            error: 'No coordinates received from device GPS.',
            permissionDenied: false,
            isGpsVerified: false,
            permissionState
          };
          logDiagnostics(res, permissionState);
          resolve(res);
          return;
        }

        const { latitude, longitude, accuracy } = position.coords;

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) {
          const res = {
            success: false,
            mode: 'current',
            error: 'Invalid coordinates received from device GPS.',
            permissionDenied: false,
            isGpsVerified: false,
            permissionState
          };
          logDiagnostics(res, permissionState);
          resolve(res);
          return;
        }

        try {
          const place = await reverseGeocode(latitude, longitude);
          const weather = await fetchWeather(latitude, longitude);

          const res = {
            success: true,
            mode: 'current',
            latitude,
            longitude,
            accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
            ...place,
            ...weather,
            isGpsVerified: true,
            locationSource: 'browser_gps',
            permissionState: 'granted',
            timestamp: Date.now()
          };
          logDiagnostics(res, 'granted');
          resolve(res);
        } catch (error) {
          const message = error.message || 'Unable to resolve your city from device coordinates. Please retry.';
          const res = {
            success: false,
            mode: 'current',
            error: message,
            permissionDenied: false,
            isGpsVerified: false,
            permissionState
          };
          logDiagnostics(res, permissionState);
          resolve(res);
        }
      },
      (error) => {
        const denied = error.code === 1;
        let message = 'Location is unavailable. Check your device location settings and try again.';
        if (denied) {
          message = 'Location permission was denied. Please allow location access in your browser address bar, then click Retry.';
        } else if (error.code === 3) {
          message = 'The location request timed out. Please check your connection and click Retry.';
        } else if (error.code === 2) {
          message = 'Device position unavailable. Ensure device location/GPS is turned on, then click Retry.';
        }

        const res = {
          success: false,
          mode: 'current',
          error: message,
          permissionDenied: denied,
          isGpsVerified: false,
          permissionState: denied ? 'denied' : permissionState
        };
        logDiagnostics(res, denied ? 'denied' : permissionState);
        resolve(res);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  });
};

function logDiagnostics(result, permissionState) {
  const diag = {
    permissionState,
    geolocationSuccess: result.success,
    coordsReceived: Boolean(result.latitude && result.longitude),
    source: result.isGpsVerified ? 'browser_gps' : 'none',
    displayedLocation: result.formattedLocation || 'Location unavailable',
    error: result.error || null,
    timestamp: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    window.__AGRISPHERE_LOCATION_DIAGNOSTICS__ = diag;
  }

  // Safe development diagnostics without exposing sensitive raw coordinates
  console.log(
    `[AgriSphere Location Diagnostic] permission=${permissionState} | success=${result.success} | coordsReceived=${diag.coordsReceived} | source=${diag.source} | location="${diag.displayedLocation}"`
  );
}
