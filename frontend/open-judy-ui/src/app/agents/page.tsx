'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { EnterpriseAgent } from '@/lib/types';
import {
  Bot,
  Sparkles,
  Scale,
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  Database,
  Search,
  Cpu,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

export default function AgentGardenHubPage() {
  const [agents, setAgents] = useState<EnterpriseAgent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('search');
      if (q) setSearchTerm(q);
    }
    api.listEnterpriseAgents().then(setAgents);
  }, []);

  const getAgentIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Scale':
        return <Scale className="w-5 h-5 text-crimson" />;
      case 'AlertTriangle':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'FileText':
        return <FileText className="w-5 h-5 text-indigo-400" />;
      case 'Calendar':
        return <Calendar className="w-5 h-5 text-emerald-400" />;
      default:
        return <Bot className="w-5 h-5 text-sky-400" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'JURISPRUDENCE':
        return { label: 'Jurisprudência', bg: 'bg-crimson/15', text: 'text-red-300', border: 'border-crimson/30' };
      case 'CONTRADICTION_AUDIT':
        return { label: 'Auditoria de Provas', bg: 'bg-amber-950/40', text: 'text-amber-300', border: 'border-amber-800/40' };
      case 'DOCUMENT_GENERATION':
        return { label: 'Redação Forense', bg: 'bg-indigo-950/40', text: 'text-indigo-300', border: 'border-indigo-800/40' };
      case 'PROCESS_MANAGEMENT':
        return { label: 'Gestão de Pautas', bg: 'bg-emerald-950/40', text: 'text-emerald-300', border: 'border-emerald-800/40' };
      default:
        return { label: 'Agente Geral', bg: 'bg-sky-950/40', text: 'text-sky-300', border: 'border-sky-800/40' };
    }
  };

  const filteredAgents = agents.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || a.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 animate-in fade-in">
      {/* ========================================================================= */}
      {/* Top Banner / Hero Header */}
      {/* ========================================================================= */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-5 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-dark-muted">
              <Link href="/" className="hover:text-white transition-colors">Gabinete &amp; Expediente</Link>
              <span>/</span>
              <span className="text-white font-medium">Assessoria Jurisdicional (Res. CNJ nº 332/2020)</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5 font-serif">
              <Scale className="w-6 h-6 text-crimson" />
              <span>Módulos de Assessoria Jurisdicional (Res. CNJ nº 332/2020)</span>
            </h1>

            <p className="text-xs text-dark-muted leading-relaxed">
              Módulos especializados de apoio à pesquisa de precedentes qualificados, exame de contraditório probatório e elaboração de minutas sob supervisão humana do Magistrado.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="px-3.5 py-2.5 rounded-lg bg-dark-input border border-dark-border flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <div>
                <div className="text-[11px] text-dark-muted font-medium">Governança Ética de IA</div>
                <div className="text-xs font-bold text-white">Resolução CNJ nº 332/2020</div>
              </div>
            </div>

            <div className="px-3.5 py-2.5 rounded-lg bg-dark-input border border-dark-border flex items-center gap-3">
              <Database className="w-4 h-4 text-sky-400" />
              <div>
                <div className="text-[11px] text-dark-muted font-medium">Acervo Jurisprudencial</div>
                <div className="text-xs font-bold text-white">STF, STJ &amp; Tribunais</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Search & Filter Toolbar */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'ALL', label: 'Todos os Agentes' },
            { id: 'JURISPRUDENCE', label: 'Jurisprudência' },
            { id: 'CONTRADICTION_AUDIT', label: 'Auditoria de Provas' },
            { id: 'DOCUMENT_GENERATION', label: 'Redação Forense' },
            { id: 'PROCESS_MANAGEMENT', label: 'Gestão de Pautas' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap min-h-[36px] ${
                filterCategory === cat.id
                  ? 'bg-crimson text-white border-crimson shadow-sm font-semibold'
                  : 'bg-dark-input border-dark-border text-dark-muted hover:text-white hover:bg-dark-pill'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-dark-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome, função ou dados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-input border border-dark-border rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson transition-colors shadow-inner min-h-[36px]"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Agent Cards Grid */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5 flex-1">
        {filteredAgents.map((agent) => {
          const badge = getCategoryBadge(agent.category);
          return (
            <div
              key={agent.id}
              className="bg-dark-card border border-dark-border hover:border-crimson/60 rounded-2xl p-5 shadow-xl transition-colors duration-200 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                {/* Top Row: Icon, Title & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-dark-input group-hover:bg-crimson/15 border border-dark-border group-hover:border-crimson/40 transition-colors shadow-md">
                      {getAgentIcon(agent.icon)}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white group-hover:text-red-300 transition-colors">
                        {agent.name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-dark-input text-dark-muted font-mono border border-dark-border">
                          {agent.agentType.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="flex items-center gap-1 text-[11px] status-badge-success px-2.5 py-1 rounded-lg border font-semibold shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Ativo</span>
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-dark-muted leading-relaxed">
                  {agent.description}
                </p>

                {/* Capabilities Chips */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Habilidades do Agente:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.capabilities.map((cap, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-dark-input text-slate-300 border border-dark-border/80 font-medium"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Data Stores & Model Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-dark-border/60 text-[11px] text-dark-muted">
                  <div className="flex items-center gap-1.5 truncate tabular-nums">
                    <Database className="w-3.5 h-3.5 text-crimson shrink-0" />
                    <span className="truncate">Data Stores: <strong className="text-slate-200">{agent.dataStores.length} conectados</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Cpu className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">Modelo: <strong className="text-slate-200 font-mono">{agent.defaultModel || 'gemini-4-argon'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Bottom Action Button: Go to Agent Conversations */}
              <div className="pt-5 mt-4 border-t border-dark-border flex items-center justify-between gap-3">
                <span className="text-[11px] text-dark-muted flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sessões Multi-turn via StreamAssist</span>
                </span>

                <Link
                  href={`/agents/${agent.id}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-white text-xs font-bold transition-colors shadow-md shadow-crimson/20 min-h-[36px]"
                >
                  <span>Abrir Conversas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
