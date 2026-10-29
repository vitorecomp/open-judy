'use client';

import React from 'react';
import { HearingSummary } from '@/lib/types';
import {
  Sparkles,
  AlertTriangle,
  Scale,
  Calendar,
  Quote,
  Clock,
  RefreshCw,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface LegalAnalysisViewProps {
  summary: HearingSummary | null;
  onSeek: (ms: number) => void;
  isAnalyzing?: boolean;
  onTriggerAnalysis?: () => void;
  analysisStatusMessage?: string | null;
}

function formatMsLabel(ms: number): string {
  const safeSec = Math.max(0, Math.floor((ms || 0) / 1000));
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = safeSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

export default function LegalAnalysisView({
  summary,
  onSeek,
  isAnalyzing = false,
  onTriggerAnalysis,
  analysisStatusMessage,
}: LegalAnalysisViewProps) {
  const hasContent = Boolean(
    summary &&
      (summary.executiveSummary?.trim() ||
        (summary.contradictions && summary.contradictions.length > 0) ||
        (summary.disputedFacts && summary.disputedFacts.length > 0) ||
        (summary.timeline && summary.timeline.length > 0) ||
        (summary.keyQuotes && summary.keyQuotes.length > 0))
  );

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto p-5 space-y-6">
      {/* Task Status & Trigger Toolbar */}
      <div className="p-4 rounded-xl bg-dark-card border border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
              <Sparkles className="w-4 h-4 text-crimson" />
              <span>Task de Análises &amp; Detecção de Contradições</span>
            </span>
            {isAnalyzing ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold status-badge-warning border">
                <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                <span>Processando Task IA...</span>
              </span>
            ) : hasContent ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold status-badge-success border">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Task Concluída</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-dark-input text-slate-300 border border-dark-border">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Aguardando Execução</span>
              </span>
            )}
          </div>
          <p className="text-xs text-dark-muted">
            Extração assíncrona fundamentada nos segmentos da transcrição (
            <span className="font-mono text-indigo-300">
              {summary?.promptVersion ||
                'PROMPT_HEARING_SUMMARY + PROMPT_CONTRADICTION_DETECTION'}
            </span>
            )
          </p>
          {analysisStatusMessage && (
            <p className="text-xs text-emerald-300 font-medium pt-0.5">
              {analysisStatusMessage}
            </p>
          )}
        </div>

        {onTriggerAnalysis && (
          <button
            type="button"
            onClick={onTriggerAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-crimson hover:bg-crimson-dark disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-md shadow-crimson/20 shrink-0 cursor-pointer min-h-[38px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>
              {isAnalyzing
                ? 'Executando Task...'
                : hasContent
                ? 'Reprocessar Análise & Contradições'
                : 'Executar Task de Análise'}
            </span>
          </button>
        )}
      </div>

      {!hasContent ? (
        <div className="p-8 rounded-2xl bg-dark-input/50 border border-dark-border text-center space-y-3">
          <Sparkles className="w-8 h-8 text-crimson mx-auto opacity-80" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">
              {isAnalyzing
                ? 'Processando Análises Jurídicas e Contradições via Task...'
                : 'Análise Probatória e Contradições ainda não geradas'}
            </h4>
            <p className="text-xs text-dark-muted max-w-md mx-auto">
              A task analisa todos os depoimentos transcritos da audiência para extrair o resumo executivo, pontos controvertidos, linha do tempo e alertas de contradições com timestamps clicáveis.
            </p>
          </div>
          {onTriggerAnalysis && !isAnalyzing && (
            <button
              type="button"
              onClick={onTriggerAnalysis}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-white text-xs font-bold transition-colors shadow-md shadow-crimson/20 cursor-pointer min-h-[38px]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Executar Task Agora</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Executive Summary */}
          {summary?.executiveSummary && (
            <div className="p-4 rounded-xl bg-dark-input border border-dark-border">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-crimson" />
                <h3 className="text-sm font-bold text-red-400">
                  Resumo Executivo da Audiência
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line max-w-[70ch]">
                {summary.executiveSummary}
              </p>
            </div>
          )}

          {/* Contradiction Detector */}
          {summary?.contradictions && summary.contradictions.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-amber-400">
                    Contradições Detectadas ({summary.contradictions.length})
                  </h3>
                </div>
              </div>
              <div className="space-y-3">
                {summary.contradictions.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl status-badge-danger border space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-red-200 max-w-[70ch]">{c.description}</h4>
                      {c.severity && (
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-950/80 text-red-200 border border-red-800/60 shrink-0">
                          {c.severity}
                          {typeof c.confidence === 'number'
                            ? ` • ${Math.round(c.confidence * 100)}%`
                            : ''}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Speaker A */}
                      <div className="p-3 rounded-lg bg-dark-bg/85 border border-dark-border">
                        <div className="flex items-center justify-between text-slate-200 font-semibold mb-1 gap-2">
                          <span className="truncate">{c.speakerA}</span>
                          <button
                            type="button"
                            onClick={() => onSeek(c.timestampMsA)}
                            className="flex items-center gap-1 text-xs text-red-400 hover:underline font-mono shrink-0 cursor-pointer touch-target-expand"
                          >
                            <Clock className="w-3 h-3" /> [{formatMsLabel(c.timestampMsA)}] Ouvir fala
                          </button>
                        </div>
                        <p className="text-slate-200 italic max-w-[65ch]">&ldquo;{c.statementA}&rdquo;</p>
                      </div>

                      {/* Speaker B */}
                      <div className="p-3 rounded-lg bg-dark-bg/85 border border-dark-border">
                        <div className="flex items-center justify-between text-slate-200 font-semibold mb-1 gap-2">
                          <span className="truncate">{c.speakerB}</span>
                          <button
                            type="button"
                            onClick={() => onSeek(c.timestampMsB)}
                            className="flex items-center gap-1 text-xs text-red-400 hover:underline font-mono shrink-0 cursor-pointer touch-target-expand"
                          >
                            <Clock className="w-3 h-3" /> [{formatMsLabel(c.timestampMsB)}] Ouvir fala
                          </button>
                        </div>
                        <p className="text-slate-200 italic max-w-[65ch]">&ldquo;{c.statementB}&rdquo;</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 pt-1 text-xs text-red-200 font-medium max-w-[70ch]">
                      <Scale className="w-3.5 h-3.5 mt-0.5 shrink-0 text-crimson" />
                      <span>
                        <strong>Impacto Processual:</strong> {c.legalImpact}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disputed Facts */}
          {summary?.disputedFacts && summary.disputedFacts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Scale className="w-4 h-4 text-slate-300" />
                <h3 className="text-sm font-bold text-slate-200">
                  Pontos Controvertidos e Teses ({summary.disputedFacts.length})
                </h3>
              </div>
              <div className="space-y-3">
                {summary.disputedFacts.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-dark-input border border-dark-border text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-200">{f.topic}</h4>
                      <div className="flex gap-1 flex-wrap">
                        {f.relevantTimestampTags.map((t, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-dark-bg text-xs font-mono text-crimson border border-dark-border"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-dark-muted max-w-[70ch]">{f.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                      <div className="p-3 rounded-lg bg-dark-bg border border-dark-border">
                        <span className="text-xs font-bold text-red-400">
                          Tese do Autor / Acusação
                        </span>
                        <p className="text-slate-200 text-xs mt-1 max-w-[65ch]">{f.plaintiffPosition}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-dark-bg border border-dark-border">
                        <span className="text-xs font-bold text-slate-300">
                          Tese do Réu / Defesa
                        </span>
                        <p className="text-slate-200 text-xs mt-1 max-w-[65ch]">{f.defendantPosition}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Quotes */}
          {summary?.keyQuotes && summary.keyQuotes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Quote className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-200">
                  Depoimentos e Trechos-Chave ({summary.keyQuotes.length})
                </h3>
              </div>
              <div className="space-y-2.5">
                {summary.keyQuotes.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-dark-input border border-dark-border text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{q.speakerName}</span>
                        <span className="px-2 py-0.5 rounded bg-dark-bg text-xs font-mono text-slate-200 border border-dark-border">
                          {q.role}
                        </span>
                        {q.relevanceTag && (
                          <span className="px-2 py-0.5 rounded status-badge-success border text-xs font-semibold">
                            {q.relevanceTag}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onSeek(q.timestampMs)}
                        className="flex items-center gap-1 text-xs text-crimson hover:underline font-mono cursor-pointer touch-target-expand"
                      >
                        <Clock className="w-3 h-3" /> [{formatMsLabel(q.timestampMs)}] Ir para trecho
                      </button>
                    </div>
                    <p className="text-slate-200 italic max-w-[70ch]">&ldquo;{q.quoteText}&rdquo;</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chronological Timeline */}
          {summary?.timeline && summary.timeline.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-crimson" />
                <h3 className="text-sm font-bold text-slate-200">
                  Cronologia dos Fatos Extraída ({summary.timeline.length})
                </h3>
              </div>
              <div className="relative border-l-2 border-dark-border ml-2 space-y-4 pl-4">
                {summary.timeline.map((ev, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-crimson ring-4 ring-dark-card" />
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <button
                        type="button"
                        onClick={() => onSeek(ev.hearingTimestampMs)}
                        className="text-red-400 hover:underline font-mono font-bold cursor-pointer touch-target-expand"
                      >
                        [{ev.timeOrDate}]
                      </button>
                      <span className="text-dark-muted text-xs">
                        — declarante: {ev.sourceSpeaker}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 mt-0.5 max-w-[70ch]">{ev.eventDescription}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
