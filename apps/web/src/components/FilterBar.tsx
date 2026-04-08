'use client';

import { Search, Filter, Database } from 'lucide-react';

interface FilterBarProps {
  onSearch: (q: string) => void;
  onStatusChange: (status: string) => void;
}

export function FilterBar({ onSearch, onStatusChange }: FilterBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-8">
      <div className="relative flex-1 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
        <input 
          type="text" 
          placeholder="Buscar leads por nome ou email..." 
          onChange={(e) => onSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <select 
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
          >
            <option value="">Todos os Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <Filter className="w-3 h-3 opacity-40" />
          </div>
        </div>
        
        <button 
          onClick={() => (window as unknown as { processIntelligence?: () => void }).processIntelligence?.()}
          className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors flex items-center gap-2 shadow-lg shadow-white/5 active:scale-95"
        >
          <Database className="w-4 h-4" />
          Sincronizar IA
        </button>

        <a 
          href="http://localhost:3001/leads/template"
          className="text-[10px] font-bold text-slate-500 hover:text-slate-300 underline underline-offset-4 tracking-widest uppercase transition-colors"
        >
          Baixar Modelo
        </a>
      </div>

    </div>
  );
}
