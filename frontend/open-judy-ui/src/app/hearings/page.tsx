'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Hearing } from '@/lib/types';
import UploadModal from '@/components/UploadModal';
import { useAuth } from '@/lib/auth-context';
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
  ArrowRight,
  Video,
  Music,
  LayoutGrid,
  LayoutList,
  Building2,
  Users,
  Clock
} from 'lucide-react';

export default function HearingsPage() {
  const { config, updateConfig, openPreferencesWithTab } = useAuth();
  const viewMode = (config?.hearingsViewMode as 'TABLE' | 'CARDS') || 'TABLE';

  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterMediaType, setFilterMediaType] = useState<'ALL' | 'VIDEO' | 'AUDIO'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const router = useRouter();

  const handleToggleViewMode = (mode: 'TABLE' | 'CARDS') => {
    updateConfig({ hearingsViewMode: mode });
  };

  useEffect(() => {
    api.listHearings().then(setHearings);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterMediaType]);

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

  const isVideoHearing = (h: Hearing) => {
    return (
      h.mediaType === 'VIDEO' ||
      (h.audioFilename &&
        (h.audioFilename.endsWith('.mp4') ||
          h.audioFilename.endsWith('.webm') ||
          h.audioFilename.endsWith('.mkv')))
    );
  };

  const filteredHearings = hearings.filter((h, idx) => {
    const badge = getStatusBadge(idx);
    const matchesFilter = filterStatus ? badge.label.toLowerCase() === filterStatus.toLowerCase() : true;
    const isVideo = isVideoHearing(h);
    const matchesMedia =
      filterMediaType === 'ALL'
        ? true
        : filterMediaType === 'VIDEO'
        ? isVideo
        : !isVideo;
    const matchesSearch = searchTerm
      ? h.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.courtJurisdiction.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesFilter && matchesMedia && matchesSearch;
  });

  const totalItems = filteredHearings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedHearings = filteredHearings.slice(startIndex, startIndex + pageSize);

  const handleSelectAll = () => {
    if (selectedIds.length === paginatedHearings.length && paginatedHearings.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedHearings.map((h) => h.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between space-y-6 animate-in fade-in min-h-[calc(100vh-8rem)]">
      <div className="space-y-6 flex-1 flex flex-col">
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

            <div className="w-px h-4 bg-dark-border mx-1 hidden sm:block" />

            {/* Media Type Filter */}
            <div className="flex items-center p-0.5 bg-dark-input rounded-xl border border-dark-border">
              <button
                onClick={() => setFilterMediaType('ALL')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                  filterMediaType === 'ALL'
                    ? 'bg-dark-pill text-white'
                    : 'text-dark-muted hover:text-white'
                }`}
              >
                Todas Mídias
              </button>
              <button
                onClick={() => setFilterMediaType('VIDEO')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                  filterMediaType === 'VIDEO'
                    ? 'bg-crimson text-white shadow-sm'
                    : 'text-dark-muted hover:text-white'
                }`}
              >
                <Video className="w-2.5 h-2.5" />
                <span>Vídeos</span>
              </button>
              <button
                onClick={() => setFilterMediaType('AUDIO')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                  filterMediaType === 'AUDIO'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-dark-muted hover:text-white'
                }`}
              >
                <Music className="w-2.5 h-2.5" />
                <span>Áudios</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Toggle (Table vs Cards) */}
          <div className="flex items-center p-1 bg-dark-input rounded-xl border border-dark-border">
            <button
              onClick={() => handleToggleViewMode('TABLE')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'TABLE'
                  ? 'bg-crimson text-white shadow-sm'
                  : 'text-dark-muted hover:text-white hover:bg-dark-pill/50'
              }`}
              title="Exibir como Tabela"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Tabela</span>
            </button>
            <button
              onClick={() => handleToggleViewMode('CARDS')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'CARDS'
                  ? 'bg-crimson text-white shadow-sm'
                  : 'text-dark-muted hover:text-white hover:bg-dark-pill/50'
              }`}
              title="Exibir como Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Cards</span>
            </button>
          </div>

          {/* Sort Dropdown */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-xs text-slate-300 transition">
            <ArrowUpDown className="w-3 h-3 text-dark-muted" />
            <span className="font-semibold text-white uppercase text-[10px] tracking-wider">
              PADRÃO
            </span>
            <ChevronDown className="w-3 h-3 text-dark-muted" />
          </button>

          {/* Settings button */}
          <button
            onClick={() => openPreferencesWithTab('ui')}
            className="p-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition"
            title="Configurações e Preferências de Exibição"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content: Table View vs Card Grid View */}
      {viewMode === 'TABLE' ? (
        /* Dark Data Grid Table */
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-dark-border bg-dark-bg/50 text-dark-muted text-[11px]">
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === paginatedHearings.length && paginatedHearings.length > 0}
                      onChange={handleSelectAll}
                      className="rounded bg-dark-input border-dark-border text-crimson focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold text-slate-300">
                    Processo (CNJ) / Mídia ▾
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
                {paginatedHearings.map((h, idx) => {
                  const badge = getStatusBadge(startIndex + idx);
                  const isSelected = selectedIds.includes(h.id);
                  const isVideo = isVideoHearing(h);

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

                      {/* Case Number & Media Icon */}
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        <Link
                          href={`/hearings/${h.id}`}
                          className="hover:text-crimson transition flex items-center gap-2 group-hover:translate-x-0.5 duration-150"
                        >
                          <span
                            className={`p-1 rounded-md border ${
                              isVideo
                                ? 'bg-crimson/10 border-crimson/30 text-crimson'
                                : 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400'
                            }`}
                            title={isVideo ? 'Audiência com Gravação em Vídeo' : 'Audiência com Gravação em Áudio'}
                          >
                            {isVideo ? <Video className="w-3 h-3" /> : <Music className="w-3 h-3" />}
                          </span>
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
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
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
                          <div className="w-6 h-6 rounded-full bg-slate-800 border border-dark-border flex items-center justify-center text-[9px] font-bold text-slate-200 shrink-0">
                            AW
                          </div>
                          <span className="text-xs text-slate-300">
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
        </div>
      ) : (
        /* Cards View (Grid) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedHearings.map((h, idx) => {
            const badge = getStatusBadge(startIndex + idx);
            const isSelected = selectedIds.includes(h.id);
            const isVideo = isVideoHearing(h);

            return (
              <div
                key={h.id}
                className={`bg-dark-card border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:border-dark-muted/60 hover:shadow-xl group relative ${
                  isSelected
                    ? 'border-crimson ring-1 ring-crimson/50 bg-crimson/[0.03]'
                    : 'border-dark-border hover:bg-dark-card/90'
                }`}
              >
                {/* Top: Checkbox, Media Type & Status */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(h.id)}
                        className="rounded bg-dark-input border-dark-border text-crimson focus:ring-0 cursor-pointer mt-0.5"
                      />
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          isVideo
                            ? 'bg-crimson/10 border-crimson/30 text-crimson'
                            : 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400'
                        }`}
                      >
                        {isVideo ? <Video className="w-3 h-3" /> : <Music className="w-3 h-3" />}
                        <span>{isVideo ? 'Vídeo' : 'Áudio'}</span>
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                  </div>

                  {/* Case Number Header */}
                  <div>
                    <Link
                      href={`/hearings/${h.id}`}
                      className="font-mono text-sm font-bold text-white hover:text-crimson transition flex items-center gap-1.5 group-hover:translate-x-0.5 duration-150"
                    >
                      <span className="truncate">{h.caseNumber}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-crimson opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-dark-input text-slate-300 border border-dark-border">
                        {getTypeBadge(h.hearingType)}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40 font-semibold">
                        <Check className="w-3 h-3" />
                        <span>Gemini 2.0</span>
                      </div>
                    </div>
                  </div>

                  {/* Jurisdiction & Details */}
                  <div className="space-y-1.5 text-xs text-dark-muted border-t border-dark-border/40 pt-2.5">
                    <p className="flex items-start gap-1.5 line-clamp-2 text-slate-300 text-[11px]">
                      <Building2 className="w-3.5 h-3.5 text-dark-muted shrink-0 mt-0.5" />
                      <span>{h.courtJurisdiction}</span>
                    </p>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="flex items-center gap-1 text-dark-muted">
                        <Users className="w-3 h-3 text-dark-muted" />
                        <span>{h.participants?.length || 5} partes</span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-crimson" />
                        Dra. Camila
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 mt-3 border-t border-dark-border/50 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-dark-muted font-mono">
                    {Math.round(h.audioDurationSeconds || 142)}s • Diarizado
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {}}
                      className="p-1.5 rounded-lg text-dark-muted hover:text-white hover:bg-dark-pill transition"
                      title="Excluir Audiência"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      href={`/hearings/${h.id}`}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-crimson/15 hover:bg-crimson border border-crimson/30 hover:border-crimson text-red-200 hover:text-white text-xs font-semibold transition shadow-sm"
                    >
                      <span>Abrir</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Standalone Bottom Page Select & Pagination Bar (Permanently pinned at bottom with sticky backdrop) */}
      <div className="sticky bottom-0 z-20 mt-auto bg-dark-card/95 backdrop-blur-md border border-dark-border rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-dark-muted shadow-2xl">
        {/* Left: Bulk actions with selection badge */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-dark-muted text-xs">Ações com selecionados:</span>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-slate-300 text-xs transition font-medium">
            <span>Alterar status</span>
            <ChevronDown className="w-3 h-3 text-dark-muted" />
          </button>
          {selectedIds.length > 0 && (
            <span className="px-2.5 py-1 rounded-xl bg-crimson/15 text-red-300 border border-crimson/30 text-[11px] font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-crimson" />
              <span>{selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}</span>
            </span>
          )}
        </div>

        {/* Right: Items per page dropdown & page navigation controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-dark-muted">Itens por página:</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-dark-input hover:bg-dark-pill border border-dark-border rounded-xl pl-3 pr-7 py-1.5 text-xs text-white focus:outline-none focus:border-crimson cursor-pointer transition appearance-none font-medium"
              >
                <option value={5} className="bg-dark-card text-white">5</option>
                <option value={10} className="bg-dark-card text-white">10</option>
                <option value={20} className="bg-dark-card text-white">20</option>
                <option value={50} className="bg-dark-card text-white">50</option>
              </select>
              <ChevronDown className="w-3 h-3 text-dark-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <span className="font-mono text-slate-300">
            {totalItems === 0 ? '0-0' : `${startIndex + 1}-${Math.min(startIndex + pageSize, totalItems)}`} de {totalItems}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="p-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
              title="Página Anterior"
            >
              ‹
            </button>
            <span className="text-xs font-mono px-2.5 py-1 rounded-xl bg-dark-input border border-dark-border text-slate-200">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="p-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
              title="Próxima Página"
            >
              ›
            </button>
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
