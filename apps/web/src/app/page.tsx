'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { ProfessionalHeader } from '@/components/ProfessionalHeader';
import { StatCard } from '@/components/StatCard';
import { LeadTable } from '@/components/LeadTable';
import { FilterBar } from '@/components/FilterBar';
import { LeadDrawer } from '@/components/LeadDrawer';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Zap, Binary, Sparkles, ChevronLeft, ChevronRight, ShieldCheck, MapPin, LayoutDashboard, MessageSquare } from 'lucide-react';
import { MessagingView } from '@/components/MessagingView';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  cpf?: string;
  age?: string;
  income?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  location: string;
}

interface StatusStat {
  status: string;
  count: number;
}

export default function NiroDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<{ total: number; byStatus: StatusStat[]; topDevices: any[] }>({ 
    total: 0, 
    byStatus: [], 
    topDevices: [] 
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'messaging'>('dashboard');

  const fetchData = async () => {
    try {
      setLoading(true);
      const leadsRes = await fetch(`http://localhost:3001/leads?q=${search}&status=${status}&page=${page}&sort=${sortField}&order=${sortOrder}`);
      const leadsData = await leadsRes.json();
      setLeads(leadsData.data);
      setTotalPages(leadsData.pagination.pages);

      // Sincroniza o lead selecionado com os novos dados
      if (selectedLead) {
        const updated = leadsData.data.find((l: Lead) => l.id === selectedLead.id);
        if (updated) setSelectedLead(updated);
      }

      const statsRes = await fetch('http://localhost:3001/stats');
      const statsData = await statsRes.json();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, status, page, sortField, sortOrder]);

  const handleExport = () => {
    window.location.href = 'http://localhost:3001/leads/export';
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/leads/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      alert(data.message || data.error);
      fetchData();
    } catch (err) {
      alert('Erro ao importar arquivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessIntelligence = () => {
    setLoading(true);
    setTimeout(() => {
      fetchData();
      alert('Inteligência Niro IA: Matriz de Leads sincronizada com sucesso.');
    }, 1500);
  };

  // Auto Logout (Idle Timer - 5 minutes)
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        signOut({ callbackUrl: '/login' });
      }, 5 * 60 * 1000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);

    resetTimer(); // Start timer initially

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      clearTimeout(timeout);
    };
  }, []);

  // Expose to FilterBar via Window for simplicity in this MVP
  useEffect(() => {
    (window as any).processIntelligence = handleProcessIntelligence;
  }, []);

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };


  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1); // Reset to first page on sort
  };

  const totalCities = [...new Set(leads.map(l => l.city).filter(Boolean))].length;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-blue-500/30">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      
      <main className="relative z-10 p-6 md:p-12 max-w-7xl mx-auto">
        <ProfessionalHeader />

        {/* Tab Switcher */}
        <div className="flex gap-1 mb-8 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Painel Leads
          </button>
          <button
            onClick={() => setActiveTab('messaging')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
              activeTab === 'messaging' 
                ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Central Twilio
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {/* Seção de Novos Leads Adicionados */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-12 p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col lg:flex-row items-center gap-8 justify-between backdrop-blur-sm"
        >
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Novos leads adicionados</h3>
            </div>
            
            <div className="flex flex-wrap gap-4">
              {leads.slice(0, 5).map((lead, idx) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedLead(lead)}
                  className="flex items-center gap-3 bg-white/5 border border-white/5 hover:border-emerald-500/30 p-2 pr-4 rounded-xl cursor-pointer transition-all hover:bg-white/10 group"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                    {lead.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200 truncate max-w-[100px]">{lead.name}</div>
                    <div className="text-[9px] text-slate-500 font-mono">{lead.location}</div>
                  </div>
                </motion.div>
              ))}
              {leads.length === 0 && (
                <div className="text-sm text-slate-500 italic">Aguardando novas capturas...</div>
              )}
            </div>
          </div>

          <div className="flex gap-3 shrink-0">
            <input 
              type="file" 
              id="import-input" 
              hidden 
              accept=".csv" 
              onChange={handleImport} 
            />
            <label 
              htmlFor="import-input"
              className="whitespace-nowrap bg-white/5 border border-white/10 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all cursor-pointer flex items-center gap-2 text-slate-300"
            >
              <Binary className="w-4 h-4 opacity-40" />
              Importar CSV
            </label>
            <button 
              onClick={handleExport}
              className="whitespace-nowrap bg-emerald-500 text-black px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              Exportar
            </button>
          </div>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard 
            label="Total de Leads" 
            value={stats.total} 
            icon={Users}
            trend="+12.4% vs última semana"
            color="primary"
          />
          <StatCard 
            label="Cidades Atendidas" 
            value={totalCities || stats.topDevices.length} 
            icon={MapPin}
            trend="Alcance Geográfico"
            color="accent"
          />
          <StatCard 
            label="Monitoramento" 
            value="Comercial" 
            icon={ShieldCheck}
            trend="Dados Qualificados"
            color="secondary"
          />
        </div>


        <FilterBar 
          onSearch={(v) => { setSearch(v); setPage(1); }} 
          onStatusChange={(v) => { setStatus(v); setPage(1); }} 
        />

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-64 flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Sincronizando Niro IA</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <LeadTable 
                leads={leads} 
                onSelectLead={handleSelectLead} 
                onSort={handleSort}
                sortField={sortField}
                sortOrder={sortOrder}
              />
              
              {/* Paginação */}
              <div className="mt-8 flex items-center justify-between px-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Página {page} de {totalPages} // Total: {stats.total}
                </div>
                <div className="flex gap-2">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="p-2 px-4 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-30 flex items-center gap-2"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    Anterior
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-[11px] font-bold border transition-all ${
                            page === p 
                              ? 'bg-emerald-500 border-emerald-500 text-black' 
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="p-2 px-4 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-30 flex items-center gap-2"
                  >
                    Próxima
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <MessagingView />
          </motion.div>
        )}
        
        <footer className="mt-24 border-t border-white/5 pt-8 text-[11px] font-medium text-slate-600 flex justify-between items-center">
          <div className="flex gap-6">
            <span className="hover:text-slate-400 cursor-pointer transition-colors text-[9px]">POLÍTICA_DE_PRIVACIDADE</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors text-[9px]">SEGURANÇA_TOTAL</span>
          </div>
          <div>© 2026 NIRO IA // PROTOCOLO_SaaS</div>
        </footer>
      </main>

      <LeadDrawer 
        lead={selectedLead} 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onUpdate={fetchData}
      />
    </div>
  );
}
