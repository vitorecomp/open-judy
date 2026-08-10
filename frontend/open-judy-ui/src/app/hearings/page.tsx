'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Hearing } from '@/lib/types';
import UploadModal from '@/components/UploadModal';
import {
  Settings,
  Plus,
  ArrowUpDown,
  Filter,
  X,
  ChevronDown,
  Trash2,
  Edit2,
  Check,
  Search,
  Scale,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function HearingsPage() {
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api.listHearings().then(setHearings);
  }, []);

  const handleSelectAll = () => {
    if (selectedIds.length === filteredHearings.length && filteredHearings.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredHearings.map((h) => h.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Helper for status badge styling
  const getStatusBadge = (index: number) => {
    switch (index % 4) {
      case 0:
        return {
          label: 'urgente',
          bg: 'bg-[#381c22]',
          text: 'text-red-400',
          dot: 'bg-crimson',
          border: 'border-red-900/40',
        };
      case 1:
        return {
          label: 'em análise',
          bg: 'bg-[#382a1c]',
          text: 'text-amber-300',
          dot: 'bg-amber-400',
          border: 'border-amber-900/40',
        };
      case 2:
        return {
          label: 'concluída',
          bg: 'bg-[#1a3328]',
          text: 'text-emerald-300',
          dot: 'bg-emerald-400',
          border: 'border-emerald-900/40',
        };
      default:
        return {
          label: 'suspensa',
          bg: 'bg-[#1c2838]',
          text: 'text-sky-300',
          dot: 'bg-sky-400',
          border: 'border-sky-900/40',
        };
    }
  };

  const getTypeBadge = (type: string) => {
    const formatted = type.replace(/_/g, ' ');
    if (formatted.includes('INSTRUCAO')) return 'Instrução';
    if (formatted.includes('CONCILIACAO')) return 'Conciliação';
    if (formatted.includes('UNA')) return 'Una Trabalhista';
    if (formatted.includes('CUSTODIA')) return 'Custódia';
    if (formatted.includes('INTERROGATORIO')) return 'Interrogatório';
    return 'Geral';
  };

  const filteredHearings = hearings.filter((h, idx) => {
    const badge = getStatusBadge(idx);
    const matchesFilter = filterStatus ? badge.label.toLowerCase() === filterStatus.toLowerCase() : true;
    const matchesSearch = searchTerm
      ? h.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.courtJurisdiction.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in">
      {/* Top Banner / Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-dark-muted mb-1">
            <Link href="/" className="hover:text-white transition">Dashboard</Link>
            <span>/</span>
            <span className="text-white font-medium">Audiências & Pautas</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-crimson" />
            <span>Pauta Geral de Audiências</span>
          </h1>
          <p className="text-xs text-dark-muted mt-0.5">
            Gerenciamento de sessões, diarização multimodal com Gemini 2.0 e atas oficiais
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-xs font-bold text-white uppercase tracking-wider shadow-md shadow-crimson/25 transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Audiência</span>
          </button>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-dark-card border border-dark-border rounded-2xl p-3 shadow-md">
        {/* Search Bar & Filter Chips */}
        <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-[280px]">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-dark-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar processo, comarca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-dark-input hover:bg-dark-pill border border-dark-border rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson transition"
            />
          </div>

          {/* Filter Status Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['todos', 'urgente', 'em análise', 'concluída', 'suspensa'].map((st) => {
              const isActive = st === 'todos' ? filterStatus === null : filterStatus === st;
              return (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st === 'todos' ? null : st)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition capitalize ${
                    isActive
                      ? 'bg-crimson text-white border-crimson shadow-sm'
                      : 'bg-dark-input border-dark-border text-dark-muted hover:text-white hover:bg-dark-pill'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort Dropdown */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-xs text-slate-300 transition">
            <ArrowUpDown className="w-3 h-3 text-dark-muted" />
            <span className="font-semibold text-white uppercase text-[10px] tracking-wider">
              PADRÃO
            </span>
            <ChevronDown className="w-3 h-3 text-dark-muted" />
          </button>

          {/* Settings button */}
          <button className="p-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition" title="Configurações da tabela">
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dark Data Grid Table */}
      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-dark-border bg-dark-bg/50 text-dark-muted text-[11px]">
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredHearings.length && filteredHearings.length > 0}
                    onChange={handleSelectAll}
                    className="rounded bg-dark-input border-dark-border text-crimson focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 font-semibold text-slate-300">
                  Número do Processo (CNJ) ▾
                </th>
                <th className="py-3 px-4 font-semibold text-slate-300">Status ▾</th>
                <th className="py-3 px-4 font-semibold text-slate-300">Tipo ▾</th>
                <th className="py-3 px-4 font-semibold text-slate-300">Vara / Juízo ▾</th>
                <th className="py-3 px-4 font-semibold text-slate-300 text-center">Status IA ▾</th>
                <th className="py-3 px-4 font-semibold text-slate-300">Partes & Depoentes</th>
                <th className="py-3 px-4 font-semibold text-slate-300">Magistrado(a)</th>
                <th className="py-3 px-4 font-semibold text-slate-300 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-dark-border/40">
              {filteredHearings.map((h, idx) => {
                const badge = getStatusBadge(idx);
                const isSelected = selectedIds.includes(h.id);

                return (
                  <tr
                    key={h.id}
                    className={`group transition-colors ${
                      isSelected
                        ? 'bg-crimson/5 hover:bg-crimson/10'
                        : 'hover:bg-dark-pill/30'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(h.id)}
                        className="rounded bg-dark-input border-dark-border text-crimson focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Case Number */}
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      <Link
                        href={`/hearings/${h.id}`}
                        className="hover:text-crimson transition flex items-center gap-2 group-hover:translate-x-0.5 duration-150"
                      >
                        <span>{h.caseNumber}</span>
                        <ArrowRight className="w-3 h-3 text-crimson opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>

                    {/* Status Pill */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-dark-input text-slate-200 border border-dark-border">
                        {getTypeBadge(h.hearingType)}
                      </span>
                    </td>

                    {/* Court Jurisdiction */}
                    <td className="py-3.5 px-4 text-slate-300 font-medium max-w-xs truncate">
                      {h.courtJurisdiction}
                    </td>

                    {/* Status IA Busy/Ready Icon */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-dark-input border border-dark-border text-slate-300">
                        {h.status === 'READY' ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <span className="text-[10px] text-amber-400">?</span>
                        )}
                      </div>
                    </td>

                    {/* Drivers / Participants Avatar Stack */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-dark-border flex items-center justify-center text-[9px] font-bold text-slate-200">
                          AW
                        </div>
                        <span className="text-xs text-slate-300 truncate max-w-[120px]">
                          {h.participants[1]?.name || 'Mariana Ribeiro'}
                        </span>
                      </div>
                    </td>

                    {/* Manager / Judge */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-crimson/20 border border-crimson/40 flex items-center justify-center text-[9px] font-bold text-red-300">
                          CV
                        </div>
                        <span className="text-xs text-slate-300">
                          Dra. Camila
                        </span>
                      </div>
                    </td>

                    {/* Actions: Trash, Edit, Open */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-dark-muted">
                        <button
                          onClick={() => {}}
                          className="p-1.5 rounded-lg hover:text-white hover:bg-dark-pill transition"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/hearings/${h.id}`}
                          className="p-1.5 rounded-lg hover:text-crimson hover:bg-dark-pill transition"
                          title="Abrir Audiência"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Bulk actions & Pagination */}
        <div className="p-4 bg-dark-bg/60 border-t border-dark-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-dark-muted">
          {/* Left: Actions with selected */}
          <div className="flex items-center gap-2">
            <span>Ações com selecionados:</span>
            <button className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-slate-300 text-xs transition">
              <span>Alterar status</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Right: Items per page & Pagination */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Itens por página:</span>
              <button className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-dark-input border border-dark-border text-slate-300 text-xs">
                <span>{filteredHearings.length}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            <span>1-{filteredHearings.length} de {hearings.length || 5}</span>

            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-lg bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition disabled:opacity-40">
                ‹
              </button>
              <button className="p-1.5 rounded-lg bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition disabled:opacity-40">
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(id) => {
          setIsUploadOpen(false);
          router.push(`/hearings/${id}`);
        }}
      />
    </div>
  );
}
