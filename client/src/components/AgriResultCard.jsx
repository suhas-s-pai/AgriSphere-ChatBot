import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Sparkles, HelpCircle, FlaskConical, Droplets, ShieldAlert, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getCategoryBadge } from '../utils/formatters';
import { submitFeedback } from '../services/api';

export default function AgriResultCard({ result, onReset }) {
  const { t } = useLanguage();
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const [showSymptoms, setShowSymptoms] = useState(false);
  const [showCauses, setShowCauses] = useState(false);
  const [showActions, setShowActions] = useState(true);
  const [showPrevention, setShowPrevention] = useState(false);

  // Progressive response text rendering effect
  const [displayedAssessment, setDisplayedAssessment] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const fullAssessment = result?.assessment || 'Agricultural guidance';

  useEffect(() => {
    if (!fullAssessment) return;
    setDisplayedAssessment('');
    setIsTyping(true);

    let idx = 0;
    const speed = Math.max(12, Math.floor(600 / fullAssessment.length));
    const interval = setInterval(() => {
      idx++;
      setDisplayedAssessment(fullAssessment.slice(0, idx));
      if (idx >= fullAssessment.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [fullAssessment]);

  if (!result) return null;

  const {
    consultationId,
    scanId,
    category = 'General Agriculture',
    crop = 'General Crop',
    confidence = 85,
    symptoms = [],
    possibleCauses = [],
    recommendedActions = [],
    prevention = []
  } = result;

  const targetId = consultationId || scanId;
  const badge = getCategoryBadge(category);

  const handleFeedback = async (isHelpful) => {
    if (feedbackSent || feedbackLoading || !targetId) return;
    setFeedbackLoading(true);
    await submitFeedback(targetId, isHelpful);
    setFeedbackLoading(false);
    setFeedbackSent(true);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 text-left transition-all duration-300">
      
      {/* 1. Primary Advisory Card Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#091A13] border border-[#1F7A4D]/25 shadow-2xl space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${badge.bg}`}>
              {badge.dot} {category}
            </span>
            <span className="px-3 py-1 rounded-full bg-[#1F7A4D]/10 text-[#14532D] dark:text-emerald-300 text-[11px] font-extrabold border border-[#1F7A4D]/20">
              🌱 {crop}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-black text-[#1F7A4D] dark:text-emerald-400 bg-[#1F7A4D]/10 px-3 py-1 rounded-full border border-[#1F7A4D]/20">
              {confidence}% {t('result.confidence') || 'Match Confidence'}
            </div>
            {onReset && (
              <button
                onClick={onReset}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
                title="Close report"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <h3 className="text-lg sm:text-xl font-black text-[#14532D] dark:text-white tracking-tight leading-snug flex items-center gap-1">
          <span>{displayedAssessment}</span>
          {isTyping && <span className="w-2 h-5 bg-[#1F7A4D] animate-pulse inline-block rounded-xs" />}
        </h3>
      </div>

      {/* 2. Structured Information Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Soil & Nutrients */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#091A13] border border-[#1F7A4D]/20 shadow-sm space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-black text-[#1F7A4D] dark:text-emerald-400 uppercase tracking-wider">
            <FlaskConical className="w-4 h-4 text-[#1F7A4D]" />
            <span>{t('result.nutrients') || 'Soil & Nutrients'}</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
            Apply balanced NPK nutrients based on growth phase. Incorporate well-decomposed organic compost.
          </p>
        </div>

        {/* Irrigation & Moisture */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#091A13] border border-[#1F7A4D]/20 shadow-sm space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-black text-sky-700 dark:text-sky-400 uppercase tracking-wider">
            <Droplets className="w-4 h-4 text-sky-600" />
            <span>{t('farmOverlay.water') || 'Irrigation & Water'}</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
            Maintain optimal root zone saturation. Operate drip systems during early morning to minimize loss.
          </p>
        </div>
      </div>

      {/* 3. Recommended Actions Section */}
      {recommendedActions.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-[#091A13] border border-[#1F7A4D]/20 shadow-md overflow-hidden transition-all">
          <button
            onClick={() => setShowActions(!showActions)}
            className="w-full p-4 flex items-center justify-between text-xs font-black text-[#14532D] dark:text-emerald-300 hover:bg-[#1F7A4D]/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1F7A4D]" />
              <span>{t('result.actions') || 'Recommended Farming Actions'} ({recommendedActions.length})</span>
            </div>
            {showActions ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showActions && (
            <div className="p-4 pt-0 space-y-2 border-t border-[#1F7A4D]/10">
              {recommendedActions.map((act, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#F6F3E8] dark:bg-slate-900 border border-[#1F7A4D]/15 text-xs font-bold text-slate-800 dark:text-slate-100 flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#1F7A4D] shrink-0 mt-0.5" />
                  <span>{act}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Symptoms Accordion */}
      {symptoms.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-[#091A13] border border-[#1F7A4D]/20 shadow-sm overflow-hidden transition-all">
          <button
            onClick={() => setShowSymptoms(!showSymptoms)}
            className="w-full p-4 flex items-center justify-between text-xs font-black text-[#14532D] dark:text-emerald-300 hover:bg-[#1F7A4D]/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#1F7A4D]" />
              <span>{t('result.symptoms') || 'Observed Symptoms'} ({symptoms.length})</span>
            </div>
            {showSymptoms ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showSymptoms && (
            <div className="p-4 pt-0 space-y-1.5 border-t border-[#1F7A4D]/10 text-xs text-slate-700 dark:text-slate-300 font-semibold">
              {symptoms.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 py-0.5">
                  <span className="text-[#1F7A4D] font-bold">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Possible Causes Accordion */}
      {possibleCauses.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-[#091A13] border border-[#1F7A4D]/20 shadow-sm overflow-hidden transition-all">
          <button
            onClick={() => setShowCauses(!showCauses)}
            className="w-full p-4 flex items-center justify-between text-xs font-black text-[#14532D] dark:text-emerald-300 hover:bg-[#1F7A4D]/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>{t('result.causes') || 'Possible Causes'} ({possibleCauses.length})</span>
            </div>
            {showCauses ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showCauses && (
            <div className="p-4 pt-0 space-y-1.5 border-t border-[#1F7A4D]/10 text-xs text-slate-700 dark:text-slate-300 font-semibold">
              {possibleCauses.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 py-0.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Prevention Accordion */}
      {prevention.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-[#091A13] border border-[#1F7A4D]/20 shadow-sm overflow-hidden transition-all">
          <button
            onClick={() => setShowPrevention(!showPrevention)}
            className="w-full p-4 flex items-center justify-between text-xs font-black text-[#14532D] dark:text-emerald-300 hover:bg-[#1F7A4D]/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1F7A4D]" />
              <span>{t('result.prevention') || 'Long-term Prevention'} ({prevention.length})</span>
            </div>
            {showPrevention ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showPrevention && (
            <div className="p-4 pt-0 space-y-1.5 border-t border-[#1F7A4D]/10 text-xs text-slate-700 dark:text-slate-300 font-semibold">
              {prevention.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 py-0.5">
                  <span className="text-[#1F7A4D] font-bold">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. Feedback & Action Bar */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#091A13] border border-[#1F7A4D]/20 flex items-center justify-between gap-2 text-xs flex-wrap shadow-md">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
            {t('result.helpful') || 'Was this guidance helpful?'}
          </span>
          {feedbackSent ? (
            <span className="font-black text-[#1F7A4D] dark:text-emerald-400 text-xs">
              {t('result.thanks') || '✓ Thank you for your feedback!'}
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleFeedback(true)}
                disabled={feedbackLoading}
                className="px-3 py-1 rounded-xl bg-[#1F7A4D]/10 hover:bg-[#1F7A4D]/20 text-[#14532D] dark:text-emerald-300 font-extrabold text-xs flex items-center gap-1 transition-colors"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{t('result.yes') || 'Yes'}</span>
              </button>
              <button
                onClick={() => handleFeedback(false)}
                disabled={feedbackLoading}
                className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-extrabold text-xs flex items-center gap-1 transition-colors"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>{t('result.no') || 'No'}</span>
              </button>
            </div>
          )}
        </div>

        {onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-xl bg-[#1F7A4D] hover:bg-[#14532D] text-white font-black text-xs transition-all shadow-md active:scale-95"
          >
            {t('result.askAnother') || 'Start New Consultation'}
          </button>
        )}
      </div>

    </div>
  );
}
