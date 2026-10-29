'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, formatPromptVersionBadge, getUnreadNotificationCount } from '@/lib/api';
import { Hearing } from '@/lib/types';
import UploadModal from '@/components/UploadModal';
import {
  Settings,
  Plus,
  ArrowRight,
  Maximize2,
  ChevronDown,
  Trash2,
  Clock,
  Sparkles,
  Scale,
  Users,
  MapPin,
  FileText,
  Video,
  Music
} from 'lucide-react';

export default function DashboardPage() {
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api.listHearings().then(setHearings);
    getUnreadNotificationCount().then(setUnreadCount).catch(() => {});
  }, []);

  const completedHearings = hearings.filter(
    (h) => h.status === 'READY' || h.status === 'TRANSCRIPTION_COMPLETED'
  );
  const completionPct = hearings.length > 0 ? Math.round((completedHearings.length / hearings.length) * 100) : 0;
  const totalParticipants = hearings.reduce((acc, h) => acc + (h.participants?.length || 0), 0);

  return (
    <div className="w-full space-y-8 animate-in fade-in">
      {/* ========================================================================= */}
      {/* TOP SECTION: DASHBOARD WIDGETS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Big Widget: Court Map Hero (7 cols) */}
        <div className="lg:col-span-7 bg-dark-card border border-dark-border rounded-2xl p-5 relative flex flex-col justify-between overflow-hidden shadow-xl min-h-[300px] sm:min-h-[340px]">
          {/* Subtle Map Ambient Background */}
          <div className="absolute inset-0 bg-dark-bg opacity-90" />
          
          {/* Stylized vector map graphic & glow */}
          <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">
            <svg viewBox="0 0 800 400" className="w-full h-full text-slate-600 fill-current">
              <path d="M150,80 Q200,60 260,90 T350,110 T450,90 T550,120 T650,100 Q700,120 720,160 T680,240 T580,280 T480,260 T380,310 T280,270 T180,220 Z" fill="var(--color-pill)" />
              <path d="M180,110 Q220,100 280,130 T370,160 T460,140 T560,180 T630,220 T520,240 T390,260 T250,220 T190,160 Z" fill="var(--color-input)" />
            </svg>
          </div>

          {/* Interactive Glowing Red Court Pins reflecting real populated hearings */}
          <div className="relative z-10 w-full h-full min-h-[220px]">
            <div className="absolute top-[42%] left-[50%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-crimson/30 animate-ping absolute inset-0" />
              <div className="w-7 h-7 rounded-full bg-crimson flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-crimson/50 ring-2 ring-white/20">
                {hearings.length}
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-8 left-1/2 -translate-x-1/2 bg-dark-bg border border-dark-border px-2.5 py-1 rounded-md text-[11px] text-white whitespace-nowrap z-20 shadow-xl pointer-events-none">
                {hearings.length} Audiências na Pauta ({completedHearings.length} concluídas)
              </div>
            </div>
          </div>

          {/* Map bottom controls */}
          <div className="relative z-10 flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-crimson animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">
                Monitoramento de Audiências & Processamento IA
              </span>
            </div>
            <button
              className="p-1.5 rounded-lg bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
              title="Expandir mapa"
              aria-label="Expandir mapa de audiências"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Big Widget: Audiências Próximas da Conclusão (5 cols) */}
        <div className="lg:col-span-5 bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-200">
                Status do Pipeline de Audiências
              </h3>
              <Link
                href="/settings?tab=ui"
                className="p-1.5 rounded-lg text-dark-muted hover:text-white hover:bg-dark-input transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                title="Configurar painel de pipeline"
                aria-label="Configurar painel de pipeline"
              >
                <Settings className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* List of Hearings with Real Progress Bars */}
            <div className="space-y-4">
              {hearings.slice(0, 3).map((h) => {
                const isDone = h.status === 'READY' || h.status === 'TRANSCRIPTION_COMPLETED';
                const isRunning = h.status === 'PROCESSING_TRANSCRIPTION' || h.status === 'PROCESSING_SUMMARY';
                const pct = isDone ? '100%' : isRunning ? '55%' : '15%';
                const statusLabel = isDone ? 'concluído' : isRunning ? 'transcrevendo' : h.status === 'FAILED' ? 'falha' : 'na fila';
                return (
                  <Link key={h.id} href={`/hearings/${h.id}`} className="block space-y-1.5 group">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-white group-hover:text-crimson transition-colors truncate">
                          {h.mediaFilename || h.audioFilename || h.caseNumber}
                        </span>
                      </div>
                      <span className="text-[11px] text-dark-muted font-mono uppercase shrink-0">
                        {statusLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-dark-muted gap-2 flex-wrap">
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">{h.caseNumber}</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-800/40 font-mono text-[11px] font-semibold"
                          title={`Versão do Prompt: ${h.promptVersion || 'PROMPT_AUDIO_VIDEO_TRANSCRIPTION v3 (OPT_V1_DIARIZATION_SURGICAL)'}`}
                        >
                          <Sparkles className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                          <span>Prompt: {formatPromptVersionBadge(h.promptVersion, h.pipelineVersion)}</span>
                        </span>
                        <span className="text-[11px] text-dark-muted tabular-nums">
                          {(h.participants?.length || 0)} {(h.participants?.length || 0) === 1 ? 'pessoa' : 'pessoas'}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-dark-input rounded-full overflow-hidden">
                      <div className="h-full bg-crimson rounded-full transition-[width] duration-500" style={{ width: pct }} />
                    </div>
                  </Link>
                );
              })}
              {hearings.length === 0 && (
                <p className="text-xs text-dark-muted py-4 text-center">
                  Nenhuma audiência cadastrada.
                </p>
              )}
            </div>
          </div>

          {/* Action button linking to /hearings */}
          <div className="pt-4 border-t border-dark-border/60 flex justify-end">
            <Link
              href="/hearings"
              className="px-4 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
            >
              <span>Ir para Audiências</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Middle Left Row: Informações de Audiências & Pautas (6 cols) */}
        <div className="lg:col-span-6 bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-200">
                Informações de Audiências & Pautas
              </h3>
              <Link
                href="/settings?tab=ui"
                className="p-1.5 rounded-lg text-dark-muted hover:text-white hover:bg-dark-input transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                title="Configurar indicadores de pautas"
                aria-label="Configurar indicadores de pautas"
              >
                <Settings className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 3 Prominent Stat Columns */}
            <div className="grid grid-cols-3 gap-3 my-2">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">
                  {hearings.length}
                </div>
                <p className="text-[11px] text-dark-muted mt-1 leading-tight">
                  Audiências na pauta
                </p>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">
                  {completedHearings.length}
                </div>
                <p className="text-[11px] text-dark-muted mt-1 leading-tight">
                  Transcrições prontas
                </p>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">
                  {totalParticipants}
                </div>
                <p className="text-[11px] text-dark-muted mt-1 leading-tight">
                  Participantes identificados por IA
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons in card */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-dark-border/60">
            <Link
              href="/hearings"
              className="px-3.5 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Ver Todas
            </Link>
            <Link
              href={hearings[0] ? `/hearings/${hearings[0].id}` : '/hearings'}
              className="px-3.5 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-xs font-semibold text-white transition-colors"
            >
              Abrir Sessão
            </Link>
          </div>
        </div>

        {/* Middle Right Metric Card 1: Taxa de Transcrição Concluída (3 cols) */}
        <div className="lg:col-span-3 bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="text-3xl font-black text-white tracking-tight tabular-nums">
              {completionPct}<span className="text-xl text-dark-muted">%</span>
            </div>
            <p className="text-xs font-semibold text-slate-200 mt-0.5">
              Vídeos Transcritos
            </p>
          </div>

          <div className="my-3 h-16 w-full relative">
            <svg viewBox="0 0 200 80" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#e63946" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#e63946" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0,60 C 40,55 70,75 110,40 C 150,10 170,25 200,10 L 200,80 L 0,80 Z"
                fill="url(#curveGradient)"
              />
              <path
                d="M 0,60 C 40,55 70,75 110,40 C 150,10 170,25 200,10"
                fill="none"
                stroke="#e63946"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <p className="text-[11px] text-dark-muted">Processados via Gemini 3.8 Flash</p>
        </div>

        {/* Middle Right Metric Card 2: Cobertura de Diarização IA (3 cols) */}
        <div className="lg:col-span-3 bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl font-black text-white tracking-tight tabular-nums">
                {completionPct}<span className="text-xl text-dark-muted">%</span>
              </div>
              <p className="text-xs font-semibold text-slate-200 mt-0.5">
                Diarização Concluída
              </p>
            </div>

            <div className="relative w-14 h-14">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path
                  className="text-dark-input"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-crimson"
                  strokeDasharray={`${completionPct}, 100`}
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>

          <p className="text-[11px] text-dark-muted mt-4">
            Audiências com participantes e segmentos extraídos pela IA
          </p>
        </div>

        {/* Bottom Left: Audiências Recentes (7 cols) */}
        <div className="lg:col-span-7 bg-dark-card border border-dark-border rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-200">
                  Audiências Recentes
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-crimson text-white tabular-nums">
                  {hearings.length}
                </span>
              </div>
              <Link
                href="/settings?tab=ui"
                className="p-1.5 rounded-lg text-dark-muted hover:text-white hover:bg-dark-input transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                title="Configurar lista de audiências recentes"
                aria-label="Configurar lista de audiências recentes"
              >
                <Settings className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mini Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] text-dark-muted border-b border-dark-border/60">
                    <th className="pb-2 font-medium">Audiência / Processo ▾</th>
                    <th className="pb-2 font-medium">Status Pipeline ▾</th>
                    <th className="pb-2 font-medium">Tipo ▾</th>
                    <th className="pb-2 font-medium">Participantes ▾</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40">
                  {hearings.slice(0, 3).map((h) => {
                    const isDone = h.status === 'READY' || h.status === 'TRANSCRIPTION_COMPLETED';
                    const isRunning = h.status === 'PROCESSING_TRANSCRIPTION' || h.status === 'PROCESSING_SUMMARY';
                    return (
                      <tr key={h.id} className="group hover:bg-dark-pill/30">
                        <td className="py-2.5 font-medium text-white">
                          <Link
                            href={`/hearings/${h.id}`}
                            className="hover:text-crimson transition-colors flex flex-col gap-1"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="p-0.5 rounded bg-crimson/15 text-crimson border border-crimson/30">
                                <Video className="w-2.5 h-2.5" />
                              </span>
                              <span className="truncate max-w-[180px]">{h.mediaFilename || h.audioFilename || h.caseNumber}</span>
                              <span className="font-mono text-[11px] text-dark-muted tabular-nums">({h.caseNumber})</span>
                            </div>
                            <div>
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-800/40 font-mono text-[11px] font-semibold"
                                title={`Versão do Prompt: ${h.promptVersion || 'PROMPT_AUDIO_VIDEO_TRANSCRIPTION v3 (OPT_V1_DIARIZATION_SURGICAL)'}`}
                              >
                                <Sparkles className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                                <span>Prompt: {formatPromptVersionBadge(h.promptVersion, h.pipelineVersion)}</span>
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              isDone
                                ? 'status-badge-success'
                                : isRunning
                                ? 'status-badge-warning'
                                : h.status === 'FAILED'
                                ? 'status-badge-danger'
                                : 'status-badge-info'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isDone ? 'bg-emerald-400' : isRunning ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'
                              }`}
                            />
                            {isDone ? 'concluído' : isRunning ? 'transcrevendo' : h.status === 'FAILED' ? 'falha' : 'na fila'}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-md text-[11px] bg-dark-input text-slate-300 border border-dark-border">
                            {h.hearingType.includes('INSTRUCAO') ? 'Instrução' : h.hearingType}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-300 text-[11px] tabular-nums">
                          {(h.participants?.length || 0)} {(h.participants?.length || 0) === 1 ? 'pessoa' : 'pessoas'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-dark-border/40 flex justify-end">
            <Link
              href="/hearings"
              className="text-xs text-crimson hover:text-crimson-light font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Ver todas as audiências na pauta</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Bottom Right: Notificações (5 cols) */}
        <div className="lg:col-span-5 bg-dark-card border border-dark-border rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-200">
                  Notificações
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-crimson text-white tabular-nums">
                  {unreadCount}
                </span>
              </div>
              <div className="flex items-center gap-1 text-dark-muted">
                <Link
                  href="/settings?tab=notifications"
                  className="p-1.5 rounded-lg hover:text-white hover:bg-dark-input transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                  title="Configurar notificações"
                  aria-label="Configurar notificações"
                >
                  <Settings className="w-3.5 h-3.5" />
                </Link>
                <button
                  className="p-1.5 rounded-lg hover:text-white hover:bg-dark-input transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                  title="Limpar notificações"
                  aria-label="Limpar notificações"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Avatar Stack & Update card */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex -space-x-2 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-crimson flex items-center justify-center text-white text-[11px] font-black ring-2 ring-dark-card">
                  J
                </div>
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-dark-card">
                  CV
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-dark-card">
                  AW
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white">
                Suporte a Audiências em Vídeo & Áudio!
              </h4>
              <p className="text-[11px] text-dark-muted leading-relaxed">
                Processamento multimodal de gravações de vídeo e áudio com Gemini 3.8 Flash e análise textual com Gemini 4 Argon.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-dark-border/40 flex justify-end">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-white text-xs font-bold transition-colors min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Audiência</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
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
