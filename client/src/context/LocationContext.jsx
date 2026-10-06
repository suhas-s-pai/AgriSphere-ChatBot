import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  fetchRealUserLocation,
  getCachedLocation,
  getStoredLocationMode,
  setStoredLocationMode
} from '../services/locationService';

const LocationContext = createContext();

export function LocationProvider({ children }) {
  const [locationMode, setLocationModeState] = useState(() => getStoredLocationMode());

  const [location, setLocation] = useState(() => {
    const savedMode = getStoredLocationMode();
    if (savedMode === 'global') {
      return {
        mode: 'global',
        city: 'Global',
        formattedLocation: 'Global Agriculture',
        temp: null,
        condition: null
      };
    }
    const cached = getCachedLocation();
    if (cached) {
      return { ...cached, mode: 'current', isFallback: true };
    }
    return null;
  });

  const [loading, setLoading] = useState(getStoredLocationMode() === 'current');
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Request fresh location from browser Geolocation API
  const requestLocation = useCallback(async (forceRefresh = true) => {
    setLoading(true);
    setError(null);
    setPermissionDenied(false);

    const result = await fetchRealUserLocation(forceRefresh);

    if (result.success) {
      const activeLoc = { ...result, mode: 'current' };
      setLocation(activeLoc);
      setError(null);
      setPermissionDenied(false);
    } else {
      if (result.permissionDenied) {
        setPermissionDenied(true);
        setError('Location access was denied. Please enable browser location permissions for farming guidance.');
      } else {
        setError(result.error || 'Failed to obtain farm location');
      }
      // If detection failed and we don't have a valid location, clear fallback
      setLocation(prev => (prev?.isFallback ? null : prev));
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
      setLocation({
        mode: 'global',
        city: 'Global',
        formattedLocation: 'Global Agriculture',
        temp: null,
        condition: null
      });
      setLoading(false);
      setError(null);
      setPermissionDenied(false);
    } else {
      // Switched back to Current Location -> automatically fetch fresh location
      requestLocation(true);
    }
  }, [requestLocation]);

  // ON APP STARTUP: Always trigger fresh location request if mode is 'current'
  useEffect(() => {
    if (locationMode === 'current') {
      requestLocation(true);
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
        requestLocation: () => requestLocation(true),
        refreshLocation: () => requestLocation(true)
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
