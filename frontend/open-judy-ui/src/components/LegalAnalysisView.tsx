'use client';

import React from 'react';
import { HearingSummary } from '@/lib/types';
import { Sparkles, AlertTriangle, Scale, Calendar, Quote, Clock } from 'lucide-react';

interface LegalAnalysisViewProps {
  summary: HearingSummary;
  onSeek: (ms: number) => void;
}

export default function LegalAnalysisView({ summary, onSeek }: LegalAnalysisViewProps) {
  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto p-5 space-y-6">
      {/* Executive Summary */}
      <div className="p-4 rounded-xl bg-dark-input border border-dark-border">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-crimson" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">
            Resumo Executivo da Audiência
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
          {summary.executiveSummary}
        </p>
      </div>

      {/* Contradiction Detector */}
      {summary.contradictions && summary.contradictions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Contradições Detectadas pelo Gemini
            </h3>
          </div>
          <div className="space-y-3">
            {summary.contradictions.map((c, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#381c22]/40 border border-red-900/50 space-y-3"
              >
                <h4 className="text-xs font-bold text-red-200">{c.description}</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Speaker A */}
                  <div className="p-2.5 rounded-lg bg-dark-bg/80 border border-dark-border">
                    <div className="flex items-center justify-between text-slate-200 font-semibold mb-1">
                      <span>{c.speakerA}</span>
                      <button
                        onClick={() => onSeek(c.timestampMsA)}
                        className="flex items-center gap-1 text-[10px] text-red-400 hover:underline font-mono"
                      >
                        <Clock className="w-2.5 h-2.5" /> Ouvir fala
                      </button>
                    </div>
                    <p className="text-slate-300 italic">&ldquo;{c.statementA}&rdquo;</p>
                  </div>

                  {/* Speaker B */}
                  <div className="p-2.5 rounded-lg bg-dark-bg/80 border border-dark-border">
                    <div className="flex items-center justify-between text-slate-200 font-semibold mb-1">
                      <span>{c.speakerB}</span>
                      <button
                        onClick={() => onSeek(c.timestampMsB)}
                        className="flex items-center gap-1 text-[10px] text-red-400 hover:underline font-mono"
                      >
                        <Clock className="w-2.5 h-2.5" /> Ouvir fala
                      </button>
                    </div>
                    <p className="text-slate-300 italic">&ldquo;{c.statementB}&rdquo;</p>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 pt-1 text-xs text-red-300 font-medium">
                  <Scale className="w-3.5 h-3.5 mt-0.5 shrink-0 text-crimson" />
                  <span><strong>Impacto Processual:</strong> {c.legalImpact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disputed Facts */}
      {summary.disputedFacts && summary.disputedFacts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-4 h-4 text-slate-300" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Pontos Controvertidos e Teses
            </h3>
          </div>
          <div className="space-y-3">
            {summary.disputedFacts.map((f, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-dark-input border border-dark-border text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200">{f.topic}</h4>
                  <div className="flex gap-1">
                    {f.relevantTimestampTags.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-dark-bg text-[10px] font-mono text-crimson border border-dark-border">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-dark-muted">{f.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-lg bg-dark-bg border border-dark-border">
                    <span className="text-[10px] font-bold uppercase text-red-400">Tese do Autor</span>
                    <p className="text-slate-300 text-[11px] mt-0.5">{f.plaintiffPosition}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-dark-bg border border-dark-border">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Tese do Réu</span>
                    <p className="text-slate-300 text-[11px] mt-0.5">{f.defendantPosition}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chronological Timeline */}
      {summary.timeline && summary.timeline.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-crimson" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Cronologia dos Fatos Extraída
            </h3>
          </div>
          <div className="relative border-l-2 border-dark-border ml-2 space-y-4 pl-4">
            {summary.timeline.map((ev, idx) => (
              <div key={idx} className="relative group">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-crimson ring-4 ring-dark-card" />
                <div className="flex items-center gap-2 text-xs">
                  <strong className="text-red-400 font-mono">{ev.timeOrDate}</strong>
                  <span className="text-dark-muted text-[11px]">— declarante: {ev.sourceSpeaker}</span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">{ev.eventDescription}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
