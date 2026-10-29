'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  FastForward,
  Video,
  Music,
  Maximize2,
  Minimize2,
  Users,
  Eye,
  Sparkles,
  Camera,
  Layers,
  Scale,
  Subtitles
} from 'lucide-react';
import { MediaType, ParticipantRole, TranscriptBlock, TranscriptSegment } from '@/lib/types';

interface MediaPlayerProps {
  currentPlaybackMs: number;
  onTimeUpdate: (ms: number) => void;
  seekTargetMs: number | null;
  totalDurationSeconds?: number;
  filename?: string;
  mediaType?: MediaType;
  videoUrl?: string;
  segments?: TranscriptSegment[];
  blocks?: TranscriptBlock[];
  hearingId?: string;
  subtitleOffsetMs?: number;
  onSubtitleOffsetChange?: (offsetMs: number) => void;
}

const LEAD_IN_TOLERANCE_MS = 60;
const SEQUENTIAL_HANDOFF_OVERLAP_MS = 300;

function getEffectiveSegmentEndMs(
  seg: TranscriptSegment,
  nextSeg?: TranscriptSegment
): number {
  const spokenChars = (seg.text || '').replace(/\s+/g, '').length;
  // Prevent subtitles from lingering across long silent gaps when a short utterance has a stretched end timestamp
  const maxNaturalDurMs = Math.max(2400, Math.min(11500, 1600 + spokenChars * 110));
  let endMs = Math.min(seg.endTimeMs, seg.startTimeMs + maxNaturalDurMs);

  if (nextSeg) {
    const rawOverlapMs = endMs - nextSeg.startTimeMs;
    const isSameSpeaker =
      Boolean(seg.speakerName && nextSeg.speakerName) &&
      seg.speakerName.trim().toLowerCase() === nextSeg.speakerName.trim().toLowerCase();

    // For sequential turn handoffs (<= 300ms overlap) or same-speaker continuation,
    // end the current cue right as the next cue's perceptual lead-in begins.
    if (isSameSpeaker || rawOverlapMs <= SEQUENTIAL_HANDOFF_OVERLAP_MS) {
      const handoffEndMs = nextSeg.startTimeMs - LEAD_IN_TOLERANCE_MS;
      if (handoffEndMs >= seg.startTimeMs + 350) {
        endMs = Math.min(endMs, handoffEndMs);
      } else {
        endMs = Math.min(endMs, nextSeg.startTimeMs);
      }
    }
  }

  return Math.max(seg.startTimeMs + 350, endMs);
}

export function resolveActiveSegments(
  segments: TranscriptSegment[],
  effectiveTimeMs: number
): TranscriptSegment[] {
  if (!segments || segments.length === 0) return [];

  const matching: TranscriptSegment[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const nextSeg = segments[i + 1];
    const effectiveStartMs = Math.max(0, seg.startTimeMs - LEAD_IN_TOLERANCE_MS);
    const effectiveEndMs = getEffectiveSegmentEndMs(seg, nextSeg);

    if (effectiveTimeMs >= effectiveStartMs && effectiveTimeMs <= effectiveEndMs) {
      matching.push(seg);
    }
  }

  if (matching.length <= 1) return matching;

  // Deduplicate by speaker keeping the most recently started segment per speaker,
  // and return up to 2 simultaneous speakers ordered oldest-to-newest for stacked captions.
  const bySpeaker = new Map<string, TranscriptSegment>();
  for (const seg of matching) {
    const key = (seg.speakerName || seg.speakerRole || seg.id).trim().toLowerCase();
    bySpeaker.set(key, seg);
  }
  const deduped = Array.from(bySpeaker.values());
  return deduped.slice(-2);
}

function formatProgressiveCueText(seg: TranscriptSegment, effectiveTimeMs: number): string {
  if (!seg?.text) return '';
  const raw = seg.text.trim();
  if (raw.length <= 125) return raw;
  const words = raw.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  for (const w of words) {
    const candidate = currentLine ? `${currentLine} ${w}` : w;
    if (candidate.length <= 62 || !currentLine) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = w;
    }
  }
  if (currentLine) lines.push(currentLine);
  const cueWindows: string[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    cueWindows.push(lines.slice(i, i + 2).join(' '));
  }
  if (cueWindows.length <= 1) return raw;
  const segDur = Math.max(800, seg.endTimeMs - seg.startTimeMs);
  const ratio = Math.max(0, Math.min(0.999, (effectiveTimeMs - seg.startTimeMs) / segDur));
  const winIdx = Math.floor(ratio * cueWindows.length);
  return cueWindows[winIdx] || cueWindows[0];
}

