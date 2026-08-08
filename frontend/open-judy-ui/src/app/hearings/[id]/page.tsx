'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Hearing, TranscriptSegment, AtaDraft, HearingSummary } from '@/lib/types';
import AudioPlayer from '@/components/AudioPlayer';
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
  Clock
} from 'lucide-react';

export default function HearingWorkspacePage() {
  const params = useParams();
  const hearingId = (params?.id as string) || 'f1e2d3c4-b5a6-9788-7654-3210fedcba98';

  const [hearing, setHearing] = useState<Hearing | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [ata, setAta] = useState<AtaDraft | null>(null);
  const [summary, setSummary] = useState<HearingSummary | null>(null);

  // Audio Playback & Timestamp synchronization state
  const [currentPlaybackMs, setCurrentPlaybackMs] = useState<number>(0);
  const [seekTargetMs, setSeekTargetMs] = useState<number | null>(null);

  // Right Panel Active Tab: 'ata' | 'analysis' | 'copilot'
  const [activeTab, setActiveTab] = useState<'ata' | 'analysis' | 'copilot'>('ata');

  useEffect(() => {
    api.getHearing(hearingId).then(setHearing);
    api.getTranscript(hearingId).then(setSegments);
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

  return (
    <div className="flex-1 flex flex-col space-y-4 max-w-[1440px] mx-auto w-full">
      {/* Top Dossier Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-card border border-dark-border rounded-2xl p-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/"
              className="p-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition"
              title="Voltar para o Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="font-mono text-sm font-bold text-white tracking-tight">
              {hearing.caseNumber}
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-dark-input text-slate-200 border border-dark-border uppercase">
              {hearing.hearingType.replace(/_/g, ' ')}
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

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1a3328] border border-emerald-900/40 text-xs text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Gemini 2.0 + AlloyDB Ativo</span>
          </div>
        </div>
      </div>

      {/* Synchronized Audio Player Bar */}
      <AudioPlayer
        currentPlaybackMs={currentPlaybackMs}
        onTimeUpdate={setCurrentPlaybackMs}
        seekTargetMs={seekTargetMs}
        totalDurationSeconds={hearing.audioDurationSeconds || 142}
        filename={hearing.audioFilename || 'audiencia_0004521_instrucao.mp3'}
      />

      {/* Main Workspace Split: Left (Diarized Transcript) vs Right (Ata / Analysis / Copilot) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[580px]">
        {/* Left Column (6 cols): Diarized Transcript Viewer */}
        <div className="lg:col-span-6 h-[620px]">
          <TranscriptViewer
            segments={segments}
            currentPlaybackMs={currentPlaybackMs}
            onSeek={handleSeek}
          />
        </div>

        {/* Right Column (6 cols): Tabbed Workspace */}
        <div className="lg:col-span-6 flex flex-col h-[620px] space-y-2">
          {/* Tab Navigation Pill Bar */}
          <div className="flex p-1 bg-dark-card border border-dark-border rounded-xl">
            <button
              onClick={() => setActiveTab('ata')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'ata'
                  ? 'bg-dark-pill text-white shadow-sm border border-dark-border/80'
                  : 'text-dark-muted hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-crimson" />
              <span>Minuta da Ata</span>
            </button>

            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'analysis'
                  ? 'bg-dark-pill text-white shadow-sm border border-dark-border/80'
                  : 'text-dark-muted hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Análise & Contradições</span>
            </button>

            <button
              onClick={() => setActiveTab('copilot')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'copilot'
                  ? 'bg-dark-pill text-white shadow-sm border border-dark-border/80'
                  : 'text-dark-muted hover:text-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-sky-400" />
              <span>Copilot IA</span>
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-hidden">
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
    </div>
  );
}
