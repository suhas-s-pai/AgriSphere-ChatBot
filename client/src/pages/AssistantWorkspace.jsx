import React, { useState, useEffect } from 'react';
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
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  ArrowRight,
  Bug,
  Droplets,
  FlaskConical,
  ShieldCheck,
  Camera,
  FolderPlus,
  Mic,
  Lightbulb,
  Bell,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Menu
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import AgriSphereLogo from '../components/AgriSphereLogo';
import ChatComposer from '../components/ChatComposer';
import ChatInterface from '../components/ChatInterface';
import FarmCanvas from '../components/FarmCanvas';
import { analyzeContent, getHistory } from '../services/api';

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
  },
  {
    id: 'act-4',
    title: 'Integrated Pest Management for Onion',
    topic: 'Pest Management',
    time: '9/16/2026',
    icon: Bug,
    iconBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400',
    queryText: 'How to formulate 5% neem oil emulsion for thrips and aphid control on onion crops organically?',
    crop: 'Onion',
    result: {
      crop: 'Onion',
      category: 'Pest Management',
      assessment: 'Neem Oil Bio-Pesticide Spray',
      confidence: 95,
      symptoms: ['Silver streaks on leaf tips, curling shoots'],
      causes: ['Thrips tabaci population buildup in dry weather'],
      recommendedActions: ['Spray 5% cold-pressed neem oil + 10ml liquid soap per liter of water', 'Apply late evening under foliage'],
      prevention: ['Install yellow sticky traps (10 per acre)']
    }
  },
  {
    id: 'act-5',
    title: 'Dryland Pulse Selection & Sowing Advice',
    topic: 'Crop Selection',
    time: '9/15/2026',
    icon: Sprout,
    iconBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400',
    queryText: 'What farming precautions should I take for maize crop before heavy monsoon rain?',
    crop: 'Maize',
    result: {
      crop: 'Maize',
      category: 'Weather Advisory',
      assessment: 'Monsoon Heavy Rainfall Drainage Protocol',
      confidence: 91,
      symptoms: ['Risk of waterlogging in field troughs'],
      causes: ['Heavy precipitation forecast over next 48 hours'],
      recommendedActions: ['Clear field perimeter drainage channels', 'Delay top-dressing fertilizer spray until rain stops'],
      prevention: ['Ridge and furrow cultivation method']
    }
  }
];

const QUICK_TIPS = [
  'Apply organic compost to improve soil structure and water retention.',
  'Irrigate crops during early morning hours to minimize water evaporation and prevent fungal diseases.',
  'Rotate Solanaceous crops like tomato and potato with legumes to naturally replenish soil nitrogen.',
  'Install yellow sticky traps across your field to detect sucking pests early before outbreak.'
];

