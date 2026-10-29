'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, extractPromptVersionNumber } from '@/lib/api';
import { Hearing, TranscriptSegment, AtaDraft, HearingSummary } from '@/lib/types';
import MediaPlayer from '@/components/MediaPlayer';
import TranscriptViewer from '@/components/TranscriptViewer';
import AtaEditor from '@/components/AtaEditor';
import LegalAnalysisView from '@/components/LegalAnalysisView';
import CopilotChat from '@/components/CopilotChat';
import {
  ArrowLeft,
  Scale,
  FileText,
  Sparkles,
  Bot,
  AlertTriangle,
  Users,
  CheckCircle2,
  Calendar,
  Building2,
  Clock,
  Video,
  Music,
  MessageSquare,
  Layers,
  Loader2,
  Play,
  Timer,
  ChevronDown,
  ChevronUp,
  XCircle,
  RefreshCw,
  Lock
} from 'lucide-react';

export default function HearingWorkspacePage() {
  const params = useParams();
  const hearingId = (params?.id as string) || 'f1e2d3c4-b5a6-9788-7654-3210fedcba98';

  const [hearing, setHearing] = useState<Hearing | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [blocks, setBlocks] = useState<import('@/lib/types').TranscriptBlock[]>([]);
  const [telemetry, setTelemetry] = useState<import('@/lib/types').PipelineTelemetrySummary | null>(null);
  const [ata, setAta] = useState<AtaDraft | null>(null);
  const [summary, setSummary] = useState<HearingSummary | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisBannerMsg, setAnalysisBannerMsg] = useState<string | null>(null);
  const [activePromptVersion, setActivePromptVersion] = useState<number>(3);
  const [activePromptCode, setActivePromptCode] = useState<string>('PROMPT_AUDIO_VIDEO_TRANSCRIPTION');
  const [promptVersionLoaded, setPromptVersionLoaded] = useState<boolean>(false);
  const [isReprocessing, setIsReprocessing] = useState<boolean>(false);
  const [reprocessBannerMsg, setReprocessBannerMsg] = useState<string | null>(null);

  // Audio/Video Playback & Timestamp synchronization state
  const [currentPlaybackMs, setCurrentPlaybackMs] = useState<number>(0);
  const [seekTargetMs, setSeekTargetMs] = useState<number | null>(null);
  const [subtitleOffsetMs, setSubtitleOffsetMs] = useState<number>(0);

  // Unified Workspace Active Tab: 'transcription' | 'parts' | 'ata' | 'analysis' | 'copilot'
  const [activeTab, setActiveTab] = useState<'transcription' | 'parts' | 'ata' | 'analysis' | 'copilot'>('transcription');
  const [selectedTranscriptBlock, setSelectedTranscriptBlock] = useState<number | null>(null);
  const [expandedPartIndices, setExpandedPartIndices] = useState<number[]>([]);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  const refreshActivePrompt = React.useCallback(() => {
    api.getPrompts('TRANSCRIPTION').then((tpls) => {
      if (Array.isArray(tpls) && tpls.length > 0) {
        const mainPrompt =
          tpls.find((p: any) => p.code === 'PROMPT_AUDIO_VIDEO_TRANSCRIPTION') || tpls[0];
        if (mainPrompt?.version !== undefined && mainPrompt?.version !== null) {
          const parsedVer = extractPromptVersionNumber(String(mainPrompt.version), 3);
          setActivePromptVersion(parsedVer);
        }
        if (mainPrompt?.code) {
          setActivePromptCode(mainPrompt.code);
        }
      }
      setPromptVersionLoaded(true);
    }).catch(() => {
      setPromptVersionLoaded(true);
    });
  }, []);

  useEffect(() => {
    api.getHearing(hearingId).then(setHearing);
    api.getTranscript(hearingId).then(setSegments);
    api.getBlocks(hearingId).then(setBlocks);
    api.getTelemetrySummary().then(setTelemetry);
    api.getAta(hearingId).then(setAta);
    api.getAnalysis(hearingId).then(setSummary);
    refreshActivePrompt();

    const onPromptUpdated = () => refreshActivePrompt();
    if (typeof window !== 'undefined') {
      window.addEventListener('open-judy-prompt-updated', onPromptUpdated);
      return () => window.removeEventListener('open-judy-prompt-updated', onPromptUpdated);
    }
  }, [hearingId, refreshActivePrompt]);

  useEffect(() => {
    if (activeTab === 'analysis') {
      api.getAnalysis(hearingId).then((res) => {
        if (res) setSummary(res);
      });
    }
    refreshActivePrompt();
  }, [activeTab, hearingId, refreshActivePrompt]);

  const hearingPromptVer = extractPromptVersionNumber(hearing?.promptVersion, 3);
  const minBlockPromptVer =
    blocks.length > 0
      ? Math.min(
          ...blocks.map((b) => extractPromptVersionNumber(b.promptVersion, hearingPromptVer))
        )
      : hearingPromptVer;

  const videoProcessedVersion = minBlockPromptVer;
  const hasNewerPromptVersion =
    promptVersionLoaded &&
    Boolean(hearing) &&
    Number.isFinite(activePromptVersion) &&
    Number.isFinite(videoProcessedVersion) &&
    activePromptVersion > videoProcessedVersion;

  const isDone =
    hearing?.status === 'TRANSCRIPTION_COMPLETED' ||
    hearing?.status === 'ANALYSIS_COMPLETED' ||
    hearing?.status === 'READY' ||
    hearing?.status === 'FAILED';

  const completedBlocks = blocks.filter((b) => (b.status || 'COMPLETED') === 'COMPLETED');
  const processingBlock = blocks.find((b) => b.status === 'PROCESSING');

  const expectedBlocks = Math.max(
    blocks.length,
    hearing?.audioDurationSeconds && hearing.audioDurationSeconds > 600
      ? Math.ceil(hearing.audioDurationSeconds / 600)
      : 1
  );

  useEffect(() => {
    if (isDone) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isDone]);

  useEffect(() => {
    if (isDone && segments.length > 0 && completedBlocks.length >= expectedBlocks) {
      return;
    }
    const interval = setInterval(async () => {
      try {
        const [freshHearing, freshSegs, freshBlocks, freshTelemetry] = await Promise.all([
          api.getHearing(hearingId),
          api.getTranscript(hearingId),
          api.getBlocks(hearingId),
          api.getTelemetrySummary(),
        ]);
        if (freshTelemetry) {
          setTelemetry(freshTelemetry);
        }
        if (freshHearing) {
          const prevStatus = hearing?.status;
          setHearing(freshHearing);
          if (
            prevStatus === 'PROCESSING_TRANSCRIPTION' &&
            (freshHearing.status === 'TRANSCRIPTION_COMPLETED' ||
              freshHearing.status === 'READY')
          ) {
            api.getAta(hearingId).then(setAta);
            api.getAnalysis(hearingId).then(setSummary);
          }
        }
        if (freshSegs && freshSegs.length > 0) {
          setSegments(freshSegs);
        }
        if (freshBlocks && freshBlocks.length > 0) {
          setBlocks(freshBlocks);
        }
      } catch (_) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [hearingId, isDone, hearing?.status, segments.length, blocks.length, expectedBlocks]);

  const formatPartDuration = (ms?: number) => {
    const val = ms && ms > 0 ? ms : 34000;
    const sec = val / 1000;
    if (sec >= 60) {
      const m = Math.floor(sec / 60);
      const r = Math.round(sec % 60);
      return `${m}m ${r}s`;
    }
    return `${sec.toFixed(1)}s`;
  };

  const formatEtaDuration = (ms: number) => {
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

  const formatSecHms = (sec: number) => {
    const s = Math.max(0, Math.floor(Math.round(sec * 100) / 100));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
  };

  const formatMsSubSecond = (ms: number): string => {
    const safeMs = Math.max(0, Math.round(ms));
    const totalTenths = Math.floor(safeMs / 100);
    const tenths = totalTenths % 10;
    const totalSec = Math.floor(totalTenths / 10);
    const hrs = Math.floor(totalSec / 3600);
    const min = Math.floor((totalSec % 3600) / 60);
    const sec = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return hrs > 0
      ? `${pad(hrs)}:${pad(min)}:${pad(sec)}.${tenths}`
      : `${pad(min)}:${pad(sec)}.${tenths}`;
  };

  const formatWallClockTimestamp = (iso?: string | null): string | null => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const timeStr = d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return `${dateStr} ${timeStr}`;
  };

  const recentBlockDurations = completedBlocks
    .map((b) => b.processingDurationMs || 0)
    .filter((d) => d > 0)
    .slice(-6);
  const avgPartMs =
    recentBlockDurations.length > 0
      ? Math.round(
          recentBlockDurations.reduce((a, b) => a + b, 0) / recentBlockDurations.length
        )
      : telemetry?.hearings?.[hearingId]?.averageBlockDurationMs ||
        telemetry?.averagePartDurationMs ||
        34000;

  const remainingPartsCount = Math.max(0, expectedBlocks - completedBlocks.length);
  const activePartRefIso =
    processingBlock?.startedAt ||
    (completedBlocks.length > 0
      ? completedBlocks[completedBlocks.length - 1]?.completedAt
      : telemetry?.hearings?.[hearingId]?.lastCompletedAt);
  const elapsedOnCurrentPartMs = activePartRefIso
    ? Math.max(0, Math.min(avgPartMs - 2000, nowMs - new Date(activePartRefIso).getTime()))
    : 0;
  const estimatedRemainingMs = Math.max(
    3000,
    remainingPartsCount * avgPartMs - elapsedOnCurrentPartMs
  );
  const totalProcessingMs = completedBlocks.reduce(
    (sum, b) => sum + (b.processingDurationMs && b.processingDurationMs > 0 ? b.processingDurationMs : avgPartMs),
    0
  );

  const toggleExpandPart = (partIndex: number) => {
    setExpandedPartIndices((prev) =>
      prev.includes(partIndex) ? prev.filter((i) => i !== partIndex) : [...prev, partIndex]
    );
  };

  const handleSeek = (ms: number) => {
    setCurrentPlaybackMs(ms);
    setSeekTargetMs(ms);
    setTimeout(() => setSeekTargetMs(null), 50);
  };

  const handleRegenerateAta = async () => {
    const updated = await api.generateAta(hearingId);
    setAta(updated);
  };

  const handleTriggerAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisBannerMsg(null);
    try {
      const updated = await api.triggerHearingAnalysis(hearingId);
      setSummary(updated);
      setAnalysisBannerMsg('Task de Análise Jurídica e Detecção de Contradições executada com sucesso.');
    } catch (e: any) {
      setAnalysisBannerMsg(e?.message || 'Erro ao executar task de análise.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReprocessHearing = async () => {
    if (!hearing || isReprocessing || !hasNewerPromptVersion) return;
    setIsReprocessing(true);
    setReprocessBannerMsg(null);
    try {
      const mediaFile =
        hearing.mediaFilename || hearing.audioFilename || '00 - video 1min .mp4';
      const mType =
        hearing.mediaType ||
        (mediaFile.toLowerCase().endsWith('.mp4') ||
        mediaFile.toLowerCase().endsWith('.webm') ||
        mediaFile.toLowerCase().endsWith('.mkv')
          ? 'VIDEO'
          : 'AUDIO');
      const nextPromptTag = `${activePromptCode} v${activePromptVersion} (OPT_V1_DIARIZATION_SURGICAL)`;
      await api.reprocessHearing(hearingId, hearing.caseNumber, mediaFile, mType);
      setHearing((prev) =>
        prev
          ? {
              ...prev,
              status: 'PROCESSING_TRANSCRIPTION',
              promptVersion: nextPromptTag,
            }
          : prev
      );
      setBlocks((prev) =>
        prev.map((b, idx) => ({
          ...b,
          status: idx === 0 ? 'PROCESSING' : 'QUEUED',
          startedAt: idx === 0 ? new Date().toISOString() : null,
          completedAt: null,
          promptVersion: nextPromptTag,
        }))
      );
      setReprocessBannerMsg(
        `Reprocessamento iniciado com ${activePromptCode} v${activePromptVersion} e proteção Anti-429 (Backoff Exponencial + Jitter + Fallback GA).`
      );
    } catch (err: any) {
      setReprocessBannerMsg(
        err?.message || 'Erro ao solicitar reprocessamento da audiência.'
      );
    } finally {
      setIsReprocessing(false);
    }
  };

  if (!hearing) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-dark-muted">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-5 h-5 rounded-full border-2 border-crimson border-t-transparent animate-spin" />
          <span>Carregando dados da sessão judicial...</span>
        </div>
      </div>
    );
  }

  const isVideo = hearing.mediaType === 'VIDEO' || (hearing.audioFilename && (
    hearing.audioFilename.endsWith('.mp4') || hearing.audioFilename.endsWith('.webm') || hearing.audioFilename.endsWith('.mkv')
  ));

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start w-full">
      {/* ========================================================================= */}
      {/* COLUNA ESQUERDA (5/12): Cabeçalho do Dossiê & Player de Vídeo Sincronizado */}
      {/* ========================================================================= */}
      <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-4 bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl flex flex-col">
        {/* Dossier Header */}
        <div className="flex flex-col gap-3 p-4 border-b border-dark-border/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/hearings"
                aria-label="Voltar para a Lista de Audiências"
                className="p-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center touch-target-expand"
                title="Voltar para a Lista de Audiências"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <span className="font-mono text-sm font-bold text-white tracking-tight">
                {hearing.caseNumber}
              </span>
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-dark-input text-slate-200 border border-dark-border">
                {hearing.hearingType.replace(/_/g, ' ')}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border ${
                isVideo
                  ? 'bg-crimson/15 text-red-300 border-crimson/30'
                  : 'bg-indigo-600/15 text-indigo-300 border-indigo-500/30'
              }`}>
                {isVideo ? <Video className="w-3.5 h-3.5 text-crimson" /> : <Music className="w-3.5 h-3.5 text-indigo-400" />}
                <span>{isVideo ? 'Vídeo da Sessão' : 'Gravação em Áudio'}</span>
              </span>
            </div>

            {hearing.courtJurisdiction && hearing.courtJurisdiction.trim().length > 0 && (
              <p className="text-xs text-dark-muted pl-10 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-dark-muted" />
                <span>{hearing.courtJurisdiction}</span>
              </p>
            )}
          </div>

          {/* Badges & Meta info */}
          <div className="flex items-center gap-2 flex-wrap">
            {hearing.status === 'PROCESSING_TRANSCRIPTION' || hearing.status === 'PENDING_UPLOAD' ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl status-badge-warning border text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>
                  Transcrevendo ({completedBlocks.length}/{expectedBlocks} partes)
                </span>
                <span className="text-amber-200/90 font-mono text-xs border-l border-amber-700/60 pl-2">
                  ~{formatEtaDuration(estimatedRemainingMs)} restantes
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl status-badge-success border text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Concluído ({completedBlocks.length}/{expectedBlocks} partes • {formatEtaDuration(totalProcessingMs)})
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-dark-input border border-dark-border text-xs text-slate-200">
              <Users className="w-3.5 h-3.5 text-dark-muted" />
              <span>{hearing.participants?.length || 0} Pessoas</span>
            </div>
            <Link
              href={`/config?tab=prompts&prompt=${encodeURIComponent(activePromptCode || 'PROMPT_AUDIO_VIDEO_TRANSCRIPTION')}`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/40 text-xs font-mono font-semibold text-indigo-300 hover:text-indigo-200 transition-colors"
              title={`Vídeo processado na v${videoProcessedVersion} • Prompt atual no sistema: ${activePromptCode} v${activePromptVersion}. Clique para abrir nas Configurações do Sistema.`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                Prompt: v{videoProcessedVersion}
                {hasNewerPromptVersion ? ` (v${activePromptVersion} disp.)` : ' (atual)'}
              </span>
            </Link>
            <button
              type="button"
              onClick={hasNewerPromptVersion && !isReprocessing ? handleReprocessHearing : undefined}
              disabled={!hasNewerPromptVersion || isReprocessing}
              aria-disabled={!hasNewerPromptVersion || isReprocessing}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors min-h-[34px] touch-target-expand ${
                hasNewerPromptVersion && !isReprocessing
                  ? 'bg-crimson/20 hover:bg-crimson text-red-200 hover:text-white border-crimson/40 cursor-pointer'
                  : 'bg-dark-input/80 text-dark-muted border-dark-border opacity-60 cursor-not-allowed select-none'
              }`}
              title={
                hasNewerPromptVersion
                  ? `Nova versão v${activePromptVersion} disponível (vídeo processado na v${videoProcessedVersion}). Clique para reprocessar o vídeo.`
                  : `Desabilitado: o vídeo já foi processado na versão atual do prompt (v${videoProcessedVersion}). Só é habilitado quando houver uma versão de prompt mais nova.`
              }
            >
              {hasNewerPromptVersion ? (
                <RefreshCw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin' : ''}`} />
              ) : (
                <Lock className="w-3.5 h-3.5 text-dark-muted" />
              )}
              <span>
                {isReprocessing
                  ? 'Reprocessando...'
                  : hasNewerPromptVersion
                  ? `Reprocessar Vídeo (v${videoProcessedVersion} → v${activePromptVersion})`
                  : `Reprocessar Vídeo (v${videoProcessedVersion} Atual)`}
              </span>
            </button>
          </div>
        </div>

        {/* Synchronized Media Player (Audio & Video) */}
        <MediaPlayer
          currentPlaybackMs={currentPlaybackMs}
          onTimeUpdate={setCurrentPlaybackMs}
          seekTargetMs={seekTargetMs}
          totalDurationSeconds={hearing.audioDurationSeconds || 142}
          filename={hearing.mediaFilename || hearing.audioFilename || 'audiencia_0004521_instrucao.mp4'}
          mediaType={hearing.mediaType || (isVideo ? 'VIDEO' : 'AUDIO')}
          videoUrl={hearing.videoUrl || (hearing as any).mediaUrl || (hearing as any).audioUrl}
          segments={segments}
          blocks={blocks}
          hearingId={hearingId}
          subtitleOffsetMs={subtitleOffsetMs}
          onSubtitleOffsetChange={setSubtitleOffsetMs}
        />
      </div>

      {/* ========================================================================= */}
      {/* COLUNA DIREITA (7/12): Abas de Trabalho (Transcrição, Partes, Minuta, Análise, Gemini Chat) */}
      {/* ========================================================================= */}
      <div className="lg:col-span-7 xl:col-span-7 flex flex-col bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl lg:h-[calc(100vh-5.5rem)] lg:min-h-[640px]">
        {/* Top Tab Navigation Bar */}
        <div className="p-2.5 bg-dark-bg/60 border-b border-dark-border flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('transcription')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap min-h-[38px] ${
              activeTab === 'transcription'
                ? 'bg-dark-pill text-white shadow-sm border border-dark-border/80'
                : 'text-dark-muted hover:text-slate-200 hover:bg-dark-pill/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-red-400" />
            <span>Transcrição Diarizada</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-dark-input text-slate-200 font-mono">
              {segments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('parts')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap min-h-[38px] ${
              activeTab === 'parts'
                ? 'bg-dark-pill text-white shadow-sm border border-dark-border/80'
                : 'text-dark-muted hover:text-slate-200 hover:bg-dark-pill/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Partes</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-dark-input text-slate-200 font-mono">
              {completedBlocks.length}/{expectedBlocks}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ata')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap min-h-[38px] ${
              activeTab === 'ata'
                ? 'bg-dark-pill text-white shadow-sm border border-dark-border/80'
                : 'text-dark-muted hover:text-slate-200 hover:bg-dark-pill/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-crimson" />
            <span>Minuta da Ata</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap min-h-[38px] ${
              activeTab === 'analysis'
                ? 'bg-dark-pill text-white shadow-sm border border-dark-border/80'
                : 'text-dark-muted hover:text-slate-200 hover:bg-dark-pill/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Análise &amp; Contradições</span>
            {summary?.contradictions && summary.contradictions.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-md status-badge-warning font-mono border">
                {summary.contradictions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('copilot')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap min-h-[38px] ${
              activeTab === 'copilot'
                ? 'bg-dark-pill text-white shadow-sm border border-dark-border/80'
                : 'text-dark-muted hover:text-slate-200 hover:bg-dark-pill/50'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-sky-400" />
            <span>Gemini Chat</span>
          </button>
        </div>

        {/* Tab Contents Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'transcription' && (
            <TranscriptViewer
              segments={segments}
              blocks={blocks}
              currentPlaybackMs={currentPlaybackMs}
              subtitleOffsetMs={subtitleOffsetMs}
              onSeek={handleSeek}
              hearingStatus={hearing.status}
              totalDurationSeconds={hearing.audioDurationSeconds}
              selectedBlockIndex={selectedTranscriptBlock}
              onSelectBlockIndex={setSelectedTranscriptBlock}
            />
          )}
          {activeTab === 'parts' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {/* Top Telemetry & ETA Summary Strip (Hairlined Flat Telemetry Strip) */}
              <div className="rounded-xl bg-dark-input/50 border border-dark-border grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-dark-border">
                <div className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-dark-muted">
                    <span className="font-semibold text-xs text-slate-300">
                      Progresso das Partes
                    </span>
                    <Layers className="w-4 h-4 text-crimson" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white font-mono">
                      {completedBlocks.length} / {expectedBlocks}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      ({Math.round((completedBlocks.length / Math.max(1, expectedBlocks)) * 100)}%)
                    </span>
                  </div>
                  <p className="text-xs text-dark-muted mt-1">
                    Divisão balanceada de 5 a 10 min com padding de 2m e contexto de 5m
                  </p>
                </div>

                <div className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-dark-muted">
                    <span className="font-semibold text-xs text-slate-300">
                      Tempo Médio por Parte (Histórico)
                    </span>
                    <Timer className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white font-mono">
                      {formatPartDuration(avgPartMs)}
                    </span>
                    <span className="text-xs text-dark-muted">por parte</span>
                  </div>
                  <p className="text-xs text-dark-muted mt-1">
                    Calculado com base no histórico real das últimas partes transcritas
                  </p>
                </div>

                <div className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-dark-muted">
                    <span className="font-semibold text-xs text-slate-300">
                      {isDone ? 'Tempo Total de Transcrição' : 'Estimativa de Término'}
                    </span>
                    <Clock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white font-mono">
                      {isDone
                        ? formatEtaDuration(totalProcessingMs)
                        : `~${formatEtaDuration(estimatedRemainingMs)}`}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">
                      {isDone ? 'concluído' : 'restantes'}
                    </span>
                  </div>
                  <p className="text-xs text-dark-muted mt-1">
                    {isDone
                      ? `${completedBlocks.length} partes transcritas no Vertex AI (Gemini 3.8 Flash)`
                      : `Faltam ${remainingPartsCount} ${remainingPartsCount === 1 ? 'parte' : 'partes'} na fila sequencial`}
                  </p>
                </div>
              </div>

              {/* New Prompt Version Detector Banner */}
              {hasNewerPromptVersion && (
                <div className="rounded-xl status-badge-warning border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        Nova versão de Prompt disponível: {activePromptCode} v{activePromptVersion}{' '}
                        (partes atuais em v{minBlockPromptVer})
                      </span>
                    </div>
                    <p className="text-xs text-amber-100/90 max-w-[70ch]">
                      Foi detectada uma versão mais recente do prompt forense no catálogo. Você pode
                      reprocessar todas as partes deste vídeo com a versão v{activePromptVersion} e
                      proteção Anti-429.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleReprocessHearing}
                    disabled={!hasNewerPromptVersion || isReprocessing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black text-xs font-extrabold transition-colors shrink-0 cursor-pointer shadow-md min-h-[38px]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin' : ''}`} />
                    <span>
                      Reprocessar Vídeo com Novo Prompt (v{activePromptVersion})
                    </span>
                  </button>
                </div>
              )}

              {reprocessBannerMsg && (
                <div className="rounded-xl status-badge-success border px-3.5 py-2.5 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{reprocessBannerMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReprocessBannerMsg(null)}
                    className="text-xs font-semibold text-emerald-300 hover:text-white touch-target-expand"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {/* Active Pipeline, Prompt Version & Reprocess Action Strip */}
              <div className="rounded-xl bg-dark-input/50 border border-dark-border/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg status-badge-success border font-mono text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Pipeline: {blocks[0]?.pipelineVersion || 'v3.2-VAD-SYNC (gemini-3.8-flash)'}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-bg text-slate-200 border border-dark-border font-mono text-xs font-medium">
                    <FileText className="w-3.5 h-3.5 text-crimson" />
                    <span>
                      Vídeo processado: v{videoProcessedVersion} • Prompt Atual: {activePromptCode} v{activePromptVersion}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg status-badge-info border font-mono text-xs font-semibold">
                    <span>Anti-429: Backoff Exponencial + Jitter + Fallback GA</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {!hasNewerPromptVersion && (
                    <span className="text-xs text-dark-muted">
                      Vídeo já na versão atual (v{videoProcessedVersion}) — botão habilitado apenas em nova versão
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={hasNewerPromptVersion && !isReprocessing ? handleReprocessHearing : undefined}
                    disabled={!hasNewerPromptVersion || isReprocessing}
                    aria-disabled={!hasNewerPromptVersion || isReprocessing}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors min-h-[36px] touch-target-expand ${
                      hasNewerPromptVersion && !isReprocessing
                        ? 'bg-crimson/20 hover:bg-crimson text-red-200 hover:text-white border-crimson/40 cursor-pointer'
                        : 'bg-dark-input/80 text-dark-muted border-dark-border opacity-60 cursor-not-allowed select-none'
                    }`}
                    title={
                      hasNewerPromptVersion
                        ? `Reprocessar todas as partes do vídeo utilizando a versão mais recente do prompt (v${activePromptVersion}) e proteção Anti-429`
                        : `Desabilitado: o vídeo já foi processado na versão atual do prompt (v${videoProcessedVersion}). Só é habilitado quando houver uma versão de prompt mais nova.`
                    }
                  >
                    {hasNewerPromptVersion ? (
                      <RefreshCw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin' : ''}`} />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-dark-muted" />
                    )}
                    <span>
                      {isReprocessing
                        ? 'Enfileirando...'
                        : hasNewerPromptVersion
                        ? `Reprocessar Vídeo (v${videoProcessedVersion} → v${activePromptVersion})`
                        : `Reprocessar Vídeo (Prompt v${videoProcessedVersion} Atual)`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Parts List (Flattened Hairlined List Rows) */}
              <div className="rounded-xl border border-dark-border divide-y divide-dark-border overflow-hidden bg-dark-input/25">
                {Array.from({ length: expectedBlocks }, (_, idx) => {
                  const partIndex = idx + 1;
                  const readyBlk = blocks.find((b) => b.blockIndex === partIndex);
                  const blkStatus =
                    readyBlk?.status ||
                    (!isDone && partIndex === completedBlocks.length + 1
                      ? 'PROCESSING'
                      : readyBlk
                      ? 'COMPLETED'
                      : 'QUEUED');

                  const isPartCompleted = blkStatus === 'COMPLETED';
                  const isCurrentlyTranscribing = blkStatus === 'PROCESSING';
                  const isPartFailed = blkStatus === 'FAILED';

                  const stepSec =
                    hearing.audioDurationSeconds && hearing.audioDurationSeconds > 0
                      ? hearing.audioDurationSeconds / expectedBlocks
                      : 540;
                  const coreStartSec =
                    readyBlk?.startTimeMs !== undefined
                      ? readyBlk.startTimeMs / 1000
                      : (partIndex - 1) * stepSec;
                  const coreEndSec =
                    readyBlk?.endTimeMs !== undefined
                      ? readyBlk.endTimeMs / 1000
                      : partIndex * stepSec;
                  const paddingSec =
                    readyBlk?.paddingSeconds !== undefined
                      ? readyBlk.paddingSeconds
                      : partIndex > 1
                      ? Math.min(120, Math.round(coreStartSec))
                      : 0;
                  const clipStartSec = Math.max(0, coreStartSec - paddingSec);

                  const startFormatted =
                    readyBlk?.startTimeFormatted || formatSecHms(coreStartSec);
                  const endFormatted =
                    readyBlk?.endTimeFormatted || formatSecHms(coreEndSec);
                  const clipStartFormatted = formatSecHms(clipStartSec);
                  const partDurMs =
                    readyBlk?.processingDurationMs && readyBlk.processingDurationMs > 0
                      ? readyBlk.processingDurationMs
                      : avgPartMs;

                  const pipelineVer =
                    readyBlk?.pipelineVersion || 'v3.2-VAD-SYNC (gemini-3.8-flash)';
                  const promptVer =
                    readyBlk?.promptVersion ||
                    'PROMPT_AUDIO_VIDEO_TRANSCRIPTION v3 (OPT_V1_DIARIZATION_SURGICAL)';
                  const blockPromptVerNum = extractPromptVersionNumber(promptVer, 3);
                  const isBlockPromptOutdated = blockPromptVerNum < activePromptVersion;
                  const isRetrying429 =
                    Boolean(readyBlk?.summary) &&
                    (readyBlk!.summary!.includes('429') ||
                      readyBlk!.summary!.toLowerCase().includes('retentativa'));
                  const startedAtFormatted = formatWallClockTimestamp(readyBlk?.startedAt);
                  const completedAtFormatted = formatWallClockTimestamp(readyBlk?.completedAt);

                  const liveElapsedSec =
                    isCurrentlyTranscribing && readyBlk?.startedAt
                      ? Math.max(1, Math.round((nowMs - new Date(readyBlk.startedAt).getTime()) / 1000))
                      : null;

                  const partSegments = segments.filter(
                    (s) => (s.blockIndex || 1) === partIndex
                  );
                  const isExpanded = expandedPartIndices.includes(partIndex);

                  return (
                    <div
                      key={`part-row-${partIndex}`}
                      className={`transition-colors ${
                        isPartCompleted
                          ? 'hover:bg-dark-input/60'
                          : isCurrentlyTranscribing
                          ? 'bg-amber-950/20'
                          : isPartFailed
                          ? 'bg-red-950/20'
                          : 'opacity-80'
                      }`}
                    >
                      <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-dark-bg border border-dark-border text-white">
                              Parte {partIndex}/{expectedBlocks}
                            </span>

                            {/* Status Badge */}
                            {isPartCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold status-badge-success border">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Concluído</span>
                              </span>
                            ) : isCurrentlyTranscribing ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold status-badge-warning border">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                <span>
                                  Transcrevendo agora...
                                  {liveElapsedSec !== null ? ` (${liveElapsedSec}s decorridos)` : ''}
                                </span>
                              </span>
                            ) : isPartFailed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold status-badge-danger border">
                                <XCircle className="w-3.5 h-3.5 text-red-400" />
                                <span>Falha</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold status-badge-info border">
                                <Clock className="w-3.5 h-3.5 text-sky-400" />
                                <span>Na fila sequencial</span>
                              </span>
                            )}

                            {/* Prominent Video Start & End Timestamps */}
                            <span className="text-xs font-mono text-slate-100 bg-dark-bg/90 px-2.5 py-0.5 rounded border border-dark-border font-semibold">
                              Início: {startFormatted} → Fim: {endFormatted} (
                              {Math.round(coreStartSec * 10) / 10}s – {Math.round(coreEndSec * 10) / 10}s)
                            </span>

                            {partIndex > 1 && (
                              <span className="text-xs font-mono text-dark-muted bg-dark-bg/50 px-2 py-0.5 rounded border border-dark-border/60">
                                Padding +{paddingSec}s ({clipStartFormatted} → {startFormatted}) • Contexto 5m:{' '}
                                {readyBlk?.contextSegmentsCount !== undefined && readyBlk.contextSegmentsCount > 0
                                  ? `${readyBlk.contextSegmentsCount} legendas da Parte ${partIndex - 1}`
                                  : `Parte ${partIndex - 1}`}
                              </span>
                            )}
                          </div>

                          {/* Prompt Version, Pipeline Version & Execution Wall-Clock Start/End Timestamps */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold status-badge-success border">
                              <span>Pipeline: {pipelineVer}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono text-slate-200 bg-dark-bg/70 border border-dark-border/70">
                              <span>Prompt: {promptVer}</span>
                            </span>
                            {isBlockPromptOutdated ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold status-badge-warning border">
                                <span>
                                  Prompt Desatualizado (v{blockPromptVerNum} → v{activePromptVersion})
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold status-badge-success border">
                                <span>Prompt Atual (v{blockPromptVerNum})</span>
                              </span>
                            )}
                            {(isCurrentlyTranscribing || isRetrying429) && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                                  isRetrying429
                                    ? 'status-badge-warning animate-pulse'
                                    : 'status-badge-info'
                                }`}
                              >
                                <span>
                                  {isRetrying429
                                    ? 'Anti-429 Ativo: Backoff Exponencial + Jitter'
                                    : 'Proteção Anti-429 (Backoff + Jitter + Fallback GA)'}
                                </span>
                              </span>
                            )}
                            {startedAtFormatted && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono status-badge-info border">
                                <Clock className="w-3 h-3 text-sky-400" />
                                <span>Início Proc.: {startedAtFormatted}</span>
                              </span>
                            )}
                            {completedAtFormatted && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono status-badge-success border">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Término Proc.: {completedAtFormatted}</span>
                              </span>
                            )}
                          </div>

                          <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                            {readyBlk?.title
                              ? readyBlk.title
                              : isCurrentlyTranscribing
                              ? `Parte ${partIndex}/${expectedBlocks}: Transcrevendo legendas sincronizadas no Gemini 3.8 Flash...`
                              : `Parte ${partIndex}/${expectedBlocks}: Intervalo oficial (${startFormatted} – ${endFormatted})`}
                          </h3>

                          {readyBlk?.summary && (
                            <p className="text-xs text-dark-muted leading-relaxed line-clamp-2 max-w-[70ch]">
                              {readyBlk.summary}
                            </p>
                          )}
                        </div>

                        {/* Right Column: Processing Time & Actions */}
                        <div className="flex flex-wrap sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t lg:border-t-0 border-dark-border/40 pt-2.5 lg:pt-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                                isPartCompleted
                                  ? 'bg-dark-bg text-emerald-300 border-emerald-900/40'
                                  : isCurrentlyTranscribing
                                  ? 'status-badge-warning'
                                  : 'bg-dark-bg/50 text-dark-muted border-dark-border/50'
                              }`}
                              title="Tempo de processamento desta parte"
                            >
                              <Timer className="w-3.5 h-3.5" />
                              <span>
                                {isPartCompleted
                                  ? `Tempo: ${formatPartDuration(partDurMs)}`
                                  : isCurrentlyTranscribing
                                  ? liveElapsedSec !== null
                                    ? `${liveElapsedSec}s / ~${formatPartDuration(avgPartMs)}`
                                    : `Estimado: ~${formatPartDuration(avgPartMs)}`
                                  : `~${formatPartDuration(avgPartMs)} (est.)`}
                              </span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleSeek(Math.round(coreStartSec * 1000))}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-crimson/15 hover:bg-crimson text-red-300 hover:text-white border border-crimson/30 text-xs font-bold transition-colors cursor-pointer min-h-[34px] touch-target-expand"
                              title="Reproduzir trecho no player de vídeo"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Reproduzir trecho</span>
                            </button>

                            {isPartCompleted && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTranscriptBlock(partIndex);
                                    setActiveTab('transcription');
                                  }}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-dark-bg hover:bg-dark-pill text-slate-200 border border-dark-border text-xs font-semibold transition-colors cursor-pointer min-h-[34px] touch-target-expand"
                                  title="Filtrar esta parte na aba Transcrição Diarizada"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Filtrar na Transcrição</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleExpandPart(partIndex)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-dark-bg hover:bg-dark-pill text-slate-200 border border-dark-border text-xs font-mono font-semibold transition-colors cursor-pointer min-h-[34px] touch-target-expand"
                                >
                                  <span>{partSegments.length || readyBlk?.segmentCount || 0} legendas</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-slate-300" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Subtitle Preview Accordion (Flat Hairlined List Rows) */}
                      {isExpanded && partSegments.length > 0 && (
                        <div className="border-t border-dark-border/60 bg-dark-bg/50 px-4 py-3 space-y-2 max-h-72 overflow-y-auto">
                          <div className="flex items-center justify-between text-xs text-dark-muted flex-wrap gap-2">
                            <span className="font-semibold text-slate-300">
                              Legendas Sincronizadas da Parte {partIndex} (Início: {startFormatted} → Fim:{' '}
                              {endFormatted})
                            </span>
                            <span className="font-mono">
                              {partSegments.length} legendas curtas • {pipelineVer}
                            </span>
                          </div>
                          <div className="divide-y divide-dark-border/50">
                            {partSegments.map((seg) => (
                              <div
                                key={seg.id}
                                onClick={() => handleSeek(seg.startTimeMs)}
                                className="py-2 px-2 hover:bg-dark-pill/50 flex items-start gap-2.5 cursor-pointer transition-colors"
                              >
                                <span className="text-xs font-mono text-emerald-300 shrink-0 mt-0.5">
                                  [{formatMsSubSecond(seg.startTimeMs)} – {formatMsSubSecond(seg.endTimeMs)}]
                                </span>
                                <span className="text-xs font-bold text-slate-200 shrink-0 mt-0.5">
                                  {seg.speakerName}:
                                </span>
                                <span className="text-xs text-slate-100 leading-snug max-w-[70ch]">
                                  {seg.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {activeTab === 'ata' && ata && (
            <AtaEditor ata={ata} onRegenerate={handleRegenerateAta} />
          )}
          {activeTab === 'analysis' && (
            <LegalAnalysisView
              summary={summary}
              onSeek={handleSeek}
              isAnalyzing={isAnalyzing}
              onTriggerAnalysis={handleTriggerAnalysis}
              analysisStatusMessage={analysisBannerMsg}
            />
          )}
          {activeTab === 'copilot' && (
            <CopilotChat hearingId={hearingId} onSeek={handleSeek} />
          )}
        </div>
      </div>
    </div>
  );
}
