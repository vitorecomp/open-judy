'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TranscriptSegment, ParticipantRole } from '@/lib/types';
import { resolveActiveSegments } from '@/components/MediaPlayer';
import { Search, Clock, CheckCircle2, Bookmark, Edit2, Loader2, Subtitles, Play } from 'lucide-react';

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  blocks?: import('@/lib/types').TranscriptBlock[];
  currentPlaybackMs: number;
  subtitleOffsetMs?: number;
  onSeek: (ms: number) => void;
  hearingStatus?: string;
  totalDurationSeconds?: number;
  selectedBlockIndex?: number | null;
  onSelectBlockIndex?: (blockIndex: number | null) => void;
}

const ROLE_COLORS: Record<ParticipantRole, { bg: string; text: string; border: string; label: string }> = {
  MAGISTRADO: { bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-600/50', label: 'MAGISTRADO' },
  PROMOTOR: { bg: 'bg-rose-950/50', text: 'text-rose-200', border: 'border-rose-700/50', label: 'MINISTÉRIO PÚBLICO' },
  DEFENSOR_PUBLICO: { bg: 'bg-purple-950/50', text: 'text-purple-200', border: 'border-purple-700/50', label: 'DEFENSORIA PÚBLICA' },
  ADVOGADO_AUTOR: { bg: 'bg-sky-950/50', text: 'text-sky-200', border: 'border-sky-700/50', label: 'ADVOGADO DO AUTOR' },
  ADVOGADO_REU: { bg: 'bg-indigo-950/50', text: 'text-indigo-200', border: 'border-indigo-700/50', label: 'ADVOGADO DO RÉU' },
  AUTOR: { bg: 'status-badge-success', text: 'text-emerald-200', border: 'border-emerald-700/50', label: 'PARTE AUTORA' },
  REU: { bg: 'bg-amber-950/40', text: 'text-amber-200', border: 'border-amber-800/50', label: 'PARTE RÉ' },
  TESTEMUNHA: { bg: 'bg-teal-950/50', text: 'text-teal-200', border: 'border-teal-700/50', label: 'TESTEMUNHA' },
  PERITO: { bg: 'bg-cyan-950/50', text: 'text-cyan-200', border: 'border-cyan-700/50', label: 'PERITO JUDICIAL' },
  ESCRIVAO: { bg: 'bg-dark-pill', text: 'text-slate-200', border: 'border-dark-border', label: 'SECRETARIA / ESCRIVÃO' },
  OUTRO: { bg: 'bg-dark-pill', text: 'text-slate-200', border: 'border-dark-border', label: 'DECLARANTE' },
};

const VIRTUAL_THRESHOLD = 100;
const ESTIMATED_ROW_HEIGHT = 64;
const OVERSCAN_ROWS = 20;

interface TranscriptCueRowProps {
  segment: TranscriptSegment;
  rowNumber: number;
  isActive: boolean;
  isPrimaryActive: boolean;
  isEditing: boolean;
  currentSpeakerName: string;
  activeCueRef: React.RefObject<HTMLDivElement | null>;
  onSeekToSegment: (ms: number) => void;
  onStartEdit: (id: string) => void;
  onFinishEdit: () => void;
  onSpeakerChange: (id: string, newName: string) => void;
}

const TranscriptCueRow = React.memo(function TranscriptCueRow({
  segment,
  rowNumber,
  isActive,
  isPrimaryActive,
  isEditing,
  currentSpeakerName,
  activeCueRef,
  onSeekToSegment,
  onStartEdit,
  onFinishEdit,
  onSpeakerChange,
}: TranscriptCueRowProps) {
  const roleStyle = ROLE_COLORS[segment.speakerRole] || ROLE_COLORS.OUTRO;
  const paragraphCode = `§ ${String(rowNumber).padStart(4, '0')}`;

  return (
    <div
      ref={isPrimaryActive ? activeCueRef : null}
      className={`px-3.5 py-2.5 rounded-lg border transition-colors duration-150 flex flex-col sm:flex-row sm:items-baseline gap-2.5 ${
        isActive
          ? 'bg-crimson/15 border-crimson/70 shadow-sm'
          : 'bg-dark-input/40 border-dark-border/80 hover:border-dark-muted/50'
      }`}
    >
      {/* Left Column: Official Paragraph Record Number + Clickable Timestamp + Judicial Party Badge */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <span
          className="text-[11px] font-mono font-bold text-dark-muted px-1.5 py-0.5 rounded bg-dark-bg border border-dark-border/80 select-none"
          title={`Registro taquigráfico nº ${rowNumber} da degravação oficial`}
        >
          {paragraphCode}
        </span>

        <button
          type="button"
          onClick={() => onSeekToSegment(segment.startTimeMs)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono font-bold border transition-colors cursor-pointer touch-target-expand ${
            isActive
              ? 'bg-crimson text-white border-crimson'
              : 'bg-dark-bg hover:bg-dark-pill text-slate-200 hover:text-white border-dark-border'
          }`}
          title="Ir para este instante no registro audiovisual"
        >
          <Clock className="w-3 h-3" />
          <span>
            {segment.startTimeFormatted} – {segment.endTimeFormatted}
          </span>
        </button>

        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded border tracking-wide ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
        >
          {roleStyle.label}
        </span>

        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              aria-label="Editar qualificação do declarante"
              value={currentSpeakerName}
              onChange={(e) => onSpeakerChange(segment.id, e.target.value)}
              className="px-2 py-1 text-xs bg-dark-bg border border-crimson rounded text-white focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={onFinishEdit}
              aria-label="Confirmar qualificação do declarante"
              className="text-emerald-400 hover:text-emerald-300 p-1 touch-target-expand"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 group/name">
            <span className="text-xs font-bold text-slate-100">
              {currentSpeakerName}:
            </span>
            <button
              type="button"
              onClick={() => onStartEdit(segment.id)}
              aria-label={`Retificar identificação do declarante ${currentSpeakerName}`}
              className="opacity-0 group-hover/name:opacity-100 focus:opacity-100 text-dark-muted hover:text-white transition-opacity p-1 touch-target-expand"
              title="Retificar identificação do declarante"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Official Verbatim Utterance Text */}
      <div className="flex-1 flex items-baseline justify-between gap-2 min-w-0">
        <p
          onClick={() => onSeekToSegment(segment.startTimeMs)}
          className={`text-xs sm:text-sm leading-relaxed cursor-pointer max-w-[70ch] ${
            isActive ? 'text-white font-semibold' : 'text-slate-200 hover:text-white'
          }`}
        >
          {segment.text}
        </p>

        {segment.isKeyStatement && (
          <span className="flex items-center gap-1 text-[11px] status-badge-warning px-2 py-0.5 rounded border font-semibold shrink-0">
            <Bookmark className="w-3 h-3" /> Ponto Relevante
          </span>
        )}
      </div>
    </div>
  );
});

export default function TranscriptViewer({
  segments,
  blocks = [],
  currentPlaybackMs,
  subtitleOffsetMs = 0,
  onSeek,
  hearingStatus,
  totalDurationSeconds = 0,
  selectedBlockIndex,
  onSelectBlockIndex,
}: TranscriptViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedSpeakers, setEditedSpeakers] = useState<Record<string, string>>({});
  const [internalBlockFilter, setInternalBlockFilter] = useState<number | null>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(640);
  const activeCueRef = useRef<HTMLDivElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const userScrollLockUntilRef = useRef<number>(0);

  const handleUserManualScroll = () => {
    userScrollLockUntilRef.current = Date.now() + 4500;
  };

  const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setScrollTop(el.scrollTop);
    if (el.clientHeight > 0 && el.clientHeight !== viewportHeight) {
      setViewportHeight(el.clientHeight);
    }
  };

  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    if (el.clientHeight > 0) {
      setViewportHeight(el.clientHeight);
    }
  }, []);

  const activeBlockFilter =
    selectedBlockIndex !== undefined ? selectedBlockIndex : internalBlockFilter;
  const setActiveBlockFilter = (val: number | null) => {
    setInternalBlockFilter(val);
    if (onSelectBlockIndex) onSelectBlockIndex(val);
  };

  const completedBlocks = blocks.filter((b) => (b.status || 'COMPLETED') === 'COMPLETED');
  const processingBlock = blocks.find((b) => b.status === 'PROCESSING');
  const isTranscribing =
    hearingStatus === 'PROCESSING_TRANSCRIPTION' || hearingStatus === 'PENDING_UPLOAD';
  const totalExpectedBlocks = Math.max(
    blocks.length,
    totalDurationSeconds > 600 ? Math.ceil(totalDurationSeconds / 600) : 1
  );
  const progressPct =
    totalExpectedBlocks > 0
      ? Math.min(100, Math.round((completedBlocks.length / totalExpectedBlocks) * 100))
      : 0;

  const formatSecHms = (sec: number) => {
    const s = Math.max(0, Math.floor(Math.round(sec * 100) / 100));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
  };

  const filteredSegments = React.useMemo(
    () =>
      segments.filter((s) => {
        if (activeBlockFilter !== null && s.blockIndex !== activeBlockFilter) {
          return false;
        }
        const q = searchTerm.toLowerCase();
        if (!q) return true;
        const textMatch = s.text.toLowerCase().includes(q);
        const speakerMatch = (editedSpeakers[s.id] || s.speakerName)
          .toLowerCase()
          .includes(q);
        return textMatch || speakerMatch;
      }),
    [segments, activeBlockFilter, searchTerm, editedSpeakers]
  );

  const effectiveTimeMs = Math.max(0, currentPlaybackMs + subtitleOffsetMs);

  const activeSegments = React.useMemo(
    () => resolveActiveSegments(filteredSegments, effectiveTimeMs),
    [filteredSegments, effectiveTimeMs]
  );

  const activeSegmentIds = React.useMemo(
    () => new Set(activeSegments.map((s) => s.id)),
    [activeSegments]
  );

  const activeSegmentId =
    activeSegments.length > 0 ? activeSegments[activeSegments.length - 1].id : null;

  const activeSegmentIndex = React.useMemo(
    () => (activeSegmentId ? filteredSegments.findIndex((s) => s.id === activeSegmentId) : -1),
    [filteredSegments, activeSegmentId]
  );

  const isVirtualized = filteredSegments.length > VIRTUAL_THRESHOLD;
  const virtualStartIndex = isVirtualized
    ? Math.max(0, Math.floor(scrollTop / ESTIMATED_ROW_HEIGHT) - OVERSCAN_ROWS)
    : 0;
  const virtualEndIndex = isVirtualized
    ? Math.min(
        filteredSegments.length,
        Math.ceil((scrollTop + viewportHeight) / ESTIMATED_ROW_HEIGHT) + OVERSCAN_ROWS
      )
    : filteredSegments.length;
  const visibleSegments = isVirtualized
    ? filteredSegments.slice(virtualStartIndex, virtualEndIndex)
    : filteredSegments;
  const topSpacerHeight = isVirtualized ? virtualStartIndex * ESTIMATED_ROW_HEIGHT : 0;
  const bottomSpacerHeight = isVirtualized
    ? Math.max(0, (filteredSegments.length - virtualEndIndex) * ESTIMATED_ROW_HEIGHT)
    : 0;

  useEffect(() => {
    if (!autoScroll || !activeSegmentId || !listContainerRef.current) {
      return;
    }
    if (Date.now() < userScrollLockUntilRef.current) {
      return;
    }
    const container = listContainerRef.current;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollBehavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

    const targetEl = activeCueRef.current;
    if (targetEl) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const topThreshold = containerRect.top + containerRect.height * 0.14;
      const bottomThreshold = containerRect.bottom - containerRect.height * 0.22;
      if (targetRect.top < topThreshold || targetRect.bottom > bottomThreshold) {
        const offsetTopInContainer = targetRect.top - containerRect.top + container.scrollTop;
        const desiredScrollTop = Math.max(0, offsetTopInContainer - containerRect.height * 0.3);
        container.scrollTo({
          top: desiredScrollTop,
          behavior: scrollBehavior,
        });
      }
    } else if (isVirtualized && activeSegmentIndex >= 0) {
      const desiredScrollTop = Math.max(
        0,
        activeSegmentIndex * ESTIMATED_ROW_HEIGHT - container.clientHeight * 0.3
      );
      setScrollTop(desiredScrollTop);
      container.scrollTo({
        top: desiredScrollTop,
        behavior: scrollBehavior,
      });
    }
  }, [activeSegmentId, activeSegmentIndex, autoScroll, isVirtualized]);

  const handleSpeakerChange = React.useCallback((id: string, newName: string) => {
    setEditedSpeakers((prev) => ({ ...prev, [id]: newName }));
  }, []);

  const handleSeekToSegment = React.useCallback(
    (ms: number) => {
      userScrollLockUntilRef.current = 0;
      onSeek(ms);
    },
    [onSeek]
  );

  const handleStartEdit = React.useCallback((id: string) => {
    setEditingId(id);
  }, []);

  const handleFinishEdit = React.useCallback(() => {
    setEditingId(null);
  }, []);

  const activeBlockObj =
    activeBlockFilter !== null
      ? blocks.find((b) => b.blockIndex === activeBlockFilter) || null
      : null;

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Header, Auto-Scroll Toggle & Search */}
      <div className="p-4 border-b border-dark-border bg-dark-bg/40 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
              <Subtitles className="w-4 h-4 text-crimson" />
              <span>Termo de Degravação Oficial &amp; Registro Taquigráfico</span>
              {isTranscribing ? (
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded status-badge-warning border font-mono">
                  <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                  <span>
                    Bloco {completedBlocks.length}/{totalExpectedBlocks} concluído
                    {completedBlocks.length !== 1 ? 's' : ''} ({progressPct}%)
                  </span>
                </span>
              ) : (
                completedBlocks.length > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded bg-dark-input text-slate-200 border border-dark-border font-mono">
                    {completedBlocks.length}/{totalExpectedBlocks} blocos homologados
                  </span>
                )
              )}
            </h2>
            <p className="text-xs text-dark-muted">
              {segments.length} registros taquigráficos sincronizados (Res. CNJ nº 105/2010)
              {isTranscribing
                ? ` • Atualização contínua a cada bloco processado pelo motor forense`
                : ` • Selecione qualquer parágrafo (§) para posicionar o registro audiovisual`}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                userScrollLockUntilRef.current = 0;
                setAutoScroll(!autoScroll);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shrink-0 min-h-[36px] touch-target-expand ${
                autoScroll
                  ? 'bg-crimson/15 text-slate-100 border-crimson/50'
                  : 'bg-dark-input text-dark-muted hover:text-white border-dark-border'
              }`}
              title="Acompanhar automaticamente o registro audiovisual durante a reprodução"
            >
              <Play className="w-3 h-3" />
              <span>Acompanhar Áudio</span>
            </button>

            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-dark-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Pesquisar no termo de degravação ou por declarante"
                placeholder="Pesquisar termo ou declarante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-dark-input border border-dark-border rounded-lg text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson transition-colors min-h-[36px]"
              />
            </div>
          </div>
        </div>

        {/* Live Progressive Transcription Banner */}
        {isTranscribing && (
          <div className="rounded-lg status-badge-warning border px-3.5 py-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-amber-200 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                <span>
                  {processingBlock
                    ? `Degravando Bloco ${processingBlock.blockIndex}/${totalExpectedBlocks} (${processingBlock.startTimeFormatted} – ${processingBlock.endTimeFormatted}) com margem de segurança de ${processingBlock.paddingSeconds || 0}s e ${processingBlock.contextSegmentsCount || 0} registros precedentes...`
                    : completedBlocks.length > 0
                    ? `Degravando Bloco ${Math.min(completedBlocks.length + 1, totalExpectedBlocks)} de ${totalExpectedBlocks}... Os blocos 1 a ${completedBlocks.length} já constam nos autos.`
                    : `Iniciando degravação do Bloco 1 de ${totalExpectedBlocks} no motor forense...`}
                </span>
              </div>
              <span className="text-xs font-mono text-amber-300 font-bold shrink-0">
                {completedBlocks.length} / {totalExpectedBlocks} blocos ({progressPct}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-dark-input rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-[width] duration-500"
                style={{ width: `${Math.max(4, progressPct)}%` }}
              />
            </div>
          </div>
        )}

        {/* Block Filter Pills (Using real DB lifecycle status when pre-created, or fallback) */}
        {(blocks.length > 0 || isTranscribing) && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            <button
              type="button"
              onClick={() => setActiveBlockFilter(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[34px] touch-target-expand ${
                activeBlockFilter === null
                  ? 'bg-crimson text-white'
                  : 'bg-dark-input text-dark-muted hover:text-white border border-dark-border'
              }`}
            >
              Degravação Integral ({segments.length})
            </button>
            {blocks.map((blk) => {
              const blkStatus = blk.status || 'COMPLETED';
              const isCompleted = blkStatus === 'COMPLETED';
              const isProc = blkStatus === 'PROCESSING';
              return (
                <button
                  type="button"
                  key={blk.id || `blk-${blk.blockIndex}`}
                  onClick={() => {
                    if (isCompleted) {
                      setActiveBlockFilter(blk.blockIndex);
                    }
                    onSeek(blk.startTimeMs);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border min-h-[34px] touch-target-expand ${
                    activeBlockFilter === blk.blockIndex
                      ? 'bg-crimson text-white border-crimson'
                      : isCompleted
                      ? 'bg-dark-input text-slate-200 hover:text-white border-emerald-800/40'
                      : isProc
                      ? 'status-badge-warning font-semibold'
                      : 'bg-dark-input/40 text-dark-muted border-dark-border/40'
                  }`}
                  title={`${blk.title} (${blk.startTimeFormatted} - ${blk.endTimeFormatted})`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : isProc ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                  ) : null}
                  <span>Bloco {blk.blockIndex}</span>
                  <span className="text-xs font-mono opacity-85">
                    ({blk.startTimeFormatted} - {blk.endTimeFormatted})
                  </span>
                </button>
              );
            })}
            {isTranscribing &&
              blocks.length < totalExpectedBlocks &&
              Array.from(
                { length: Math.max(0, totalExpectedBlocks - blocks.length) },
                (_, idx) => blocks.length + idx + 1
              ).map((pendingIdx) => {
                const isNextActive = pendingIdx === completedBlocks.length + 1;
                const stepSec =
                  totalDurationSeconds > 0
                    ? totalDurationSeconds / totalExpectedBlocks
                    : 540;
                const estStart = formatSecHms((pendingIdx - 1) * stepSec);
                const estEnd = formatSecHms(pendingIdx * stepSec);
                return (
                  <span
                    key={`pending-blk-${pendingIdx}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border min-h-[34px] ${
                      isNextActive
                        ? 'status-badge-warning font-semibold'
                        : 'bg-dark-input/40 text-dark-muted border-dark-border/40'
                    }`}
                  >
                    {isNextActive && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                    )}
                    <span>Bloco {pendingIdx}</span>
                    <span className="text-xs font-mono opacity-80">
                      ({estStart} - {estEnd})
                    </span>
                  </span>
                );
              })}
          </div>
        )}

        {/* Selected Block Summary Banner */}
        {activeBlockObj && (
          <div className="rounded-lg bg-dark-input/80 border border-dark-border px-3.5 py-2.5 text-xs text-slate-200 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-white">{activeBlockObj.title}</span>
              <span className="font-mono text-xs text-emerald-300">
                Início: {activeBlockObj.startTimeFormatted} → Término: {activeBlockObj.endTimeFormatted} ({activeBlockObj.segmentCount} parágrafos)
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono text-dark-muted">
              <span>
                Motor Forense: {activeBlockObj.pipelineVersion || 'v3.2-VAD-SYNC (gemini-3.8-flash)'}
              </span>
              <span>•</span>
              <span>
                Diretriz:{' '}
                {activeBlockObj.promptVersion ||
                  'PROMPT_AUDIO_VIDEO_TRANSCRIPTION v3 (OPT_V1_DIARIZATION_SURGICAL)'}
              </span>
            </div>
            {activeBlockObj.summary && (
              <p className="text-xs text-dark-muted leading-relaxed max-w-[70ch]">
                {activeBlockObj.summary}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Synchronized Subtitle Cue List (Virtualized when > 100 cues) */}
      <div
        ref={listContainerRef}
        onScroll={handleContainerScroll}
        onWheel={handleUserManualScroll}
        onTouchMove={handleUserManualScroll}
        className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2"
      >
        {topSpacerHeight > 0 && (
          <div style={{ height: `${topSpacerHeight}px` }} aria-hidden="true" />
        )}
        {visibleSegments.map((segment, idx) => (
          <TranscriptCueRow
            key={segment.id}
            segment={segment}
            rowNumber={virtualStartIndex + idx + 1}
            isActive={activeSegmentIds.has(segment.id)}
            isPrimaryActive={segment.id === activeSegmentId}
            isEditing={editingId === segment.id}
            currentSpeakerName={editedSpeakers[segment.id] || segment.speakerName}
            activeCueRef={activeCueRef}
            onSeekToSegment={handleSeekToSegment}
            onStartEdit={handleStartEdit}
            onFinishEdit={handleFinishEdit}
            onSpeakerChange={handleSpeakerChange}
          />
        ))}
        {bottomSpacerHeight > 0 && (
          <div style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true" />
        )}

        {isTranscribing && activeBlockFilter === null && (
          <div className="p-3.5 rounded-lg border status-badge-warning flex items-center justify-between gap-3 text-xs animate-pulse">
            <div className="flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
              <span>
                Lavrando degravação do <strong>Bloco {Math.min(completedBlocks.length + 1, totalExpectedBlocks)} de {totalExpectedBlocks}</strong> no motor forense...
              </span>
            </div>
            <span className="font-mono text-xs text-amber-300 font-bold shrink-0">
              {completedBlocks.length}/{totalExpectedBlocks}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