export default function AssistantWorkspace() {
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  // Desktop sidebars collapse state
  const [isLeftNavOpen, setIsLeftNavOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // Mobile drawers toggle state
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  // Search & notifications popover state
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showNotificationAlert, setShowNotificationAlert] = useState(false);

  const [activityItems, setActivityItems] = useState(DEFAULT_ACTIVITY_ITEMS);
  const [activeItem, setActiveItem] = useState(null);
  const [tipIndex, setTipIndex] = useState(0);

  // Active query execution state
  const [submittedText, setSubmittedText] = useState('');
  const [submittedImage, setSubmittedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isUnrelated, setIsUnrelated] = useState(false);
  const [unrelatedMessage, setUnrelatedMessage] = useState('');
  const [error, setError] = useState(null);

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

  const handleSelectActivity = (item) => {
    setActiveItem(item);
    setSubmittedText(item.queryText);
    setSubmittedImage(null);
    setAnalysisResult(item.result);
    setIsUnrelated(false);
    setError(null);
    setMobileRightOpen(false);
  };

  const handleNewConsultation = () => {
    setActiveItem(null);
    setSubmittedText('');
    setSubmittedImage(null);
    setAnalysisResult(null);
    setIsUnrelated(false);
    setError(null);
    setMobileRightOpen(false);
  };

  const handleSend = async ({ queryText, image, language: overrideLang }) => {
    if (!queryText && !image) return;

    const currentLang = overrideLang || language;

    setSubmittedText(queryText);
    setSubmittedImage(image);
    setIsLoading(true);
    setError(null);
    setIsUnrelated(false);
    setAnalysisResult(null);

    try {
      const data = await analyzeContent({
        queryText,
        image,
        language: currentLang
      });

      if (data.success) {
        if (data.isUnrelated) {
          setIsUnrelated(true);
          setUnrelatedMessage(data.message || t('chat.guardrailDefault'));
        } else {
          setAnalysisResult(data.result);
          const newItem = {
            id: `act-dynamic-${Date.now()}`,
            title: data.result.assessment || queryText.slice(0, 30) + '...',
            topic: data.result.category || 'Agricultural Inquiry',
            time: 'Just now',
            icon: Sprout,
            iconBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400',
            queryText,
            crop: data.result.crop || 'Crop',
            result: data.result
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

  const prevTip = () => {
    setTipIndex(prev => (prev === 0 ? QUICK_TIPS.length - 1 : prev - 1));
  };

  const nextTip = () => {
    setTipIndex(prev => (prev === QUICK_TIPS.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="h-screen h-[100dvh] w-full flex bg-[#FAF8F3] dark:bg-[#07130e] text-slate-900 dark:text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] relative select-none-or-normal">
      
      {/* ========================================== */}
      {/* 1. LEFT NAVIGATION SIDEBAR (Collapsible) */}
      {/* ========================================== */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-white/95 dark:bg-[#091A13]/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-[#1F7A4D]/20 h-full p-5 justify-between z-30 relative select-none shadow-xl transition-all duration-300 ease-in-out ${
          isLeftNavOpen ? 'w-64 xl:w-72 opacity-100 translate-x-0' : 'w-0 p-0 border-0 opacity-0 -translate-x-full overflow-hidden'
        }`}
      >
        <div className="space-y-6 min-w-[220px]">
          
          {/* Logo & Tagline */}
          <Link to="/" className="flex items-center gap-3 px-1 group">
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

          {/* Vertical Navigation Links */}
          <nav className="space-y-1.5">
            <Link
              to="/"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                location.pathname === '/' || location.pathname === '/assistant'
                  ? 'bg-[#14532D] text-white shadow-lg shadow-emerald-900/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-[#14532D]/10 hover:text-[#14532D]'
              }`}
            >
              <HomeIcon className="w-4 h-4" />
              <span>{t('workspace.home') || 'Home'}</span>
            </Link>

            <Link
              to="/assistant"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
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
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-[#14532D]/10 hover:text-[#14532D] transition-all"
            >
              <Activity className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
              <span>{t('nav.dashboard') || 'Dashboard'}</span>
            </Link>

            <Link
              to="/crops"
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-[#14532D]/10 hover:text-[#14532D] transition-all"
            >
              <Grid className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
              <span>{t('nav.crops') || 'Crops'}</span>
            </Link>

            <Link
              to="/consultations"
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-[#14532D]/10 hover:text-[#14532D] transition-all"
            >
              <HistoryIcon className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
              <span>{t('nav.consultations') || 'Consultations'}</span>
            </Link>

            <Link
              to="/learn"
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-[#14532D]/10 hover:text-[#14532D] transition-all"
            >
              <BookOpen className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
              <span>{t('nav.learn') || 'Learn'}</span>
            </Link>
          </nav>

        </div>

        {/* Bottom Sidebar Widgets */}
        <div className="space-y-3 min-w-[220px]">
          
          {/* Today's Insight Card */}
          <Link
            to="/learn"
            className="p-3.5 rounded-2xl bg-gradient-to-br from-[#14532D] to-[#1F7A4D] text-white shadow-md block space-y-1.5 hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <span className="flex items-center gap-1.5">
                <Sprout className="w-3.5 h-3.5 text-emerald-300" />
                <span>{t('workspace.todaysInsight') || "Today's Insight"}</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </div>
            <p className="text-xs font-semibold leading-relaxed text-emerald-50">
              {t('workspace.insightText') || 'Tomato growing conditions are good in your area.'}
            </p>
          </Link>

          {/* Global Language Selector & Theme Toggle */}
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
              className="p-1 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              title="Toggle light/dark theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>

          {/* Farmer Ramesh User Profile */}
          <div className="p-2.5 rounded-2xl border border-slate-200 dark:border-[#1F7A4D]/20 bg-white dark:bg-[#091A13] flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#14532D] text-white font-black text-xs flex items-center justify-center shadow-sm">
                F
              </div>
              <div>
                <div className="text-xs font-extrabold text-[#14532D] dark:text-white leading-tight">
                  {t('workspace.farmerName') || 'Farmer Ramesh'}
                </div>
                <div className="text-[10px] text-slate-500 font-bold">Bengaluru, KA</div>
              </div>
            </div>
            <button
              onClick={() => alert('AgriSphere Profile & Farm Location Settings: Bengaluru, KA')}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              title="Profile Settings"
            >
              <Settings className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
            </button>
          </div>

        </div>
      </aside>

      {/* ========================================== */}
      {/* 2. CENTER IMMERSIVE LANDSCAPE AREA */}
      {/* ========================================== */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden transition-all duration-300">
        
        {/* SINGLE Full-bleed Background Landscape Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/AgriSphere.png"
            alt="AgriSphere Landscape Visual"
            className="w-full h-full object-cover object-center filter brightness-[0.98] contrast-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25 pointer-events-none" />
        </div>

        {/* Floating Top Controls Header Overlay with Comfortable Left/Right Padding */}
        <div className="relative z-20 flex items-center justify-between px-6 sm:px-10 lg:px-12 py-6 pb-2 shrink-0">
          
          {/* Left Side: Prominent Show/Hide Menu Button & Main Headline (Shifted Right with Comfortable Padding) */}
          <div className="space-y-3 max-w-2xl pl-2 sm:pl-4">
            
            {/* PROMINENT SHOW/HIDE MENU TOGGLE BUTTON */}
            <div className="flex items-center gap-2">
              {/* Mobile Drawer Trigger */}
              <button
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden px-3.5 py-2 rounded-full bg-white dark:bg-[#091A13] text-slate-900 dark:text-white border border-slate-300 dark:border-[#1F7A4D]/40 font-extrabold text-xs shadow-lg flex items-center gap-2"
                aria-label="Open mobile navigation menu"
              >
                <Menu className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
                <span>Menu</span>
              </button>

              {/* Desktop Left Sidebar Hide/Show Toggle */}
              <button
                onClick={() => setIsLeftNavOpen(!isLeftNavOpen)}
                className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#091A13] text-slate-900 dark:text-white border border-slate-300 dark:border-[#1F7A4D]/40 font-black text-xs shadow-lg hover:shadow-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/80 transition-all active:scale-95 cursor-pointer"
                title={isLeftNavOpen ? 'Hide Left Navigation (Ctrl+B)' : 'Show Left Navigation (Ctrl+B)'}
                aria-label={isLeftNavOpen ? 'Hide Left Navigation' : 'Show Left Navigation'}
              >
                {isLeftNavOpen ? (
                  <PanelLeftClose className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
                )}
                <span>{isLeftNavOpen ? 'Hide Menu' : 'Show Menu'}</span>
              </button>
            </div>

            {/* Main Headline & Subtitle */}
            <div className="pt-1">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-none drop-shadow-xl">
                Your Farm.{' '}
                <span className="text-emerald-400 drop-shadow-md">
                  Smarter Decisions.
                </span>
              </h1>
              <p className="text-xs sm:text-sm font-bold text-slate-100 mt-2.5 leading-relaxed drop-shadow-md max-w-xl">
                AI-powered agricultural guidance for healthier crops and higher yields.
              </p>
            </div>

            {/* Quick Action Pill Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap pt-1">
              <button
                onClick={() => handleSend({ queryText: 'What is the optimal fertilizer schedule for tomato crops during flowering?', language })}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 dark:bg-[#091A13]/95 backdrop-blur-md border border-slate-200 dark:border-[#1F7A4D]/30 text-slate-900 dark:text-emerald-300 hover:bg-[#14532D] hover:text-white text-xs font-black transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
                <span>Ask Question</span>
              </button>

              <button
                onClick={() => handleSend({ queryText: 'Please analyze crop disease from uploaded foliage photo.', language })}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 dark:bg-[#091A13]/95 backdrop-blur-md border border-slate-200 dark:border-[#1F7A4D]/30 text-slate-900 dark:text-emerald-300 hover:bg-[#14532D] hover:text-white text-xs font-black transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
                <span>Upload Image</span>
              </button>

              <button
                onClick={() => handleSend({ queryText: 'Voice consultation inquiry regarding irrigation timing.', language })}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 dark:bg-[#091A13]/95 backdrop-blur-md border border-slate-200 dark:border-[#1F7A4D]/30 text-slate-900 dark:text-emerald-300 hover:bg-[#14532D] hover:text-white text-xs font-black transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <Mic className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
                <span>Voice Input</span>
              </button>
            </div>
          </div>

          {/* Top Right: PROMINENT Show/Hide Activity Button & Weather Card */}
          <div className="flex flex-col items-end gap-3 pr-2 sm:pr-4">
            
            <div className="flex items-center gap-2.5">
              {/* Desktop Right Activity Panel Hide/Show Toggle */}
              <button
                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                className="hidden xl:flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#091A13] text-slate-900 dark:text-white border border-slate-300 dark:border-[#1F7A4D]/40 font-black text-xs shadow-lg hover:shadow-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/80 transition-all active:scale-95 cursor-pointer"
                title={isRightPanelOpen ? 'Hide Right Activity Panel' : 'Show Right Activity Panel'}
                aria-label={isRightPanelOpen ? 'Hide Right Activity Panel' : 'Show Right Activity Panel'}
              >
                {isRightPanelOpen ? (
                  <PanelRightClose className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
                ) : (
                  <PanelRightOpen className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
                )}
                <span>{isRightPanelOpen ? 'Hide Activity' : 'Show Activity'}</span>
              </button>

              {/* Mobile Right Drawer Trigger */}
              <button
                onClick={() => setMobileRightOpen(true)}
                className="xl:hidden px-3.5 py-2 rounded-full bg-white dark:bg-[#091A13] text-slate-900 dark:text-white border border-slate-300 font-extrabold text-xs shadow-md flex items-center gap-1.5"
                aria-label="Open activity panel drawer"
              >
                <Activity className="w-4 h-4 text-[#14532D]" />
                <span>Activity</span>
              </button>

              {/* Search Button */}
              <button
                onClick={() => setShowSearchInput(!showSearchInput)}
                className="p-2.5 rounded-full bg-white dark:bg-[#091A13] border border-slate-300 dark:border-[#1F7A4D]/40 text-slate-700 dark:text-slate-200 shadow-md hover:scale-105 transition-transform cursor-pointer"
                title="Search farm logs"
              >
                <Search className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
              </button>
              
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotificationAlert(!showNotificationAlert)}
                  className="p-2.5 rounded-full bg-white dark:bg-[#091A13] border border-slate-300 dark:border-[#1F7A4D]/40 text-slate-700 dark:text-slate-200 shadow-md hover:scale-105 transition-transform cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
                </button>
                <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
              </div>
            </div>

            {/* Expandable Search Input Bar */}
            {showSearchInput && (
              <div className="w-64 p-2 rounded-2xl bg-white/95 dark:bg-[#091A13]/95 backdrop-blur-md border border-slate-200 shadow-xl text-xs flex items-center gap-2">
                <Search className="w-4 h-4 text-[#14532D] ml-1 shrink-0" />
                <input
                  type="text"
                  placeholder="Search farm logs..."
                  className="w-full bg-transparent focus:outline-none font-bold text-xs"
                  onChange={(e) => {
                    const q = e.target.value.toLowerCase();
                    if (!q) {
                      setActivityItems(DEFAULT_ACTIVITY_ITEMS);
                    } else {
                      setActivityItems(DEFAULT_ACTIVITY_ITEMS.filter(item => 
                        item.title.toLowerCase().includes(q) || item.topic.toLowerCase().includes(q)
                      ));
                    }
                  }}
                />
              </div>
            )}

            {/* Notification Alert Popover */}
            {showNotificationAlert && (
              <div className="w-64 p-3 rounded-2xl bg-white/95 dark:bg-[#091A13]/95 backdrop-blur-md border border-slate-200 shadow-xl text-xs space-y-1">
                <div className="font-black text-[#14532D] flex items-center justify-between">
                  <span>Farm Notifications</span>
                  <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setShowNotificationAlert(false)} />
                </div>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  • Optimal drip irrigation timing forecast for tomorrow 6:00 AM.
                </p>
              </div>
            )}

            {/* Weather Card */}
            <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-[#091A13]/95 backdrop-blur-md border border-slate-200 dark:border-[#1F7A4D]/30 shadow-xl text-slate-900 dark:text-white">
              <div className="p-1.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black leading-none">28°C <span className="text-xs font-semibold text-slate-500">Clear Sky</span></div>
                <div className="text-[10px] text-slate-500 font-extrabold mt-0.5">📍 Bengaluru, KA</div>
              </div>
            </div>

          </div>

        </div>

        {/* Center Interactive Telemetry Pins Overlay Layer */}
        <div className="flex-1 relative z-10 w-full min-h-0 pointer-events-auto">
          <FarmCanvas isInteractive={true} onSelectTelemetry={(m) => handleSend({ queryText: `Tell me about ${m.label} on my farm.`, language })} />
        </div>

        {/* Bottom Consultation Console & Category Chips Bar */}
        <div className="relative z-20 max-w-3xl mx-auto w-full p-4 pt-0 space-y-2 shrink-0">
          
          <ChatComposer
            onSend={handleSend}
            isLoading={isLoading}
          />

          {/* Script Watermark Text */}
          <div className="text-center font-['Playfair_Display',serif] italic text-xs font-black text-white drop-shadow-lg">
            "Better Farming Brighter Tomorrow"
          </div>

        </div>

        {/* ACTIVE CONSULTATION STREAM MODAL */}
        {(submittedText || submittedImage) && (
          <div className="fixed inset-0 z-50 p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md flex items-center justify-center overflow-y-auto">
            <div className="w-full max-w-3xl my-auto">
              <ChatInterface
                userMessage={submittedText}
                userImage={submittedImage}
                isLoading={isLoading}
                error={error}
                isUnrelated={isUnrelated}
                unrelatedMessage={unrelatedMessage}
                result={analysisResult}
                onReset={handleNewConsultation}
                onRetry={() => handleSend({ queryText: submittedText, image: submittedImage, language })}
              />
            </div>
          </div>
        )}

      </main>

      {/* ========================================== */}
      {/* 3. RIGHT RECENT FARM ACTIVITY PANEL (Collapsible) */}
      {/* ========================================== */}
      <aside
        className={`hidden xl:flex flex-col shrink-0 bg-white/95 dark:bg-[#091A13]/95 backdrop-blur-xl border-l border-slate-200/80 dark:border-[#1F7A4D]/20 h-full p-5 justify-between overflow-y-auto z-30 relative select-none space-y-4 shadow-xl transition-all duration-300 ease-in-out ${
          isRightPanelOpen ? 'w-80 xl:w-84 opacity-100 translate-x-0' : 'w-0 p-0 border-0 opacity-0 translate-x-full overflow-hidden'
        }`}
      >
        <div className="space-y-3 min-w-[260px]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              {t('workspace.recentActivity') || 'Recent Farm Activity'}
            </h3>
            <Link
              to="/consultations"
              className="text-[11px] font-black text-[#14532D] dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <span>{t('workspace.viewAll') || 'View All'}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Farm Activity List Items */}
          <div className="space-y-2">
            {activityItems.slice(0, 5).map((item) => {
              const Icon = item.icon || Sprout;
              const isSelected = activeItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectActivity(item)}
                  className={`w-full text-left p-2.5 rounded-2xl transition-all flex items-center gap-3 group border ${
                    isSelected
                      ? 'bg-[#14532D] text-white border-[#14532D] shadow-lg'
                      : 'bg-white dark:bg-[#091A13] border-slate-200/80 dark:border-[#1F7A4D]/15 hover:border-[#14532D] hover:shadow-xs text-slate-800 dark:text-slate-100'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-white/20 text-white' : item.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white group-hover:text-[#14532D]'}`}>
                      {item.title}
                    </div>
                    <div className="flex items-center justify-between text-[10px] mt-0.5 opacity-80">
                      <span className="font-extrabold truncate text-slate-500 dark:text-slate-300">{item.topic}</span>
                      <span className="shrink-0 font-medium text-slate-400">{item.time}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* + New Consultation Primary CTA Button */}
          <button
            onClick={handleNewConsultation}
            className="w-full py-3 px-4 rounded-2xl bg-[#14532D] hover:bg-[#1F7A4D] text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('memory.newConsultation') || '+ New Consultation'}</span>
          </button>
        </div>

        {/* Quick Tips Carousel */}
        <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-slate-900/60 border border-amber-200/80 dark:border-amber-900/30 space-y-1.5 min-w-[260px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-400">
              <Lightbulb className="w-4 h-4 text-amber-600" />
              <span>{t('workspace.quickTips') || 'Quick Tips'}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={prevTip}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Previous Tip"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={nextTip}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Next Tip"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
            "{QUICK_TIPS[tipIndex]}"
          </p>
        </div>

        {/* Featured Learning Section */}
        <div className="p-3 rounded-2xl bg-slate-900 text-white shadow-xl space-y-2 relative overflow-hidden group border border-slate-800 min-w-[260px]">
          <div className="relative h-24 w-full rounded-xl overflow-hidden bg-slate-800">
            <img
              src="https://images.unsplash.com/photo-1592417817098-8f3d6eb1b757?auto=format&fit=crop&w=600&q=80"
              alt="Healthy Soil Healthy Future"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
            
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
              <span className="text-xs font-black text-white leading-tight">
                Healthy Soil<br />Healthy Future
              </span>
              <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 font-medium leading-snug">
            Learn sustainable farming practices with AgriSphere.
          </p>

          <Link
            to="/learn"
            className="text-[11px] font-black text-emerald-400 hover:text-white flex items-center gap-1"
          >
            <span>Explore Learning Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </aside>

      {/* ========================================== */}
      {/* 4. MOBILE DRAWER OVERLAYS (< 1024px) */}
      {/* ========================================== */}

      {/* Mobile Left Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-[#091A13] flex flex-col p-4 justify-between shadow-2xl z-50">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
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

              <nav className="space-y-1">
                <Link to="/" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-black bg-[#14532D] text-white">
                  <HomeIcon className="w-4 h-4" />
                  <span>Home</span>
                </Link>
                <Link to="/assistant" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-[#14532D]/10">
                  <MessageSquare className="w-4 h-4" />
                  <span>Assistant</span>
                </Link>
                <Link to="/dashboard" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-[#14532D]/10">
                  <Activity className="w-4 h-4 text-[#14532D]" />
                  <span>Dashboard</span>
                </Link>
                <Link to="/crops" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-[#14532D]/10">
                  <Grid className="w-4 h-4 text-[#14532D]" />
                  <span>Crops</span>
                </Link>
                <Link to="/consultations" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-[#14532D]/10">
                  <HistoryIcon className="w-4 h-4 text-[#14532D]" />
                  <span>Consultations</span>
                </Link>
                <Link to="/learn" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-[#14532D]/10">
                  <BookOpen className="w-4 h-4 text-[#14532D]" />
                  <span>Learn</span>
                </Link>
              </nav>
            </div>

            <div className="space-y-3 border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between px-3 py-2 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold">
                <Globe className="w-4 h-4 text-[#14532D]" />
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-transparent font-bold text-xs">
                  {supportedLanguages.map(l => (
                    <option key={l.code} value={l.code}>{l.flag} {l.nativeName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Right Drawer */}
      {mobileRightOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileRightOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-80 max-w-[85vw] bg-white dark:bg-[#091A13] flex flex-col p-4 justify-between shadow-2xl z-50 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-[#14532D]">
                <Activity className="w-4 h-4" />
                <span>Recent Farm Activity</span>
              </div>
              <button onClick={() => setMobileRightOpen(false)} className="p-1 rounded-xl text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <button onClick={handleNewConsultation} className="w-full py-3 px-4 rounded-2xl bg-[#14532D] text-white text-xs font-black flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              <span>+ New Consultation</span>
            </button>

            <div className="flex-1 overflow-y-auto space-y-2">
              {activityItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelectActivity(item)}
                  className="w-full text-left p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 text-slate-900 flex items-center gap-3"
                >
                  <div className={`p-2 rounded-xl shrink-0 ${item.iconBg}`}>
                    <Sprout className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black truncate">{item.title}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.time}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
