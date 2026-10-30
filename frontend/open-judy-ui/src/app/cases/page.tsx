'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Case } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import {
  Layers,
  Scale,
  FileText,
  Search,
  Plus,
  LayoutGrid,
  LayoutList,
  Building2,
  Users,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Calendar,
  X,
  Check,
  FileCheck,
  FolderOpen
} from 'lucide-react';

export default function CasesPage() {
  const router = useRouter();
  const { config, updateConfig } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Case Form State
  const [newCaseNumber, setNewCaseNumber] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newCourt, setNewCourt] = useState('');
  const [newBranch, setNewBranch] = useState('CIVIL');
  const [newPlaintiff, setNewPlaintiff] = useState('');
  const [newDefendant, setNewDefendant] = useState('');
  const [newJudge, setNewJudge] = useState('');

  const viewMode = (config?.hearingsViewMode as 'TABLE' | 'CARDS') || 'CARDS';

  const handleToggleViewMode = (mode: 'TABLE' | 'CARDS') => {
    updateConfig({ hearingsViewMode: mode });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('search');
      if (q) setSearchTerm(q);
    }
    loadCases();
  }, []);

  const loadCases = async () => {
    setLoading(true);
    try {
      const data = await api.listCases();
      setCases(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseNumber || !newSubject || !newPlaintiff || !newDefendant) return;

    try {
      const created = await api.createCase({
        caseNumber: newCaseNumber.trim(),
        courtJurisdiction: newCourt.trim(),
        legalBranch: newBranch,
        subject: newSubject.trim(),
        plaintiffName: newPlaintiff.trim(),
        defendantName: newDefendant.trim(),
        judgeName: newJudge.trim(),
        status: 'DISTRIBUIDO',
        documents: [],
        participants: [
          { id: '1', name: newPlaintiff.trim(), role: 'AUTOR', isPresent: true },
          { id: '2', name: newDefendant.trim(), role: 'REU', isPresent: true }
        ],
      });

      setCases((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      setIsCreateModalOpen(false);
      resetForm();
      router.push(`/cases/${created.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setNewCaseNumber('');
    setNewSubject('');
    setNewPlaintiff('');
    setNewDefendant('');
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.plaintiffName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.defendantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.courtJurisdiction?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBranch = filterBranch === 'ALL' || c.legalBranch === filterBranch;
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;

    return matchesSearch && matchesBranch && matchesStatus;
  });

  const getBranchBadge = (branch: string) => {
    switch (branch) {
      case 'LABOR':
      case 'TRABALHISTA':
        return { label: 'Trabalhista', bg: 'bg-emerald-950/40', text: 'text-emerald-300', border: 'border-emerald-800/40' };
      case 'CRIMINAL':
        return { label: 'Criminal', bg: 'bg-red-950/40', text: 'text-red-300', border: 'border-red-800/40' };
      case 'FAMILY':
      case 'FAMILIA':
        return { label: 'Família', bg: 'bg-indigo-950/40', text: 'text-indigo-300', border: 'border-indigo-800/40' };
      default:
        return { label: 'Cível', bg: 'bg-sky-950/40', text: 'text-sky-300', border: 'border-sky-800/40' };
    }
  };

  const totalDocuments = cases.reduce((acc, c) => acc + (c.documents?.length || 0), 0);

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 animate-in fade-in">
      {/* ========================================================================= */}
      {/* Top Header Card */}
      {/* ========================================================================= */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-dark-muted">
            <Link href="/" className="hover:text-white transition-colors">Gabinete &amp; Expediente</Link>
            <span>/</span>
            <span className="text-white font-medium">Autos Processuais (Res. CNJ nº 65/2008)</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5 font-serif">
            <Layers className="w-6 h-6 text-crimson" />
            <span>Acervo de Autos Processuais Digitais (Numeração Única CNJ — Res. nº 65/2008)</span>
          </h1>

          <p className="text-xs text-dark-muted leading-relaxed">
            Escrituração eletrônica dos autos, peças processuais, termos de audiência e laudos periciais vinculados à jurisdição competente.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-2 rounded-lg bg-dark-input border border-dark-border">
            <div className="text-[11px] text-dark-muted font-medium">Autos em Tramitação</div>
            <div className="text-sm font-bold text-white font-mono tabular-nums">{cases.length} Autos</div>
          </div>
          <div className="px-3.5 py-2 rounded-lg bg-dark-input border border-dark-border">
            <div className="text-[11px] text-dark-muted font-medium">Peças Juntadas</div>
            <div className="text-sm font-bold text-emerald-400 font-mono tabular-nums">{totalDocuments} Peças</div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-crimson hover:bg-crimson-dark text-white text-xs font-semibold transition-colors shadow-sm min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            <span>Autuar Novo Processo</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Search & Filter Toolbar */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Branch Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'ALL', label: 'Todos os Ramos' },
            { id: 'CIVIL', label: 'Cível' },
            { id: 'LABOR', label: 'Trabalhista' },
            { id: 'CRIMINAL', label: 'Criminal' },
          ].map((branch) => (
            <button
              key={branch.id}
              onClick={() => setFilterBranch(branch.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap min-h-[36px] ${
                filterBranch === branch.id
                  ? 'bg-crimson text-white border-crimson shadow-sm font-semibold'
                  : 'bg-dark-input border-dark-border text-dark-muted hover:text-white hover:bg-dark-pill'
              }`}
            >
              {branch.label}
            </button>
          ))}
        </div>

        {/* Right Tools: Search & View Mode Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-dark-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por número CNJ, partes ou vara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-input border border-dark-border rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson transition-colors shadow-inner min-h-[36px]"
            />
          </div>

          <div className="flex items-center bg-dark-input border border-dark-border rounded-xl p-1 shrink-0">
            <button
              onClick={() => handleToggleViewMode('CARDS')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center ${
                viewMode === 'CARDS'
                  ? 'bg-crimson text-white shadow-sm'
                  : 'text-dark-muted hover:text-white'
              }`}
              title="Exibição em Cards"
              aria-label="Exibir processos em grade de cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleToggleViewMode('TABLE')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center ${
                viewMode === 'TABLE'
                  ? 'bg-crimson text-white shadow-sm'
                  : 'text-dark-muted hover:text-white'
              }`}
              title="Exibição em Tabela"
              aria-label="Exibir processos em tabela"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Content: Cards View vs Table View */}
      {/* ========================================================================= */}
      {filteredCases.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center space-y-3">
          <FolderOpen className="w-12 h-12 text-dark-muted mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum processo encontrado</h3>
          <p className="text-xs text-dark-muted max-w-sm mx-auto">
            Não foram localizados autos com os filtros aplicados. Tente ajustar os termos de busca ou registre um novo processo.
          </p>
        </div>
      ) : viewMode === 'CARDS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCases.map((c) => {
            const branchBadge = getBranchBadge(c.legalBranch);
            const docCount = c.documents?.length || 0;

            return (
              <div
                key={c.id}
                className="bg-dark-card border border-dark-border hover:border-crimson/60 rounded-lg p-5 shadow-sm transition-colors duration-200 flex flex-col justify-between group"
              >
                <div className="space-y-3.5">
                  {/* Card Header: CNJ Number & Branch */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-dark-muted font-medium">Nº Único CNJ (Res. 65/2008)</span>
                      <Link
                        href={`/cases/${c.id}`}
                        className="text-sm font-bold text-white font-mono tabular-nums group-hover:text-crimson transition-colors block"
                      >
                        {c.caseNumber}
                      </Link>
                    </div>

                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${branchBadge.bg} ${branchBadge.text} ${branchBadge.border} shrink-0`}>
                      {branchBadge.label}
                    </span>
                  </div>

                  {/* Subject */}
                  <p className="text-xs font-semibold text-slate-200 line-clamp-2 leading-relaxed">
                    {c.subject}
                  </p>

                  {/* Parties & Court */}
                  <div className="p-3 rounded-lg bg-dark-input/60 border border-dark-border/60 space-y-2 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Users className="w-3.5 h-3.5 text-crimson shrink-0" />
                      <span className="truncate text-dark-muted">
                        <strong className="text-slate-300 font-medium">Polo Ativo:</strong> {c.plaintiffName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate text-dark-muted">
                        <strong className="text-slate-300 font-medium">Polo Passivo:</strong> {c.defendantName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 truncate pt-1 border-t border-dark-border/40 text-[11px] text-dark-muted">
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{c.courtJurisdiction}</span>
                    </div>
                  </div>

                  {/* Documents & Status Counter */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="flex items-center gap-1.5 text-emerald-300 font-medium bg-emerald-950/30 px-2.5 py-1 rounded-md border border-emerald-900/30 tabular-nums">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{docCount} peça{docCount === 1 ? '' : 's'} nos autos</span>
                    </span>

                    <span className="text-[11px] text-dark-muted font-mono">
                      {c.status || 'EM TRAMITAÇÃO'}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Link */}
                <div className="pt-4 mt-4 border-t border-dark-border flex items-center justify-between">
                  <span className="text-[11px] text-dark-muted font-medium">
                    Magistrado(a): {c.judgeName}
                  </span>

                  <Link
                    href={`/cases/${c.id}`}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-crimson hover:bg-crimson-dark text-white text-xs font-semibold transition-colors shadow-sm min-h-[36px]"
                  >
                    <span>Consultar Autos</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-dark-bg/80 border-b border-dark-border text-dark-muted text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Nº Único CNJ / Competência</th>
                  <th className="py-3 px-4 font-semibold">Classe / Assunto Processual</th>
                  <th className="py-3 px-4 font-semibold">Polo Ativo / Polo Passivo</th>
                  <th className="py-3 px-4 font-semibold">Órgão Julgador &amp; Magistrado(a)</th>
                  <th className="py-3 px-4 text-center font-semibold">Peças nos Autos</th>
                  <th className="py-3 px-4 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {filteredCases.map((c) => {
                  const branchBadge = getBranchBadge(c.legalBranch);
                  const docCount = c.documents?.length || 0;

                  return (
                    <tr key={c.id} className="hover:bg-dark-input/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-white tabular-nums">
                        <Link href={`/cases/${c.id}`} className="hover:text-red-300 transition-colors">
                          {c.caseNumber}
                        </Link>
                        <div className="mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${branchBadge.bg} ${branchBadge.text} ${branchBadge.border}`}>
                            {branchBadge.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs font-medium text-slate-200">
                        {c.subject}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="truncate max-w-[200px]"><strong className="text-white">A:</strong> {c.plaintiffName}</div>
                        <div className="truncate max-w-[200px] text-dark-muted"><strong className="text-slate-400">R:</strong> {c.defendantName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-white truncate max-w-[200px]">{c.courtJurisdiction}</div>
                        <div className="text-dark-muted text-[11px] truncate max-w-[200px]">{c.judgeName}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 font-bold font-mono text-[11px] tabular-nums">
                          <FileCheck className="w-3 h-3 text-emerald-400" />
                          <span>{docCount}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/cases/${c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-crimson hover:bg-crimson-dark text-white text-xs font-bold transition-colors shadow-sm min-h-[36px]"
                        >
                          <span>Abrir</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Create Case Modal */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-dark-card border border-dark-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-dark-border pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-crimson" />
                <h2 className="text-base font-bold text-white">Cadastrar Novo Processo Judicial</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-dark-input text-dark-muted hover:text-white transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                aria-label="Fechar modal de cadastro de processo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Número do Processo (CNJ) *</label>
                <input
                  type="text"
                  required
                  placeholder="0014238-89.2024.8.26.0100"
                  value={newCaseNumber}
                  onChange={(e) => setNewCaseNumber(e.target.value)}
                  className="w-full bg-dark-input border border-dark-border rounded-xl px-3.5 py-2 text-white placeholder-dark-muted focus:outline-none focus:border-crimson font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ramo do Direito</label>
                  <select
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                    aria-label="Selecionar ramo do direito"
                    className="w-full bg-dark-input border border-dark-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-crimson"
                  >
                    <option value="CIVIL">Cível</option>
                    <option value="LABOR">Trabalhista</option>
                    <option value="CRIMINAL">Criminal</option>
                    <option value="FAMILY">Família e Sucessões</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Vara / Jurisdição</label>
                  <input
                    type="text"
                    value={newCourt}
                    onChange={(e) => setNewCourt(e.target.value)}
                    className="w-full bg-dark-input border border-dark-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-crimson"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assunto / Causa de Pedir *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Indenização por Danos Morais e Rescisão Contratual"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-dark-input border border-dark-border rounded-xl px-3.5 py-2 text-white placeholder-dark-muted focus:outline-none focus:border-crimson"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome do Autor (Polo Ativo) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome completo do autor"
                    value={newPlaintiff}
                    onChange={(e) => setNewPlaintiff(e.target.value)}
                    className="w-full bg-dark-input border border-dark-border rounded-xl px-3 py-2 text-white placeholder-dark-muted focus:outline-none focus:border-crimson"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome do Réu (Polo Passivo) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome completo do réu / empresa"
                    value={newDefendant}
                    onChange={(e) => setNewDefendant(e.target.value)}
                    className="w-full bg-dark-input border border-dark-border rounded-xl px-3 py-2 text-white placeholder-dark-muted focus:outline-none focus:border-crimson"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Magistrado Responsável</label>
                <input
                  type="text"
                  value={newJudge}
                  onChange={(e) => setNewJudge(e.target.value)}
                  className="w-full bg-dark-input border border-dark-border rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-crimson"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-dark-input hover:bg-dark-pill text-dark-muted hover:text-white font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-white font-bold transition shadow-md shadow-crimson/20 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Cadastrar Processo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
