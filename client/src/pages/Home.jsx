import React, { useState } from 'react';
import { Search, AlertCircle, RefreshCw } from 'lucide-react';
import QuickActions from '../components/QuickActions';
import DemoPresets from '../components/DemoPresets';
import ChatInterface from '../components/ChatInterface';
import ScamSniffLogo from '../components/ScamSniffLogo';
import { analyzeContent } from '../services/api';

export default function Home() {
  const [inputContent, setInputContent] = useState('');
  const [selectedMode, setSelectedMode] = useState('AUTO');
  const [submittedMessage, setSubmittedMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isUnrelated, setIsUnrelated] = useState(false);
  const [unrelatedMessage, setUnrelatedMessage] = useState('');
  const [error, setError] = useState(null);

  const handleAnalyze = async (overrideContent, overrideMode) => {
    const textToAnalyze = overrideContent !== undefined ? overrideContent : inputContent;
    const modeToUse = overrideMode !== undefined ? overrideMode : selectedMode;

    if (!textToAnalyze || textToAnalyze.trim() === '') return;

    setSubmittedMessage(textToAnalyze);
    setIsLoading(true);
    setError(null);
    setIsUnrelated(false);
    setAnalysisResult(null);

    try {
      const data = await analyzeContent(textToAnalyze, modeToUse);
      if (data.success) {
        if (data.isUnrelated) {
          setIsUnrelated(true);
          setUnrelatedMessage(data.message);
        } else {
          setAnalysisResult(data.result);
        }
      } else {
        setError(data.error || 'Failed to complete analysis.');
      }
    } catch (err) {
      setError(err.message || 'Server connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetSelect = (text, mode) => {
    setInputContent(text);
    setSelectedMode(mode);
    handleAnalyze(text, mode);
  };

  const handleReset = () => {
    setInputContent('');
    setSubmittedMessage('');
    setAnalysisResult(null);
    setIsUnrelated(false);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-16">
      
      {/* Hero Section */}
      <section className="relative pt-10 pb-8 max-w-4xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-4 shadow-sm">
          <ScamSniffLogo className="w-4 h-4" />
          <span>AI-POWERED SCAM & RISK DETECTION ENGINE</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-3">
          Got something <span className="text-emerald-600 dark:text-emerald-400">suspicious?</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium max-w-2xl mx-auto">
          Paste it here. ScamSniff will sniff out the red flags.
        </p>

        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">
          "Don't trust it blindly. Let ScamSniff check it first."
        </p>
      </section>

      {/* Main Analyzer Input Container */}
      <section className="max-w-4xl mx-auto px-4">
        {!submittedMessage ? (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 transition-all">
            
            {/* Sensitive Data Warning Notice (Section 12) */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                ⚠️ Don't paste passwords, OTPs, PINs, card numbers, or banking credentials. Redact sensitive information before analyzing.
              </span>
            </div>

            {/* Input Textarea */}
            <div className="relative">
              <textarea
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder="Paste a message, email, link, or offer here…"
                rows={5}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm leading-relaxed transition-all resize-y"
              />
              {inputContent && (
                <button
                  onClick={() => setInputContent('')}
                  className="absolute top-3 right-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-lg"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Actions (Category selector) */}
            <QuickActions selectedMode={selectedMode} onSelectMode={setSelectedMode} />

            {/* Primary Action Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Mode: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedMode}</span>
              </div>

              <button
                onClick={() => handleAnalyze()}
                disabled={!inputContent.trim() || isLoading}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-base flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
              >
                <Search className="w-5 h-5" />
                <span>Analyze with ScamSniff</span>
              </button>
            </div>

            {/* Demo Presets Bar */}
            <DemoPresets onSelectPreset={handlePresetSelect} />

          </div>
        ) : (
          /* Live Chat & Results View */
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                Live Scan Stream
              </span>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Analysis</span>
              </button>
            </div>

            <ChatInterface
              userMessage={submittedMessage}
              isLoading={isLoading}
              error={error}
              isUnrelated={isUnrelated}
              unrelatedMessage={unrelatedMessage}
              result={analysisResult}
              onReset={handleReset}
              onRetry={() => handleAnalyze(submittedMessage, selectedMode)}
            />
          </div>
        )}
      </section>

    </div>
  );
}
