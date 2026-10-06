import React, { useState } from 'react';
import { Leaf, Droplets, FlaskConical, Sun, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function FarmCanvas({ isInteractive = true, onSelectTelemetry, showBackground = false }) {
  const { t } = useLanguage();
  const [activePin, setActivePin] = useState(null);

  const telemetryMarkers = [
    {
      id: 'crop-health',
      icon: Leaf,
      label: t('farmOverlay.cropHealth') || 'Crop Health',
      status: t('farmOverlay.cropHealthStatus') || 'Healthy (94% Vigor)',
      detail: 'Vegetable plots: Tomato, Cabbage & Leafy Greens',
      badgeColor: 'bg-emerald-600 text-white border-emerald-300',
      glow: 'shadow-emerald-500/40'
    },
    {
      id: 'soil-health',
      icon: FlaskConical,
      label: t('farmOverlay.soil') || 'Soil Health',
      status: t('farmOverlay.soilStatus') || 'pH 6.8 (Good)',
      detail: 'Rich alluvial loam with balanced N-P-K reserves',
      badgeColor: 'bg-[#B86B27] text-white border-amber-300',
      glow: 'shadow-amber-600/40'
    },
    {
      id: 'irrigation',
      icon: Droplets,
      label: t('farmOverlay.water') || 'Irrigation',
      status: t('farmOverlay.waterStatus') || 'Optimal Level',
      detail: 'Drip sprinklers & water reservoir pump active',
      badgeColor: 'bg-sky-600 text-white border-sky-300',
      glow: 'shadow-sky-500/40'
    },
    {
      id: 'greenhouse',
      icon: ShieldCheck,
      label: t('farmOverlay.greenhouse') || 'Greenhouse',
      status: t('farmOverlay.greenhouseStatus') || 'Controlled Climate',
      detail: 'Temperature 24°C | Humidity 65% | UV Shield',
      badgeColor: 'bg-teal-600 text-white border-teal-300',
      glow: 'shadow-teal-500/40'
    },
    {
      id: 'weather',
      icon: Sun,
      label: t('farmOverlay.weather') || 'Weather',
      status: t('farmOverlay.weatherStatus') || '28°C Sunshine',
      detail: 'Wind: 12 km/h NE | Solar Radiation: High',
      badgeColor: 'bg-amber-500 text-white border-amber-200',
      glow: 'shadow-amber-500/40'
    }
  ];

  return (
    <div className="relative w-full h-full min-h-[160px] select-none pointer-events-auto flex flex-col justify-end items-center p-2">
      
      {/* Optional Standalone Background Image */}
      {showBackground && (
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#07130e] rounded-3xl z-0">
          <img
            src="/Golden Sunset.png"
            alt="AgriSphere Smart Farm Landscape"
            className="w-full h-full object-cover object-center filter brightness-[0.98] contrast-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
        </div>
      )}

      {/* Clean Farm Canvas - floating buttons removed for uncluttered view */}
    </div>
  );
}
