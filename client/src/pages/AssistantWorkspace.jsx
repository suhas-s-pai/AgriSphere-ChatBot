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
  X,
  ChevronLeft,
  ArrowRight,
  Bug,
  Droplets,
  FlaskConical,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
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
import FarmIntelligenceGrid from '../components/FarmIntelligenceGrid';
import { analyzeContent, getHistory } from '../services/api';
import { fetchRealUserLocation, getCachedLocation } from '../services/locationService';

const DEFAULT_ACTIVITY_ITEMS = [
  {
    id: 'act-1',
    title: 'Possible Early Blight (Alternaria solani)',
    topic: 'Plant Disease',
    time: '9/18/2026',
    icon: Bug,
    iconBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400',
    queryText: 'My tomato leaves are turning yellow with brown concentric spots on lower leaves.',
    crop: 'Tomato',
    result: {
      crop: 'Tomato',
      category: 'Plant Disease',
      assessment: 'Early Blight (Alternaria solani)',
      confidence: 94,
      symptoms: ['Concentric dark rings on lower leaves', 'Yellowing of older foliage', 'Premature leaf drop'],
      causes: ['High humidity combined with warm temps (24-29°C)', 'Fungal spores in soil splash'],
      recommendedActions: ['Apply copper-based fungicide or Mancozeb spray', 'Prune infected lower leaves', 'Avoid overhead sprinkler watering'],
      prevention: ['Implement 3-year crop rotation with non-solanaceous crops', 'Mulch soil base to prevent spore splash']
    }
  },
  {
    id: 'act-2',
    title: 'Critical Water Management Schedule',
    topic: 'Irrigation',
    time: '9/18/2026',
    icon: Droplets,
    iconBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400',
    queryText: 'How frequently should drip irrigation be operated during flowering stage in paddy?',
    crop: 'Rice',
    result: {
      crop: 'Rice',
      category: 'Irrigation Guidance',
      assessment: 'Flowering Stage Drip Irrigation Schedule',
      confidence: 89,
      symptoms: ['Panicle initiation moisture requirement check'],
      causes: ['High evapotranspiration during flowering requires consistent soil saturation'],
      recommendedActions: ['Operate drip system for 2.5 hours daily or 50 liters/plot', 'Maintain soil moisture at field capacity'],
      prevention: ['Install tensiometers or soil moisture sensors at 15cm depth']
    }
  },
  {
    id: 'act-3',
    title: 'Nutrient & Fertilizer Schedule for Maize',
    topic: 'Fertilizers',
    time: '9/17/2026',
    icon: FlaskConical,
    iconBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400',
    queryText: 'How to amend acidic sandy soil pH 5.2 for optimal sugarcane growth?',
    crop: 'Soil',
    result: {
      crop: 'Sugarcane',
      category: 'Fertilizers & Soil',
      assessment: 'Agricultural Lime (CaCO3) Amendment Protocol',
      confidence: 92,
      symptoms: ['Low pH 5.2 reducing P availability'],
      causes: ['Leaching of basic cations in high-rainfall sandy soils'],
      recommendedActions: ['Apply 2.5 tonnes/ha agricultural dolomite lime 3-4 weeks before planting', 'Incorporate thoroughly into top 20cm soil layer'],
      prevention: ['Regular biennial soil testing and organic compost additions']
    }
  }
];

const SUGGESTED_TOPICS = [
  { label: 'Tomato Disease Check', query: 'My tomato leaves are turning yellow with brown spots. What should I do?' },
  { label: 'Paddy Drip Schedule', query: 'When should I irrigate my rice paddy field during flowering stage?' },
  { label: 'Maize Fertilizer NPK', query: 'What is the recommended fertilizer dose and application schedule for maize?' },
  { label: 'Onion Thrips Control', query: 'How can I control thrips infestation on onion leaves organically?' },
  { label: 'Greenhouse Farming', query: 'What are the best crops for greenhouse farming in warm humid regions?' },
  { label: 'Soil Health pH 6.8', query: 'How to amend acidic soil to maintain pH 6.8 for optimal nutrient absorption?' }
];

