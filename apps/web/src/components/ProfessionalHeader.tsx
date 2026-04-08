'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Cpu } from 'lucide-react';

export function ProfessionalHeader() {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 mb-10 gap-4 border-b border-white/5">
      <div className="flex items-center gap-3">
        <div className="bg-primary/20 p-2 rounded-lg border border-primary/30">
          <Cpu className="text-primary w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black niro-gradient-text tracking-tighter uppercase leading-none">NIRO IA</h1>
          <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mt-1">SISTEMA INTEGRADO DE LEADS</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden md:flex flex-col items-end">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Status do Sistema</div>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-400 tracking-widest uppercase">Protegido</span>
          </div>
        </div>
        <div className="flex items-center gap-2 opacity-60 text-[12px] font-medium">
          <ShieldCheck className="w-4 h-4" />
          PRIVACIDADE DE DADOS ATIVA
        </div>
      </div>
    </header>
  );
}
