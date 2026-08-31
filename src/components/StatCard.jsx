import React from 'react';

export default function StatCard({ title, value, icon: Icon, color = 'indigo' }) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colorMap[color] || colorMap.indigo}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">{title}</p>
        <h3 className="text-xl font-bold text-slate-900 mt-0.5">{value}</h3>
      </div>
    </div>
  );
}