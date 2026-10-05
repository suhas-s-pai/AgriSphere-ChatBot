import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sprout,
  Home as HomeIcon,
  MessageSquare,
  Activity,
  Grid,
  History as HistoryIcon,
  BookOpen,
  Globe,
  Sun,
  Moon,
  Settings,
  Plus,
  ChevronLeft,
  Bug,
  Droplets,
  FlaskConical,
  Trash2,
  MapPin,
  RotateCw
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import AgriSphereLogo from '../components/AgriSphereLogo';
import ChatComposer from '../components/ChatComposer';
import ChatInterface from '../components/ChatInterface';
import ErrorBoundary from '../components/ErrorBoundary';
import FarmCanvas from '../components/FarmCanvas';
import { analyzeContent, getHistory } from '../services/api';
import { fetchRealUserLocation, getCachedLocation } from '../services/locationService';

const SUGGESTED_TOPICS = [
  { label: 'Tomato Disease Check', query: 'My tomato leaves are turning yellow with brown spots. What should I do?' },
  { label: 'Paddy Drip Schedule', query: 'When should I irrigate my rice paddy field during flowering stage?' },
  { label: 'Maize Fertilizer NPK', query: 'What is the recommended fertilizer dose and application schedule for maize?' },
  { label: 'Onion Thrips Control', query: 'How can I control thrips infestation on onion leaves organically?' },
  { label: 'Greenhouse Farming', query: 'What are the best crops for greenhouse farming in warm humid regions?' },
  { label: 'Soil Health pH 6.8', query: 'How to amend acidic soil to maintain pH 6.8 for optimal nutrient absorption?' }
];

const CHAT_STATE_KEY = 'agrisphere-active-chat';
const RECENTS_CLEARED_KEY = 'agrisphere-recents-cleared';

