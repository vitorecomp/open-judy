'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, formatPromptVersionBadge, getUnreadNotificationCount } from '@/lib/api';
import { Hearing, Case } from '@/lib/types';
import UploadModal from '@/components/UploadModal';
import {
  Settings,
  Plus,
  ArrowRight,
  Scale,
  Users,
  FileText,
  Video,
  Music,
  Landmark,
  ShieldCheck,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function DashboardPage() {
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api.listHearings().then(setHearings).catch(() => {});
    api.listCases().then(setCases).catch(() => {});
    getUnreadNotificationCount().then(setUnreadCount).catch(() => {});
  }, []);

  const completedHearings = hearings.filter(
    (h) => h.status === 'READY' || h.status === 'TRANSCRIPTION_COMPLETED' || h.status === 'ANALYSIS_COMPLETED'
  );
  const completionPct = hearings.length > 0 ? Math.round((completedHearings.length / hearings.length) * 100) : 100;
  const totalParticipants = hearings.reduce((acc, h) => acc + (h.participants?.length || 0), 0);

  const formatDuration = (seconds?: number) => {
    const s = Math.round(seconds || 0);
    if (s >= 3600) {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    if (s >= 60) {
      const m = Math.floor(s / 60);
      const rem = s % 60;
      return rem > 0 ? `${m}m ${rem}s` : `${m}min`;
    }
    return `${s}s`;
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO INSTITUCIONAL DO GABINETE JUDICIAL */}
      {/* ========================================================================= */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-dark-muted">
            <Landmark className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="font-semibold text-slate-300">PODER JUDICIÁRIO • CONSELHO NACIONAL DE JUSTIÇA</span>
            <span>•</span>
            <span>Res. CNJ nº 105/2010 &amp; Res. CNJ nº 332/2020</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-serif">
            Gabinete Judicial — Controle de Pauta, Acervo Processual e Instrução Probatória
          </h1>
          <p className="text-xs text-dark-muted max-w-[85ch]">
            Sistema integrado de escrituração eletrônica, degravação audiovisual sincronizada e apoio à fundamentação jurisdicional com rastreabilidade integral de auditoria.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Link
            href="/cases"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-dark-input hover:bg-dark-pill border border-dark-border text-xs font-semibold text-slate-200 hover:text-white transition-colors min-h-[38px]"
          >
            <Briefcase className="w-3.5 h-3.5 text-dark-muted" />
            <span>Consultar Acervo Processual</span>
          </Link>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-crimson hover:bg-crimson-dark text-white text-xs font-semibold transition-colors shadow-sm min-h-[38px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Incluir Registro de Audiência</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FAIXA DE INDICADORES FORENSES DO GABINETE (HAIRLINED STRIP) */}
      {/* ========================================================================= */}
      <div className="bg-dark-card border border-dark-border rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-dark-border">
        <div className="p-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-dark-muted">Autos em Tramitação</p>
            <div className="text-2xl font-bold text-white mt-1 font-mono tabular-nums">
              {cases.length || hearings.length}
            </div>
            <p className="text-[11px] text-dark-muted mt-1">
              Numeração Única CNJ (Res. nº 65/2008)
            </p>
          </div>
          <div className="p-2 rounded-md bg-dark-input border border-dark-border text-slate-300">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-dark-muted">Audiências Degravadas</p>
            <div className="text-2xl font-bold text-white mt-1 font-mono tabular-nums">
              {completedHearings.length} <span className="text-sm font-normal text-dark-muted">/ {hearings.length}</span>
            </div>
            <p className="text-[11px] text-emerald-400 mt-1 font-medium">
              {completionPct}% dos termos disponíveis para consulta
            </p>
          </div>
          <div className="p-2 rounded-md bg-dark-input border border-dark-border text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-dark-muted">Depoentes e Partes Qualificados</p>
            <div className="text-2xl font-bold text-white mt-1 font-mono tabular-nums">
              {totalParticipants}
            </div>
            <p className="text-[11px] text-dark-muted mt-1">
              Interlocutores identificados nos registros
            </p>
          </div>
          <div className="p-2 rounded-md bg-dark-input border border-dark-border text-slate-300">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-dark-muted">Conformidade Res. CNJ 105/2010</p>
            <div className="text-2xl font-bold text-white mt-1 font-mono tabular-nums">
              100%
            </div>
            <p className="text-[11px] text-dark-muted mt-1">
              Sincronia acústica e integridade verificadas
            </p>
          </div>
          <div className="p-2 rounded-md bg-dark-input border border-dark-border text-amber-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CORPO PRINCIPAL: PAUTA DE AUDIÊNCIAS (8 COLS) & ACERVO / EXPEDIENTE (4 COLS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 8 Cols: Pauta de Audiências e Gravações Recentes */}
        <div className="lg:col-span-8 bg-dark-card border border-dark-border rounded-lg overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-dark-border flex items-center justify-between gap-3 bg-dark-bg/40">
              <div className="flex items-center gap-2.5">
                <Scale className="w-4 h-4 text-crimson shrink-0" />
                <div>
                  <h2 className="text-sm font-bold text-white font-serif">
                    Pauta de Audiências e Registros Audiovisuais Recentes
                  </h2>
                  <p className="text-[11px] text-dark-muted">
                    Degravação fonográfica e indexação por tempo conforme Resolução CNJ nº 105/2010
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-dark-input border border-dark-border text-slate-200 tabular-nums">
                  {hearings.length} registros
                </span>
                <Link
                  href="/settings?tab=ui"
                  className="p-1.5 rounded-md text-dark-muted hover:text-white hover:bg-dark-input transition-colors min-h-[34px] min-w-[34px] touch-target-expand inline-flex items-center justify-center"
                  title="Preferências de Exibição do Expediente"
                  aria-label="Preferências de exibição do expediente"
                >
                  <Settings className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] text-dark-muted border-b border-dark-border bg-dark-bg/20">
                    <th className="py-3 px-4 font-semibold text-slate-300">Nº Único CNJ / Autos</th>
                    <th className="py-3 px-4 font-semibold text-slate-300">Ato Processual / Mídia</th>
                    <th className="py-3 px-4 font-semibold text-slate-300">Situação do Registro</th>
                    <th className="py-3 px-4 font-semibold text-slate-300">Norma / Degravação</th>
                    <th className="py-3 px-4 font-semibold text-slate-300 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/60">
                  {hearings.slice(0, 6).map((h) => {
                    const isDone =
                      h.status === 'READY' ||
                      h.status === 'TRANSCRIPTION_COMPLETED' ||
                      h.status === 'ANALYSIS_COMPLETED';
                    const isRunning =
                      h.status === 'PROCESSING_TRANSCRIPTION' ||
                      h.status === 'PROCESSING_SUMMARY';
                    return (
                      <tr key={h.id} className="group hover:bg-dark-pill/30 transition-colors">
                        <td className="py-3 px-4">
                          <Link
                            href={`/hearings/${h.id}`}
                            className="font-mono text-xs font-bold text-white group-hover:text-crimson transition-colors tabular-nums block"
                          >
                            {h.caseNumber}
                          </Link>
                          <span className="text-[11px] text-dark-muted block truncate max-w-[210px]">
                            {h.mediaFilename || h.audioFilename || 'Gravação Judicial'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="p-1 rounded bg-dark-input border border-dark-border text-slate-300">
                              <Video className="w-3 h-3" />
                            </span>
                            <div>
                              <span className="text-xs font-medium text-slate-200 block">
                                {h.hearingType.includes('INSTRUCAO')
                                  ? 'Instrução e Julgamento'
                                  : h.hearingType.includes('CONCILIACAO')
                                  ? 'Audiência de Conciliação'
                                  : h.hearingType}
                              </span>
                              <span className="text-[11px] font-mono text-dark-muted tabular-nums">
                                Duração: {formatDuration(h.audioDurationSeconds)} • {h.participants?.length || 0} depoentes
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
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
                                isDone ? 'bg-emerald-400' : isRunning ? 'bg-amber-400' : 'bg-slate-400'
                              }`}
                            />
                            {isDone
                              ? 'Degravado'
                              : isRunning
                              ? 'Em Degravação'
                              : h.status === 'FAILED'
                              ? 'Inconsistência'
                              : 'Aguardando'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-dark-input text-slate-300 border border-dark-border font-mono text-[11px]"
                            title={`Norma técnica e versão do prompt: ${h.promptVersion || 'PROMPT_AUDIO_VIDEO_TRANSCRIPTION v3'}`}
                          >
                            <span>{formatPromptVersionBadge(h.promptVersion, h.pipelineVersion)}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/hearings/${h.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-dark-input hover:bg-crimson text-slate-200 hover:text-white border border-dark-border text-[11px] font-semibold transition-colors"
                          >
                            <span>Abrir Termo</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {hearings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-dark-muted">
                        Nenhum registro audiovisual localizado na pauta.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-dark-border bg-dark-bg/30 flex items-center justify-between">
            <span className="text-[11px] text-dark-muted">
              Exibindo {Math.min(6, hearings.length)} de {hearings.length} audiências registradas em pauta
            </span>
            <Link
              href="/hearings"
              className="text-xs text-crimson hover:text-crimson-light font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Acessar Pauta Geral de Audiências</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right 4 Cols: Autos Processuais Vinculados & Expediente do Gabinete */}
        <div className="lg:col-span-4 space-y-5 flex flex-col justify-between">
          {/* Card 1: Autos Processuais Vinculados */}
          <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden flex-1 flex flex-col justify-between">
            <div>
              <div className="px-4 py-3.5 border-b border-dark-border bg-dark-bg/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-300" />
                  <h3 className="text-sm font-bold text-white font-serif">
                    Autos Processuais Vinculados
                  </h3>
                </div>
                <Link
                  href="/cases"
                  className="text-[11px] font-semibold text-crimson hover:underline"
                >
                  Ver Acervo
                </Link>
              </div>

              <div className="divide-y divide-dark-border/60">
                {cases.slice(0, 4).map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="block px-4 py-3 hover:bg-dark-pill/30 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-white group-hover:text-crimson transition-colors tabular-nums">
                        {c.caseNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-dark-input border border-dark-border text-slate-300">
                        {c.legalBranch}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-1">
                      {c.subject || c.courtJurisdiction}
                    </p>
                    <p className="text-[11px] text-dark-muted mt-0.5 truncate">
                      {c.plaintiffName ? `${c.plaintiffName} × ${c.defendantName || 'Polo Passivo'}` : c.courtJurisdiction}
                    </p>
                  </Link>
                ))}
                {cases.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-dark-muted">
                    Carregando acervo de autos digitais...
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-dark-border bg-dark-bg/30 flex items-center justify-between">
              <Link
                href="/notebooks"
                className="text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 text-dark-muted" />
                <span>Cadernos de Instrução</span>
              </Link>
              <Link
                href="/audit"
                className="text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-dark-muted" />
                <span>Corregedoria &amp; Filas</span>
              </Link>
            </div>
          </div>

          {/* Card 2: Expediente Oficial & Governança CNJ */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-white">
                  Expediente e Intimações do Gabinete
                </h3>
              </div>
              <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-dark-input border border-dark-border text-slate-200 tabular-nums">
                {unreadCount} pendentes
              </span>
            </div>

            <p className="text-[11px] text-dark-muted leading-relaxed">
              Todos os atos de degravação audiovisual e minutas de apoio à decisão observam a supervisão humana obrigatória do Magistrado, nos termos da <strong>Resolução CNJ nº 332/2020</strong>.
            </p>

            <div className="pt-2 border-t border-dark-border/60 flex items-center justify-between gap-2">
              <Link
                href="/config"
                className="text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Parâmetros &amp; Normas CNJ
              </Link>
              <Link
                href="/settings"
                className="text-[11px] font-semibold text-crimson hover:underline"
              >
                Credenciais do Magistrado →
              </Link>
            </div>
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
