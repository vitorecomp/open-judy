'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
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
  MessageSquare
} from 'lucide-react';

export default function HearingWorkspacePage() {
  const params = useParams();
  const hearingId = (params?.id as string) || 'f1e2d3c4-b5a6-9788-7654-3210fedcba98';

  const [hearing, setHearing] = useState<Hearing | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [blocks, setBlocks] = useState<import('@/lib/types').TranscriptBlock[]>([]);
  const [ata, setAta] = useState<AtaDraft | null>(null);
  const [summary, setSummary] = useState<HearingSummary | null>(null);

  // Audio/Video Playback & Timestamp synchronization state
  const [currentPlaybackMs, setCurrentPlaybackMs] = useState<number>(0);
  const [seekTargetMs, setSeekTargetMs] = useState<number | null>(null);

  // Unified Workspace Active Tab: 'transcription' | 'ata' | 'analysis' | 'copilot'
  const [activeTab, setActiveTab] = useState<'transcription' | 'ata' | 'analysis' | 'copilot'>('transcription');

  useEffect(() => {
    api.getHearing(hearingId).then(setHearing);
    api.getTranscript(hearingId).then(setSegments);
    api.getBlocks(hearingId).then(setBlocks);
    api.getAta(hearingId).then(setAta);
    api.getAnalysis(hearingId).then(setSummary);
  }, [hearingId]);

  const handleSeek = (ms: number) => {
    setCurrentPlaybackMs(ms);
    setSeekTargetMs(ms);
    setTimeout(() => setSeekTargetMs(null), 50);
  };

  const handleRegenerateAta = async () => {
    const updated = await api.generateAta(hearingId);
    setAta(updated);
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
    <div className="flex-1 flex flex-col space-y-4 w-full">
      {/* ========================================================================= */}
      {/* CARD 1: Top Dossier Header & Synchronized Media Player */}
      {/* ========================================================================= */}
      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl">
        {/* Dossier Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b border-dark-border/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href="/hearings"
                className="p-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition"
                title="Voltar para a Lista de Audiências"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <span className="font-mono text-sm font-bold text-white tracking-tight">
                {hearing.caseNumber}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-dark-input text-slate-200 border border-dark-border uppercase">
                {hearing.hearingType.replace(/_/g, ' ')}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                isVideo
                  ? 'bg-crimson/15 text-red-300 border-crimson/30'
                  : 'bg-indigo-600/15 text-indigo-300 border-indigo-500/30'
              }`}>
                {isVideo ? <Video className="w-3 h-3 text-crimson" /> : <Music className="w-3 h-3 text-indigo-400" />}
                <span>{isVideo ? 'Vídeo da Sessão' : 'Gravação em Áudio'}</span>
              </span>
            </div>

            <p className="text-xs text-dark-muted pl-8 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-dark-muted" />
              <span>{hearing.courtJurisdiction}</span>
            </p>
          </div>

          {/* Badges & Meta info */}
          <div className="flex items-center gap-2.5 flex-wrap pl-8 md:pl-0">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-dark-input border border-dark-border text-xs text-slate-300">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{hearing.participants.length} Participantes</span>
            </div>
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
          videoUrl={hearing.videoUrl}
          segments={segments}
        />
      </div>

      {/* ========================================================================= */}
      {/* CARD 2: Unified Workspace Card (Transcrição, Minuta, Análise, Gemini Chat) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl min-h-[640px]">
        {/* Top Tab Navigation Bar */}
        <div className="p-2.5 bg-dark-bg/60 border-b border-dark-border flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('transcription')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'transcription'
                ? 'bg-dark-pill text-white shadow-sm border border-dark-border/80'
                : 'text-dark-muted hover:text-slate-200 hover:bg-dark-pill/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-red-400" />
            <span>Transcrição Diarizada</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-dark-input text-slate-300 font-mono">
              {segments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ata')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'ata'
                ? 'bg-dark-pill text-white shadow-sm border border-dark-border/80'
                : 'text-dark-muted hover:text-slate-200 hover:bg-dark-pill/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-crimson" />
            <span>Minuta da Ata</span>
          </button>

          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'analysis'
                ? 'bg-dark-pill text-white shadow-sm border border-dark-border/80'
                : 'text-dark-muted hover:text-slate-200 hover:bg-dark-pill/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Análise & Contradições</span>
            {summary?.contradictions && summary.contradictions.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-950/60 text-amber-300 font-mono border border-amber-800/40">
                {summary.contradictions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('copilot')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
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
              onSeek={handleSeek}
            />
          )}
          {activeTab === 'ata' && ata && (
            <AtaEditor ata={ata} onRegenerate={handleRegenerateAta} />
          )}
          {activeTab === 'analysis' && summary && (
            <LegalAnalysisView summary={summary} onSeek={handleSeek} />
          )}
          {activeTab === 'copilot' && (
            <CopilotChat hearingId={hearingId} onSeek={handleSeek} />
          )}
        </div>
      </div>
    </div>
  );
}