export default function AssistantWorkspace() {
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  // Home Mode vs Chat Mode state
  const [isChatMode, setIsChatMode] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(CHAT_STATE_KEY) || '{}').isChatMode || false;
    } catch {
      return false;
    }
  });

  const [activityItems, setActivityItems] = useState([]);
  const [activeItem, setActiveItem] = useState(null);

  // Continuous Chat Thread State
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(CHAT_STATE_KEY) || '{}');
      return Array.isArray(saved.messages) ? saved.messages : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  // Keep the active chat intact when navigating to View all and back.
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_STATE_KEY, JSON.stringify({
        isChatMode,
        messages
      }));
    } catch (storageError) {
      console.warn('Unable to persist active chat:', storageError);
    }
  }, [isChatMode, messages]);

  // Auto-scroll to bottom of conversation whenever messages or loading state update
  useEffect(() => {
    if (isChatMode) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isChatMode]);

  // Prefill query if passed via router location state
  useEffect(() => {
    if (location.state?.prefillQuery) {
      handleSend({ queryText: location.state.prefillQuery, language });
    }
  }, [location.state]);

  // Load history from backend API and merge into activity items
  useEffect(() => {
    async function fetchBackendHistory() {
      const recentsWereCleared = sessionStorage.getItem(RECENTS_CLEARED_KEY) === 'true';
      if (recentsWereCleared) return;

      const data = await getHistory();
      if (data.success && (data.consultations?.length || data.scans?.length)) {
        const items = data.consultations || data.scans || [];
        const mapped = items.map((item, index) => ({
          id: item._id || `backend-${index}`,
          title: item.assessment || item.crop || 'Farm Consultation',
          topic: item.category || 'General Agriculture',
          time: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent',
          icon: item.category === 'Plant Disease' ? Bug : item.category === 'Irrigation Guidance' ? Droplets : item.category === 'Fertilizers & Soil' ? FlaskConical : Sprout,
          iconBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400',
          queryText: item.queryText || item.crop || 'Agricultural consultation',
          crop: item.crop || 'Crop',
          result: item
        }));
        setActivityItems(mapped);
      }
    }
    fetchBackendHistory();
  }, []);

  // Real User Location & Weather State
  const [userLocation, setUserLocation] = useState(() => getCachedLocation());
  const [locationLoading, setLocationLoading] = useState(!getCachedLocation());
  const [locationError, setLocationError] = useState(null);

  const loadLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    const data = await fetchRealUserLocation();
    if (data.success) {
      setUserLocation(data);
    } else {
      setLocationError(data.error || 'Location unavailable');
    }
    setLocationLoading(false);
  };

  useEffect(() => {
    if (!userLocation) {
      loadLocation();
    }
  }, []);

  const handleSelectActivity = (item) => {
    sessionStorage.removeItem(RECENTS_CLEARED_KEY);
    setActiveItem(item);
    setMessages([
      { id: `usr-act-${item.id}`, role: 'user', content: item.queryText || item.title },
      { id: `ast-act-${item.id}`, role: 'assistant', content: item.result?.message || item.result?.assessment, result: item.result }
    ]);
    setError(null);
    setIsChatMode(true);
  };

  const handleNewConsultation = () => {
    setActiveItem(null);
    setMessages([]);
    setError(null);
    setIsChatMode(true);
  };

  const handleClearRecents = () => {
    setActivityItems([]);
    setActiveItem(null);
    sessionStorage.setItem(RECENTS_CLEARED_KEY, 'true');
  };

  const handleClearChat = () => {
    setActiveItem(null);
    setMessages([]);
    setError(null);
    setIsChatMode(false);
  };

  const handleSend = async ({ queryText, image, language: overrideLang }) => {
    if (!queryText && !image) return;

    const currentLang = overrideLang || language;
    const userMsgId = `usr-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      role: 'user',
      content: queryText,
      image,
      timestamp: new Date()
    };

    sessionStorage.removeItem(RECENTS_CLEARED_KEY);
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);
    setIsChatMode(true);

    try {
      // Build history payload from recent messages in thread for Gemini API
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.role,
        message: m.content || m.result?.message || m.result?.assessment || ''
      }));

      const data = await analyzeContent({
        queryText,
        image,
        language: currentLang,
        history: historyPayload,
        location: userLocation
      });

      if (data.success) {
        if (data.isUnrelated) {
          const guardrailMsg = {
            id: `ast-${Date.now()}`,
            role: 'assistant',
            isUnrelated: true,
            unrelatedMessage: data.message || t('chat.guardrailDefault'),
            timestamp: new Date()
          };
          setMessages(prev => [...prev, guardrailMsg]);
        } else {
          const aiMessage = data.message || data.result?.message || data.result?.assessment || 'Agricultural guidance completed.';
          const resObj = {
            consultationId: data.consultationId || data.result?.consultationId || `agri-${Date.now()}`,
            message: aiMessage,
            assessment: aiMessage,
            title: data.title || data.result?.title || data.crop || data.result?.crop || 'Agricultural Advisory',
            category: data.category || data.result?.category || 'General Agriculture',
            crop: data.crop || data.result?.crop || null
          };

          const astMsg = {
            id: `ast-${Date.now()}`,
            role: 'assistant',
            content: aiMessage,
            result: resObj,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, astMsg]);

          const newItem = {
            id: resObj.consultationId,
            title: resObj.title || queryText.slice(0, 30) + '...',
            topic: resObj.category,
            time: 'Just now',
            icon: Sprout,
            iconBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400',
            queryText,
            crop: resObj.crop || 'Crop',
            result: resObj
          };
          setActivityItems(prev => [newItem, ...prev]);
          setActiveItem(newItem);
        }
        return true;
      } else {
        setError(data.error || 'Failed to complete analysis.');
        return false;
      }
    } catch (err) {
      setError(err.message || 'Server connection error.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen h-[100dvh] w-full flex bg-[#FAF8F3] dark:bg-[#07130e] text-slate-900 dark:text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] relative select-none-or-normal">
      
      {/* ========================================== */}
      {/* LEFT SIDEBAR — REAL CHAT HISTORY + PROFILE */}
      {/* ========================================== */}
      <aside className="hidden lg:flex w-72 xl:w-80 flex-col shrink-0 bg-white/95 dark:bg-[#091A13]/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-[#1F7A4D]/20 h-full p-4 sm:p-5 z-30 relative shadow-xl">
        <div className="flex flex-col h-full min-w-0 space-y-4">

          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 px-1 group shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md group-hover:scale-105 transition-transform shrink-0">
              <AgriSphereLogo className="w-full h-full" />
            </div>
            <div>
              <div className="flex items-center tracking-tight font-black text-xl leading-none">
                <span className="text-slate-900 dark:text-white">Agri</span>
                <span className="text-[#14532D] dark:text-emerald-400">Sphere</span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                {t('footer.tagline') || 'Smart Farming. Better Decisions.'}
              </p>
            </div>
          </Link>

          <hr className="border-slate-200/80 dark:border-[#1F7A4D]/20 my-1 shrink-0" />

          {/* REAL RECENT CHAT HISTORY — no dummy entries */}
          <div className="space-y-2 shrink-0">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {t('workspace.recent') || 'Recent'}
              </h3>
              <div className="flex items-center gap-2">
                <Link to="/consultations" className="text-[11px] font-black text-[#14532D] dark:text-emerald-400 hover:underline">
                  {t('workspace.viewAll') || 'View all →'}
                </Link>
                <button
                  type="button"
                  onClick={handleClearRecents}
                  className="inline-flex items-center gap-1 text-[10px] font-black text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
                  title="Clear all recent chats"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {activityItems.slice(0, 3).map((item) => {
                const Icon = item.icon || Sprout;
                const isSelected = activeItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectActivity(item)}
                    className={`w-full text-left p-2 rounded-2xl transition-all flex items-center gap-2.5 group border cursor-pointer ${isSelected ? 'bg-[#14532D] text-white border-[#14532D] shadow-md' : 'bg-white dark:bg-[#091A13] border-slate-200/80 dark:border-[#1F7A4D]/15 hover:border-[#14532D] hover:shadow-xs text-slate-800 dark:text-slate-100'}`}
                  >
                    <div className={`p-1.5 rounded-xl shrink-0 ${isSelected ? 'bg-white/20 text-white' : (item.iconBg || 'bg-emerald-100 text-emerald-800')}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white group-hover:text-[#14532D]'}`}>
                        {item.title}
                      </div>
                      <div className="text-[10px] mt-0.5 opacity-80 text-slate-400">
                        {item.time}
                      </div>
                    </div>
                  </button>
                );
              })}

              {activityItems.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-[#1F7A4D]/20 px-3 py-4 text-center">
                  <MessageSquare className="w-4 h-4 mx-auto mb-1.5 text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-400">
                    Your conversations will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* New Chat */}
          <button
            onClick={handleNewConsultation}
            className="w-full py-2.5 px-3 rounded-2xl bg-[#14532D] hover:bg-[#1F7A4D] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-98 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t('workspace.newChat') || '+ New Chat'}</span>
          </button>

          {/* Language + Theme + Profile */}
          <div className="mt-auto pt-3 space-y-2 border-t border-slate-200 dark:border-[#1F7A4D]/20">
            <div className="flex items-center justify-between px-3 py-2 rounded-2xl border border-slate-200 dark:border-[#1F7A4D]/20 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-4 h-4 text-[#14532D] dark:text-emerald-400 shrink-0" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer font-bold text-xs pr-1 max-w-[150px]"
                  aria-label="Select workspace language"
                >
                  {supportedLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {lang.flag} {lang.nativeName}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={toggleTheme} className="p-1 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer shrink-0" title="Toggle theme">
                {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            <div className="p-2.5 rounded-2xl border border-slate-200 dark:border-[#1F7A4D]/20 bg-white dark:bg-[#091A13] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#14532D] text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0">F</div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-[#14532D] dark:text-white leading-tight truncate">
                    {t('workspace.farmerName') || 'Farmer Ramesh'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold truncate max-w-[150px]">
                    {locationLoading ? t('workspace.locating') || 'Locating...' : userLocation?.formattedLocation || locationError || 'Location unavailable'}
                  </div>
                </div>
              </div>
              <Settings className="w-4 h-4 text-[#14532D] dark:text-emerald-400 shrink-0" />
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================== */}
      {/* MAIN EXPANDED CENTER CONTENT AREA          */}
      {/* ========================================== */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden transition-all duration-300">
        
        {/* Responsive Full-bleed Background Landscape Image */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/AgriSphere.png"
            alt="AgriSphere Landscape Visual"
            className={`w-full h-full object-cover object-center filter transition-all duration-500 ease-in-out ${
              isChatMode ? 'brightness-[0.35] blur-md scale-105' : 'brightness-[0.98] contrast-[1.03]'
            }`}
          />
          <div className={`absolute inset-0 bg-gradient-to-t pointer-events-none transition-opacity duration-500 ${
            isChatMode ? 'from-black/80 via-black/50 to-black/70' : 'from-black/40 via-transparent to-black/20'
          }`} />
        </div>

        {/* Floating Top Header Overlay: Weather & Location */}
        <div className="relative z-30 flex items-center justify-between px-4 sm:px-8 py-3 shrink-0">
          
          {/* Right Side: ONLY Weather & Real Location Card */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/95 dark:bg-[#091A13]/95 backdrop-blur-md border border-slate-200 dark:border-[#1F7A4D]/30 shadow-xl text-slate-900 dark:text-white">
              <div className="p-1.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black leading-none">
                  {userLocation?.temp ? `${userLocation.temp}°C` : '28°C'}{' '}
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {userLocation?.condition || 'Clear Sky'}
                  </span>
                </div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold mt-0.5 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 text-[#14532D] dark:text-emerald-400 shrink-0" />
                  {locationLoading ? (
                    <span className="animate-pulse">{t('workspace.locating') || 'Locating...'}</span>
                  ) : userLocation?.formattedLocation ? (
                    <span className="truncate max-w-[140px] sm:max-w-none">{userLocation.formattedLocation}</span>
                  ) : (
                    <button
                      onClick={loadLocation}
                      className="text-red-600 dark:text-red-400 hover:underline cursor-pointer flex items-center gap-0.5"
                      title="Retry fetching location"
                    >
                      <span>{t('workspace.locationUnavailable') || 'Location unavailable (Retry)'}</span>
                      <RotateCw className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* STATE A: FARM HOME MODE vs STATE B: FOREGROUND CHAT MODE */}
        {/* ======================================================== */}
        {!isChatMode ? (
          /* STATE A — FARM HOME MODE */
          <div className="flex-1 relative z-10 w-full min-h-0 overflow-y-auto px-4 sm:px-6 py-2 flex flex-col space-y-4">
            
            {/* Main Headline with Location Pill */}
            <div className="max-w-4xl mx-auto w-full space-y-1.5 text-center sm:text-left pt-1 shrink-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 text-emerald-300 text-[11px] font-black tracking-wider uppercase shadow-sm">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  {userLocation?.formattedLocation || 'Verified Agriculture Location'}
                </span>
                {userLocation?.temp && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-400/40 text-amber-200 text-[11px] font-black">
                    <Sun className="w-3 h-3 text-amber-400" />
                    {userLocation.temp}°C {userLocation.condition}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#14532D] tracking-tight leading-tight drop-shadow-xl">
                {t('workspace.heroTitle') || 'Your Farm.'}{' '}
                <span className="text-[#14532D] drop-shadow-md">
                  {t('workspace.heroTitleHighlight') || 'Smarter Decisions.'}
                </span>
              </h1>
              <p className="text-xs sm:text-sm font-bold text-[#14532D] leading-relaxed drop-shadow-md max-w-xl">
                {t('workspace.heroSub') || 'AI-powered agricultural guidance for healthier crops and higher yields.'}
              </p>
            </div>

            {/* Interactive Telemetry Canvas Hotspots */}
            <div className="flex-1 min-h-[220px] sm:min-h-[280px] relative flex items-center justify-center py-2">
              <FarmCanvas
                isInteractive={true}
                onSelectTelemetry={(m) => {
                  handleSend({ queryText: `Tell me about ${m.label} on my farm.`, language });
                }}
              />
            </div>

            {/* Suggested Farming Topics Dock Chips */}
            <div className="max-w-4xl mx-auto w-full shrink-0 space-y-2 pb-2">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {SUGGESTED_TOPICS.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend({ queryText: topic.query, language })}
                    className="px-3.5 py-2 rounded-2xl bg-white/90 dark:bg-[#091A13]/90 backdrop-blur-md border border-[#1F7A4D]/25 hover:border-[#1F7A4D] text-slate-800 dark:text-slate-100 text-xs font-bold whitespace-nowrap shadow-md hover:scale-102 transition-transform active:scale-95 cursor-pointer shrink-0"
                  >
                    🌱 {topic.label}
                  </button>
                ))}
              </div>

              {/* Sticky Bottom Composer */}
              <ChatComposer onSend={handleSend} isLoading={isLoading} />
              
              <div className="text-center font-['Playfair_Display',serif] italic text-xs font-black text-white drop-shadow-lg pt-1">
                "Better Farming Brighter Tomorrow"
              </div>
            </div>

          </div>
        ) : (
          /* STATE B — DEDICATED CHAT MODE FOREGROUND PANEL */
          <div className="flex-1 relative z-20 w-full h-full min-h-0 flex flex-col max-w-4xl mx-auto px-2 sm:px-4 pb-3">
            <div className="flex-1 flex flex-col h-full rounded-3xl backdrop-blur-2xl bg-slate-950/70 border border-white/15 shadow-2xl overflow-hidden transition-all duration-300">
              
              {/* Chat Mode Panel Header */}
              <div className="px-4 sm:px-6 py-3 border-b border-white/10 flex items-center justify-between bg-black/40 shrink-0">
                <button
                  onClick={() => setIsChatMode(false)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-black transition-all cursor-pointer border border-white/15"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{t('workspace.backToFarm') || '← Back to Farm'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <div className="text-left">
                    <div className="text-xs font-extrabold text-emerald-300 leading-tight">
                      {t('chat.guardrailTitle') || 'AgriSphere Assistant'}
                    </div>
                    {userLocation?.formattedLocation && (
                      <div className="text-[10px] text-emerald-200/90 font-semibold flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                        <span className="truncate max-w-[180px] sm:max-w-xs">{userLocation.formattedLocation}</span>
                        {userLocation?.temp && <span>| {userLocation.temp}°C</span>}
                      </div>
                    )}
                  </div>
                </div>

                {messages.length > 0 && (
                  <button
                    onClick={handleClearChat}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-extrabold transition-all cursor-pointer border border-red-500/30"
                    title="Clear current active conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('workspace.clearChat') || 'Clear Chat'}</span>
                  </button>
                )}
              </div>

              {/* Scrollable Message Thread Stream */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                <ErrorBoundary onReset={handleNewConsultation}>
                  <ChatInterface
                    messages={messages}
                    isLoading={isLoading}
                    error={error}
                    messagesEndRef={messagesEndRef}
                    onRetry={() => {
                      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                      if (lastUserMsg) {
                        handleSend({ queryText: lastUserMsg.content, image: lastUserMsg.image, language });
                      }
                    }}
                  />
                </ErrorBoundary>
              </div>

              {/* Sticky Chat Composer at Bottom of Chat Panel */}
              <div className="p-3 sm:p-4 border-t border-white/10 bg-black/50 shrink-0">
                <ChatComposer onSend={handleSend} isLoading={isLoading} />
              </div>

            </div>
          </div>
        )}

      </main>

    </div>
  );
}

