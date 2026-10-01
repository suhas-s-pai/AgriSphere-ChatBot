import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

export default function AgriResultCard({ result }) {
  const [copied, setCopied] = useState(false);

  // Extract main response text safely
  const rawMsg = result?.message || result?.assessment || result?.answer;
  const mainMessage = typeof rawMsg === 'string'
    ? rawMsg
    : (rawMsg ? String(rawMsg) : (result ? 'Agricultural guidance completed.' : ''));

  // Progressive typing effect for fresh messages
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!mainMessage) return;
    setDisplayedText('');
    setIsTyping(true);

    let idx = 0;
    const speed = Math.max(4, Math.floor(250 / mainMessage.length));
    const interval = setInterval(() => {
      idx += 2;
      if (idx >= mainMessage.length) {
        setDisplayedText(mainMessage);
        clearInterval(interval);
        setIsTyping(false);
      } else {
        setDisplayedText(mainMessage.slice(0, idx));
      }
    }, speed);

    return () => clearInterval(interval);
  }, [mainMessage]);

  if (!result || !mainMessage) return null;

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(mainMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  const renderInlineBold = (str) => {
    const safeStr = typeof str === 'string' ? str : String(str || '');
    const parts = safeStr.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part && part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-extrabold text-[#14532D] dark:text-emerald-300">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderFormattedContent = (text) => {
    const safeText = typeof text === 'string' ? text : String(text || '');
    if (!safeText) return null;

    const lines = safeText.split('\n');
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-1.5" />;

      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        return (
          <h4 key={i} className="text-sm font-black text-[#14532D] dark:text-emerald-300 mt-2 mb-1">
            {trimmed.replace(/\*\*/g, '')}
          </h4>
        );
      }

      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
        const bulletText = trimmed.replace(/^([\bullet\-\*]|\d+\.)\s*/, '');
        return (
          <div key={i} className="flex items-start gap-2 py-0.5">
            <span className="text-[#1F7A4D] dark:text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
            <span className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
              {renderInlineBold(bulletText)}
            </span>
          </div>
        );
      }

      return (
        <p key={i} className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold leading-relaxed my-1">
          {renderInlineBold(line)}
        </p>
      );
    });
  };

  return (
    <div className="relative group p-4 sm:p-5 rounded-3xl rounded-tl-none bg-white dark:bg-[#091A13] border border-[#1F7A4D]/25 shadow-md space-y-2 max-w-2xl text-left">
      {/* Message Content */}
      <div className="text-xs sm:text-sm space-y-1">
        {renderFormattedContent(displayedText)}
        {isTyping && <span className="w-2 h-4 bg-[#1F7A4D] animate-pulse inline-block rounded-xs ml-1" />}
      </div>

      {/* Subtle Copy Action */}
      <div className="flex justify-end pt-1">
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#1F7A4D] dark:hover:text-emerald-400 cursor-pointer"
          title="Copy response"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}

