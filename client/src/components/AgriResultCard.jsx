import React, { useState, useEffect } from 'react';
import { Copy, Check, X, Image as ImageIcon, ExternalLink } from 'lucide-react';

export default function AgriResultCard({ result }) {
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [failedImages, setFailedImages] = useState([]);
  const referenceImages = Array.isArray(result?.referenceImages) ? result.referenceImages : [];

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
        {result?.isFallback && (
          <div role="status" className="mb-2 inline-flex rounded-full bg-amber-100 dark:bg-amber-950/50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            Offline fallback — AI service unavailable
          </div>
        )}
        {renderFormattedContent(displayedText)}
        {isTyping && <span className="w-2 h-4 bg-[#1F7A4D] animate-pulse inline-block rounded-xs ml-1" />}
      </div>

      {result?.referenceImagesRequested && (
        <section className="pt-2 space-y-2" aria-label="Agricultural reference images">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#1F7A4D] dark:text-emerald-400">
            <ImageIcon className="w-3.5 h-3.5" /> Reference images
          </div>
          {referenceImages.length === 0 ? (
            <p className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 text-xs text-slate-600 dark:text-slate-300">
              No reference images were found. Try a crop or disease name, such as “tomato early blight.”
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {referenceImages.map((item, index) => failedImages.includes(index) ? (
                <div key={`${item.title}-${index}`} className="min-h-28 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 flex items-center text-xs text-slate-500">
                  Image unavailable: {item.title}
                </div>
              ) : (
                <button key={`${item.title}-${index}`} type="button" onClick={() => setPreviewImage(item)} className="text-left overflow-hidden rounded-xl border border-[#1F7A4D]/20 bg-slate-50 dark:bg-slate-900/60 hover:ring-2 hover:ring-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <img src={item.url} alt={item.title} loading="lazy" onError={() => setFailedImages((prev) => [...prev, index])} className="w-full h-28 sm:h-32 object-cover" />
                  <span className="block p-2">
                    <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-100">{item.title}</span>
                    <span className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 dark:text-slate-400">{item.source || 'Reference'} <ExternalLink className="w-3 h-3" /></span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

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

      {previewImage && (
        <div role="dialog" aria-modal="true" aria-label={`${previewImage.title} image preview`} className="fixed inset-0 z-[100] bg-black/80 p-4 flex items-center justify-center" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-5xl max-h-[92vh] w-full rounded-2xl bg-white dark:bg-[#091A13] p-3 sm:p-4" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setPreviewImage(null)} aria-label="Close image preview" className="absolute right-5 top-5 z-10 rounded-full bg-black/70 p-2 text-white"><X className="w-5 h-5" /></button>
            <img src={previewImage.url} alt={previewImage.title} className="max-h-[76vh] w-full object-contain rounded-xl" />
            <div className="flex flex-wrap justify-between gap-2 pt-3 text-sm"><strong>{previewImage.title}</strong><a href={previewImage.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1F7A4D]">{previewImage.source || 'Image source'} <ExternalLink className="w-4 h-4" /></a></div>
            {previewImage.attribution && <p className="pt-1 text-xs text-slate-500">{previewImage.attribution}</p>}
            {previewImage.license && <p className="pt-1 text-xs text-slate-500">License: {previewImage.license}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

