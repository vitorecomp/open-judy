'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, formatPromptVersionBadge, extractPromptVersionNumber } from '@/lib/api';
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
  Clock,
  Play
} from 'lucide-react';

export default function HearingsPage() {
  const { config, updateConfig, openPreferencesWithTab } = useAuth();
  const viewMode = (config?.hearingsViewMode as 'TABLE' | 'CARDS') || 'TABLE';

  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [blockCounts, setBlockCounts] = useState<Record<string, number>>({});
  const [telemetry, setTelemetry] = useState<import('@/lib/types').PipelineTelemetrySummary | null>(null);
  const [activePromptVersion, setActivePromptVersion] = useState<number>(3);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterMediaType, setFilterMediaType] = useState<'ALL' | 'VIDEO' | 'AUDIO'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewHearing, setPreviewHearing] = useState<Hearing | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const router = useRouter();

  const handleToggleViewMode = (mode: 'TABLE' | 'CARDS') => {
    updateConfig({ hearingsViewMode: mode });
  };

  const getHearingPromptInfo = (h: Hearing) => {
    const label = formatPromptVersionBadge(h.promptVersion, h.pipelineVersion);
    const full =
      h.promptVersion ||
      `PROMPT_AUDIO_VIDEO_TRANSCRIPTION v${activePromptVersion} (${h.pipelineVersion || 'OPT_V1_DIARIZATION_SURGICAL'})`;
    const verNum = extractPromptVersionNumber(full, activePromptVersion);
    const hasUpdate = activePromptVersion > verNum;
    return {
      label,
      full,
      verNum,
      hasUpdate,
    };
  };

  const refreshHearingsAndBlocks = async () => {
    const [list, telem, prompts] = await Promise.all([
      api.listHearings(),
      api.getTelemetrySummary(),
      api.getPromptTemplates('TRANSCRIPTION').catch(() => []),
    ]);
    setHearings(list);
    if (Array.isArray(prompts) && prompts.length > 0) {
      const avPrompt =
        prompts.find((p: any) => p?.code === 'PROMPT_AUDIO_VIDEO_TRANSCRIPTION') ||
        prompts[0];
      if (avPrompt?.version) {
        setActivePromptVersion(Number(avPrompt.version));
      }
    }
    if (telem) {
      setTelemetry(telem);
      const counts: Record<string, number> = {};
      for (const [hid, stats] of Object.entries(telem.hearings || {})) {
        counts[hid] = stats.completedBlocks || 0;
      }
      setBlockCounts(counts);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('search');
      if (q) setSearchTerm(q);
    }
    refreshHearingsAndBlocks();
  }, []);

  useEffect(() => {
    const hasActivePipeline = hearings.some(
      (h) => h.status === 'PROCESSING_TRANSCRIPTION' || h.status === 'PENDING_UPLOAD'
    );
    if (!hasActivePipeline) return;
    const interval = setInterval(() => {
      refreshHearingsAndBlocks();
    }, 3000);
    return () => clearInterval(interval);
  }, [hearings]);

  const handleDeleteHearing = async (id: string) => {
    await api.deleteHearing(id);
    setHearings((prev) => prev.filter((h) => h.id !== id));
    setSelectedIds((prev) => prev.filter((i) => i !== id));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterMediaType]);

  const formatEtaMs = (ms: number) => {
    const totalSec = Math.max(1, Math.round(ms / 1000));
    if (totalSec >= 3600) {
      const h = Math.floor(totalSec / 3600);
      const m = Math.ceil((totalSec % 3600) / 60);
      return `${h}h ${m}m`;
    }
    if (totalSec >= 60) {
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return s > 0 ? `${m}m ${s}s` : `${m}m`;
    }
    return `${totalSec}s`;
  };

  const getHearingEtaInfo = (h: Hearing) => {
    const expectedTotal =
      h.audioDurationSeconds && h.audioDurationSeconds > 600
        ? Math.ceil(h.audioDurationSeconds / 600)
        : 1;
    const hStats = telemetry?.hearings?.[h.id];
    const readyBlocks = hStats?.completedBlocks ?? (blockCounts[h.id] || 0);
    const avgPartMs =
      hStats?.averageBlockDurationMs ||
      telemetry?.averagePartDurationMs ||
      34000;
    const remainingParts = Math.max(0, expectedTotal - readyBlocks);
    const activeRefIso = hStats?.processingStartedAt || hStats?.lastCompletedAt;
    const elapsedCurrentMs = activeRefIso
      ? Math.max(
          0,
          Math.min(
            avgPartMs - 2000,
            Date.now() - new Date(activeRefIso).getTime()
          )
        )
      : 0;
    const remainingMs = Math.max(3000, remainingParts * avgPartMs - elapsedCurrentMs);
    const pct = Math.min(100, Math.round((readyBlocks / Math.max(1, expectedTotal)) * 100));
    return {
      readyBlocks,
      expectedTotal,
      avgPartMs,
      remainingMs,
      etaLabel: `~${formatEtaMs(remainingMs)}`,
      avgPartLabel: `${Math.round(avgPartMs / 1000)}s/parte`,
      pct,
    };
  };

  // Helper for pipeline status badge styling per video with live block progress
  // Multiple hearings execute in parallel while each hearing's blocks execute sequentially
  const getPipelineStatusBadge = (status?: string, h?: Hearing) => {
    const expectedTotal = h?.audioDurationSeconds && h.audioDurationSeconds > 600
      ? Math.ceil(h.audioDurationSeconds / 600)
      : 1;
    const readyBlocks = h ? (blockCounts[h.id] || 0) : 0;

    switch (status) {
      case 'TRANSCRIPTION_COMPLETED':
      case 'ANALYSIS_COMPLETED':
      case 'READY':
        return {
          filterKey: 'concluído',
          label: 'concluído',
          badgeClass: 'status-badge-success',
          dot: 'bg-emerald-400',
        };
      case 'PROCESSING_TRANSCRIPTION':
        return {
          filterKey: 'transcrevendo',
          label: `transcrevendo (${readyBlocks}/${expectedTotal})`,
          badgeClass: 'status-badge-warning',
          dot: 'bg-amber-400 animate-pulse',
        };
      case 'PENDING_UPLOAD':
        return {
          filterKey: 'na fila',
          label: 'na fila',
          badgeClass: 'status-badge-info',
          dot: 'bg-sky-400',
        };
      case 'FAILED':
        return {
          filterKey: 'falha',
          label: 'falha',
          badgeClass: 'status-badge-danger',
          dot: 'bg-crimson',
        };
      default:
        return {
          filterKey: 'transcrevendo',
          label: 'transcrevendo',
          badgeClass: 'status-badge-warning',
          dot: 'bg-amber-400 animate-pulse',
        };
    }
  };

  const getInitials = (name: string) => {
    const cleaned = name.replace(/^(Dr\.|Dra\.|Juiz|Juíza|Des\.)\s+/i, '').trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (cleaned.slice(0, 2) || 'IA').toUpperCase();
  };

  const getPresidingParticipant = (h: Hearing) => {
    const parts = h.participants || [];
    return parts.find((p) => p.role === 'MAGISTRADO') || parts[0] || null;
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

  const formatDuration = (seconds?: number) => {
    const s = Math.round(seconds || 0);
    if (s >= 3600) {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    if (s >= 60) {
      const m = Math.floor(s / 60);
      const rem = s % 60;
      return rem > 0 ? `${m}m ${rem}s` : `${m}min`;
    }
    return `${s}s`;
  };

  const formatFileSize = (bytes?: number) => {
    const b = bytes || 0;
    if (b >= 1024 * 1024 * 1024) {
      return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (b >= 1024 * 1024) {
      return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (b > 0) {
      return `${Math.round(b / 1024)} KB`;
    }
    return '';
  };

  const filteredHearings = hearings.filter((h) => {
    const badge = getPipelineStatusBadge(h.status, h);
    const matchesFilter = filterStatus
      ? (badge.filterKey || badge.label).toLowerCase() === filterStatus.toLowerCase()
      : true;
    const isVideo = isVideoHearing(h);
    const matchesMedia =
      filterMediaType === 'ALL'
        ? true
        : filterMediaType === 'VIDEO'
        ? isVideo
        : !isVideo;
    const mediaName = (h.mediaFilename || h.audioFilename || '').toLowerCase();
    const jurisdiction = (h.courtJurisdiction || '').toLowerCase();
    const matchesSearch = searchTerm
      ? h.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jurisdiction.includes(searchTerm.toLowerCase()) ||
        mediaName.includes(searchTerm.toLowerCase())
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
            Gerenciamento de sessões, diarização multimodal de vídeo/áudio com Gemini 3.8 Flash e atas oficiais com Gemini 4 Argon
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
            {['todos', 'concluído', 'transcrevendo', 'na fila', 'falha'].map((st) => {
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
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors min-h-[32px] ${
                  filterMediaType === 'ALL'
                    ? 'bg-dark-pill text-white'
                    : 'text-dark-muted hover:text-white'
                }`}
              >
                Todas Mídias
              </button>
              <button
                onClick={() => setFilterMediaType('VIDEO')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors min-h-[32px] ${
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
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors min-h-[32px] ${
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors min-h-[32px] ${
                viewMode === 'TABLE'
                  ? 'bg-crimson text-white shadow-sm'
                  : 'text-dark-muted hover:text-white hover:bg-dark-pill/50'
              }`}
              title="Exibir como Tabela"
              aria-label="Exibir audiências como tabela"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Tabela</span>
            </button>
            <button
              onClick={() => handleToggleViewMode('CARDS')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors min-h-[32px] ${
                viewMode === 'CARDS'
                  ? 'bg-crimson text-white shadow-sm'
                  : 'text-dark-muted hover:text-white hover:bg-dark-pill/50'
              }`}
              title="Exibir como Cards"
              aria-label="Exibir audiências como grade de cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Cards</span>
            </button>
          </div>

          {/* Sort Dropdown */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-xs text-slate-300 transition-colors min-h-[36px]"
            aria-label="Ordenar audiências"
          >
            <ArrowUpDown className="w-3 h-3 text-dark-muted" />
            <span className="font-semibold text-white text-[11px]">
              Padrão
            </span>
            <ChevronDown className="w-3 h-3 text-dark-muted" />
          </button>

          {/* Settings link */}
          <Link
            href="/settings?tab=ui"
            className="p-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
            title="Configurações e Preferências de Exibição"
            aria-label="Abrir configurações e preferências de exibição"
          >
            <Settings className="w-3.5 h-3.5" />
          </Link>
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
                      aria-label="Selecionar todas as audiências da página"
                      className="rounded bg-dark-input border-dark-border text-crimson focus:ring-0 cursor-pointer w-4 h-4 touch-target-expand"
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
                {paginatedHearings.map((h) => {
                  const badge = getPipelineStatusBadge(h.status, h);
                  const isSelected = selectedIds.includes(h.id);
                  const isVideo = isVideoHearing(h);
                  const presiding = getPresidingParticipant(h);
                  const peopleCount = h.participants?.length || 0;
                  const isCompleted =
                    h.status === 'TRANSCRIPTION_COMPLETED' ||
                    h.status === 'ANALYSIS_COMPLETED' ||
                    h.status === 'READY';

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
                          aria-label={`Selecionar audiência ${h.caseNumber}`}
                          className="rounded bg-dark-input border-dark-border text-crimson focus:ring-0 cursor-pointer w-4 h-4 touch-target-expand"
                        />
                      </td>

                      {/* Case Number & Media Icon */}
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        <Link
                          href={`/hearings/${h.id}`}
                          className="hover:text-crimson transition-colors flex items-start gap-2.5"
                        >
                          <span
                            className={`p-1.5 rounded-md border mt-0.5 shrink-0 ${
                              isVideo
                                ? 'bg-crimson/10 border-crimson/30 text-crimson'
                                : 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400'
                            }`}
                            title={isVideo ? 'Audiência com Gravação em Vídeo' : 'Audiência com Gravação em Áudio'}
                          >
                            {isVideo ? <Video className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-sans font-bold text-xs text-white truncate">
                                {h.mediaFilename || h.audioFilename || h.caseNumber}
                              </span>
                              <ArrowRight className="w-3 h-3 text-crimson opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-mono font-normal text-dark-muted mt-0.5 tabular-nums">
                              <span>{h.caseNumber}</span>
                              <span>•</span>
                              <span className="text-slate-300 font-semibold">{formatDuration(h.audioDurationSeconds)}</span>
                              {h.audioSizeBytes ? (
                                <>
                                  <span>•</span>
                                  <span>{formatFileSize(h.audioSizeBytes)}</span>
                                </>
                              ) : null}
                            </div>
                            {(() => {
                              const promptInfo = getHearingPromptInfo(h);
                              return (
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-indigo-950/40 text-indigo-300 border border-indigo-800/40"
                                    title={`Versão do Prompt utilizada na transcrição: ${promptInfo.full}`}
                                  >
                                    <Sparkles className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                                    <span>Prompt: {promptInfo.label}</span>
                                  </span>
                                  {promptInfo.hasUpdate && (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-950/50 text-amber-300 border border-amber-700/40"
                                      title={`Uma versão mais recente do prompt (v${activePromptVersion}) está ativa no sistema`}
                                    >
                                      <span>Nova v{activePromptVersion} disp.</span>
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </Link>
                      </td>

                      {/* Status Pill & Historical ETA when transcribing */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                          {badge.filterKey === 'transcrevendo' && (() => {
                            const eta = getHearingEtaInfo(h);
                            return (
                              <span className="flex items-center gap-1 text-[11px] font-mono text-amber-300/90 tabular-nums">
                                <Clock className="w-2.5 h-2.5 text-amber-400" />
                                <span>Est. término: {eta.etaLabel} ({eta.avgPartLabel})</span>
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-dark-input text-slate-200 border border-dark-border">
                          {getTypeBadge(h.hearingType)}
                        </span>
                      </td>

                      {/* Court Jurisdiction (Empty if not provided by user) */}
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {h.courtJurisdiction?.trim() || ''}
                      </td>

                      {/* Status IA Busy/Ready Icon */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-dark-input border border-dark-border text-slate-300">
                          {isCompleted ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : h.status === 'FAILED' ? (
                            <X className="w-3 h-3 text-red-400" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          )}
                        </div>
                      </td>

                      {/* Participants Count (AI Extracted) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 border border-dark-border flex items-center justify-center text-[11px] font-bold text-slate-200 shrink-0">
                            <Users className="w-3 h-3 text-slate-300" />
                          </div>
                          <span className="text-xs text-slate-300 tabular-nums">
                            {peopleCount > 0
                              ? `${peopleCount} ${peopleCount === 1 ? 'pessoa' : 'pessoas'}`
                              : h.status === 'PROCESSING_TRANSCRIPTION'
                              ? 'Extraindo via IA...'
                              : '0 pessoas'}
                          </span>
                        </div>
                      </td>

                      {/* Magistrate / Presiding (AI Extracted) */}
                      <td className="py-3.5 px-4">
                        {presiding ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-crimson/20 border border-crimson/40 flex items-center justify-center text-[11px] font-bold text-red-300 shrink-0">
                              {getInitials(presiding.name)}
                            </div>
                            <span className="text-xs text-slate-300 truncate max-w-[150px]">
                              {presiding.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-dark-muted">
                            {h.status === 'PROCESSING_TRANSCRIPTION' ? 'Identificando...' : ''}
                          </span>
                        )}
                      </td>

                      {/* Actions: Play, Trash, Open */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-dark-muted">
                          <button
                            onClick={() => setPreviewHearing(h)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-crimson/15 hover:bg-crimson text-red-300 hover:text-white border border-crimson/30 text-[11px] font-bold transition-colors min-h-[36px]"
                            title="Reproduzir Vídeo da Audiência"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Assistir</span>
                          </button>
                          <button
                            onClick={() => handleDeleteHearing(h.id)}
                            className="p-2 rounded-lg hover:text-white hover:bg-dark-pill transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                            title="Excluir audiência"
                            aria-label={`Excluir audiência ${h.caseNumber}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/hearings/${h.id}`}
                            className="p-2 rounded-lg hover:text-crimson hover:bg-dark-pill transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                            title="Abrir Dossiê da Audiência"
                            aria-label={`Abrir dossiê da audiência ${h.caseNumber}`}
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
          {paginatedHearings.map((h) => {
            const badge = getPipelineStatusBadge(h.status, h);
            const isSelected = selectedIds.includes(h.id);
            const isVideo = isVideoHearing(h);
            const presiding = getPresidingParticipant(h);
            const peopleCount = h.participants?.length || 0;
            const hasLocation = Boolean(h.courtJurisdiction && h.courtJurisdiction.trim().length > 0);

            return (
              <div
                key={h.id}
                className={`bg-dark-card border rounded-2xl p-4 flex flex-col justify-between transition-colors duration-200 hover:border-dark-muted/60 hover:shadow-xl group relative ${
                  isSelected
                    ? 'border-crimson ring-1 ring-crimson/50 bg-crimson/[0.03]'
                    : 'border-dark-border hover:bg-dark-card/90'
                }`}
              >
                {/* Top: Media Type & Pipeline Status */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                        isVideo
                          ? 'bg-crimson/10 border-crimson/30 text-crimson'
                          : 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400'
                      }`}
                    >
                      {isVideo ? <Video className="w-3 h-3" /> : <Music className="w-3 h-3" />}
                      <span>{isVideo ? 'Vídeo' : 'Áudio'}</span>
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${badge.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                  </div>

                  {/* Case Number & Media Filename Header */}
                  <div>
                    <Link
                      href={`/hearings/${h.id}`}
                      className="text-sm font-bold text-white hover:text-crimson transition-colors flex items-center gap-1.5"
                    >
                      <span className="truncate">{h.mediaFilename || h.audioFilename || h.caseNumber}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-crimson opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                    <p className="font-mono text-[11px] text-dark-muted mt-0.5 truncate tabular-nums">
                      {h.caseNumber}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-dark-input text-slate-300 border border-dark-border">
                        {getTypeBadge(h.hearingType)}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40 font-semibold">
                        <Check className="w-3 h-3" />
                        <span>Gemini 3.8 Flash</span>
                      </div>
                      {(() => {
                        const promptInfo = getHearingPromptInfo(h);
                        return (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-indigo-950/40 text-indigo-300 border border-indigo-800/40 max-w-full truncate"
                            title={`Versão do Prompt utilizada na transcrição: ${promptInfo.full}`}
                          >
                            <Sparkles className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                            <span className="truncate">Prompt: {promptInfo.label}</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Jurisdiction (only if informed), Prompt Version & AI-extracted People Metadata */}
                  <div className="space-y-1.5 text-xs text-dark-muted border-t border-dark-border/40 pt-2.5">
                    {(() => {
                      const promptInfo = getHearingPromptInfo(h);
                      return (
                        <div className="flex items-center justify-between gap-2 text-[11px] bg-dark-input/50 border border-dark-border/60 rounded-lg px-2.5 py-1.5">
                          <span className="flex items-center gap-1.5 text-slate-400 font-medium shrink-0">
                            <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                            <span>Versão do Prompt:</span>
                          </span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="font-mono text-[11px] font-semibold text-indigo-300 truncate"
                              title={promptInfo.full}
                            >
                              {promptInfo.label}
                            </span>
                            {promptInfo.hasUpdate && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-700/50 text-amber-300 font-mono text-[11px] font-bold shrink-0"
                                title={`Versão v${activePromptVersion} ativa nas configurações`}
                              >
                                v{activePromptVersion} disp.
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    {hasLocation && (
                      <p className="flex items-start gap-1.5 line-clamp-2 text-slate-300 text-[11px]">
                        <Building2 className="w-3.5 h-3.5 text-dark-muted shrink-0 mt-0.5" />
                        <span>{h.courtJurisdiction}</span>
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] pt-0.5 gap-2">
                      <span className="flex items-center gap-1 text-dark-muted shrink-0 tabular-nums">
                        <Users className="w-3 h-3 text-dark-muted" />
                        <span>
                          {peopleCount > 0
                            ? `${peopleCount} ${peopleCount === 1 ? 'pessoa' : 'pessoas'}`
                            : h.status === 'PROCESSING_TRANSCRIPTION'
                            ? 'Extraindo pessoas...'
                            : '0 pessoas'}
                        </span>
                      </span>
                      {presiding ? (
                        <span className="flex items-center gap-1 text-slate-300 font-medium truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-crimson shrink-0" />
                          <span className="truncate">{presiding.name}</span>
                        </span>
                      ) : null}
                    </div>

                    {badge.filterKey === 'transcrevendo' && (() => {
                      const eta = getHearingEtaInfo(h);
                      return (
                        <div className="mt-2 pt-2 border-t border-amber-900/30 bg-amber-950/25 rounded-xl p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-amber-200 font-semibold">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>Estimativa de término:</span>
                            </span>
                            <span className="font-mono font-bold text-amber-300 tabular-nums">
                              {eta.etaLabel}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-dark-input rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-[width] duration-500"
                              style={{ width: `${Math.max(5, eta.pct)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono text-dark-muted tabular-nums">
                            <span>
                              {eta.readyBlocks}/{eta.expectedTotal} partes ({eta.pct}%)
                            </span>
                            <span>Média hist.: ~{eta.avgPartLabel}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 mt-3 border-t border-dark-border/50 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-dark-muted font-mono tabular-nums">
                    {formatDuration(h.audioDurationSeconds)}{h.audioSizeBytes ? ` • ${formatFileSize(h.audioSizeBytes)}` : ' • Diarizado'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewHearing(h)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-dark-input hover:bg-crimson/20 border border-dark-border hover:border-crimson/40 text-slate-200 hover:text-white text-xs font-semibold transition-colors min-h-[36px]"
                      title="Reproduzir Vídeo da Audiência"
                    >
                      <Play className="w-3 h-3 text-crimson fill-current" />
                      <span>Assistir</span>
                    </button>
                    <button
                      onClick={() => handleDeleteHearing(h.id)}
                      className="p-2 rounded-lg text-dark-muted hover:text-white hover:bg-dark-pill transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                      title="Excluir Audiência"
                      aria-label={`Excluir audiência ${h.caseNumber}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      href={`/hearings/${h.id}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-crimson/15 hover:bg-crimson border border-crimson/30 hover:border-crimson text-red-200 hover:text-white text-xs font-semibold transition-colors shadow-sm min-h-[36px]"
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
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-slate-300 text-xs transition-colors font-medium min-h-[36px]">
            <span>Alterar status</span>
            <ChevronDown className="w-3 h-3 text-dark-muted" />
          </button>
          {selectedIds.length > 0 && (
            <span className="px-2.5 py-1 rounded-xl bg-crimson/15 text-red-300 border border-crimson/30 text-[11px] font-semibold flex items-center gap-1.5 tabular-nums">
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
                aria-label="Selecionar quantidade de itens por página"
                className="bg-dark-input hover:bg-dark-pill border border-dark-border rounded-xl pl-3 pr-7 py-1.5 text-xs text-white focus:outline-none focus:border-crimson cursor-pointer transition-colors appearance-none font-medium min-h-[36px]"
              >
                <option value={5} className="bg-dark-card text-white">5</option>
                <option value={10} className="bg-dark-card text-white">10</option>
                <option value={20} className="bg-dark-card text-white">20</option>
                <option value={50} className="bg-dark-card text-white">50</option>
              </select>
              <ChevronDown className="w-3 h-3 text-dark-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <span className="font-mono text-slate-300 tabular-nums">
            {totalItems === 0 ? '0-0' : `${startIndex + 1}-${Math.min(startIndex + pageSize, totalItems)}`} de {totalItems}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="p-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
              title="Página Anterior"
              aria-label="Página anterior"
            >
              ‹
            </button>
            <span className="text-xs font-mono px-2.5 py-1.5 rounded-xl bg-dark-input border border-dark-border text-slate-200 tabular-nums">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="p-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
              title="Próxima Página"
              aria-label="Próxima página"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Quick Video Player Modal on Hearings Tab */}
      {previewHearing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setPreviewHearing(null)}
        >
          <div
            className="w-full max-w-4xl bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-dark-border flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-crimson shrink-0" />
                  <h3 className="text-sm font-bold text-white truncate">
                    {previewHearing.mediaFilename || previewHearing.audioFilename || previewHearing.caseNumber}
                  </h3>
                </div>
                <p className="text-[11px] font-mono text-dark-muted mt-0.5 truncate tabular-nums">
                  Processo {previewHearing.caseNumber}
                  {previewHearing.courtJurisdiction?.trim() ? ` • ${previewHearing.courtJurisdiction}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/hearings/${previewHearing.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-crimson hover:bg-crimson-dark text-white text-xs font-bold transition-colors min-h-[36px]"
                >
                  <span>Abrir Dossiê Completo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => setPreviewHearing(null)}
                  className="p-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                  title="Fechar Player"
                  aria-label="Fechar reprodutor de vídeo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-black aspect-video w-full flex items-center justify-center">
              <video
                src={
                  previewHearing.videoUrl ||
                  (previewHearing as any).mediaUrl ||
                  `/media/hearings/${encodeURIComponent(
                    previewHearing.mediaFilename || previewHearing.audioFilename || ''
                  )}`
                }
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            </div>
          </div>
        </div>
      )}

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
