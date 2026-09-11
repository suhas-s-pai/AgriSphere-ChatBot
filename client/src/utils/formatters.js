export function getRiskColor(riskLevel) {
  switch ((riskLevel || '').toUpperCase()) {
    case 'HIGH':
      return {
        bg: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
        badgeBg: 'bg-red-600 text-white',
        text: 'text-red-600 dark:text-red-400',
        dot: '🔴',
        border: 'border-red-500'
      };
    case 'SUSPICIOUS':
      return {
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
        badgeBg: 'bg-amber-500 text-slate-950 font-bold',
        text: 'text-amber-600 dark:text-amber-400',
        dot: '🟡',
        border: 'border-amber-500'
      };
    case 'LOW':
    default:
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
        badgeBg: 'bg-emerald-600 text-white',
        text: 'text-emerald-600 dark:text-emerald-400',
        dot: '🟢',
        border: 'border-emerald-500'
      };
  }
}

export function getRiskTitle(riskLevel) {
  switch ((riskLevel || '').toUpperCase()) {
    case 'HIGH':
      return 'Likely Scam';
    case 'SUSPICIOUS':
      return 'Suspicious — Proceed With Caution';
    case 'LOW':
    default:
      return 'Likely Safe (Based on provided info)';
  }
}

export function formatDate(dateString) {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
