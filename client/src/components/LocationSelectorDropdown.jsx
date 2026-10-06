import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Globe, RefreshCw, ChevronDown, Check } from 'lucide-react';
import { useLocationContext } from '../context/LocationContext';

export default function LocationSelectorDropdown({ variant = 'hero' }) {
  const {
    locationMode,
    location,
    loading,
    error,
    permissionDenied,
    setMode,
    refreshLocation,
    requestLocation
  } = useLocationContext();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, []);

  const handleSelectMode = (mode) => {
    setMode(mode);
    setIsOpen(false);
  };

  const handleRefresh = async (e) => {
    e.stopPropagation();
    if (locationMode === 'global') {
      setMode('current');
    } else {
      await refreshLocation();
    }
  };

  const isCurrent = locationMode === 'current';
  const isGlobal = locationMode === 'global';

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button: HERO Variant */}
      {variant === 'hero' ? (
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/30 text-white text-xs font-extrabold tracking-wider uppercase shadow-xl drop-shadow-md transition-all cursor-pointer select-none"
          title="Click to switch location mode or refresh GPS"
        >
          {isGlobal ? (
            <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          ) : (
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}

          <span>
            {loading && isCurrent ? (
              <span className="animate-pulse">Detecting your current location...</span>
            ) : isGlobal ? (
              'Global Agriculture'
            ) : location?.formattedLocation ? (
              location.formattedLocation
            ) : permissionDenied ? (
              'Location Access Required'
            ) : (
              'Location Unavailable'
            )}
          </span>

          <ChevronDown className={`w-3.5 h-3.5 text-white/80 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        /* Trigger Button: HEADER Variant (Top Right Weather & Location) */
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/80 dark:bg-[#091A13]/85 backdrop-blur-xl border border-slate-200/80 dark:border-[#1F7A4D]/30 shadow-xl text-slate-900 dark:text-white hover:border-emerald-500/50 transition-all cursor-pointer select-none"
          title="Click to switch location mode or view details"
        >
          {isGlobal ? (
            <div className="p-1.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 shrink-0">
              <Globe className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 shrink-0">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          )}

          <div className="text-left">
            <div className="text-xs font-black leading-none flex items-center gap-1.5">
              <span>{isGlobal ? 'Global Mode' : location?.temp ? `${location.temp}°C` : '28°C'}</span>
              {!isGlobal && (
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  {location?.condition || 'Clear Sky'}
                </span>
              )}
            </div>
            <div className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold mt-0.5 flex items-center gap-1">
              <span className="truncate max-w-[140px] sm:max-w-none">
                {loading && isCurrent ? 'Detecting...' : isGlobal ? 'Global Agriculture' : location?.formattedLocation || 'Location required'}
              </span>
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </div>
          </div>
        </button>
      )}

      {/* Glassmorphism Dropdown Popover */}
      {isOpen && (
        <div className={`absolute mt-2 w-72 p-3 rounded-2xl bg-white/95 dark:bg-[#091A13]/95 backdrop-blur-2xl border border-white/40 dark:border-[#1F7A4D]/40 shadow-2xl z-50 text-slate-900 dark:text-slate-100 space-y-2 animate-in fade-in zoom-in-95 duration-150 ${
          variant === 'header' ? 'right-0 top-full' : 'left-0 top-full'
        }`}>
          
          <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-200/60 dark:border-white/10">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              <span>Location Mode</span>
            </span>
            {loading && isCurrent && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
                Updating GPS...
              </span>
            )}
          </div>

          <div className="space-y-1">
            {/* Option 1: Current Location Mode */}
            <button
              type="button"
              onClick={() => handleSelectMode('current')}
              className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                isCurrent
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/50 text-[#14532D] dark:text-emerald-300 shadow-sm'
                  : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">Current Location</span>
                  {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate mt-0.5">
                  {loading && isCurrent ? (
                    <span className="animate-pulse">Detecting your current location...</span>
                  ) : location?.formattedLocation ? (
                    location.formattedLocation
                  ) : permissionDenied ? (
                    <span className="text-amber-600 dark:text-amber-400">Permission denied — click to retry</span>
                  ) : (
                    'Real GPS device location'
                  )}
                </div>
              </div>
            </button>

            {/* Option 2: Global Mode */}
            <button
              type="button"
              onClick={() => handleSelectMode('global')}
              className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                isGlobal
                  ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500/50 text-sky-900 dark:text-sky-300 shadow-sm'
                  : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isGlobal ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                <Globe className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">Global</span>
                  {isGlobal && <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
                </div>
                <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                  General agriculture guidance
                </div>
              </div>
            </button>
          </div>

          {/* Action Footer: Refresh Current Location */}
          <div className="pt-1 border-t border-slate-200/60 dark:border-white/10">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading && isCurrent}
              className="w-full py-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${loading && isCurrent ? 'animate-spin' : ''}`} />
              <span>{loading && isCurrent ? 'Refreshing GPS...' : 'Refresh current location'}</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

