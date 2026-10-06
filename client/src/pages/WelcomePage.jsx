import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Globe, MapPin } from 'lucide-react';
import AgriSphereLogo from '../components/AgriSphereLogo';
import { useLanguage } from '../context/LanguageContext';
import { useLocationContext } from '../context/LocationContext';

export default function WelcomePage() {
  const navigate = useNavigate();
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const { location: userLocation } = useLocationContext();

  // Transition out state for cinematic zoom into workspace on "GET STARTED" click
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleGetStarted = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    try {
      sessionStorage.setItem('agrisphere_visited_welcome', 'true');
    } catch (e) {}

    // 800ms natural camera transition into workspace
    setTimeout(() => {
      navigate('/assistant');
    }, 800);
  };

  return (
    <div className="relative w-full h-screen h-[100dvh] overflow-hidden bg-[#050C08] text-white font-['Plus_Jakarta_Sans',sans-serif] select-none">
      
      {/* ============================================================ */}
      {/* 1. CINEMATIC PHOTOREALISTIC BACKGROUND & LIGHT SWEEP         */}
      {/* ============================================================ */}
      <div className="absolute inset-0 z-0 opacity-100">
        
        {/* Full-bleed Photorealistic Landscape with slow cinematic camera drift */}
        <div className={`w-full h-full transform transition-all duration-800 ease-out ${
          isTransitioning ? 'scale-[1.08] filter blur-[2px]' : 'animate-cinematic-drift'
        }`}>
          <img
            src="/Golden Sunset.png"
            alt="AgriSphere Golden Sunset Landscape"
            decoding="async"
            loading="eager"
            fetchPriority="high"
            className="w-full h-full object-cover object-center filter brightness-[0.92] contrast-[1.04]"
          />
        </div>

        {/* Dynamic Sunlight Sweep Layer */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/15 via-emerald-950/10 to-transparent pointer-events-none animate-light-sweep" />

        {/* Subtle Vignette & Gradient Overlays for Pure Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/50 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/25 to-transparent pointer-events-none" />
      </div>

      {/* Natural Atmospheric Cross-fade (Clean camera entry into workspace when Get Started is clicked) */}
      <div className={`absolute inset-0 z-30 bg-black pointer-events-none transition-opacity duration-800 ease-out ${
        isTransitioning ? 'opacity-75' : 'opacity-0'
      }`} />

      {/* ============================================================ */}
      {/* 2. MAIN FOREGROUND HERO COMPOSITION                          */}
      {/* ============================================================ */}
      <div className="relative z-20 flex flex-col h-full justify-between px-4 sm:px-10 md:px-16 py-6 sm:py-8 max-w-7xl mx-auto">
        
        {/* TOP BRAND HEADER */}
        <header className={`flex items-center justify-between transition-all duration-500 ease-out ${
          isTransitioning
            ? 'opacity-0 -translate-y-4'
            : 'opacity-100 translate-y-0 animate-hero-entrance'
        }`}>
          {/* Logo & Product Identity */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center p-1 shrink-0">
              <AgriSphereLogo className="w-full h-full" />
            </div>
            <div>
              <div className="flex items-center tracking-tight font-black text-xl sm:text-2xl leading-none">
                <span className="text-white drop-shadow-md">Agri</span>
                <span className="text-emerald-400 drop-shadow-md">Sphere</span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-300 tracking-wide mt-0.5 hidden xs:block">
                {t('footer.tagline') || 'Smart Farming. Better Decisions.'}
              </p>
            </div>
          </div>

          {/* Right Header: 8-Language Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 text-xs font-extrabold text-white shadow-lg">
              <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer text-xs font-bold text-white pr-1 max-w-[110px] sm:max-w-none"
                aria-label="Select preferred language"
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                    {lang.flag} {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* HERO MAIN CONTENT */}
        <div className={`max-w-2xl space-y-4 sm:space-y-5 my-auto pt-2 sm:pt-4 text-left transition-all duration-500 ease-out ${
          isTransitioning
            ? 'opacity-0 translate-y-4 scale-98'
            : 'opacity-100 translate-y-0 scale-100 animate-hero-entrance'
        }`}>
          
          {/* Subtle Location Context Detail */}
          {userLocation?.formattedLocation && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-[11px] sm:text-xs font-extrabold text-emerald-300 shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate max-w-[220px] sm:max-w-none">{userLocation.formattedLocation}</span>
            </div>
          )}

          {/* Main Hero Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08] drop-shadow-[0_6px_24px_rgba(0,0,0,0.95)]">
            YOUR FARM.<br />
            <span className="text-emerald-400 drop-shadow-[0_6px_24px_rgba(0,0,0,0.95)]">
              SMARTER DECISIONS.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-base md:text-lg font-bold text-slate-100 leading-relaxed drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] max-w-xl">
            {t('workspace.heroSub') || 'AI-powered agricultural guidance for healthier crops, better decisions, and improved yields.'}
          </p>

          {/* Primary Action Button */}
          <div className="pt-2 sm:pt-4">
            <button
              type="button"
              onClick={handleGetStarted}
              disabled={isTransitioning}
              className="w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 rounded-full bg-[#1F7A4D] hover:bg-[#14532D] text-white text-sm sm:text-base font-black flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(31,122,77,0.5)] border border-emerald-400/30 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
            >
              <span>GET STARTED</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1.5 transition-transform" />
            </button>
          </div>

        </div>

        {/* Minimal Bottom Spacer */}
        <div className="py-2" />

      </div>

    </div>
  );
}