const SUBTITLE_ROLE_STYLES: Record<ParticipantRole, { bg: string; text: string; border: string }> = {
  MAGISTRADO: { bg: 'status-badge-danger', text: 'text-red-200', border: 'border-red-500/40' },
  PROMOTOR: { bg: 'bg-rose-950/80', text: 'text-rose-200', border: 'border-rose-500/40' },
  DEFENSOR_PUBLICO: { bg: 'bg-purple-950/80', text: 'text-purple-200', border: 'border-purple-500/40' },
  ADVOGADO_AUTOR: { bg: 'bg-sky-950/80', text: 'text-sky-200', border: 'border-sky-500/40' },
  ADVOGADO_REU: { bg: 'bg-indigo-950/80', text: 'text-indigo-200', border: 'border-indigo-500/40' },
  AUTOR: { bg: 'status-badge-success', text: 'text-emerald-200', border: 'border-emerald-500/40' },
  REU: { bg: 'bg-amber-950/80', text: 'text-amber-200', border: 'border-amber-500/40' },
  TESTEMUNHA: { bg: 'bg-teal-950/80', text: 'text-teal-200', border: 'border-teal-500/40' },
  PERITO: { bg: 'bg-cyan-950/80', text: 'text-cyan-200', border: 'border-cyan-500/40' },
  ESCRIVAO: { bg: 'bg-dark-pill', text: 'text-slate-200', border: 'border-dark-border' },
  OUTRO: { bg: 'bg-dark-pill', text: 'text-slate-200', border: 'border-dark-border' },
};

