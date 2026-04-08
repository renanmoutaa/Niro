import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, CreditCard, Calendar, MapPin, TrendingUp, Map, Hash, Loader2, Sparkles, Send, MessageCircle } from 'lucide-react';

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

interface LeadDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void; // Callback para atualizar a lista após enriquecer
}

export function LeadDrawer({ lead, isOpen, onClose, onUpdate }: LeadDrawerProps) {
  const [enriching, setEnriching] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState<'sms' | 'whatsapp'>('whatsapp');
  const [sending, setSending] = useState(false);
  
  if (!lead) return null;

  const formatCurrency = (value?: string) => {
    if (!value) return 'NÃO INFORMADO';
    const numeric = value.replace(/\D/g, '');
    if (!numeric) return value;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(numeric));
  };

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      const response = await fetch(`http://localhost:3001/leads/${lead.id}/enrich`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.error) {
        alert(result.error);
      } else if (result.found) {
        alert('Lead enriquecido com novos dados!');
        if (onUpdate) onUpdate();
      } else {
        alert('Niro IA não encontrou dados públicos detalhados sobre este lead.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar com o serviço de enriquecimento.');
    } finally {
      setEnriching(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const response = await fetch('http://localhost:3001/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          content: message,
          type: msgType
        })
      });
      const result = await response.json();
      if (result.error) {
        alert('Erro: ' + result.error);
      } else {
        alert('Mensagem enviada com sucesso!');
        setMessage('');
      }
    } catch (err) {
      alert('Erro ao conectar com a central de mensagens.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-950 border-l border-white/5 z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black niro-gradient-text tracking-tight uppercase">Dossiê do Lead</h2>
                <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">ID DO PROTOCOLO: {lead.id}</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {/* Profile Section */}
              <section>
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <User className="w-3 h-3" /> Identidade
                </h3>
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Nome Completo</span>
                    <span className="text-sm font-semibold">{lead.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">E-mail</span>
                    <span className="text-sm font-semibold font-mono">{lead.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">CPF</span>
                    <span className="text-sm font-semibold flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 opacity-50" />
                      {lead.cpf || 'NÃO INFORMADO'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Telefone</span>
                    <a 
                      href={`https://wa.me/${lead.phone?.replace(/\D/g, '')}`} 
                      target="_blank" 
                      className="text-sm font-bold text-emerald-400 flex items-center gap-2 hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {lead.phone || 'N/A'}
                    </a>
                  </div>
                </div>
              </section>

              {/* Economic Profile Section */}
              <section>
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" /> Perfil Socioeconômico
                </h3>
                <div className="space-y-3">
                  <div className="bg-slate-900 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Renda Estimada</div>
                        <div className="text-sm font-mono font-bold text-emerald-400">{formatCurrency(lead.income)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Hash className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Faixa Etária</div>
                        <div className="text-sm font-mono font-bold text-slate-200">{lead.age ? `${lead.age} anos` : 'NÃO INFORMADO'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Location Section */}
              <section>
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Localização Detalhada
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-slate-400">
                      <Map className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase">Bairro</span>
                    </div>
                    <div className="text-xs font-bold uppercase truncate">{lead.neighborhood || 'N/A'}</div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-slate-400">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase">Cidade/UF</span>
                    </div>
                    <div className="text-xs font-bold uppercase">{lead.location || 'N/A'}</div>
                  </div>
                </div>
              </section>

              {/* Messaging Section */}
              <section className="mt-8 pt-8 border-t border-white/5">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <MessageCircle className="w-3 h-3" /> Comunicar com Lead
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setMsgType('whatsapp')}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                        msgType === 'whatsapp' 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : 'bg-white/5 border-white/5 text-slate-500'
                      }`}
                    >
                      WhatsApp
                    </button>
                    <button 
                      onClick={() => setMsgType('sms')}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                        msgType === 'sms' 
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                          : 'bg-white/5 border-white/5 text-slate-500'
                      }`}
                    >
                      SMS
                    </button>
                  </div>
                  <div className="relative">
                    <textarea 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Digite sua mensagem aqui..."
                      className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-sm min-h-[100px] focus:outline-none focus:border-emerald-500/30 transition-all font-medium placeholder:text-slate-600"
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={sending || !message.trim()}
                      className="absolute bottom-3 right-3 p-2 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-all disabled:opacity-30"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 bg-white/[0.01] space-y-3">
              <button 
                onClick={handleEnrich}
                disabled={enriching}
                className="w-full niro-gradient-bg text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {enriching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    PESQUISANDO...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    ENRIQUECER DOSSIÊ
                  </>
                )}
              </button>
              <button 
                onClick={onClose}
                className="w-full bg-slate-800 text-slate-200 py-3 rounded-xl font-bold text-sm hover:bg-slate-700 transition-all border border-white/5"
              >
                FECHAR DOSSIÊ
              </button>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
