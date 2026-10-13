import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Sprout,
  MessageSquare,
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
import LocationSelectorDropdown from '../components/LocationSelectorDropdown';
import { getInitialSidebarState } from '../utils/workspaceLayout';
import {
  analyzeContent,
  getHistory,
  clearHistoryApi,
  deleteConversationApi
} from '../services/api';
import {
  generateConversationId,
  getStoredConversations,
  saveStoredConversations,
  getStoredActiveConversationId,
  setStoredActiveConversationId,
  updateOrAddStoredConversation,
  deleteStoredConversation,
  clearAllStoredConversations
} from '../services/conversationStorage';

export default function AssistantWorkspace() {
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Central Location State
  const {
    location: userLocation,
    loading: locationLoading,
    error: locationError,
    permissionDenied,
    requestLocation,
    refreshLocation
  } = useLocationContext();

  // Desktop left sidebar toggle state: open by default only on desktop screens (> 767px)
  const [isLeftNavOpen, setIsLeftNavOpen] = useState(() =>
    typeof window !== 'undefined' ? getInitialSidebarState(window.innerWidth).desktopSidebarOpen : false
  );

  // Mobile navigation drawer state: ALWAYS starts closed on initial load and refresh
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Auto-close desktop nav when resized or rotated to mobile width (<= 767px)
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth <= 767) {
        setIsLeftNavOpen(false);
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Home Mode vs Chat Mode state: strictly tied to current route
  // '/assistant' -> Chat Mode (true); '/' or '/home' -> Farm Home Mode (false)
  const [isChatMode, setIsChatMode] = useState(() => location.pathname === '/assistant');

  // Multi-conversation state
  const [conversations, setConversations] = useState(() => getStoredConversations());
  const [activeConversationId, setActiveConversationId] = useState(() => getStoredActiveConversationId());
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ref to track the current active conversation ID to prevent stale responses from leaking into new chats
  const activeConversationIdRef = useRef(activeConversationId);
  activeConversationIdRef.current = activeConversationId;

  const messagesEndRef = useRef(null);

  // Keep isChatMode synchronized with the URL route (supports direct URL, browser back/forward, and refresh)
  useEffect(() => {
    if (location.pathname === '/assistant') {
      setIsChatMode(true);
    } else if (location.pathname === '/' || location.pathname === '/home') {
      setIsChatMode(false);
    }
  }, [location.pathname]);

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

  // Sync active conversation messages on mount or conversation switch
  // NOTE: Does NOT force isChatMode = true so that refreshing on '/' or '/home' stays in Farm Home mode
  useEffect(() => {
    if (activeConversationId) {
      const activeConv = conversations.find(c => c.id === activeConversationId);
      if (activeConv && Array.isArray(activeConv.messages) && activeConv.messages.length > 0) {
        setMessages(activeConv.messages);
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [activeConversationId, conversations]);

  // Initial load: Fetch backend history and merge if local conversations are empty
  useEffect(() => {
    async function syncBackendHistory() {
      const stored = getStoredConversations();
      if (stored.length > 0) return;

      try {
        const data = await getHistory();
        if (data.success && (data.consultations?.length || data.scans?.length)) {
          const items = data.consultations || data.scans || [];
          if (items.length === 0) return;

          const initialConvs = items.map((item, index) => {
            const convId = item.conversationId || `conv_sync_${item._id || index}`;
            const userMsg = {
              id: `usr-sync-${item._id || index}`,
              role: 'user',
              content: item.queryText || item.crop || 'Farm Consultation',
              timestamp: item.createdAt || new Date().toISOString()
            };
            const astMsg = {
              id: `ast-sync-${item._id || index}`,
              role: 'assistant',
              content: item.assessment || item.message,
              result: item,
              timestamp: item.createdAt || new Date().toISOString()
            };
            return {
              id: convId,
              title: item.assessment?.slice(0, 36) || item.crop || 'Farm Consultation',
              topic: item.category || 'General Agriculture',
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.createdAt || new Date().toISOString(),
              messages: [userMsg, astMsg]
            };
          });

          setConversations(initialConvs);
          saveStoredConversations(initialConvs);
        }
      } catch (err) {
        console.warn('Backend history sync warning:', err.message);
      }
    }
    syncBackendHistory();
  }, []);

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

  // Switch to a selected conversation
  const handleSelectConversation = (conv) => {
    setActiveConversationId(conv.id);
    setStoredActiveConversationId(conv.id);
    setMessages(conv.messages || []);
    setError(null);
    setIsChatMode(true);
    setMobileNavOpen(false);
    if (location.pathname !== '/assistant') {
      navigate('/assistant');
    }
  };

  // Start a fresh, completely independent new chat
  const handleNewChat = () => {
    const newId = generateConversationId();
    const newConv = {
      id: newId,
      title: 'New Conversation',
      topic: 'General Agriculture',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };

    const updatedConvs = [newConv, ...conversations.filter(c => c.id !== newId)];
    setConversations(updatedConvs);
    saveStoredConversations(updatedConvs);

    setActiveConversationId(newId);
    activeConversationIdRef.current = newId;
    setStoredActiveConversationId(newId);

    setMessages([]);
    setError(null);
    setIsChatMode(true);
    setMobileNavOpen(false);
    if (location.pathname !== '/assistant') {
      navigate('/assistant');
    }
  };

  // Return to Farm Home mode cleanly and navigate to '/'
  const handleBackToFarm = () => {
    setIsChatMode(false);
    setMobileNavOpen(false);
    navigate('/');
  };

  // Permanent Delete for the CURRENT active conversation
  const handleClearChat = async () => {
    const convIdToDelete = activeConversationId;
    if (!convIdToDelete) {
      setMessages([]);
      setIsChatMode(false);
      navigate('/');
      return;
    }

    try {
      // 1. Delete on backend
      await deleteConversationApi(convIdToDelete);

      // 2. Delete permanently from local persistence
      const remainingConvs = deleteStoredConversation(convIdToDelete);
      setConversations(remainingConvs);

      // 3. Reset UI state immediately
      setActiveConversationId(null);
      activeConversationIdRef.current = null;
      setMessages([]);
      setError(null);
      setIsChatMode(false);
      setMobileNavOpen(false);
      navigate('/');
    } catch (err) {
      console.error('Clear chat error:', err);
      setError('Failed to permanently delete this chat. Please try again.');
    }
  };

  // Permanent Delete for ALL conversations and history
  const handleClearAllHistory = async () => {
    try {
      // 1. Delete on backend
      await clearHistoryApi();

      // 2. Clear all local storage records
      clearAllStoredConversations();

      // 3. Update React state immediately
      setConversations([]);
      setActiveConversationId(null);
      activeConversationIdRef.current = null;
      setMessages([]);
      setError(null);
      setIsChatMode(false);
      setMobileNavOpen(false);
      navigate('/');
    } catch (err) {
      console.error('Clear all history error:', err);
      setError('Failed to permanently clear history. Please try again.');
    }
  };

  const handleSend = async ({ queryText, image, language: overrideLang }) => {
    if (!queryText && !image) return;

    // Ensure we have a valid unique conversation ID for this chat
    let targetConvId = activeConversationId;
    if (!targetConvId) {
      targetConvId = generateConversationId();
      setActiveConversationId(targetConvId);
      activeConversationIdRef.current = targetConvId;
      setStoredActiveConversationId(targetConvId);
    }

    const currentLang = overrideLang || language;
    const userMsgId = `usr-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      role: 'user',
      content: queryText,
      image,
      timestamp: new Date().toISOString()
    };

    // Update messages only if user is still viewing this conversation
    if (activeConversationIdRef.current === targetConvId) {
      setMessages(prev => [...prev, userMsg]);
    }

    // Persist user message in conversation store immediately
    const existingConv = conversations.find(c => c.id === targetConvId);
    const convTitle = existingConv && existingConv.title !== 'New Conversation'
      ? existingConv.title
      : (queryText ? queryText.slice(0, 36) + (queryText.length > 36 ? '...' : '') : 'Crop Image Analysis');

    const updatedUserConv = {
      id: targetConvId,
      title: convTitle,
      topic: existingConv?.topic || 'General Agriculture',
      createdAt: existingConv?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [...(existingConv?.messages || []), userMsg]
    };

    const newConvsWithUser = updateOrAddStoredConversation(updatedUserConv);
    setConversations(newConvsWithUser);

    setIsLoading(true);
    setError(null);
    setIsChatMode(true);
    if (location.pathname !== '/assistant') {
      navigate('/assistant');
    }

    try {
      // Send ONLY active conversation's message history to Gemini
      const activeConvHistory = (existingConv?.messages || []).slice(-6).map(m => ({
        role: m.role,
        message: m.content || m.result?.message || m.result?.assessment || ''
      }));

      const data = await analyzeContent({
        queryText,
        image,
        language: currentLang,
        history: activeConvHistory,
        location: userLocation,
        conversationId: targetConvId
      });

      if (data.success) {
        let astMsg;
        let topicCategory = 'General Agriculture';

        if (data.isUnrelated) {
          astMsg = {
            id: `ast-${Date.now()}`,
            role: 'assistant',
            isUnrelated: true,
            unrelatedMessage: data.message || t('chat.guardrailDefault'),
            timestamp: new Date().toISOString()
          };
          topicCategory = 'Domain Notice';
        } else {
          const aiMessage = data.message || data.result?.message || data.result?.assessment || 'Agricultural guidance completed.';
          const resObj = {
            consultationId: data.consultationId || data.result?.consultationId || `agri-${Date.now()}`,
            conversationId: targetConvId,
            message: aiMessage,
            assessment: aiMessage,
            title: data.title || data.result?.title || data.crop || data.result?.crop || 'Agricultural Advisory',
            category: data.category || data.result?.category || 'General Agriculture',
            crop: data.crop || data.result?.crop || null,
            source: data.source || data.result?.source || 'GEMINI',
            isFallback: Boolean(data.isFallback || data.result?.isFallback),
            referenceImages: data.referenceImages || data.result?.referenceImages || [],
            referenceImagesRequested: Boolean(data.referenceImagesRequested || data.result?.referenceImagesRequested)
          };

          astMsg = {
            id: `ast-${Date.now()}`,
            role: 'assistant',
            content: aiMessage,
            result: resObj,
            timestamp: new Date().toISOString()
          };
          topicCategory = resObj.category;
        }

        // Prevent delayed responses from an old conversation from appearing in a new chat
        if (activeConversationIdRef.current === targetConvId) {
          setMessages(prev => [...prev, astMsg]);
        }

        // Always persist assistant message into the target conversation in storage
        const currentConvState = getStoredConversations().find(c => c.id === targetConvId);
        const finalConv = {
          id: targetConvId,
          title: convTitle,
          topic: topicCategory,
          createdAt: currentConvState?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [...(currentConvState?.messages || [userMsg]), astMsg]
        };

        const finalConvs = updateOrAddStoredConversation(finalConv);
        setConversations(finalConvs);
        return true;
      } else {
        setError(data.error || 'Failed to complete agricultural analysis.');
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
      
      {/* Full-bleed Background Landscape Image spanning the ENTIRE viewport */}
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
        className={`hidden md:flex flex-col shrink-0 bg-white/30 dark:bg-[#07130e]/40 backdrop-blur-2xl border-r border-white/30 dark:border-[#1F7A4D]/30 h-full z-20 relative shadow-2xl transition-all duration-300 ease-in-out ${
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

          {/* RECENT CHAT HISTORY (Independent Conversation Switcher) */}
          <div className="space-y-2 shrink-0">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {t('workspace.recent') || 'Recent'}
              </h3>
              {conversations.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  className="inline-flex items-center gap-1 text-[10px] font-black text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
                  title="Permanently clear all conversation history"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-[42vh] overflow-y-auto no-scrollbar">
              {conversations.slice(0, 8).map((conv) => {
                const isSelected = activeConversationId === conv.id;
                const Icon = conv.topic === 'Plant Disease' ? Bug : conv.topic === 'Irrigation Guidance' ? Droplets : conv.topic === 'Fertilizers & Soil' ? FlaskConical : Sprout;
                const formattedTime = conv.updatedAt ? new Date(conv.updatedAt).toLocaleDateString() : 'Recent';

                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left p-2 rounded-2xl transition-all flex items-center gap-2.5 group border cursor-pointer ${
                      isSelected
                        ? 'bg-[#14532D] text-white border-[#14532D] shadow-md'
                        : 'bg-white/40 dark:bg-black/35 backdrop-blur-md border-white/40 dark:border-[#1F7A4D]/25 hover:bg-white/60 dark:hover:bg-black/55 text-slate-900 dark:text-slate-100 shadow-xs'
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white group-hover:text-[#14532D]'}`}>
                        {conv.title || 'Conversation'}
                      </div>
                      <div className="text-[10px] mt-0.5 opacity-80 text-slate-600 dark:text-slate-400 font-semibold truncate">
                        {formattedTime} • {conv.topic || 'Farming'}
                      </div>
                    </div>
                  </button>
                );
              })}

              {conversations.length === 0 && (
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
            onClick={handleNewChat}
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
                      <span className="text-amber-600 dark:text-amber-400">Location unavailable</span>
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
      <main className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden transition-all duration-300">
        
        {/* Floating Top Header Bar: Hide/Reveal Toggle + Location & Weather Card */}
        <div className={`relative ${mobileNavOpen ? 'z-[60]' : 'z-30'} flex items-center justify-between gap-2 px-2 sm:px-8 py-3 shrink-0 min-w-0`}>
          
          {/* Left Controls: Hide/Reveal Sidebar & Mobile Drawer Buttons */}
          <div className="flex items-center gap-2">
            {/* Desktop Hide/Reveal Sidebar Toggle */}
            <button
              type="button"
              onClick={() => setIsLeftNavOpen(prev => !prev)}
              className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/75 dark:bg-[#091A13]/75 backdrop-blur-xl border border-slate-200/80 dark:border-[#1F7A4D]/30 text-slate-800 dark:text-white text-xs font-black shadow-md hover:bg-emerald-50 dark:hover:bg-emerald-950/80 transition-all cursor-pointer shrink-0"
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
              className={`md:hidden flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/75 dark:bg-[#091A13]/75 backdrop-blur-xl border border-slate-200/80 dark:border-[#1F7A4D]/30 text-slate-800 dark:text-white text-xs font-black shadow-md hover:bg-emerald-50 dark:hover:bg-emerald-950/80 transition-all cursor-pointer shrink-0 ${mobileNavOpen ? 'relative z-[60]' : ''}`}
              aria-label="Open mobile navigation menu"
            >
              <Menu className="w-4 h-4 text-[#14532D] dark:text-emerald-400" />
              <span>Menu</span>
            </button>
          </div>

          {/* Right Controls: Interactive Real Location & Weather Card */}
          <div className="flex items-center justify-end gap-1 min-w-0 max-w-[62%]">
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
                  onClick={handleBackToFarm}
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
                        {userLocation?.temp != null ? <span>| {userLocation.temp}°C</span> : userLocation?.weatherUnavailable && <span>| Weather unavailable</span>}
                      </div>
                    )}
                  </div>
                </div>

                {messages.length > 0 && (
                  <button
                    onClick={handleClearChat}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-extrabold transition-all cursor-pointer border border-red-500/30"
                    title="Clear current active conversation permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('workspace.clearChat') || 'Clear Chat'}</span>
                  </button>
                )}
              </div>

              {/* Scrollable Message Thread Stream */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                <ErrorBoundary onReset={handleNewChat}>
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
      {/* 3. MOBILE NAVIGATION DRAWER (Exact mirror of Desktop Sidebar) */}
      {/* ============================================================ */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white/95 dark:bg-[#07130e]/95 backdrop-blur-2xl border-r border-white/30 dark:border-[#1F7A4D]/30 flex flex-col p-4 sm:p-5 justify-between shadow-2xl z-50 overflow-y-auto space-y-4">
            
            <div className="flex flex-col h-full min-w-[240px] space-y-4">

              {/* Brand Identity + Close Button */}
              <div className="flex items-center justify-between shrink-0">
                <Link
                  to="/welcome"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-3 px-1 group"
                  title="Return to AgriSphere Welcome Experience"
                >
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

                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                  aria-label="Close mobile navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <hr className="border-slate-200 dark:border-[#1F7A4D]/30 my-1 shrink-0" />

              {/* RECENT CHAT HISTORY (Independent Conversation Switcher) */}
              <div className="space-y-2 shrink-0">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {t('workspace.recent') || 'Recent'}
                  </h3>
                  {conversations.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClearAllHistory();
                        setMobileNavOpen(false);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-black text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
                      title="Permanently clear all conversation history"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-[38vh] overflow-y-auto no-scrollbar">
                  {conversations.slice(0, 8).map((conv) => {
                    const isSelected = activeConversationId === conv.id;
                    const Icon = conv.topic === 'Plant Disease' ? Bug : conv.topic === 'Irrigation Guidance' ? Droplets : conv.topic === 'Fertilizers & Soil' ? FlaskConical : Sprout;
                    const formattedTime = conv.updatedAt ? new Date(conv.updatedAt).toLocaleDateString() : 'Recent';

                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className={`w-full text-left p-2 rounded-2xl transition-all flex items-center gap-2.5 group border cursor-pointer ${
                          isSelected
                            ? 'bg-[#14532D] text-white border-[#14532D] shadow-md'
                            : 'bg-white/60 dark:bg-black/35 backdrop-blur-md border-slate-200 dark:border-[#1F7A4D]/25 hover:bg-white dark:hover:bg-black/55 text-slate-900 dark:text-slate-100 shadow-xs'
                        }`}
                      >
                        <div className={`p-1.5 rounded-xl shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white group-hover:text-[#14532D]'}`}>
                            {conv.title || 'Conversation'}
                          </div>
                          <div className="text-[10px] mt-0.5 opacity-80 text-slate-600 dark:text-slate-400 font-semibold truncate">
                            {formattedTime} • {conv.topic || 'Farming'}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {conversations.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-[#1F7A4D]/30 bg-white/40 dark:bg-black/20 px-3 py-4 text-center">
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
                onClick={handleNewChat}
                className="w-full py-2.5 px-3 rounded-2xl bg-[#14532D] hover:bg-[#1F7A4D] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-98 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{t('workspace.newChat') || '+ New Chat'}</span>
              </button>

              {/* Language + Theme + Farmer Profile */}
              <div className="mt-auto pt-3 space-y-2 border-t border-slate-200 dark:border-[#1F7A4D]/30">
                <div className="flex items-center justify-between px-3 py-2 rounded-2xl border border-slate-200 dark:border-[#1F7A4D]/30 bg-white/60 dark:bg-black/35 backdrop-blur-md text-xs font-bold text-slate-900 dark:text-slate-100 shadow-xs">
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
                  <button onClick={toggleTheme} className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer shrink-0" title="Toggle theme">
                    {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
                  </button>
                </div>

                <div className="p-2.5 rounded-2xl border border-slate-200 dark:border-[#1F7A4D]/30 bg-white/60 dark:bg-black/35 backdrop-blur-md flex items-center justify-between shadow-xs">
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
                          <span className="text-amber-600 dark:text-amber-400">Location unavailable</span>
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
