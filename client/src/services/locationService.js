/**
 * AgriSphere Real User Location & Weather Service
 * Uses browser Geolocation API, BigDataCloud Reverse Geocoding, and Open-Meteo Weather API
 */

const LOCATION_CACHE_KEY = 'agrisphere_user_location_cache';

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

export const getCachedLocation = () => {
  try {
    const cached = localStorage.getItem(LOCATION_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {}
  return null;
};

export const fetchRealUserLocation = async () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        success: false,
        error: 'Geolocation is not supported by your browser',
        permissionDenied: true
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Reverse geocode using BigDataCloud free client endpoint
          const geoRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const geoData = await geoRes.json();

          const city = geoData.city || geoData.locality || geoData.localityInfo?.administrative?.[2]?.name || geoData.localityInfo?.administrative?.[1]?.name || 'Local Farm';
          const state = geoData.principalSubdivision || geoData.localityInfo?.administrative?.[1]?.name || '';
          const country = geoData.countryName || geoData.countryCode || '';
          const formattedLocation = state ? `${city}, ${state}` : `${city}, ${country}`;

          // Fetch weather using Open-Meteo free forecast API
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
            console.warn('Weather fetch fallback:', we);
          }

          const result = {
            success: true,
            latitude,
            longitude,
            city,
            state,
            country,
            formattedLocation,
            temp,
            condition,
            permissionDenied: false
          };

          try {
            localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(result));
          } catch (e) {}

          resolve(result);
        } catch (err) {
          resolve({
            success: false,
            error: 'Failed to reverse geocode location',
            permissionDenied: false
          });
        }
      },
      (err) => {
        let msg = 'Location unavailable';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied';
        }
        resolve({
          success: false,
          error: msg,
          permissionDenied: err.code === err.PERMISSION_DENIED
        });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
};

