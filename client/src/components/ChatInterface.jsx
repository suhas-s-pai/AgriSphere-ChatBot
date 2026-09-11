import React from 'react';
import { Search, RefreshCw, AlertTriangle } from 'lucide-react';
import ResultCard from './ResultCard';
import ScamSniffLogo from './ScamSniffLogo';

export default function ChatInterface({
  userMessage,
  isLoading,
  error,
  isUnrelated,
  unrelatedMessage,
  result,
  onReset,
  onRetry
}) {
  if (!userMessage && !isLoading && !result && !error) return null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-6 transition-all duration-300">

      {/* 1. User Submitted Message Bubble (Right Aligned) */}
      <div className="flex justify-end">
        <div className="max-w-xl p-4 rounded-2xl rounded-tr-none bg-emerald-600 text-white font-medium text-sm shadow-md">
          <p className="whitespace-pre-wrap leading-relaxed">{userMessage}</p>
        </div>
      </div>

      {/* 2. Loading State (Animated Sniffing Indicator) */}
      {isLoading && (
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-md shadow-emerald-600/30 animate-bounce">
            <ScamSniffLogo className="w-full h-full" />
          </div>
          <div className="p-4 rounded-2xl rounded-tl-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex items-center gap-3">
            <Search className="w-5 h-5 text-emerald-500 animate-spin" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                ScamSniff is sniffing for red flags…
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Running rule engine, link checks, and sensitive data redaction...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Error State */}
      {error && !isLoading && (
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="p-5 rounded-2xl rounded-tl-none bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 space-y-3 max-w-xl">
            <p className="text-sm font-bold">
              Something went wrong while analyzing this content.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {error}
            </p>
            <button
              onClick={onRetry}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Unrelated Query Redirection Response */}
      {isUnrelated && !isLoading && (
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-md">
            <ScamSniffLogo className="w-full h-full" />
          </div>
          <div className="p-5 rounded-2xl rounded-tl-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md max-w-xl space-y-3">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
              <span>👀 Specialized Focus Notice</span>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
              {unrelatedMessage || "I'm built specifically to sniff out scams. Paste the message, link, offer, or payment request you're concerned about and I'll check it."}
            </p>
            <button
              onClick={onReset}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-colors"
            >
              Paste Suspicious Content
            </button>
          </div>
        </div>
      )}

      {/* 5. Analysis Result Output Card */}
      {result && !isLoading && !isUnrelated && (
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-md shadow-emerald-600/30">
            <ScamSniffLogo className="w-full h-full" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
              <span>🐽 Hmm… here is what ScamSniff detected 👀</span>
            </p>
            <ResultCard result={result} onReset={onReset} />
          </div>
        </div>
      )}

    </div>
  );
}
