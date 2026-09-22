import React from 'react';
import { Sprout, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import AgriResultCard from './AgriResultCard';
import AgriSphereLogo from './AgriSphereLogo';

export default function ChatInterface({
  userMessage,
  userImage,
  isLoading,
  error,
  isUnrelated,
  unrelatedMessage,
  result,
  onReset,
  onRetry
}) {
  const { t } = useLanguage();

  if (!userMessage && !userImage && !isLoading && !result && !error && !isUnrelated) return null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 py-2 transition-all duration-300">

      {/* 1. User Message Bubble */}
      <div className="flex justify-end">
        <div className="max-w-xl p-4 rounded-3xl rounded-tr-none bg-[#1F7A4D] text-white font-bold text-xs sm:text-sm shadow-md space-y-2">
          {userImage && (
            <div className="w-48 h-36 rounded-2xl overflow-hidden bg-black/20 border border-white/20">
              <img src={userImage} alt="Crop query upload" className="w-full h-full object-cover" />
            </div>
          )}
          {userMessage && <p className="whitespace-pre-wrap leading-relaxed">{userMessage}</p>}
        </div>
      </div>

      {/* 2. AI Loading State */}
      {isLoading && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 shadow-sm border border-[#1F7A4D]/20">
            <AgriSphereLogo className="w-full h-full" />
          </div>
          <div className="p-4 rounded-3xl rounded-tl-none bg-white border border-[#1F7A4D]/20 shadow-md flex items-center gap-3">
            <Sprout className="w-5 h-5 text-[#1F7A4D] animate-spin" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs sm:text-sm font-black text-[#14532D]">
                  {t('chat.analyzing') || 'AgriSphere is thinking...'}
                </p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F7A4D] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F7A4D] animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F7A4D] animate-bounce" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                {t('chat.evaluating') || 'Evaluating crop health, soil parameters & agricultural guidance...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Error State */}
      {error && !isLoading && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="p-4 rounded-3xl rounded-tl-none bg-red-50 border border-red-200 text-red-900 space-y-2 max-w-xl text-xs font-semibold shadow-md">
            <p className="font-extrabold">{t('chat.errorTitle')}</p>
            <p className="text-[11px] text-slate-700">{error}</p>
            <button
              onClick={onRetry}
              className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs shadow-sm transition-colors hover:bg-red-700"
            >
              {t('chat.tryAgain')}
            </button>
          </div>
        </div>
      )}

      {/* 4. Domain Guardrail Rejection Notice */}
      {isUnrelated && !isLoading && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 shadow-sm border border-[#1F7A4D]/20">
            <AgriSphereLogo className="w-full h-full" />
          </div>
          <div className="p-5 rounded-3xl rounded-tl-none bg-white border border-[#1F7A4D]/20 shadow-lg max-w-xl space-y-3 text-left">
            <div className="flex items-center gap-1.5 text-[#1F7A4D] font-black text-xs uppercase tracking-wider">
              <Sprout className="w-4 h-4" />
              <span>{t('chat.guardrailTitle')}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 font-semibold leading-relaxed">
              {unrelatedMessage || t('chat.guardrailDefault')}
            </p>
            <button
              onClick={onReset}
              className="px-4 py-2 rounded-xl bg-[#1F7A4D] hover:bg-[#14532D] text-white text-xs font-black transition-all shadow-md"
            >
              {t('chat.askAgriQuestion')}
            </button>
          </div>
        </div>
      )}

      {/* 5. Analysis Result Output Card */}
      {result && !isLoading && !isUnrelated && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 shadow-sm border border-[#1F7A4D]/20">
            <AgriSphereLogo className="w-full h-full" />
          </div>
          <div className="flex-1 min-w-0">
            <AgriResultCard result={result} onReset={onReset} />
          </div>
        </div>
      )}

    </div>
  );
}
