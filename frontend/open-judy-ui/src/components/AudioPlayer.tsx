'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, FastForward } from 'lucide-react';

interface AudioPlayerProps {
  currentPlaybackMs: number;
  onTimeUpdate: (ms: number) => void;
  seekTargetMs: number | null;
  totalDurationSeconds?: number;
  filename?: string;
}

export default function AudioPlayer({
  currentPlaybackMs,
  onTimeUpdate,
  seekTargetMs,
  totalDurationSeconds = 142,
  filename = 'audiencia_0004521_instrucao.mp3',
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalDurationMs = totalDurationSeconds * 1000;

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
    <div className="bg-dark-card border border-dark-border rounded-2xl p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-crimson animate-pulse" />
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[240px] sm:max-w-xs font-mono">
            {filename}
          </span>
          <span className="text-[11px] text-dark-muted font-mono">
            ({formatTime(currentPlaybackMs)} / {formatTime(totalDurationMs)})
          </span>
        </div>

        {/* Playback rate & Volume */}
        <div className="flex items-center gap-2">
          <button
            onClick={cyclePlaybackRate}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-[11px] font-bold text-white transition"
          >
            <FastForward className="w-3 h-3 text-crimson" />
            {playbackRate}x
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-crimson" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Waveform Scrubber */}
      <div className="relative w-full mb-3 group cursor-pointer">
        <div className="w-full h-10 flex items-end gap-[3px] px-1.5 py-1 bg-dark-bg rounded-xl overflow-hidden border border-dark-border">
          {Array.from({ length: 48 }).map((_, i) => {
            const barPercent = (i / 48) * 100;
            const isPassed = barPercent <= progressPercent;
            const height = 20 + Math.sin(i * 0.4) * 35 + ((i % 3) * 15);
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

      {/* Transport Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => skipSeconds(-5)}
          className="p-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-slate-300 hover:text-white transition"
          title="Voltar 5 segundos"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={togglePlay}
          className="w-11 h-11 rounded-full bg-crimson hover:bg-crimson-dark flex items-center justify-center text-white shadow-lg shadow-crimson/30 hover:scale-105 active:scale-95 transition"
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
    </div>
  );
}
