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
  Scale
} from 'lucide-react';
import { MediaType, ParticipantRole, TranscriptSegment } from '@/lib/types';

interface MediaPlayerProps {
  currentPlaybackMs: number;
  onTimeUpdate: (ms: number) => void;
  seekTargetMs: number | null;
  totalDurationSeconds?: number;
  filename?: string;
  mediaType?: MediaType;
  videoUrl?: string;
  segments?: TranscriptSegment[];
}

export default function MediaPlayer({
  currentPlaybackMs,
  onTimeUpdate,
  seekTargetMs,
  totalDurationSeconds = 142,
  filename = 'audiencia_0004521_instrucao.mp4',
  mediaType = 'VIDEO',
  videoUrl,
  segments = [],
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
  const [cameraLayout, setCameraLayout] = useState<'GRID' | 'SPOTLIGHT'>('GRID');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const totalDurationMs = totalDurationSeconds * 1000;

  // Find active segment and speaker at current time
  const currentSegment = segments.find(
    (s) => currentPlaybackMs >= s.startTimeMs && currentPlaybackMs <= s.endTimeMs
  );

  const activeSpeakerName = currentSegment?.speakerName || 'Dra. Camila Vasconcelos';
  const activeSpeakerRole = currentSegment?.speakerRole || 'MAGISTRADO';

  useEffect(() => {
    if (seekTargetMs !== null) {
      onTimeUpdate(seekTargetMs);
    }
  }, [seekTargetMs]);

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = 100;
      timerRef.current = setInterval(() => {
        onTimeUpdate(Math.min(totalDurationMs, currentPlaybackMs + intervalMs * playbackRate));
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
  }, [isPlaying, currentPlaybackMs, playbackRate, totalDurationMs]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMs = Number(e.target.value);
    onTimeUpdate(newMs);
  };

  const skipSeconds = (seconds: number) => {
    const newMs = Math.max(0, Math.min(totalDurationMs, currentPlaybackMs + seconds * 1000));
    onTimeUpdate(newMs);
  };

  const cyclePlaybackRate = () => {
    const rates = [1.0, 1.25, 1.5, 2.0];
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(next);
  };

  const progressPercent = (currentPlaybackMs / totalDurationMs) * 100;

  return (
    <div className="bg-transparent overflow-hidden transition-all">
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
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">
              {viewMode === 'VIDEO' ? 'Vídeo da Audiência' : 'Áudio da Audiência'}
            </span>
          </div>

          <span className="text-xs font-semibold text-slate-200 font-mono truncate max-w-[200px] sm:max-w-xs">
            {filename}
          </span>

          <span className="text-[11px] text-dark-muted font-mono font-medium">
            ({formatTime(currentPlaybackMs)} / {formatTime(totalDurationMs)})
          </span>
        </div>

        {/* Right: Mode Toggle, Speed & Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher: Video vs Audio */}
          <div className="flex items-center p-0.5 bg-dark-input rounded-xl border border-dark-border">
            <button
              onClick={() => setViewMode('VIDEO')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                viewMode === 'VIDEO'
                  ? 'bg-crimson text-white shadow-sm'
                  : 'text-dark-muted hover:text-white'
              }`}
              title="Alternar para visualização de vídeo"
            >
              <Video className="w-3 h-3" />
              <span>Vídeo</span>
            </button>
            <button
              onClick={() => setViewMode('AUDIO')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                viewMode === 'AUDIO'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-dark-muted hover:text-white'
              }`}
              title="Alternar para visualização de forma de onda"
            >
              <Music className="w-3 h-3" />
              <span>Áudio</span>
            </button>
          </div>

          {/* Speed */}
          <button
            onClick={cyclePlaybackRate}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-[11px] font-bold text-white transition"
            title="Alterar velocidade de reprodução"
          >
            <FastForward className="w-3 h-3 text-crimson" />
            {playbackRate}x
          </button>

          {/* Mute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition"
            title={isMuted ? 'Desmutar' : 'Mutar'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-crimson" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Expand Video Toggle */}
          {viewMode === 'VIDEO' && (
            <button
              onClick={() => setIsVideoExpanded(!isVideoExpanded)}
              className="p-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition"
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
          className={`relative bg-[#090a0f] border-b border-dark-border transition-all duration-300 ${
            isVideoExpanded ? 'h-[360px] sm:h-[440px]' : 'h-[220px] sm:h-[260px]'
          }`}
        >
          {/* Active Speaker HUD Banner */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-white text-[11px] font-medium shadow-lg">
              <span className="w-2 h-2 rounded-full bg-crimson animate-pulse" />
              <span className="font-mono text-red-400 font-bold">REC</span>
              <span className="text-dark-muted">|</span>
              <span className="font-mono text-xs">{formatTime(currentPlaybackMs)}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-white text-xs font-semibold shadow-lg">
              <Camera className="w-3.5 h-3.5 text-crimson" />
              <span>Sessão Virtual Gravada • Vara Cível Central</span>
            </div>
          </div>

          {/* Camera Layout Toggle */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            <button
              onClick={() => setCameraLayout(cameraLayout === 'GRID' ? 'SPOTLIGHT' : 'GRID')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-bold text-slate-200 hover:text-white transition shadow-lg"
            >
              <Layers className="w-3 h-3 text-crimson" />
              <span>{cameraLayout === 'GRID' ? 'Visão em Grade (4 Câmeras)' : 'Foco no Orador'}</span>
            </button>
          </div>

          {/* 4-Grid Courtroom Cameras or Spotlight View */}
          {cameraLayout === 'GRID' ? (
            <div className="w-full h-full grid grid-cols-2 gap-1.5 p-2 bg-[#0c0d14]">
              {/* Camera 1: Magistrado */}
              <div
                className={`relative rounded-xl overflow-hidden bg-[#141622] border transition-all flex flex-col items-center justify-center ${
                  activeSpeakerRole === 'MAGISTRADO'
                    ? 'border-crimson ring-2 ring-crimson/50 shadow-lg shadow-crimson/20'
                    : 'border-white/5 opacity-85'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-crimson/20 border border-crimson/40 text-red-300 flex items-center justify-center font-bold text-sm shadow-md mb-2">
                  CV
                </div>
                <span className="text-xs font-bold text-white tracking-wide">Dra. Camila Vasconcelos</span>
                <span className="text-[10px] text-dark-muted">Magistrada Presidente</span>
                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-slate-300 border border-white/10">
                  CAM 01 • JUIZ
                </div>
                {activeSpeakerRole === 'MAGISTRADO' && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-crimson text-[9px] font-black text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    FALANDO
                  </div>
                )}
              </div>

              {/* Camera 2: Advogado Autor */}
              <div
                className={`relative rounded-xl overflow-hidden bg-[#141622] border transition-all flex flex-col items-center justify-center ${
                  activeSpeakerRole === 'ADVOGADO_AUTOR' || activeSpeakerRole === 'AUTOR'
                    ? 'border-crimson ring-2 ring-crimson/50 shadow-lg shadow-crimson/20'
                    : 'border-white/5 opacity-85'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-sm shadow-md mb-2">
                  LM
                </div>
                <span className="text-xs font-bold text-white tracking-wide">Dr. Lucas Menezes / Mariana R.</span>
                <span className="text-[10px] text-dark-muted">Advogado / Parte Autora</span>
                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-slate-300 border border-white/10">
                  CAM 02 • AUTOR
                </div>
                {(activeSpeakerRole === 'ADVOGADO_AUTOR' || activeSpeakerRole === 'AUTOR') && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-crimson text-[9px] font-black text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    FALANDO
                  </div>
                )}
              </div>

              {/* Camera 3: Advogada Ré */}
              <div
                className={`relative rounded-xl overflow-hidden bg-[#141622] border transition-all flex flex-col items-center justify-center ${
                  activeSpeakerRole === 'ADVOGADO_REU' || activeSpeakerRole === 'REU'
                    ? 'border-crimson ring-2 ring-crimson/50 shadow-lg shadow-crimson/20'
                    : 'border-white/5 opacity-85'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-amber-600/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-sm shadow-md mb-2">
                  BF
                </div>
                <span className="text-xs font-bold text-white tracking-wide">Dra. Beatriz Fontana</span>
                <span className="text-[10px] text-dark-muted">Advogada da Ré</span>
                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-slate-300 border border-white/10">
                  CAM 03 • RÉU
                </div>
                {(activeSpeakerRole === 'ADVOGADO_REU' || activeSpeakerRole === 'REU') && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-crimson text-[9px] font-black text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    FALANDO
                  </div>
                )}
              </div>

              {/* Camera 4: Testemunha */}
              <div
                className={`relative rounded-xl overflow-hidden bg-[#141622] border transition-all flex flex-col items-center justify-center ${
                  activeSpeakerRole === 'TESTEMUNHA' || activeSpeakerRole === 'PERITO'
                    ? 'border-crimson ring-2 ring-crimson/50 shadow-lg shadow-crimson/20'
                    : 'border-white/5 opacity-85'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-sm shadow-md mb-2">
                  CP
                </div>
                <span className="text-xs font-bold text-white tracking-wide">Carlos Eduardo Prado</span>
                <span className="text-[10px] text-dark-muted">Testemunha / Oitiva</span>
                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-slate-300 border border-white/10">
                  CAM 04 • TESTEMUNHA
                </div>
                {(activeSpeakerRole === 'TESTEMUNHA' || activeSpeakerRole === 'PERITO') && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-crimson text-[9px] font-black text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    FALANDO
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Spotlight Mode: Large Active Speaker Frame */
            <div className="w-full h-full flex items-center justify-center bg-[#0e1017] p-4 relative">
              <div className="text-center space-y-2 max-w-md">
                <div className="w-20 h-20 mx-auto rounded-full bg-crimson/20 border-2 border-crimson flex items-center justify-center text-white text-xl font-black shadow-xl shadow-crimson/30 animate-pulse">
                  {activeSpeakerName.slice(0, 2).toUpperCase()}
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white">{activeSpeakerName}</h4>
                <p className="text-xs text-crimson font-semibold uppercase tracking-wider">
                  {activeSpeakerRole.replace(/_/g, ' ')}
                </p>
                {currentSegment?.text && (
                  <p className="text-xs text-slate-300 bg-black/60 border border-white/10 p-3 rounded-xl line-clamp-2 italic">
                    "{currentSegment.text}"
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Subtitle / Closed Caption Bar */}
          {currentSegment && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 max-w-[90%] sm:max-w-2xl px-4 py-2 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 text-center z-20 shadow-2xl">
              <span className="text-crimson font-bold text-xs mr-2">{currentSegment.speakerName}:</span>
              <span className="text-white text-xs font-medium leading-relaxed">{currentSegment.text}</span>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUDIO WAVEFORM SCRUBBER (Visible when viewMode === 'AUDIO' or as main scrubber) */}
      {/* ========================================================================= */}
      <div className="p-4 space-y-3">
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
                    className={`flex-1 rounded-sm transition-all duration-75 ${
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
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
        )}

        {/* Video Scrubber Slider (when viewMode === 'VIDEO') */}
        {viewMode === 'VIDEO' && (
          <div className="relative w-full flex items-center group">
            <div className="w-full h-2 bg-dark-input rounded-full overflow-hidden border border-dark-border">
              <div
                className="h-full bg-crimson transition-all duration-100 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={totalDurationMs}
              value={currentPlaybackMs}
              onChange={handleScrub}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
        )}

        {/* Transport Controls Bar */}
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono text-dark-muted hidden sm:block">
            {formatTime(currentPlaybackMs)} / {formatTime(totalDurationMs)}
          </div>

          {/* Center Playback Buttons */}
          <div className="flex items-center justify-center gap-3 mx-auto">
            <button
              onClick={() => skipSeconds(-5)}
              className="p-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-slate-300 hover:text-white transition"
              title="Voltar 5 segundos"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-crimson hover:bg-crimson-dark flex items-center justify-center text-white shadow-lg shadow-crimson/30 hover:scale-105 active:scale-95 transition"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <button
              onClick={() => skipSeconds(5)}
              className="p-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-slate-300 hover:text-white transition"
              title="Avançar 5 segundos"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <div className="text-[11px] font-mono text-dark-muted hidden sm:block text-right">
            Taxa: {playbackRate}x
          </div>
        </div>
      </div>
    </div>
  );
}