export default function AssistantWorkspace() {
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  // Desktop left sidebar collapse state
  const [isLeftNavOpen, setIsLeftNavOpen] = useState(true);

  // Mobile drawer state
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Home Mode vs Chat Mode state
  const [isChatMode, setIsChatMode] = useState(false);

  const [activityItems, setActivityItems] = useState(DEFAULT_ACTIVITY_ITEMS);
  const [activeItem, setActiveItem] = useState(null);

  // Continuous Chat Thread State
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of conversation whenever messages or loading state update
  useEffect(() => {
    if (isChatMode) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isChatMode]);

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

  // Prefill query if passed via router location state
  useEffect(() => {
    if (location.state?.prefillQuery) {
      handleSend({ queryText: location.state.prefillQuery, language });
    }
  }, [location.state]);

  // Load history from backend API and merge into activity items
  useEffect(() => {
    async function fetchBackendHistory() {
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
        setActivityItems(prev => {
          const combined = [...mapped, ...prev];
          const map = new Map();
          const unique = [];
          for (const item of combined) {
            if (!map.has(item.id)) {
              map.set(item.id, true);
              unique.push(item);
            }
          }
          return unique;
        });
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
    setIsChatMode(false);
    setMobileNavOpen(false);
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
      {/* 1. INDEPENDENTLY SCROLLABLE LEFT SIDEBAR   */}
      {/* ========================================== */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-white/95 dark:bg-[#091A13]/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-[#1F7A4D]/20 h-full overflow-y-auto p-4 sm:p-5 z-30 relative select-none shadow-xl transition-all duration-300 ease-in-out ${
          isLeftNavOpen ? 'w-72 xl:w-80 opacity-100 translate-x-0' : 'w-0 p-0 border-0 opacity-0 -translate-x-full overflow-hidden'
        }`}
      >
        <div className="flex flex-col h-full space-y-4 min-w-[240px]">
          
          {/* SECTION 1 — BRAND */}
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

          {/* SECTION 2 — PRIMARY NAVIGATION */}
          <nav className="space-y-1 shrink-0">
            <Link
              to="/"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all ${
                location.pathname === '/'
                  ? 'bg-[#14532D] text-white shadow-lg shadow-emerald-900/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-[#14532D]/10 hover:text-[#14532D]'
              }`}
            >
              <HomeIcon className="w-4 h-4" />
              <span>{t('workspace.home') || 'Home'}</span>
            </Link>

            <Link
              to="/assistant"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all ${
                location.pathname === '/assistant'
                  ? 'bg-[#14532D] text-white shadow-lg shadow-emerald-900/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-[#14532D]/10 hover:text-[#14532D]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>{t('workspace.assistant') || 'Assistant'}</span>
            </Link>

            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-[#14532D]/10 hover:text-[#14532D] transition-all"
            >
              <Activity className="w-4 h-4" />
              <span>{t('nav.dashboard') || 'Dashboard'}</span>
            </Link>

            <Link
              to="/crops"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-[#14532D]/10 hover:text-[#14532D] transition-all"
            >
              <Grid className="w-4 h-4" />
              <span>{t('nav.crops') || 'Crops'}</span>
            </Link>

            <Link
              to="/consultations"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-[#14532D]/10 hover:text-[#14532D] transition-all"
            >
              <HistoryIcon className="w-4 h-4" />
              <span>{t('nav.consultations') || 'Consultations'}</span>
            </Link>

            <Link
              to="/learn"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-[#14532D]/10 hover:text-[#14532D] transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>{t('nav.learn') || 'Learn'}</span>
            </Link>
          </nav>

          {/* SECTION 3 — DIVIDER */}
          <hr className="border-slate-200/80 dark:border-[#1F7A4D]/20 my-1 shrink-0" />

          {/* SECTION 4 — RECENT (Compact, 3 items) & CLEAR CHAT */}
          <div className="space-y-2 shrink-0">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {t('workspace.recent') || 'Recent'}
              </h3>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={handleClearChat}
                    className="text-[11px] font-black text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1 cursor-pointer"
                    title="Clear current active chat conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{t('workspace.clearChat') || 'Clear Chat'}</span>
                  </button>
                )}
                <Link
                  to="/consultations"
                  className="text-[11px] font-black text-[#14532D] dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  <span>{t('workspace.viewAll') || 'View all →'}</span>
                </Link>
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
                    className={`w-full text-left p-2 rounded-2xl transition-all flex items-center gap-2.5 group border cursor-pointer ${
                      isSelected
                        ? 'bg-[#14532D] text-white border-[#14532D] shadow-md'
                        : 'bg-white dark:bg-[#091A13] border-slate-200/80 dark:border-[#1F7A4D]/15 hover:border-[#14532D] hover:shadow-xs text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl shrink-0 ${isSelected ? 'bg-white/20 text-white' : item.iconBg}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white group-hover:text-[#14532D]'}`}>
                        {item.title}
                      </div>
                      <div className="flex items-center justify-between text-[10px] mt-0.5 opacity-80">
                        <span className="shrink-0 font-medium text-slate-400 ml-1">{item.time}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 5 — + NEW CONSULTATION & CLEAR CHAT BUTTONS */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleNewConsultation}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-[#14532D] hover:bg-[#1F7A4D] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-98 cursor-pointer"
              title="Start a new consultation thread"
            >
              <Plus className="w-4 h-4" />
              <span>{t('workspace.newChat') || '+ New Chat'}</span>
            </button>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="py-2.5 px-3 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-black flex items-center justify-center gap-1 shadow-sm transition-transform active:scale-98 cursor-pointer"
                title="Clear current conversation"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('workspace.clearChat') || 'Clear'}</span>
              </button>
            )}
          </div>

          {/* SECTION 6 — PROFILE & FOOTER (Pinned to bottom) */}
          <div className="mt-auto pt-3 space-y-2 shrink-0">
            {/* Global Language & Theme Selector */}
            <div className="relative flex items-center justify-between px-3 py-2 rounded-2xl border border-slate-200 dark:border-[#1F7A4D]/20 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer font-bold text-xs pr-1"
                  aria-label="Select workspace language"
                >
                  {supportedLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold">
                      {lang.flag} {lang.nativeName}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={toggleTheme}
                className="p-1 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Toggle light/dark theme"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>
            </div>

            {/* Farmer Ramesh User Profile */}
            <div className="p-2.5 rounded-2xl border border-slate-200 dark:border-[#1F7A4D]/20 bg-white dark:bg-[#091A13] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#14532D] text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0">
                  F
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-[#14532D] dark:text-white leading-tight truncate">
                    {t('workspace.farmerName') || 'Farmer Ramesh'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold truncate max-w-[120px]">
                    {locationLoading ? t('workspace.locating') || 'Locating...' : userLocation?.formattedLocation || locationError || 'Location unavailable'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => alert(`AgriSphere Farm Location: ${userLocation?.formattedLocation || 'Location unavailable'}`)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer shrink-0"
                title="Profile Settings"
              >
                <Settings className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
              </button>
            </div>
          </div>

        </div>
      </aside>

      {/* ========================================== */}
      {/* 2. MAIN EXPANDED CENTER CONTENT AREA       */}
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

        {/* Floating Top Header Overlay: Menu Toggle + Weather/Location ONLY (Search & Bell REMOVED) */}
        <div className="relative z-30 flex items-center justify-between px-4 sm:px-8 py-3 shrink-0">
          
          {/* Left Side: Hide/Show Menu Toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden px-3.5 py-2 rounded-full bg-white/95 dark:bg-[#091A13]/95 text-slate-900 dark:text-white border border-slate-300 dark:border-[#1F7A4D]/40 font-extrabold text-xs shadow-lg flex items-center gap-2 cursor-pointer"
              aria-label="Open mobile navigation menu"
            >
              <Menu className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
              <span>Menu</span>
            </button>

            <button
              onClick={() => setIsLeftNavOpen(!isLeftNavOpen)}
              className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 dark:bg-[#091A13]/95 text-slate-900 dark:text-white border border-slate-300 dark:border-[#1F7A4D]/40 font-black text-xs shadow-lg hover:shadow-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/80 transition-all active:scale-95 cursor-pointer"
              title={isLeftNavOpen ? 'Hide Menu (Ctrl+B)' : 'Show Menu (Ctrl+B)'}
              aria-label={isLeftNavOpen ? 'Hide Left Navigation' : 'Show Left Navigation'}
            >
              {isLeftNavOpen ? (
                <PanelLeftClose className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
              ) : (
                <PanelLeftOpen className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
              )}
              <span>{isLeftNavOpen ? (t('workspace.hideMenu') || 'Hide Menu') : (t('workspace.showMenu') || 'Show Menu')}</span>
            </button>
          </div>

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
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-xl">
                {t('workspace.heroTitle') || 'Your Farm.'}{' '}
                <span className="text-emerald-400 drop-shadow-md">
                  {t('workspace.heroTitleHighlight') || 'Smarter Decisions.'}
                </span>
              </h1>
              <p className="text-xs sm:text-sm font-bold text-slate-100 leading-relaxed drop-shadow-md max-w-xl">
                {t('workspace.heroSub') || 'AI-powered agricultural guidance for healthier crops and higher yields.'}
              </p>
            </div>

            {/* Farm Intelligence Grid Hub */}
            <div className="max-w-4xl mx-auto w-full shrink-0">
              <FarmIntelligenceGrid
                onSelectTopic={(topicQuery) => handleSend({ queryText: topicQuery, language })}
                onStartConsultation={() => setIsChatMode(true)}
              />
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

      {/* ========================================== */}
      {/* 3. MOBILE FULL NAVIGATION & ACTIVITY DRAWER */}
      {/* ========================================== */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[88vw] bg-white dark:bg-[#091A13] flex flex-col p-4 justify-between shadow-2xl z-50 overflow-y-auto space-y-4">
            
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

              {/* Navigation Links */}
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

              {/* Recent Section (3 items) */}
              <div className="space-y-2 pt-1 shrink-0">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase text-slate-900 dark:text-white">{t('workspace.recent') || 'Recent'}</span>
                  <Link to="/consultations" onClick={() => setMobileNavOpen(false)} className="text-[11px] font-black text-[#14532D] dark:text-emerald-400 hover:underline">{t('workspace.viewAll') || 'View all →'}</Link>
                </div>
                <div className="space-y-1.5">
                  {activityItems.slice(0, 3).map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectActivity(item)}
                      className="w-full text-left p-2 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#1F7A4D]/20 text-slate-900 dark:text-slate-100 flex items-center gap-2.5 cursor-pointer"
                    >
                      <div className={`p-1.5 rounded-xl shrink-0 ${item.iconBg}`}>
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

              {/* + New Consultation & Clear Chat Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleNewConsultation} className="flex-1 py-2.5 px-3 rounded-2xl bg-[#14532D] text-white text-xs font-black flex items-center justify-center gap-1 shadow-lg cursor-pointer">
                  <Plus className="w-4 h-4" />
                  <span>{t('workspace.newChat') || '+ New Chat'}</span>
                </button>
                {messages.length > 0 && (
                  <button onClick={handleClearChat} className="py-2.5 px-3 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-xs font-black flex items-center justify-center gap-1 shadow-sm cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                    <span>{t('workspace.clearChat') || 'Clear'}</span>
                  </button>
                )}
              </div>

              {/* Profile & Controls Footer */}
              <div className="space-y-2 border-t border-slate-200 dark:border-[#1F7A4D]/20 pt-3 mt-auto shrink-0">
                <div className="flex items-center justify-between px-3 py-2 rounded-2xl border border-slate-200 dark:border-[#1F7A4D]/20 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-transparent font-bold text-xs pr-1">
                      {supportedLanguages.map(l => (
                        <option key={l.code} value={l.code}>{l.flag} {l.nativeName}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={toggleTheme} className="p-1 rounded-xl text-slate-700 dark:text-slate-300 cursor-pointer">
                    {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
                  </button>
                </div>

                <div className="p-2.5 rounded-2xl border border-slate-200 dark:border-[#1F7A4D]/20 bg-white dark:bg-[#091A13] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#14532D] text-white font-black text-xs flex items-center justify-center shrink-0">
                      F
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-[#14532D] dark:text-white leading-tight truncate">{t('workspace.farmerName') || 'Farmer Ramesh'}</div>
                      <div className="text-[10px] text-slate-500 font-bold truncate max-w-[120px]">
                        {locationLoading ? t('workspace.locating') || 'Locating...' : userLocation?.formattedLocation || locationError || 'Location unavailable'}
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

