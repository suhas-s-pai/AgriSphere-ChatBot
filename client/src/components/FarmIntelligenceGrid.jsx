import React from 'react';
import {
  Sprout,
  FlaskConical,
  Droplets,
  Sun,
  Bug,
  Compass,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function FarmIntelligenceGrid({ onSelectTopic, onStartConsultation }) {
  const { t } = useLanguage();

  const gridCards = [
    {
      id: 'crop-health',
      title: t('intelligence.cropHealth') || 'Crop Health & Disease',
      desc: t('intelligence.cropHealthDesc') || 'Identify leaf spots, blights, and nutrient deficits from plant symptoms.',
      query: 'How do I identify crop diseases and leaf yellowing on my farm?',
      icon: Sprout,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    },
    {
      id: 'soil-health',
      title: t('intelligence.soilHealth') || 'Soil & Fertigation',
      desc: t('intelligence.soilHealthDesc') || 'pH balancing, NPK dosage calculation, and organic compost schedules.',
      query: 'What fertilizer schedule and soil pH level is best for my soil?',
      icon: FlaskConical,
      color: 'from-amber-500/20 to-yellow-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    },
    {
      id: 'irrigation',
      title: t('intelligence.irrigation') || 'Smart Irrigation',
      desc: t('intelligence.irrigationDesc') || 'Drip watering schedules, moisture management, and drought resilience.',
      query: 'What is the optimal drip irrigation schedule for my crop growth stage?',
      icon: Droplets,
      color: 'from-blue-500/20 to-cyan-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
    },
    {
      id: 'weather',
      title: t('intelligence.weather') || 'Hyperlocal Weather',
      desc: t('intelligence.weatherDesc') || 'Microclimate advisories, rain alerts, and optimal spraying windows.',
      query: 'How does the current weather in my location affect crop planting and irrigation?',
      icon: Sun,
      color: 'from-orange-500/20 to-amber-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
    },
    {
      id: 'pests',
      title: t('intelligence.pests') || 'Pest & Insect Control',
      desc: t('intelligence.pestsDesc') || 'IPM solutions, bio-pesticides, neem oil sprays, and thrip prevention.',
      query: 'How can I prevent and control aphid and thrip pests organically?',
      icon: Bug,
      color: 'from-rose-500/20 to-pink-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
    },
    {
      id: 'planning',
      title: t('intelligence.planning') || 'Crop Selection & Planning',
      desc: t('intelligence.planningDesc') || 'Region-specific crop recommendations based on your local soil and climate.',
      query: 'Which high-yield crops are best suited for my location and climate?',
      icon: Compass,
      color: 'from-indigo-500/20 to-purple-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
    }
  ];

  return (
    <div className="w-full space-y-4 my-2">
      {/* Grid Title */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
            {t('intelligence.gridTitle') || 'Farm Intelligence Hub'}
          </h2>
        </div>
        <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
          {t('intelligence.activeMonitoring') || 'Location-Aware AI Active'}
        </span>
      </div>

      {/* 6 Intelligence Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {gridCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => onSelectTopic(card.query)}
              className="group text-left p-3.5 rounded-2xl bg-white/85 dark:bg-[#091A13]/85 backdrop-blur-md border border-slate-200/80 dark:border-[#1F7A4D]/25 hover:border-emerald-500 dark:hover:border-emerald-400 shadow-md hover:shadow-xl transition-all duration-300 active:scale-98 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${card.color} border shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {card.title}
                </h3>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1 leading-snug line-clamp-2">
                  {card.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* AI Assistant Entry Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#14532D] via-[#1F7A4D] to-[#04341B] p-4 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-emerald-400/30">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-black tracking-wider uppercase text-emerald-200">
              {t('intelligence.aiAssistantBadge') || 'AgriSphere AI Assistant'}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black tracking-tight">
            {t('intelligence.askAnythingTitle') || 'Ask AgriSphere Anything About Your Farm'}
          </h3>
          <p className="text-xs font-medium text-emerald-100 max-w-xl">
            {t('intelligence.askAnythingSub') || 'Get immediate answers tailored to your real location, soil conditions, weather, and crop stages.'}
          </p>
        </div>
        <button
          onClick={onStartConsultation}
          className="shrink-0 px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
        >
          <span>{t('intelligence.startConsultation') || 'Start AI Consultation'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
