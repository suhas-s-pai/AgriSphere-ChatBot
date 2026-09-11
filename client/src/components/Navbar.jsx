import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Menu, X, Search, Activity, History as HistoryIcon, BookOpen, Grid } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import ScamSniffLogo from './ScamSniffLogo';

export default function Navbar() {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Analyze', path: '/', icon: Search },
    { label: 'Dashboard', path: '/dashboard', icon: Activity },
    { label: 'History', path: '/history', icon: HistoryIcon },
    { label: 'Learn', path: '/learn', icon: BookOpen },
    { label: 'Categories', path: '/categories', icon: Grid },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-[#0b132b]/80 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo & Identity */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-emerald-600/30 group-hover:scale-105 transition-transform">
              <ScamSniffLogo className="w-full h-full" />
            </div>
            <div>
              <div className="flex items-center tracking-tight font-extrabold text-xl leading-none">
                <span className="text-slate-900 dark:text-white">SCAM</span>
                <span className="text-emerald-600 dark:text-emerald-400 ml-1">SNIFF</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                RISK ASSESSMENT PLATFORM
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    active
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions (Theme Switcher & Mobile Menu) */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark/light theme"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b132b] px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
