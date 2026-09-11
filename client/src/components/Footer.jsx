import React from 'react';
import { Lock, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import ScamSniffLogo from './ScamSniffLogo';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-[#070d1e] text-slate-600 dark:text-slate-400 py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden shadow-md">
                <ScamSniffLogo className="w-full h-full" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                SCAM<span className="text-emerald-600 dark:text-emerald-400">SNIFF</span>
              </span>
            </div>
            
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              "Sniff Out Scams Before They Sniff You."
            </p>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              Don't trust suspicious online content blindly. Let ScamSniff run hybrid rule indicators and AI risk scoring to protect your credentials and money.
            </p>

            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <Lock className="w-4 h-4" />
              <span>Automatic Sensitive Data Redaction Enabled</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Quick Navigation</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li><Link to="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Analyzer Engine</Link></li>
              <li><Link to="/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Analytics Dashboard</Link></li>
              <li><Link to="/history" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Scan History</Link></li>
              <li><Link to="/learn" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Scam Education Hub</Link></li>
              <li><Link to="/categories" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Scam Categories Catalog</Link></li>
            </ul>
          </div>

          {/* Disclaimer & Project Info */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Legal & Safety</h4>
            <div className="p-3 rounded-xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300/60 dark:border-slate-800 text-[11px] leading-relaxed space-y-2">
              <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Disclaimer</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                ScamSniff provides automated risk assessment based on provided text and URL patterns. It is not a legal authority or absolute guarantee.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800/80 text-center text-xs text-slate-500">
          <p>© 2026 ScamSniff Platform. Designed for Students & General Internet Safety.</p>
        </div>
      </div>
    </footer>
  );
}