export default function MediaPlayer({
  currentPlaybackMs,
  onTimeUpdate,
  seekTargetMs,
  totalDurationSeconds = 142,
  filename = 'audiencia_0004521_instrucao.mp4',
  mediaType = 'VIDEO',
  videoUrl,
  segments = [],
  blocks = [],
  hearingId,
  subtitleOffsetMs,
  onSubtitleOffsetChange,
}: MediaPlayerProps) {
  // Infer initial mode from filename or mediaType
  const isVideoFile =
    mediaType === 'VIDEO' ||
    filename.toLowerCase().endsWith('.mp4') ||
    filename.toLowerCase().endsWith('.webm') ||
    filename.toLowerCase().endsWith('.mkv') ||
    filename.toLowerCase().endsWith('.mov');

  const [viewMode, setViewMode] = useState<'VIDEO' | 'AUDIO'>(isVideoFile ? 'VIDEO' : 'AUDIO');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoExpanded, setIsVideoExpanded] = useState<boolean>(false);
  const [cameraLayout, setCameraLayout] = useState<'REAL_VIDEO' | 'GRID' | 'SPOTLIGHT'>('REAL_VIDEO');
  const [mediaLoadError, setMediaLoadError] = useState<boolean>(false);
  const [detectedDurationSec, setDetectedDurationSec] = useState<number | null>(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(true);
  const [subtitleSize, setSubtitleSize] = useState<'P' | 'M' | 'G'>('M');
  const [internalOffsetMs, setInternalOffsetMs] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const lastReportedMsRef = useRef<number>(currentPlaybackMs);
  const lastActiveCueKeyRef = useRef<string>('');

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  const activeOffsetMs = subtitleOffsetMs !== undefined ? subtitleOffsetMs : internalOffsetMs;
  const offsetStorageKey = `openjudy_subtitle_offset_${hearingId || filename || 'default'}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(offsetStorageKey);
      const parsed = saved !== null ? Number(saved) : 0;
      const validOffset = Number.isFinite(parsed)
        ? Math.max(-5000, Math.min(5000, Math.round(parsed / 100) * 100))
        : 0;
      setInternalOffsetMs(validOffset);
      if (onSubtitleOffsetChange) {
        onSubtitleOffsetChange(validOffset);
      }
    } catch (_) {}
  }, [offsetStorageKey]);

  const updateSubtitleOffset = (nextOffsetMs: number) => {
    const clamped = Math.max(-5000, Math.min(5000, Math.round(nextOffsetMs / 100) * 100));
    setInternalOffsetMs(clamped);
    if (onSubtitleOffsetChange) {
      onSubtitleOffsetChange(clamped);
    }
    if (typeof window !== 'undefined') {
      try {
        if (clamped === 0) {
          window.localStorage.removeItem(offsetStorageKey);
        } else {
          window.localStorage.setItem(offsetStorageKey, String(clamped));
        }
      } catch (_) {}
    }
  };

  const resolvedMediaUrl =
    videoUrl && videoUrl.trim().length > 0
      ? videoUrl
      : filename
      ? `/media/hearings/${encodeURIComponent(filename)}`
      : '';

  const effectiveDurationSeconds = detectedDurationSec && detectedDurationSec > 0 ? detectedDurationSec : totalDurationSeconds;
  const totalDurationMs = Math.max(1000, Math.round(effectiveDurationSeconds * 1000));

  useEffect(() => {
    setMediaLoadError(false);
    setDetectedDurationSec(null);
    setIsPlaying(false);
  }, [resolvedMediaUrl]);

  const effectiveTimeMs = Math.max(0, currentPlaybackMs + activeOffsetMs);

  // Resolve all active subtitle segments at effectiveTimeMs (supporting overlapping/rapid speakers + 60ms perceptual lead-in)
  const activeSegments = React.useMemo(
    () => resolveActiveSegments(segments, effectiveTimeMs),
    [segments, effectiveTimeMs]
  );

  // Primary segment is the most recently started active segment
  const currentSegment =
    activeSegments.length > 0 ? activeSegments[activeSegments.length - 1] : undefined;

  const currentBlock = blocks.find(
    (b) => effectiveTimeMs >= b.startTimeMs && effectiveTimeMs <= b.endTimeMs
  );

  // Compute crisp 1-2 line progressive subtitle window if a segment has multiple clauses
  const activeSubtitleText = React.useMemo(() => {
    if (!currentSegment) return '';
    return formatProgressiveCueText(currentSegment, effectiveTimeMs);
  }, [currentSegment, effectiveTimeMs]);

  const activeSpeakerName = currentSegment?.speakerName || segments[0]?.speakerName || 'Interlocutor';
  const activeSpeakerRole = currentSegment?.speakerRole || segments[0]?.speakerRole || 'MAGISTRADO';

  const uniqueSpeakers = React.useMemo(() => {
    const map = new Map<string, { name: string; role: string }>();
    for (const seg of segments) {
      if (seg.speakerName && !map.has(seg.speakerName)) {
        map.set(seg.speakerName, { name: seg.speakerName, role: seg.speakerRole || 'OUTRO' });
      }
      if (map.size >= 4) break;
    }
    return Array.from(map.values());
  }, [segments]);

  const getActiveMediaElement = (): HTMLMediaElement | null => {
    if (viewMode === 'VIDEO' && cameraLayout === 'REAL_VIDEO' && !mediaLoadError && videoRef.current) {
      return videoRef.current;
    }
    if (viewMode === 'AUDIO' && !mediaLoadError && audioRef.current) {
      return audioRef.current;
    }
    return null;
  };

  useEffect(() => {
    if (seekTargetMs !== null) {
      lastReportedMsRef.current = seekTargetMs;
      onTimeUpdate(seekTargetMs);
      const el = getActiveMediaElement();
      if (el) {
        el.currentTime = seekTargetMs / 1000;
      }
    }
  }, [seekTargetMs]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.muted = isMuted;
    }
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.muted = isMuted;
    }
  }, [playbackRate, isMuted]);

  // 60fps High-Precision Clock Loop (requestAnimationFrame + requestVideoFrameCallback)
  // Eliminates the coarse ~250ms-500ms HTML5 timeupdate lag on subtitle transitions
  useEffect(() => {
    if (!isPlaying) return;
    const initialEl = getActiveMediaElement();
    if (!initialEl) return;

    let rafId: number | null = null;
    let vfcId: number | null = null;
    let active = true;

    const syncHighPrecisionClock = () => {
      if (!active) return;
      const el = getActiveMediaElement();
      if (!el || el.paused) return;

      const nowMediaMs = Math.round(el.currentTime * 1000);
      const effMs = Math.max(0, nowMediaMs + activeOffsetMs);
      const liveSegs = resolveActiveSegments(segments, effMs);
      const cueKey = liveSegs
        .map((s) => `${s.id}:${formatProgressiveCueText(s, effMs)}`)
        .join('|');
      const elapsedSinceReport = Math.abs(nowMediaMs - lastReportedMsRef.current);

      if (cueKey !== lastActiveCueKeyRef.current || elapsedSinceReport >= 45) {
        lastActiveCueKeyRef.current = cueKey;
        lastReportedMsRef.current = nowMediaMs;
        onTimeUpdateRef.current(nowMediaMs);
      }
    };

    const tickRaf = () => {
      if (!active) return;
      syncHighPrecisionClock();
      rafId = window.requestAnimationFrame(tickRaf);
    };

    rafId = window.requestAnimationFrame(tickRaf);

    const videoEl =
      initialEl instanceof HTMLVideoElement
        ? (initialEl as HTMLVideoElement & {
            requestVideoFrameCallback?: (cb: () => void) => number;
            cancelVideoFrameCallback?: (id: number) => void;
          })
        : null;

    const tickVfc = () => {
      if (!active || !videoEl?.requestVideoFrameCallback) return;
      syncHighPrecisionClock();
      vfcId = videoEl.requestVideoFrameCallback(tickVfc);
    };

    if (videoEl && typeof videoEl.requestVideoFrameCallback === 'function') {
      vfcId = videoEl.requestVideoFrameCallback(tickVfc);
    }

    return () => {
      active = false;
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (vfcId !== null && videoEl && typeof videoEl.cancelVideoFrameCallback === 'function') {
        videoEl.cancelVideoFrameCallback(vfcId);
      }
    };
  }, [isPlaying, viewMode, cameraLayout, mediaLoadError, segments, activeOffsetMs]);

  // Fallback timer only when real HTML5 media element is not active
  useEffect(() => {
    const el = getActiveMediaElement();
    if (el) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    if (isPlaying) {
      const intervalMs = 50;
      timerRef.current = setInterval(() => {
        const nextMs = Math.min(totalDurationMs, currentPlaybackMs + intervalMs * playbackRate);
        lastReportedMsRef.current = nextMs;
        onTimeUpdate(nextMs);
        if (currentPlaybackMs >= totalDurationMs) {
          setIsPlaying(false);
        }
      }, intervalMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentPlaybackMs, playbackRate, totalDurationMs, viewMode, cameraLayout, mediaLoadError]);

  const togglePlay = () => {
    const el = getActiveMediaElement();
    if (el) {
      if (el.paused) {
        el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } else {
        el.pause();
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const min = Math.floor((totalSec % 3600) / 60);
    const sec = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMs = Number(e.target.value);
    lastReportedMsRef.current = newMs;
    onTimeUpdate(newMs);
    const el = getActiveMediaElement();
    if (el) {
      el.currentTime = newMs / 1000;
    }
  };

  const skipSeconds = (seconds: number) => {
    const newMs = Math.max(0, Math.min(totalDurationMs, currentPlaybackMs + seconds * 1000));
    lastReportedMsRef.current = newMs;
    onTimeUpdate(newMs);
    const el = getActiveMediaElement();
    if (el) {
      el.currentTime = newMs / 1000;
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1.0, 1.25, 1.5, 2.0];
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(next);
  };

  const progressPercent = (currentPlaybackMs / totalDurationMs) * 100;

  return (
    <div className="bg-transparent overflow-hidden transition-colors">
      {/* Top Media Bar */}
      <div className="p-3.5 sm:p-4 bg-dark-bg/60 border-b border-dark-border/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Media Title & Mode Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-dark-input border border-dark-border">
            {viewMode === 'VIDEO' ? (
              <Video className="w-3.5 h-3.5 text-crimson" />
            ) : (
              <Music className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span className="text-xs font-bold text-white">
              {viewMode === 'VIDEO' ? 'Vídeo da Audiência' : 'Áudio da Audiência'}
            </span>
          </div>

          <span className="text-xs font-semibold text-slate-200 font-mono truncate max-w-[200px] sm:max-w-xs">
            {filename}
          </span>

          <span className="text-xs text-dark-muted font-mono font-medium">
            ({formatTime(currentPlaybackMs)} / {formatTime(totalDurationMs)})
          </span>
        </div>

        {/* Right: Mode Toggle, Speed & Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Mode Switcher: Video vs Audio */}
          <div className="flex items-center p-0.5 bg-dark-input rounded-xl border border-dark-border">
            <button
              type="button"
              onClick={() => setViewMode('VIDEO')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors touch-target-expand ${
                viewMode === 'VIDEO'
                  ? 'bg-crimson text-white shadow-sm'
                  : 'text-dark-muted hover:text-white'
              }`}
              title="Alternar para visualização de vídeo"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Vídeo</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('AUDIO')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors touch-target-expand ${
                viewMode === 'AUDIO'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-dark-muted hover:text-white'
              }`}
              title="Alternar para visualização de forma de onda"
            >
              <Music className="w-3.5 h-3.5" />
              <span>Áudio</span>
            </button>
          </div>

          {/* Speed */}
          <button
            type="button"
            onClick={cyclePlaybackRate}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-xs font-bold text-white transition-colors min-h-[34px] touch-target-expand"
            title="Alterar velocidade de reprodução"
          >
            <FastForward className="w-3.5 h-3.5 text-crimson" />
            <span className="font-mono">{playbackRate}x</span>
          </button>

          {/* Subtitles CC Toggle & Size */}
          <div className="flex items-center p-0.5 bg-dark-input rounded-xl border border-dark-border">
            <button
              type="button"
              onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors touch-target-expand ${
                subtitlesEnabled
                  ? 'bg-crimson text-white shadow-sm'
                  : 'text-dark-muted hover:text-white'
              }`}
              title={subtitlesEnabled ? 'Desativar legendas (CC)' : 'Ativar legendas (CC)'}
            >
              <Subtitles className="w-3.5 h-3.5" />
              <span>CC</span>
            </button>
            {subtitlesEnabled && (
              <button
                type="button"
                onClick={() =>
                  setSubtitleSize(subtitleSize === 'P' ? 'M' : subtitleSize === 'M' ? 'G' : 'P')
                }
                aria-label={`Tamanho da legenda: ${subtitleSize}`}
                className="px-2 py-1.5 text-xs font-mono font-bold text-slate-200 hover:text-white transition-colors touch-target-expand"
                title="Alternar tamanho da fonte da legenda (P / M / G)"
              >
                {subtitleSize}
              </button>
            )}
          </div>

          {/* Interactive Subtitle Sync Offset Control (±0.1s Fine-Tuning) */}
          {subtitlesEnabled && (
            <div
              className="flex items-center gap-0.5 p-0.5 bg-dark-input rounded-xl border border-dark-border"
              title="Sincronia de Legenda: ajuste fino (±0.1s) persistido por audiência"
            >
              <button
                type="button"
                onClick={() => updateSubtitleOffset(activeOffsetMs - 100)}
                aria-label="Atrasar legenda em 0.1 segundo"
                className="px-2 py-1.5 rounded-lg text-xs font-mono font-bold text-dark-muted hover:text-white hover:bg-dark-pill transition-colors touch-target-expand"
                title="Atrasar legenda em 0.1s (-0.1s)"
              >
                -0.1s
              </button>
              <button
                type="button"
                onClick={() => updateSubtitleOffset(0)}
                className={`px-2 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors touch-target-expand ${
                  activeOffsetMs !== 0
                    ? 'status-badge-warning border'
                    : 'text-slate-200 hover:text-white'
                }`}
                title="Sincronia de Legenda (clique para restaurar Offset: 0.0s)"
              >
                Offset:{' '}
                {activeOffsetMs === 0
                  ? '0.0s'
                  : `${activeOffsetMs > 0 ? '+' : ''}${(activeOffsetMs / 1000).toFixed(1)}s`}
              </button>
              <button
                type="button"
                onClick={() => updateSubtitleOffset(activeOffsetMs + 100)}
                aria-label="Adiantar legenda em 0.1 segundo"
                className="px-2 py-1.5 rounded-lg text-xs font-mono font-bold text-dark-muted hover:text-white hover:bg-dark-pill transition-colors touch-target-expand"
                title="Adiantar legenda em 0.1s (+0.1s)"
              >
                +0.1s
              </button>
              {activeOffsetMs !== 0 && (
                <button
                  type="button"
                  onClick={() => updateSubtitleOffset(0)}
                  aria-label="Resetar sincronia de legenda para 0.0s"
                  className="px-2 py-1.5 rounded-lg text-xs font-bold text-amber-300 hover:text-white hover:bg-amber-500/30 transition-colors touch-target-expand"
                  title="Resetar sincronia de legenda para 0.0s"
                >
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Mute */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            aria-label={isMuted ? 'Ativar som' : 'Silenciar áudio'}
            className="p-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center touch-target-expand"
            title={isMuted ? 'Desmutar' : 'Mutar'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-crimson" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Expand Video Toggle */}
          {viewMode === 'VIDEO' && (
            <button
              type="button"
              onClick={() => setIsVideoExpanded(!isVideoExpanded)}
              aria-label={isVideoExpanded ? 'Recolher quadro de vídeo' : 'Expandir quadro de vídeo'}
              className="p-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center touch-target-expand"
              title={isVideoExpanded ? 'Recolher vídeo' : 'Expandir vídeo'}
            >
              {isVideoExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIDEO SCREEN / STAGE (Visible when viewMode === 'VIDEO') */}
      {/* ========================================================================= */}
      {viewMode === 'VIDEO' && (
        <div
          className={`relative bg-black border-b border-dark-border transition-[height] duration-300 ${
            isVideoExpanded ? 'h-[420px] sm:h-[540px]' : 'h-[280px] sm:h-[360px]'
          }`}
        >
          {/* Active Speaker HUD Banner */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/90 border border-white/15 text-white text-xs font-medium shadow-lg">
              <span className="w-2 h-2 rounded-full bg-crimson animate-pulse" />
              <span className="font-mono text-red-400 font-bold">REC</span>
              <span className="text-dark-muted">|</span>
              <span className="font-mono text-xs">{formatTime(currentPlaybackMs)}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/90 border border-white/15 text-white text-xs font-semibold shadow-lg">
              <Camera className="w-3.5 h-3.5 text-crimson" />
              <span className="truncate max-w-xs">{filename}</span>
            </div>
          </div>

          {/* Camera Layout Toggle */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setCameraLayout(
                  cameraLayout === 'REAL_VIDEO'
                    ? 'GRID'
                    : cameraLayout === 'GRID'
                    ? 'SPOTLIGHT'
                    : 'REAL_VIDEO'
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/90 border border-white/15 text-xs font-semibold text-slate-200 hover:text-white transition-colors shadow-lg touch-target-expand"
            >
              <Layers className="w-3.5 h-3.5 text-crimson" />
              <span>
                {cameraLayout === 'REAL_VIDEO'
                  ? 'Vídeo Original (MP4)'
                  : cameraLayout === 'GRID'
                  ? 'Visão em Grade (4 Câmeras)'
                  : 'Foco no Orador'}
              </span>
            </button>
          </div>

          {/* Real HTML5 Video Player, 4-Grid Courtroom Cameras, or Spotlight View */}
          {cameraLayout === 'REAL_VIDEO' && resolvedMediaUrl && !mediaLoadError ? (
            <div className="w-full h-full flex items-center justify-center bg-black relative">
              <video
                ref={videoRef}
                src={resolvedMediaUrl}
                className="w-full h-full object-contain bg-black cursor-pointer"
                playsInline
                preload="metadata"
                muted={isMuted}
                onClick={togglePlay}
                onLoadedMetadata={(e) => {
                  const dur = e.currentTarget.duration;
                  if (dur && Number.isFinite(dur) && dur > 0) {
                    setDetectedDurationSec(dur);
                  }
                  e.currentTarget.playbackRate = playbackRate;
                }}
                onTimeUpdate={(e) => {
                  const nowMs = Math.round(e.currentTarget.currentTime * 1000);
                  if (!isPlaying || Math.abs(nowMs - lastReportedMsRef.current) >= 45) {
                    lastReportedMsRef.current = nowMs;
                    onTimeUpdate(nowMs);
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onError={() => {
                  setMediaLoadError(true);
                  setCameraLayout('GRID');
                }}
              />
              {!isPlaying && (
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label="Reproduzir vídeo da audiência"
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-crimson/90 hover:bg-crimson text-white flex items-center justify-center shadow-2xl shadow-crimson/50 transition-transform hover:scale-110 z-10"
                  title="Reproduzir vídeo da audiência"
                >
                  <Play className="w-7 h-7 ml-1" />
                </button>
              )}
            </div>
          ) : cameraLayout === 'GRID' ? (
            <div className="w-full h-full grid grid-cols-2 gap-1.5 p-2 bg-dark-bg">
              {(uniqueSpeakers.length > 0
                ? uniqueSpeakers
                : [{ name: activeSpeakerName, role: activeSpeakerRole }]
              ).map((spk, idx) => {
                const isSpeaking = activeSegments.some((s) => s.speakerName === spk.name);
                const initials = spk.name
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join('');
                return (
                  <div
                    key={`${spk.name}-${idx}`}
                    className={`relative rounded-xl overflow-hidden bg-dark-card border transition-colors flex flex-col items-center justify-center ${
                      isSpeaking
                        ? 'border-crimson ring-2 ring-crimson/50 shadow-lg shadow-crimson/20'
                        : 'border-white/5 opacity-85'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-crimson/20 border border-crimson/40 text-red-300 flex items-center justify-center font-bold text-sm shadow-md mb-2">
                      {initials || 'OJ'}
                    </div>
                    <span className="text-xs font-bold text-white tracking-wide px-2 text-center truncate max-w-full">
                      {spk.name}
                    </span>
                    <span className="text-xs text-dark-muted">{spk.role.replace(/_/g, ' ')}</span>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[11px] font-mono text-slate-200 border border-white/10">
                      CAM 0{idx + 1} • {spk.role.replace(/_/g, ' ')}
                    </div>
                    {isSpeaking && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-crimson text-[11px] font-bold text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        FALANDO
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Spotlight Mode: Large Active Speaker Frame */
            <div className="w-full h-full flex items-center justify-center bg-dark-bg p-4 relative">
              <div className="text-center space-y-2 max-w-md">
                <div className="w-20 h-20 mx-auto rounded-full bg-crimson/20 border-2 border-crimson flex items-center justify-center text-white text-xl font-black shadow-xl shadow-crimson/30 animate-pulse">
                  {activeSpeakerName.slice(0, 2).toUpperCase()}
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white">{activeSpeakerName}</h4>
                <p className="text-xs text-crimson font-semibold">
                  {activeSpeakerRole.replace(/_/g, ' ')}
                </p>
                {currentSegment?.text && (
                  <p className="text-xs text-slate-300 bg-black/60 border border-white/10 p-3 rounded-xl line-clamp-2 italic">
                    &ldquo;{currentSegment.text}&rdquo;
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Cinema / Streaming Subtitle Overlay (Supports Single & Stacked Dual-Speaker Overlap) */}
          {subtitlesEnabled && activeSegments.length > 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[94%] sm:max-w-3xl px-4 py-2.5 rounded-2xl bg-black/95 border border-white/15 text-center z-20 shadow-2xl transition-opacity duration-100 space-y-2">
              {activeSegments.map((seg, idx) => {
                const roleStyle = SUBTITLE_ROLE_STYLES[seg.speakerRole] || SUBTITLE_ROLE_STYLES.OUTRO;
                const segText = formatProgressiveCueText(seg, effectiveTimeMs);
                return (
                  <div
                    key={seg.id}
                    className={
                      idx > 0
                        ? 'pt-1.5 border-t border-white/10'
                        : ''
                    }
                  >
                    <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-bold border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                      >
                        {seg.speakerName} ({seg.speakerRole.replace(/_/g, ' ')})
                      </span>
                      <span className="text-xs font-mono text-slate-300">
                        {seg.startTimeFormatted} – {seg.endTimeFormatted}
                      </span>
                      {idx === activeSegments.length - 1 && currentBlock && (
                        <span className="text-xs font-mono status-badge-success px-2 py-0.5 rounded border">
                          Parte {currentBlock.blockIndex}/{blocks.length || 1}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-white font-medium leading-snug tracking-wide mx-auto max-w-[68ch] ${
                        subtitleSize === 'G'
                          ? 'text-sm sm:text-base'
                          : subtitleSize === 'P'
                          ? 'text-xs'
                          : 'text-xs sm:text-sm'
                      }`}
                    >
                      {segText}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUDIO WAVEFORM SCRUBBER (Visible when viewMode === 'AUDIO' or as main scrubber) */}
      {/* ========================================================================= */}
      {viewMode === 'AUDIO' && resolvedMediaUrl && !mediaLoadError && (
        <audio
          ref={audioRef}
          src={resolvedMediaUrl}
          preload="metadata"
          muted={isMuted}
          onLoadedMetadata={(e) => {
            const dur = e.currentTarget.duration;
            if (dur && Number.isFinite(dur) && dur > 0) {
              setDetectedDurationSec(dur);
            }
          }}
          onTimeUpdate={(e) => {
            const nowMs = Math.round(e.currentTarget.currentTime * 1000);
            if (!isPlaying || Math.abs(nowMs - lastReportedMsRef.current) >= 45) {
              lastReportedMsRef.current = nowMs;
              onTimeUpdate(nowMs);
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={() => setMediaLoadError(true)}
          className="hidden"
        />
      )}
      <div className="p-4 space-y-3">
        {viewMode === 'AUDIO' && subtitlesEnabled && activeSegments.length > 0 && (
          <div className="px-4 py-2.5 rounded-xl bg-dark-bg/90 border border-dark-border text-center space-y-2">
            {activeSegments.map((seg, idx) => (
              <div key={seg.id} className={idx > 0 ? 'pt-1.5 border-t border-dark-border/60' : ''}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-crimson font-bold text-xs">{seg.speakerName}:</span>
                  <span className="text-xs font-mono text-dark-muted">
                    {seg.startTimeFormatted} – {seg.endTimeFormatted}
                  </span>
                </div>
                <p className="text-white text-xs sm:text-sm font-medium leading-snug mx-auto max-w-[68ch]">
                  {formatProgressiveCueText(seg, effectiveTimeMs)}
                </p>
              </div>
            ))}
          </div>
        )}
        {viewMode === 'AUDIO' && (
          <div className="relative w-full group cursor-pointer">
            <div className="w-full h-11 flex items-end gap-[3px] px-2 py-1 bg-dark-bg rounded-xl overflow-hidden border border-dark-border">
              {Array.from({ length: 54 }).map((_, i) => {
                const barPercent = (i / 54) * 100;
                const isPassed = barPercent <= progressPercent;
                const height = 20 + Math.sin(i * 0.35) * 40 + ((i % 4) * 12);
                return (
                  <div
                    key={i}
                    style={{ height: `${Math.min(100, Math.max(15, height))}%` }}
                    className={`flex-1 rounded-sm transition-colors duration-75 ${
                      isPassed
                        ? 'bg-crimson shadow-sm shadow-crimson/50'
                        : 'bg-dark-pill group-hover:bg-[#343844]'
                    }`}
                  />
                );
              })}
            </div>
            <input
              type="range"
              min={0}
              max={totalDurationMs}
              value={currentPlaybackMs}
              onChange={handleScrub}
              aria-label="Posição de reprodução do áudio"
              aria-valuetext={`${formatTime(currentPlaybackMs)} de ${formatTime(totalDurationMs)}`}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
        )}

        {/* Video Scrubber Slider with Part (1..N) Chapter Dividers */}
        {viewMode === 'VIDEO' && (
          <div className="space-y-1">
            <div className="relative w-full flex items-center group">
              <div className="relative w-full h-2.5 bg-dark-input rounded-full overflow-hidden border border-dark-border">
                <div
                  className="h-full bg-crimson transition-[width] duration-100 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
                {blocks.length > 1 &&
                  blocks.slice(1).map((blk) => {
                    const pct = Math.min(99.5, Math.max(0.5, (blk.startTimeMs / totalDurationMs) * 100));
                    return (
                      <div
                        key={`div-${blk.blockIndex}`}
                        style={{ left: `${pct}%` }}
                        className="absolute top-0 bottom-0 w-[2px] bg-black/80 z-10"
                        title={`Parte ${blk.blockIndex}: ${blk.startTimeFormatted} – ${blk.endTimeFormatted}`}
                      />
                    );
                  })}
              </div>
              <input
                type="range"
                min={0}
                max={totalDurationMs}
                value={currentPlaybackMs}
                onChange={handleScrub}
                aria-label="Posição de reprodução do vídeo"
                aria-valuetext={`${formatTime(currentPlaybackMs)} de ${formatTime(totalDurationMs)}`}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
              />
            </div>
            {blocks.length > 1 && (
              <div className="flex items-center justify-between text-xs font-mono text-dark-muted px-0.5">
                <span>
                  {currentBlock
                    ? `Reproduzindo Parte ${currentBlock.blockIndex}/${blocks.length} (${currentBlock.startTimeFormatted} – ${currentBlock.endTimeFormatted})`
                    : `Dividido em ${blocks.length} partes sequenciais`}
                </span>
                <span>{blocks.filter((b) => (b.status || 'COMPLETED') === 'COMPLETED').length}/{blocks.length} partes prontas</span>
              </div>
            )}
          </div>
        )}

        {/* Transport Controls Bar */}
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono text-dark-muted hidden sm:block">
            {formatTime(currentPlaybackMs)} / {formatTime(totalDurationMs)}
          </div>

          {/* Center Playback Buttons */}
          <div className="flex items-center justify-center gap-3 mx-auto">
            <button
              type="button"
              onClick={() => skipSeconds(-5)}
              aria-label="Voltar 5 segundos"
              className="p-2.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-slate-300 hover:text-white transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center touch-target-expand"
              title="Voltar 5 segundos"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pausar reprodução' : 'Iniciar reprodução'}
              className="w-11 h-11 rounded-full bg-crimson hover:bg-crimson-dark flex items-center justify-center text-white shadow-lg shadow-crimson/30 hover:scale-105 active:scale-95 transition-transform"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => skipSeconds(5)}
              aria-label="Avançar 5 segundos"
              className="p-2.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-slate-300 hover:text-white transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center touch-target-expand"
              title="Avançar 5 segundos"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs font-mono text-dark-muted hidden sm:block text-right">
            Taxa: {playbackRate}x
          </div>
        </div>
      </div>
    </div>
  );
}
