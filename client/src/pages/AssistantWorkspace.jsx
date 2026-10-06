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
  RotateCw,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useLocationContext } from '../context/LocationContext';
import AgriSphereLogo from '../components/AgriSphereLogo';
import ChatComposer from '../components/ChatComposer';
import ChatInterface from '../components/ChatInterface';
import ErrorBoundary from '../components/ErrorBoundary';
import FarmCanvas from '../components/FarmCanvas';
import LocationSelectorDropdown from '../components/LocationSelectorDropdown';
import { analyzeContent, getHistory } from '../services/api';

const CHAT_STATE_KEY = 'agrisphere-active-chat';
const RECENTS_CLEARED_KEY = 'agrisphere-recents-cleared';

export default function AssistantWorkspace() {
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  // Central Location State
  const {
    location: userLocation,
    loading: locationLoading,
    error: locationError,
    permissionDenied,
    requestLocation,
    refreshLocation
  } = useLocationContext();

  // Desktop left sidebar toggle state
  const [isLeftNavOpen, setIsLeftNavOpen] = useState(true);

  // Mobile navigation drawer state
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  // Keyboard shortcut Ctrl+B to toggle left nav
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsLeftNavOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Persist active chat thread in sessionStorage
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

  // Auto-scroll to bottom of conversation
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

  const handleSelectActivity = (item) => {
    sessionStorage.removeItem(RECENTS_CLEARED_KEY);
    setActiveItem(item);
    setMessages([
      { id: `usr-act-${item.id}`, role: 'user', content: item.queryText || item.title },
      { id: `ast-act-${item.id}`, role: 'assistant', content: item.result?.message || item.result?.assessment, result: item.result }
    ]);
    setError(null);
    setIsChatMode(true);
    setMobileNavOpen(false);
  };

  const handleNewConsultation = () => {
    setActiveItem(null);
    setMessages([]);
    setError(null);
    setIsChatMode(true);
    setMobileNavOpen(false);
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
    setMobileNavOpen(false);
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
    <div className="h-screen h-[100dvh] w-full flex text-slate-900 dark:text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] relative select-none-or-normal bg-slate-950">
      
      {/* Full-bleed Background Landscape Image spanning the ENTIRE viewport (under sidebar and main) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/Golden Sunset.png"
          alt="AgriSphere Landscape Visual"
          className={`w-full h-full object-cover object-center filter transition-all duration-500 ease-in-out ${
            isChatMode ? 'brightness-[0.35] blur-md scale-105' : 'brightness-[0.98] contrast-[1.03]'
          }`}
        />
        <div className={`absolute inset-0 bg-gradient-to-t pointer-events-none transition-opacity duration-500 ${
          isChatMode ? 'from-black/85 via-black/55 to-black/75' : 'from-black/40 via-transparent to-black/20'
        }`} />
      </div>

      {/* ============================================================ */}
      {/* 1. GLASSMORPHISM COLLAPSIBLE DESKTOP LEFT SIDEBAR             */}
      {/* ============================================================ */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-white/30 dark:bg-[#07130e]/40 backdrop-blur-2xl border-r border-white/30 dark:border-[#1F7A4D]/30 h-full z-20 relative shadow-2xl transition-all duration-300 ease-in-out ${
          isLeftNavOpen
            ? 'w-72 xl:w-80 opacity-100 translate-x-0 p-4 sm:p-5'
            : 'w-0 p-0 opacity-0 -translate-x-full border-0 overflow-hidden'
        }`}
      >
        <div className="flex flex-col h-full min-w-[240px] space-y-4">

          {/* Brand Identity */}
          <Link to="/welcome" className="flex items-center gap-3 px-1 group shrink-0" title="Return to AgriSphere Welcome Experience">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md group-hover:scale-105 transition-transform shrink-0">
              <AgriSphereLogo className="w-full h-full" />
            </div>
            <div>
              <div className="flex items-center tracking-tight font-black text-xl leading-none">
                <span className="text-slate-900 dark:text-white drop-shadow-xs">Agri</span>
                <span className="text-[#14532D] dark:text-emerald-400 drop-shadow-xs">Sphere</span>
              </div>
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                {t('footer.tagline') || 'Smart Farming. Better Decisions.'}
              </p>
            </div>
          </Link>

          <hr className="border-white/30 dark:border-[#1F7A4D]/30 my-1 shrink-0" />

          {/* RECENT CHAT HISTORY (No "View All") */}
          <div className="space-y-2 shrink-0">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {t('workspace.recent') || 'Recent'}
              </h3>
              {activityItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearRecents}
                  className="inline-flex items-center gap-1 text-[10px] font-black text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
                  title="Clear recent chats"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {activityItems.slice(0, 3).map((item) => {
                const Icon = item.icon || Sprout;
                const isSelected = activeItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectActivity(item)}
                    className={`w-full text-left p-2 rounded-2xl transition-all flex items-center gap-2.5 group border cursor-pointer ${
                      isSelected
                        ? 'bg-[#14532D] text-white border-[#14532D] shadow-md'
                        : 'bg-white/40 dark:bg-black/35 backdrop-blur-md border-white/40 dark:border-[#1F7A4D]/25 hover:bg-white/60 dark:hover:bg-black/55 text-slate-900 dark:text-slate-100 shadow-xs'
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl shrink-0 ${isSelected ? 'bg-white/20 text-white' : (item.iconBg || 'bg-emerald-100 text-emerald-800')}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white group-hover:text-[#14532D]'}`}>
                        {item.title}
                      </div>
                      <div className="text-[10px] mt-0.5 opacity-80 text-slate-600 dark:text-slate-400 font-semibold">
                        {item.time}
                      </div>
                    </div>
                  </button>
                );
              })}

              {activityItems.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/40 dark:border-[#1F7A4D]/30 bg-white/20 dark:bg-black/20 px-3 py-4 text-center">
                  <MessageSquare className="w-4 h-4 mx-auto mb-1.5 text-slate-600 dark:text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    Your conversations will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewConsultation}
            className="w-full py-2.5 px-3 rounded-2xl bg-[#14532D] hover:bg-[#1F7A4D] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-98 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t('workspace.newChat') || '+ New Chat'}</span>
          </button>

          {/* Language + Theme + Farmer Profile */}
          <div className="mt-auto pt-3 space-y-2 border-t border-white/30 dark:border-[#1F7A4D]/30">
            <div className="flex items-center justify-between px-3 py-2 rounded-2xl border border-white/40 dark:border-[#1F7A4D]/30 bg-white/40 dark:bg-black/35 backdrop-blur-md text-xs font-bold text-slate-900 dark:text-slate-100 shadow-xs">
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
              <button onClick={toggleTheme} className="p-1 rounded-xl hover:bg-white/40 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer shrink-0" title="Toggle theme">
                {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            <div className="p-2.5 rounded-2xl border border-white/40 dark:border-[#1F7A4D]/30 bg-white/40 dark:bg-black/35 backdrop-blur-md flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#14532D] text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0">F</div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-[#14532D] dark:text-white leading-tight truncate">
                    {t('workspace.farmerName') || 'Farmer Ramesh'}
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-300 font-extrabold truncate max-w-[150px]">
                    {locationLoading ? (
                      <span className="animate-pulse">{t('workspace.locating') || 'Locating...'}</span>
                    ) : userLocation?.formattedLocation ? (
                      userLocation.formattedLocation
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">Location required</span>
                    )}
                  </div>
                </div>
              </div>
              <Settings className="w-4 h-4 text-[#14532D] dark:text-emerald-400 shrink-0" />
            </div>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. MAIN EXPANDED CENTER CONTENT AREA                          */}
      {/* ============================================================ */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative z-10 overflow-hidden transition-all duration-300">
        
        {/* Floating Top Header Bar: Hide/Reveal Toggle + Location & Weather Card */}
        <div className="relative z-30 flex items-center justify-between px-4 sm:px-8 py-3 shrink-0">
          
          {/* Left Controls: Hide/Reveal Sidebar & Mobile Drawer Buttons */}
          <div className="flex items-center gap-2">
            {/* Desktop Hide/Reveal Sidebar Toggle */}
            <button
              type="button"
              onClick={() => setIsLeftNavOpen(prev => !prev)}
              className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/75 dark:bg-[#091A13]/75 backdrop-blur-xl border border-slate-200/80 dark:border-[#1F7A4D]/30 text-slate-800 dark:text-white text-xs font-black shadow-md hover:bg-emerald-50 dark:hover:bg-emerald-950/80 transition-all cursor-pointer shrink-0"
              title={isLeftNavOpen ? "Hide Navigation (Ctrl+B)" : "Reveal Navigation (Ctrl+B)"}
            >
              {isLeftNavOpen ? (
                <PanelLeftClose className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
              ) : (
                <PanelLeftOpen className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
              )}
              <span>{isLeftNavOpen ? 'Hide Menu' : 'Reveal Menu'}</span>
            </button>

            {/* Mobile Navigation Drawer Trigger */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/75 dark:bg-[#091A13]/75 backdrop-blur-xl border border-slate-200/80 dark:border-[#1F7A4D]/30 text-slate-800 dark:text-white text-xs font-black shadow-md hover:bg-emerald-50 dark:hover:bg-emerald-950/80 transition-all cursor-pointer shrink-0"
              aria-label="Open mobile navigation menu"
            >
              <Menu className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
              <span>Menu</span>
            </button>
          </div>

          {/* Right Controls: Interactive Real Location & Weather Card */}
          <div className="flex items-center gap-3">
            <LocationSelectorDropdown variant="header" />
          </div>
        </div>

        {/* ======================================================== */}
        {/* STATE A: FARM HOME MODE vs STATE B: FOREGROUND CHAT MODE */}
        {/* ======================================================== */}
        {!isChatMode ? (
          /* STATE A — FARM HOME MODE */
          <div className="flex-1 relative z-10 w-full min-h-0 overflow-y-auto no-scrollbar px-4 sm:px-8 md:px-12 py-3 flex flex-col justify-between space-y-4">
            
            {/* HERO SECTION: LOCATION BADGE + WHITE HIGH-CONTRAST HEADING + SUBTITLE */}
            <div className="max-w-3xl w-full space-y-2 text-left pt-2 sm:pt-4 shrink-0">
              
              {/* Interactive Location Selector Badge */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <LocationSelectorDropdown variant="hero" />
              </div>

              {/* White High-Contrast Hero Heading */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15] drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                {t('workspace.heroTitle') || 'Your Farm.'}{' '}
                <span className="text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                  {t('workspace.heroTitleHighlight') || 'Smarter Decisions.'}
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base font-bold text-white/95 leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] max-w-xl">
                {t('workspace.heroSub') || 'AI-powered agricultural guidance for healthier crops and higher yields.'}
              </p>
            </div>

            {/* Clean Center Spacer (Exposes the Golden Sunset Landscape & Sun) */}
            <div className="flex-1 min-h-[120px] sm:min-h-[160px]" />

            {/* Bottom Chat Composer Container */}
            <div className="max-w-4xl mx-auto w-full shrink-0 space-y-2 pb-2">
              <ChatComposer onSend={handleSend} isLoading={isLoading} />
              
              <div className="text-center font-['Playfair_Display',serif] italic text-xs font-extrabold text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] pt-1">
                "Better Farming, Brighter Tomorrow"
              </div>
            </div>

          </div>
        ) : (
          /* STATE B — DEDICATED CHAT MODE FOREGROUND PANEL */
          <div className="flex-1 relative z-20 w-full h-full min-h-0 flex flex-col max-w-4xl mx-auto px-2 sm:px-4 pb-3">
            <div className="flex-1 flex flex-col h-full rounded-3xl backdrop-blur-2xl bg-slate-950/75 border border-white/15 shadow-2xl overflow-hidden transition-all duration-300">
              
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

      {/* ============================================================ */}
      {/* 3. MOBILE NAVIGATION DRAWER                                   */}
      {/* ============================================================ */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[88vw] bg-white/90 dark:bg-[#091A13]/90 backdrop-blur-2xl flex flex-col p-4 justify-between shadow-2xl z-50 overflow-y-auto space-y-4">
            
            <div className="space-y-4 flex-1 flex flex-col">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1F7A4D]/20 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg overflow-hidden">
                    <AgriSphereLogo className="w-full h-full" />
                  </div>
                  <span className="font-black text-base text-[#14532D] dark:text-white">Agri<span className="text-emerald-500">Sphere</span></span>
                </div>
                <button onClick={() => setMobileNavOpen(false)} className="p-1 rounded-xl text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-1 shrink-0">
                <Link to="/" onClick={() => setMobileNavOpen(false)} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-black ${location.pathname === '/' ? 'bg-[#14532D] text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-[#14532D]/10'}`}>
                  <HomeIcon className="w-4 h-4" />
                  <span>{t('workspace.home') || 'Home'}</span>
                </Link>
                <Link to="/assistant" onClick={() => setMobileNavOpen(false)} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-black ${location.pathname === '/assistant' ? 'bg-[#14532D] text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-[#14532D]/10'}`}>
                  <MessageSquare className="w-4 h-4" />
                  <span>{t('workspace.assistant') || 'Assistant'}</span>
                </Link>
                <Link to="/dashboard" onClick={() => setMobileNavOpen(false)} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-black ${location.pathname === '/dashboard' ? 'bg-[#14532D] text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-[#14532D]/10'}`}>
                  <Activity className="w-4 h-4" />
                  <span>{t('nav.dashboard') || 'Dashboard'}</span>
                </Link>
                <Link to="/crops" onClick={() => setMobileNavOpen(false)} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-black ${location.pathname === '/crops' ? 'bg-[#14532D] text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-[#14532D]/10'}`}>
                  <Grid className="w-4 h-4" />
                  <span>{t('nav.crops') || 'Crops'}</span>
                </Link>
                <Link to="/consultations" onClick={() => setMobileNavOpen(false)} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-black ${location.pathname === '/consultations' ? 'bg-[#14532D] text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-[#14532D]/10'}`}>
                  <HistoryIcon className="w-4 h-4" />
                  <span>{t('nav.consultations') || 'Consultations'}</span>
                </Link>
                <Link to="/learn" onClick={() => setMobileNavOpen(false)} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-black ${location.pathname === '/learn' ? 'bg-[#14532D] text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-[#14532D]/10'}`}>
                  <BookOpen className="w-4 h-4" />
                  <span>{t('nav.learn') || 'Learn'}</span>
                </Link>
              </nav>

              <hr className="border-slate-200 dark:border-[#1F7A4D]/20 my-2 shrink-0" />

              {/* Recent Section (No View All) */}
              <div className="space-y-2 pt-1 shrink-0">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase text-slate-900 dark:text-white">{t('workspace.recent') || 'Recent'}</span>
                  {activityItems.length > 0 && (
                    <button onClick={handleClearRecents} className="text-[11px] font-black text-red-600 dark:text-red-400 hover:underline">Clear</button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {activityItems.slice(0, 3).map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectActivity(item)}
                      className="w-full text-left p-2 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-[#1F7A4D]/20 text-slate-900 dark:text-slate-100 flex items-center gap-2.5 cursor-pointer"
                    >
                      <div className={`p-1.5 rounded-xl shrink-0 ${item.iconBg || 'bg-emerald-100 text-emerald-800'}`}>
                        <Sprout className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black truncate">{item.title}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{item.time}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* New Chat Button */}
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleNewConsultation} className="flex-1 py-2.5 px-3 rounded-2xl bg-[#14532D] text-white text-xs font-black flex items-center justify-center gap-1 shadow-lg cursor-pointer">
                  <Plus className="w-4 h-4" />
                  <span>{t('workspace.newChat') || '+ New Chat'}</span>
                </button>
              </div>

              {/* Profile & Controls Footer */}
              <div className="space-y-2 border-t border-slate-200 dark:border-[#1F7A4D]/20 pt-3 mt-auto shrink-0">
                <div className="flex items-center justify-between px-3 py-2 rounded-2xl border border-slate-200 dark:border-[#1F7A4D]/20 bg-white/70 dark:bg-slate-900/70 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-transparent font-bold text-xs pr-1">
                      {supportedLanguages.map(l => (
                        <option key={l.code} value={l.code}>{l.flag} {l.nativeName}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={toggleTheme} className="p-1 rounded-xl text-slate-700 dark:text-slate-300 cursor-pointer">
                    {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
                  </button>
                </div>

                <div className="p-2.5 rounded-2xl border border-slate-200 dark:border-[#1F7A4D]/20 bg-white/80 dark:bg-[#091A13]/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#14532D] text-white font-black text-xs flex items-center justify-center shrink-0">F</div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-[#14532D] dark:text-white leading-tight truncate">{t('workspace.farmerName') || 'Farmer Ramesh'}</div>
                      <div className="text-[10px] text-slate-500 font-bold truncate max-w-[140px]">
                        {locationLoading ? (
                          <span className="animate-pulse">{t('workspace.locating') || 'Locating...'}</span>
                        ) : userLocation?.formattedLocation ? (
                          userLocation.formattedLocation
                        ) : (
                          'Location required'
                        )}
                      </div>
                    </div>
                  </div>
                  <Settings className="w-4 h-4 text-[#14532D] dark:text-emerald-400 shrink-0" />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
