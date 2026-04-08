'use client';

import { motion } from 'framer-motion';
import { User, Smartphone, MapPin, Search, ArrowUp, ArrowDown } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  age?: string;
  income?: string;
  neighborhood?: string;
  location: string;
  phone?: string | null;
}

interface LeadTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onSort: (field: string) => void;
  sortField: string;
  sortOrder: 'asc' | 'desc';
}

export function LeadTable({ leads, onSelectLead, onSort, sortField, sortOrder }: LeadTableProps) {
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-emerald-400" /> : <ArrowDown className="w-3 h-3 ml-1 text-emerald-400" />;
  };

  const formatCurrency = (value?: string) => {
    if (!value) return '---';
    const numeric = value.replace(/\D/g, '');
    if (!numeric) return value;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(numeric));
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/5 niro-glass">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/[0.03] border-b border-white/10">
            <tr>
              <th 
                onClick={() => onSort('name')}
                className="p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center">
                  Entidade / Lead <SortIcon field="name" />
                </div>
              </th>
              <th className="p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Telefone</th>
              <th className="p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Idade</th>
              <th className="p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Renda</th>
              <th className="p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bairro</th>
              <th className="p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Localização</th>
              <th className="p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>


          <tbody>
            {leads.map((lead, idx) => (
              <motion.tr 
                key={lead.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => onSelectLead(lead)}
                className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors cursor-pointer group"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-all">
                      <User className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-100">{lead.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{lead.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-slate-300 font-mono text-xs">
                    <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                    {lead.phone || '---'}
                  </div>
                </td>
                <td className="p-4 text-sm font-medium text-slate-300">
                  {lead.age ? `${lead.age} anos` : '---'}
                </td>
                <td className="p-4 text-sm font-bold text-emerald-400/90 font-mono">
                  {formatCurrency(lead.income)}
                </td>
                <td className="p-4 text-sm text-slate-400 uppercase tracking-tight font-medium">
                  {lead.neighborhood || '---'}
                </td>
                <td className="p-4 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 opacity-40" />
                    {lead.location}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <button className="p-2 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10">
                    <Search className="w-4 h-4 text-primary" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  );
}
