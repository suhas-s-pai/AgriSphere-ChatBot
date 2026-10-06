/**
 * AgriSphere Real User Location & Weather Service
 * Uses browser Geolocation API, BigDataCloud Reverse Geocoding, and Open-Meteo Weather API.
 * Supports CURRENT LOCATION and GLOBAL modes.
 */

const LOCATION_CACHE_KEY = 'agrisphere_user_location_cache';
const LOCATION_MODE_KEY = 'agrisphere_location_mode';

function getWeatherConditionText(code) {
  if (code === 0) return 'Clear Sky';
  if (code >= 1 && code <= 3) return 'Partly Cloudy';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 67) return 'Rainy';
  if (code >= 71 && code <= 77) return 'Snowy';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Clear Sky';
}

export const getStoredLocationMode = () => {
  try {
    const saved = localStorage.getItem(LOCATION_MODE_KEY);
    if (saved === 'global' || saved === 'current') {
      return saved;
    }
  } catch (e) {}
  return 'current'; // DEFAULT mode
};

export const setStoredLocationMode = (mode) => {
  try {
    localStorage.setItem(LOCATION_MODE_KEY, mode);
  } catch (e) {}
};

export const getCachedLocation = () => {
  try {
    const cached = localStorage.getItem(LOCATION_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
        return parsed;
      }
    }
  } catch (e) {}
  return null;
};

export const fetchRealUserLocation = async (forceRefresh = true) => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        success: false,
        mode: 'current',
        error: 'Geolocation is not supported by your browser',
        permissionDenied: true
      });
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: forceRefresh ? 0 : 60000
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let city = '';
        let state = '';
        let country = '';
        let formattedLocation = '';

        try {
          // Reverse geocode using BigDataCloud free client endpoint
          const geoRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const geoData = await geoRes.json();

          city = geoData.city || geoData.locality || geoData.localityInfo?.administrative?.[2]?.name || geoData.localityInfo?.administrative?.[1]?.name || '';
          state = geoData.principalSubdivision || geoData.localityInfo?.administrative?.[1]?.name || '';
          country = geoData.countryName || geoData.countryCode || '';
          
          if (city && state) {
            formattedLocation = `${city}, ${state}`;
          } else if (city && country) {
            formattedLocation = `${city}, ${country}`;
          } else if (state && country) {
            formattedLocation = `${state}, ${country}`;
          } else if (city || state || country) {
            formattedLocation = city || state || country;
          } else {
            formattedLocation = `Lat ${latitude.toFixed(2)}°, Lng ${longitude.toFixed(2)}°`;
          }
        } catch (err) {
          console.warn('Reverse geocoding warning:', err);
          formattedLocation = `Lat ${latitude.toFixed(2)}°, Lng ${longitude.toFixed(2)}°`;
        }

        // Fetch weather using Open-Meteo free forecast API using the EXACT SAME coordinates
        let temp = 28;
        let condition = 'Clear Sky';
        try {
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
          );
          const weatherData = await weatherRes.json();
          if (weatherData?.current_weather) {
            temp = Math.round(weatherData.current_weather.temperature);
            condition = getWeatherConditionText(weatherData.current_weather.weathercode);
          }
        } catch (we) {
          console.warn('Weather fetch warning:', we);
        }

        const result = {
          success: true,
          mode: 'current',
          latitude,
          longitude,
          city: city || 'Farm Location',
          state,
          country,
          formattedLocation,
          temp,
          condition,
          permissionDenied: false,
          timestamp: Date.now()
        };

        try {
          localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(result));
        } catch (e) {}

        resolve(result);
      },
      (err) => {
        let msg = 'Location unavailable';
        let denied = false;
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied by user';
          denied = true;
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Device location position unavailable';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out';
        }

        resolve({
          success: false,
          mode: 'current',
          error: msg,
          permissionDenied: denied
        });
      },
      options
    );
  });
};
