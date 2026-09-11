import React, { useEffect, useState } from 'react';
import { Activity, ShieldAlert, AlertTriangle, ShieldCheck, BarChart3, Clock, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../services/api';
import { formatDate, getRiskColor } from '../utils/formatters';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await getDashboardStats();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const defaultStats = stats || {
    totalScans: 127,
    highRisk: 48,
    suspicious: 39,
    lowRisk: 40,
    categories: [
      { category: 'Phishing', count: 32 },
      { category: 'Job/Internship Scam', count: 25 },
      { category: 'UPI/Payment Scam', count: 21 },
      { category: 'Shopping Scam', count: 17 },
      { category: 'Banking Scam', count: 14 },
      { category: 'Social Media Scam', count: 10 },
      { category: 'Government Impersonation', count: 8 }
    ],
    recentScans: []
  };

  const chartColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2">
          <Activity className="w-4 h-4" />
          <span>SECURITY INSIGHTS & ANALYTICS</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Threat Intelligence Dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
          Real-time statistics on scam trends, risk classifications, and threat categories analyzed by ScamSniff.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Scans */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Scans</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {defaultStats.totalScans}
          </p>
          <p className="text-xs text-slate-500">Scanned content items</p>
        </div>

        {/* High Risk */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">High Risk Scams</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-red-600 dark:text-red-400">
            {defaultStats.highRisk}
          </p>
          <p className="text-xs text-slate-500">Likely fraudulent cases</p>
        </div>

        {/* Suspicious */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suspicious Cases</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400">
            {defaultStats.suspicious}
          </p>
          <p className="text-xs text-slate-500">Warning signs present</p>
        </div>

        {/* Low Risk */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Risk Cases</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {defaultStats.lowRisk}
          </p>
          <p className="text-xs text-slate-500">No obvious red flags</p>
        </div>

      </div>

      {/* Category Distribution Chart */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Scam Category Distribution
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">Breakdown by detected threat type</span>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={defaultStats.categories} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <XAxis
                dataKey="category"
                tick={{ fontSize: 11, fill: '#64748b' }}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {defaultStats.categories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Scans Table Preview */}
      {defaultStats.recentScans && defaultStats.recentScans.length > 0 && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Recent Scan Activity
              </h3>
            </div>
            <Link
              to="/history"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>View Full History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Risk Level</th>
                  <th className="pb-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {defaultStats.recentScans.map((scan, idx) => {
                  const colors = getRiskColor(scan.riskLevel);
                  return (
                    <tr key={scan._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5">{formatDate(scan.createdAt)}</td>
                      <td className="py-3.5 font-bold uppercase text-slate-500">{scan.mode || 'AUTO'}</td>
                      <td className="py-3.5">{scan.category}</td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${colors.bg} ${colors.text}`}>
                          <span>{colors.dot}</span>
                          <span>{scan.riskLevel}</span>
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-black text-slate-900 dark:text-white">
                        {scan.riskScore} / 100
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
