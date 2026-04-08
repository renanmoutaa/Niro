'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Send, Clock, Check, CheckCheck, 
  AlertCircle, Search, User, Settings, Save, 
  X as CloseIcon, Filter, Users, Layout, 
  ChevronRight, Trash2, Plus, Sparkles, Zap
} from 'lucide-react';

interface Message {
  id: string;
  leadId: string;
  content: string;
  direction: 'outbound' | 'inbound';
  status: string;
  type: string;
  createdAt: number;
}

interface Template {
  id: string;
  title: string;
  content: string;
  type: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  neighborhood: string | null;
  city: string | null;
  income: string | null;
}

export const MessagingView = () => {
  const [activeTab, setActiveTab] = useState<'history' | 'campaign'>('history');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings State
  const [config, setConfig] = useState({
    twilio_sid: '',
    twilio_token: '',
    twilio_phone: ''
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Campaign State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filterOptions, setFilterOptions] = useState<{
    neighborhoods: string[];
    cities: string[];
    incomes: string[];
  }>({ neighborhoods: [], cities: [], incomes: [] });
  const [selectedFilters, setSelectedFilters] = useState({
    neighborhood: '',
    city: '',
    income: ''
  });
  const [manualSelection, setManualSelection] = useState<string[]>([]);
  const [campaignContent, setCampaignContent] = useState('');
  const [campaignType, setCampaignType] = useState('sms');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ title: '', content: '' });
  const [dispatchLimit, setDispatchLimit] = useState(100);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [msgRes, settingsRes, optionsRes, templatesRes, leadsRes] = await Promise.all([
          fetch('http://localhost:3001/messages'),
          fetch('http://localhost:3001/settings'),
          fetch('http://localhost:3001/leads/filter-options'),
          fetch('http://localhost:3001/templates'),
          fetch('http://localhost:3001/leads?limit=1000') // Fetch a good sample of leads for manual selection
        ]);

        const [msgs, settings, options, tmpls, leadsData] = await Promise.all([
          msgRes.json(),
          settingsRes.json(),
          optionsRes.json(),
          templatesRes.json(),
          leadsRes.json()
        ]);

        setMessages(msgs);
        setConfig({
          twilio_sid: settings.twilio_sid || '',
          twilio_token: settings.twilio_token || '',
          twilio_phone: settings.twilio_phone || ''
        });
        setFilterOptions(options);
        setTemplates(tmpls);
        setLeads(leadsData.data || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // SSE connection
    const eventSource = new EventSource('http://localhost:3001/messages/feed');
    eventSource.onmessage = (event) => {
      const newMessage = JSON.parse(event.data);
      setMessages(prev => {
        const index = prev.findIndex(m => m.id === newMessage.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = newMessage;
          return updated;
        }
        return [newMessage, ...prev];
      });
    };

    return () => eventSource.close();
  }, []);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch('http://localhost:3001/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      alert(data.message);
      setShowSettings(false);
    } catch (err) {
      alert('Erro ao salvar configurações.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const res = await fetch('http://localhost:3001/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTemplate, type: campaignType })
      });
      const data = await res.json();
      setTemplates(prev => [data, ...prev]);
      setShowTemplateModal(false);
      setNewTemplate({ title: '', content: '' });
      // Refresh templates
      const freshRes = await fetch('http://localhost:3001/templates');
      setTemplates(await freshRes.json());
    } catch (err) {
      alert('Erro ao salvar template.');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Excluir este template?')) return;
    try {
      await fetch(`http://localhost:3001/templates/${id}`, { method: 'DELETE' });
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert('Erro ao excluir template.');
    }
  };

  const startDispatch = async () => {
    if (!campaignContent) return alert('Escreva uma mensagem primeiro.');
    if (targetedLeads.length === 0) return alert('Nenhum lead selecionado.');
    
    const leadsToProcess = targetedLeads.slice(0, dispatchLimit);
    if (!confirm(`Iniciar disparo para ${leadsToProcess.length} leads?`)) return;

    setSending(true);
    setProgress({ current: 0, total: leadsToProcess.length });

    for (let i = 0; i < leadsToProcess.length; i++) {
        const lead = leadsToProcess[i];
        // Dynamic variable replacement
        let personalizedContent = campaignContent
            .replace(/\{\{name\}\}/g, lead.name || 'Cliente')
            .replace(/\{\{city\}\}/g, lead.city || '')
            .replace(/\{\{income\}\}/g, lead.income || '')
            .replace(/\{\{neighborhood\}\}/g, lead.neighborhood || '');
        
        try {
            await fetch('http://localhost:3001/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadId: lead.id,
                    content: personalizedContent,
                    type: campaignType
                })
            });
        } catch (err) {
            console.error(`Falha ao enviar para ${lead.id}:`, err);
        }
        
        setProgress(prev => ({ ...prev, current: i + 1 }));
        // Pequeno delay para não sobrecarregar
        await new Promise(r => setTimeout(r, 200));
    }

    setSending(false);
    alert('Disparo concluído!');
    setActiveTab('history');
  };

  const targetedLeads = useMemo(() => {
    let filtered = leads;

    if (selectedFilters.neighborhood) {
      filtered = filtered.filter(l => l.neighborhood === selectedFilters.neighborhood);
    }
    if (selectedFilters.city) {
      filtered = filtered.filter(l => l.city === selectedFilters.city);
    }
    if (selectedFilters.income) {
      filtered = filtered.filter(l => l.income === selectedFilters.income);
    }

    if (manualSelection.length > 0) {
      filtered = [...filtered, ...leads.filter(l => manualSelection.includes(l.id) && !filtered.find(f => f.id === l.id))];
    }

    return filtered;
  }, [leads, selectedFilters, manualSelection]);

  const toggleManualSelection = (id: string) => {
    setManualSelection(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued': return <Clock className="w-3 h-3 text-slate-500" />;
      case 'sent': return <Check className="w-3 h-3 text-emerald-400" />;
      case 'delivered': return <CheckCheck className="w-3 h-3 text-emerald-400" />;
      case 'failed': return <AlertCircle className="w-3 h-3 text-rose-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 min-h-[700px]">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Clock className="w-4 h-4" />
            Histórico e Logs
          </button>
          <button 
            onClick={() => setActiveTab('campaign')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'campaign' ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Zap className="w-4 h-4" />
            Nova Campanha
          </button>
        </div>
        
        <button 
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all group border border-transparent hover:border-white/10 rounded-xl"
        >
          <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
          Twilio Gateway
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'history' ? (
          <motion.div 
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Sidebar Feed */}
            <div className="lg:col-span-4 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6 h-fit">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                  <MessageSquare className="w-5 h-5" />
                  Feed ao vivo
                </h3>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">SSE_ACTIVE</span>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Buscar no histórico..."
                  className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="py-20 text-center">
                    <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 text-sm">Nenhum rastro de comunicação.</p>
                  </div>
                ) : (
                  messages.filter(m => m.content.toLowerCase().includes(searchTerm.toLowerCase())).map((msg) => (
                    <motion.div
                      key={msg.id}
                      layout
                      className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/20 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">
                          {msg.id.substring(0, 10)}...
                        </span>
                        <div className="flex items-center gap-1.5 grayscale group-hover:grayscale-0 transition-all">
                          {getStatusIcon(msg.status)}
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            {msg.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-200 line-clamp-2 mb-3 leading-relaxed">
                        {msg.content}
                      </p>
                      <div className="flex items-center justify-between text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-emerald-400" />
                          {msg.leadId.substring(0, 8)}
                        </div>
                        <span className="opacity-50">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Main Traffic Monitor */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-black tracking-tight">Centro de Tráfego Twilio</h2>
                    <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                      Gerencie sua malha de comunicação em tempo real. Cada mensagem é rastreada desde o disparo até o dispositivo final.
                    </p>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold border border-emerald-500/20">GATEWAY_ONLINE</span>
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold border border-blue-500/20">SSL_ENCRYPTED</span>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center p-6 bg-black/40 border border-white/10 rounded-2xl min-w-[140px] shadow-xl">
                      <div className="text-3xl font-mono font-bold text-emerald-400">{messages.filter(m => m.status === 'delivered').length}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">Sucesso</div>
                    </div>
                    <div className="text-center p-6 bg-black/40 border border-white/10 rounded-2xl min-w-[140px] shadow-xl">
                      <div className="text-3xl font-mono font-bold text-blue-400">{messages.filter(m => m.status === 'sent' || m.status === 'queued').length}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">Tráfego</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detail Table */}
              <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                  <h3 className="font-bold flex items-center gap-2">
                    <Layout className="w-5 h-5 text-emerald-400" />
                    Detalhamento de Entregas
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black tracking-[0.2em] text-slate-400">REALTIME</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                      <tr>
                        <th className="px-8 py-5">Status</th>
                        <th className="px-8 py-5">Mensagem</th>
                        <th className="px-8 py-5">Canal</th>
                        <th className="px-8 py-5">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {messages.slice(0, 15).map((msg) => (
                        <tr key={msg.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(msg.status)}
                              <span className="text-xs font-mono group-hover:text-white transition-colors uppercase">{msg.status}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <p className="text-xs text-slate-400 max-w-sm truncate group-hover:text-slate-200 transition-colors font-medium">{msg.content}</p>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border shadow-sm ${msg.type === 'whatsapp' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                              {msg.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-[10px] text-slate-500 font-mono italic opacity-70">
                            {new Date(msg.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="campaign"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Column: Targeting & Selection */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6 shadow-xl">
                <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                  <Filter className="w-5 h-5" />
                  Segmentação Inteligente
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Bairro</label>
                    <select 
                      value={selectedFilters.neighborhood}
                      onChange={(e) => setSelectedFilters({...selectedFilters, neighborhood: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium appearance-none"
                    >
                      <option value="">Todos os Bairros</option>
                      {filterOptions.neighborhoods.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Cidade</label>
                    <select 
                      value={selectedFilters.city}
                      onChange={(e) => setSelectedFilters({...selectedFilters, city: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium appearance-none"
                    >
                      <option value="">Todas as Cidades</option>
                      {filterOptions.cities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Relatórios de Renda</label>
                    <select 
                      value={selectedFilters.income}
                      onChange={(e) => setSelectedFilters({...selectedFilters, income: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium appearance-none"
                    >
                      <option value="">Todas as Faixas</option>
                      {filterOptions.incomes.map(i => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-black text-emerald-400">{targetedLeads.length}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Leads Alvo</div>
                    </div>
                    <Users className="w-8 h-8 text-emerald-400/20" />
                  </div>
                </div>
              </div>

              {/* Manual Selection List */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 h-[400px] flex flex-col shadow-xl">
                 <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  Seleção Manual
                </h3>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input 
                    type="text"
                    placeholder="Filtrar por nome..."
                    className="w-full bg-black/20 border border-white/5 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                  {leads.map(lead => (
                    <div 
                      key={lead.id}
                      onClick={() => toggleManualSelection(lead.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${manualSelection.includes(lead.id) ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5' : 'bg-white/5 border-transparent hover:border-white/10'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${manualSelection.includes(lead.id) ? 'bg-emerald-500 text-black' : 'bg-white/10 text-slate-400 group-hover:bg-white/20'}`}>
                          {lead.name[0]}
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-200">{lead.name}</div>
                          <div className="text-[9px] text-slate-500 font-medium">
                            {lead.neighborhood || 'Bairro N/D'}
                          </div>
                        </div>
                      </div>
                      {manualSelection.includes(lead.id) && <Check className="w-4 h-4 text-emerald-500" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Composer & Execution */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                
                <div className="flex justify-between items-center relative z-10">
                  <h3 className="text-xl font-bold flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-emerald-400" />
                    Compositor de Campanha
                  </h3>
                  <div className="flex gap-2">
                    {templates.slice(0, 3).map(tmpl => (
                      <button 
                        key={tmpl.id}
                        onClick={() => {
                            setCampaignContent(tmpl.content);
                            setCampaignType(tmpl.type);
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition-all"
                      >
                        {tmpl.title}
                      </button>
                    ))}
                    <button 
                      onClick={() => setShowTemplateModal(true)}
                      className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-all"
                    >
                      <Layout className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-4 p-1 bg-black/40 rounded-xl border border-white/5 w-fit">
                    <button 
                       onClick={() => setCampaignType('sms')}
                       className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${campaignType === 'sms' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >SMS</button>
                    <button 
                       onClick={() => setCampaignType('whatsapp')}
                       className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${campaignType === 'whatsapp' ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >WhatsApp</button>
                  </div>

                  <div className="relative">
                    <textarea 
                      value={campaignContent}
                      onChange={(e) => setCampaignContent(e.target.value)}
                      placeholder="Olá {{name}}, temos uma oferta especial para você no bairro {{neighborhood}}..."
                      className="w-full h-[220px] bg-black/40 border border-white/10 rounded-2xl p-6 text-sm focus:outline-none focus:border-emerald-500/50 transition-all font-medium leading-relaxed resize-none custom-scrollbar"
                    />
                    <div className="absolute bottom-4 right-6 flex gap-3 text-[10px] items-center">
                      <span className="bg-black/40 px-3 py-1.5 rounded-full border border-white/5 text-slate-500 font-mono">
                        {campaignContent.length} caracteres
                      </span>
                      <button 
                        onClick={() => {
                            if (!campaignContent) return;
                            setNewTemplate({...newTemplate, content: campaignContent});
                            setShowTemplateModal(true);
                        }}
                        className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20 transition-all font-bold group"
                      >
                        <Save className="w-3 h-3 group-hover:scale-110 transition-transform" />
                        SALVAR TEMPLATE
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {['{{name}}', '{{city}}', '{{income}}', '{{neighborhood}}'].map(tag => (
                      <button 
                        key={tag}
                        onClick={() => setCampaignContent(prev => prev + ' ' + tag)}
                        className="px-2 py-1 bg-black/40 hover:bg-black/60 border border-white/5 rounded text-[10px] font-mono text-slate-500 hover:text-emerald-400 transition-all"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/5 relative z-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Limite de Disparo</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[100, 1000, 10000, 20000].map(limit => (
                        <button 
                          key={limit}
                          onClick={() => setDispatchLimit(limit)}
                          className={`p-2 rounded-xl text-[10px] font-black border transition-all ${dispatchLimit === limit ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/20'}`}
                        >
                          {limit >= 1000 ? `${limit/1000}k` : limit}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-500 uppercase font-bold italic opacity-50">
                      * O limite previne bloqueios por flood nas operadoras.
                    </p>
                  </div>

                  <div className="flex items-end">
                    <button 
                      onClick={startDispatch}
                      disabled={sending || targetedLeads.length === 0}
                      className="w-full h-[60px] bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] disabled:opacity-30 disabled:grayscale group relative overflow-hidden"
                    >
                      {sending ? (
                        <>
                          <div className="absolute inset-0 bg-black/10 origin-left" style={{ transform: `scaleX(${progress.current / progress.total})` }} />
                          <div className="relative z-10 flex items-center gap-2">
                            <Clock className="w-4 h-4 animate-spin" />
                            PROCESSANDO {progress.current}/{progress.total}
                          </div>
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5 group-hover:scale-125 transition-transform" />
                          INICIAR DISPARO MASSIVO
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tips & Recommendations */}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-8 flex gap-6 items-start shadow-xl">
                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-blue-300">Dica de Engajamento</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Personalizar a mensagem usando <span className="text-blue-400 font-mono text-[11px] bg-blue-500/10 px-1.5 py-0.5 rounded">{"{{name}}"}</span> aumenta a taxa de abertura em até 85%. 
                    Evite disparos com textos idênticos para evitar o filtro de spam do WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal (Vínculo Twilio) */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 z-[101] shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-400" />
                  Gateway Twilio
                </h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Account SID</label>
                  <input 
                    type="password"
                    value={config.twilio_sid}
                    onChange={(e) => setConfig({...config, twilio_sid: e.target.value})}
                    placeholder="AC..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Auth Token</label>
                  <input 
                    type="password"
                    value={config.twilio_token}
                    onChange={(e) => setConfig({...config, twilio_token: e.target.value})}
                    placeholder="Auth Token..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Telefone Principal</label>
                  <input 
                    type="text"
                    value={config.twilio_phone}
                    onChange={(e) => setConfig({...config, twilio_phone: e.target.value})}
                    placeholder="+1234567890"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="flex-1 px-4 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                  >Cancelar</button>
                  <button 
                    onClick={handleSaveConfig}
                    disabled={savingConfig}
                    className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg"
                  >
                    {savingConfig ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    CONECTAR GATEWAY
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Template Modal */}
      <AnimatePresence>
        {showTemplateModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTemplateModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl p-8 z-[111] shadow-2xl h-[600px] flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Layout className="w-5 h-5 text-emerald-400" />
                  Biblioteca de Templates
                </h3>
                <button onClick={() => setShowTemplateModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-hidden">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Salvar Novo</h4>
                  <div className="space-y-4">
                    <input 
                      type="text"
                      placeholder="Título do Template (ex: Boas Vindas)"
                      value={newTemplate.title}
                      onChange={(e) => setNewTemplate({...newTemplate, title: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all font-bold"
                    />
                    <textarea 
                      placeholder="Conteúdo da mensagem..."
                      value={newTemplate.content}
                      onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                      className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium resize-none"
                    />
                    <button 
                      onClick={handleSaveTemplate}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
                    >CRIAR TEMPLATE</button>
                  </div>
                </div>

                <div className="space-y-6 flex flex-col h-full overflow-hidden">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Meus Templates ({templates.length})</h4>
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {templates.map(tmpl => (
                      <div key={tmpl.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/20 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                           <h5 className="font-bold text-slate-200 text-sm">{tmpl.title}</h5>
                           <div className="flex gap-1">
                             <button 
                                onClick={() => {
                                    setCampaignContent(tmpl.content);
                                    setCampaignType(tmpl.type);
                                    setShowTemplateModal(false);
                                }}
                                className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded-md transition-all"
                             ><ChevronRight className="w-4 h-4" /></button>
                             <button 
                                onClick={() => handleDeleteTemplate(tmpl.id)}
                                className="p-1.5 hover:bg-rose-500/20 text-rose-500 rounded-md transition-all"
                             ><Trash2 className="w-4 h-4" /></button>
                           </div>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{tmpl.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
