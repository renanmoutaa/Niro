'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: 'primary' | 'accent' | 'secondary';
}

export function StatCard({ label, value, icon: Icon, trend, color = 'primary' }: StatCardProps) {
  const borderColors = {
    primary: 'border-blue-500/20 group-hover:border-blue-500/50',
    accent: 'border-emerald-500/20 group-hover:border-emerald-500/50',
    secondary: 'border-slate-500/20 group-hover:border-slate-500/50',
  };

  const iconColors = {
    primary: 'text-blue-500 bg-blue-500/10',
    accent: 'text-emerald-500 bg-emerald-500/10',
    secondary: 'text-slate-400 bg-slate-400/10',
  };

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`niro-glass p-6 rounded-xl border transition-all duration-300 group ${borderColors[color]}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${iconColors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
            {trend}
          </div>
        )}
      </div>
      <div>
        <div className="text-[11px] text-secondary font-bold uppercase tracking-wider mb-1">{label}</div>
        <div className="text-3xl font-black tracking-tight">{value}</div>
      </div>
    </motion.div>
  );
}
