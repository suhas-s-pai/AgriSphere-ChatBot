import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchRealUserLocation,
  getStoredLocationMode,
  setStoredLocationMode,
  purgeStaleLocationCaches
} from '../services/locationService';

// Ensure any stale storage keys are purged on app load
purgeStaleLocationCaches();

const LocationContext = createContext();

export function LocationProvider({ children }) {
  const [locationMode, setLocationModeState] = useState(() => getStoredLocationMode());
  const [location, setLocation] = useState(() => getStoredLocationMode() === 'global' ? {
    mode: 'global', city: 'Global', formattedLocation: 'Global Agriculture', temp: null, condition: null, isGpsVerified: false
  } : null);
  const [loading, setLoading] = useState(getStoredLocationMode() === 'current');
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const requestSequence = useRef(0);

  // Request fresh location from browser Geolocation API
  const requestLocation = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError(null);
    setPermissionDenied(false);
    setLocation(null);

    let result;
    try {
      result = await fetchRealUserLocation();
    } catch (requestError) {
      result = {
        success: false,
        error: requestError.message || 'Unable to obtain your device location. Please retry.',
        permissionDenied: false,
        isGpsVerified: false
      };
    }
    if (sequence !== requestSequence.current) return result;

    if (result.success) {
      const activeLoc = { ...result, mode: 'current', isGpsVerified: true };
      setLocation(activeLoc);
      setError(null);
      setPermissionDenied(false);
    } else {
      if (result.permissionDenied) {
        setPermissionDenied(true);
        setError('Location permission was denied. Please allow location access in your browser, then click Retry.');
      } else {
        setError(result.error || 'Location unavailable — check device GPS and retry.');
      }
      // Never display any fallback or previous location on failure
      setLocation(null);
    }
    setLoading(false);
    return result;
  }, []);

  // Set Location Mode ('current' vs 'global')
  const setMode = useCallback((newMode) => {
    if (newMode !== 'current' && newMode !== 'global') return;
    
    setLocationModeState(newMode);
    setStoredLocationMode(newMode);

    if (newMode === 'global') {
      requestSequence.current += 1;
      setLocation({
        mode: 'global',
        city: 'Global',
        formattedLocation: 'Global Agriculture',
        temp: null,
        condition: null,
        isGpsVerified: false
      });
      setLoading(false);
      setError(null);
      setPermissionDenied(false);
    } else {
      // Switched back to Current Location -> request real device GPS immediately
      requestLocation();
    }
  }, [requestLocation]);

  // ON APP STARTUP: Always trigger fresh location request if mode is 'current'
  useEffect(() => {
    if (locationMode === 'current') {
      requestLocation();
    }
  }, [locationMode, requestLocation]);

  return (
    <LocationContext.Provider
      value={{
        locationMode,
        location,
        loading,
        error,
        permissionDenied,
        setMode,
        requestLocation,
        refreshLocation: requestLocation,
        isGpsVerified: Boolean(location?.isGpsVerified)
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
}
