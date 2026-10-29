'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api, formatPromptVersionBadge, extractPromptVersionNumber } from '@/lib/api';
import {
  AsyncTask,
  RabbitMqBrokerStatus,
  TaskStats,
  AuditLogEntry,
  AuditStats,
  Hearing,
} from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import {
  ShieldCheck,
  Activity,
  Server,
  RefreshCw,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  Sparkles,
  FileCode,
  ChevronDown,
  ChevronUp,
  Layers,
  Lock,
  ArrowRight,
  Terminal,
  Database,
} from 'lucide-react';

export default function AuditAndTasksPage() {
  const { role, permissions, switchProfile } = useAuth();
  const isAdmin = role === 'ADMIN' || permissions.canEditSystemConfig;

  const [activeTab, setActiveTab] = useState<'tasks' | 'audit' | 'queues'>('tasks');
  const [tasks, setTasks] = useState<AsyncTask[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [brokerStatus, setBrokerStatus] = useState<RabbitMqBrokerStatus | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [activePromptVersion, setActivePromptVersion] = useState<number>(3);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionBanner, setActionBanner] = useState<string | null>(null);
  const [dispatchingTaskKey, setDispatchingTaskKey] = useState<string | null>(null);

  // Task Filters
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('ALL');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('ALL');
  const [taskSearch, setTaskSearch] = useState<string>('');

  // Dispatch Quick Bar
  const [selectedHearingId, setSelectedHearingId] = useState<string>('');
  const [selectedDispatchType, setSelectedDispatchType] = useState<string>('LEGAL_ANALYSIS');

  // Audit Filters
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>('ALL');
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    try {
      const [tList, tStats, bStatus, aLogs, aStats, hList, promptsList] = await Promise.all([
        api.getAsyncTasks(),
        api.getTaskStats(),
        api.getTaskQueues(),
        api.getAuditLogs({ limit: 150 }),
        api.getAuditStats(),
        api.listHearings(),
        api.getPrompts('TRANSCRIPTION').catch(() => []),
      ]);
      setTasks(tList);
      setTaskStats(tStats);
      setBrokerStatus(bStatus);
      setAuditLogs(aLogs);
      setAuditStats(aStats);
      setHearings(hList);
      if (Array.isArray(promptsList) && promptsList.length > 0) {
        const avPrompt =
          promptsList.find((p: any) => p?.code === 'PROMPT_AUDIO_VIDEO_TRANSCRIPTION') ||
          promptsList[0];
        if (avPrompt?.version !== undefined) {
          setActivePromptVersion(extractPromptVersionNumber(String(avPrompt.version), 3));
        }
      }
      if (!selectedHearingId && hList.length > 0) {
        setSelectedHearingId(hList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedHearingId]);

  useEffect(() => {
    if (!isAdmin) return;
    loadAllData();
    const timer = setInterval(loadAllData, 5000);
    return () => clearInterval(timer);
  }, [isAdmin, loadAllData]);

  if (!isAdmin) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center p-6 animate-in fade-in">
        <div className="max-w-lg w-full bg-dark-card border border-dark-border rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-crimson/15 border border-crimson/30 flex items-center justify-center mx-auto text-crimson">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-black text-white">
            Acesso Restrito ao Administrador
          </h1>
          <p className="text-xs text-dark-muted leading-relaxed">
            A Central de Auditoria &amp; Tasks RabbitMQ é exclusiva para o perfil{' '}
            <strong className="text-emerald-400">ADMIN</strong>. Seu perfil atual é{' '}
            <span className="font-mono text-slate-200">{role}</span>.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-xs font-semibold text-slate-200 transition"
            >
              Voltar ao Dashboard
            </Link>
            <button
              onClick={() => switchProfile('ADMIN')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition cursor-pointer"
            >
              Alternar para Perfil Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleDispatchTask = async () => {
    if (!selectedHearingId) return;
    const h = hearings.find((item) => item.id === selectedHearingId);
    const key = `dispatch:${selectedDispatchType}:${selectedHearingId}`;
    setDispatchingTaskKey(key);
    setActionBanner(null);
    try {
      await api.dispatchAsyncTask({
        taskType: selectedDispatchType,
        entityType: 'HEARING',
        entityId: selectedHearingId,
        entityTitle: h
          ? `${h.mediaFilename || h.caseNumber} (${h.caseNumber})`
          : selectedHearingId,
        force: true,
      });
      setActionBanner(
        `Task ${selectedDispatchType} enfileirada no RabbitMQ para ${
          h?.mediaFilename || selectedHearingId
        } e registrada na Trilha de Auditoria.`
      );
      await loadAllData();
    } catch (e: any) {
      setActionBanner(e?.message || 'Erro ao enfileirar task no RabbitMQ.');
    } finally {
      setDispatchingTaskKey(null);
    }
  };

  const handleRetryTask = async (task: AsyncTask) => {
    const key = `retry:${task.id}`;
    setDispatchingTaskKey(key);
    setActionBanner(null);
    try {
      await api.retryAsyncTask(task.id);
      setActionBanner(
        `Reexecução da task ${task.taskType} (${task.entityTitle}) publicada na fila RabbitMQ ${task.queueName}.`
      );
      await loadAllData();
    } catch (e: any) {
      setActionBanner(e?.message || 'Erro ao reexecutar task.');
    } finally {
      setDispatchingTaskKey(null);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesType = taskTypeFilter === 'ALL' || t.taskType === taskTypeFilter;
    const matchesStatus = taskStatusFilter === 'ALL' || t.status === taskStatusFilter;
    const q = taskSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (t.entityTitle || '').toLowerCase().includes(q) ||
      (t.entityId || '').toLowerCase().includes(q) ||
      (t.queueName || '').toLowerCase().includes(q) ||
      (t.promptVersion || '').toLowerCase().includes(q);
    return matchesType && matchesStatus && matchesSearch;
  });

  const filteredAuditLogs = auditLogs.filter((l) => {
    const matchesCat = auditCategoryFilter === 'ALL' || l.category === auditCategoryFilter;
    const q = auditSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (l.action || '').toLowerCase().includes(q) ||
      (l.entityName || '').toLowerCase().includes(q) ||
      (l.actorName || '').toLowerCase().includes(q) ||
      (l.actorEmail || '').toLowerCase().includes(q) ||
      (l.rabbitmqQueue || '').toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const formatDurationMs = (ms?: number | null) => {
    if (!ms || ms <= 0) return '—';
    if (ms < 1000) return `${ms}ms`;
    const sec = ms / 1000;
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}m ${s}s`;
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR')}`;
  };

  const getTaskStatusBadge = (status: string) => {
    switch ((status || '').toUpperCase()) {
      case 'COMPLETED':
        return {
          label: 'CONCLUÍDA',
          badgeClass: 'status-badge-success',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
        };
      case 'PROCESSING':
        return {
          label: 'PROCESSANDO',
          badgeClass: 'status-badge-warning',
          icon: <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />,
        };
      case 'RETRYING_429':
        return {
          label: 'BACKOFF 429',
          badgeClass: 'status-badge-warning',
          icon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
        };
      case 'FAILED':
        return {
          label: 'FALHA',
          badgeClass: 'status-badge-danger',
          icon: <XCircle className="w-3 h-3 text-red-400" />,
        };
      default:
        return {
          label: 'NA FILA',
          badgeClass: 'status-badge-info',
          icon: <Clock className="w-3 h-3 text-sky-400" />,
        };
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-dark-muted mb-1">
            <Link href="/" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-emerald-400 font-semibold">
              Administração • Auditoria &amp; Tasks RabbitMQ
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span>Central de Tasks Assíncronas (RabbitMQ) &amp; Trilha de Auditoria</span>
          </h1>
          <p className="text-xs text-dark-muted mt-0.5">
            Orquestração 100% via RabbitMQ AMQP (`open-judy-rabbitmq:5672`) com telemetria de tasks (`tb_async_tasks`) e auditoria administrativa (`tb_audit_logs`)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl status-badge-success border text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>RabbitMQ AMQP :5672 Ativo (100% AMQP)</span>
          </span>
          <Link
            href="/config?tab=prompts"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-800/50 text-xs font-bold text-indigo-300 hover:text-indigo-200 transition-colors min-h-[36px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Configurações de Prompts &amp; IA</span>
          </Link>
          <button
            onClick={loadAllData}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dark-card hover:bg-dark-pill border border-dark-border text-xs font-bold text-white transition-colors cursor-pointer min-h-[36px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {actionBanner && (
        <div className="p-3.5 rounded-xl status-badge-success border text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionBanner}</span>
          </div>
          <button
            onClick={() => setActionBanner(null)}
            className="text-emerald-300 hover:text-white text-[11px] font-bold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Top KPI Telemetry Strip (Distilled Single Hairlined Surface) */}
      <div className="bg-dark-card border border-dark-border rounded-2xl shadow-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-dark-border overflow-hidden">
        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-dark-muted">
            <span className="font-semibold text-xs">
              Broker de Mensageria
            </span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-white font-mono">
            {brokerStatus?.brokerName || 'open-judy-rabbitmq'}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium tabular-nums">
            {brokerStatus?.queues?.length || 6} filas AMQP declaradas • Mensageria Unificada RabbitMQ
          </div>
        </div>

        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-dark-muted">
            <span className="font-semibold text-xs">
              Tasks Concluídas / Total
            </span>
            <Activity className="w-4 h-4 text-crimson" />
          </div>
          <div className="text-2xl font-black text-white font-mono tabular-nums">
            {taskStats?.completedTasks ?? tasks.filter((t) => t.status === 'COMPLETED').length}
            <span className="text-sm text-dark-muted font-normal">
              {' '}
              / {taskStats?.totalTasks ?? tasks.length}
            </span>
          </div>
          <div className="text-[11px] text-dark-muted">
            Transcrição, Análise &amp; Contradições, Indexação
          </div>
        </div>

        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-dark-muted">
            <span className="font-semibold text-xs">
              Tasks em Execução / Fila
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono tabular-nums">
            {(taskStats?.processingTasks ?? 0) + (taskStats?.queuedTasks ?? 0)}
          </div>
          <div className="text-[11px] text-dark-muted tabular-nums">
            {taskStats?.processingTasks ?? 0} processando • {taskStats?.queuedTasks ?? 0} na fila
          </div>
        </div>

        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-dark-muted">
            <span className="font-semibold text-xs">
              Eventos de Auditoria
            </span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono tabular-nums">
            {auditStats?.totalEvents ?? auditLogs.length}
          </div>
          <div className="text-[11px] text-indigo-300 font-mono truncate">
            Fila: judy.audit.events → tb_audit_logs
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-dark-card border border-dark-border rounded-2xl p-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[36px] ${
              activeTab === 'tasks'
                ? 'bg-crimson text-white shadow-sm'
                : 'text-dark-muted hover:text-white hover:bg-dark-input'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="tabular-nums">Tasks RabbitMQ ({tasks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[36px] ${
              activeTab === 'audit'
                ? 'bg-crimson text-white shadow-sm'
                : 'text-dark-muted hover:text-white hover:bg-dark-input'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="tabular-nums">Trilha de Auditoria ({auditLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('queues')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[36px] ${
              activeTab === 'queues'
                ? 'bg-crimson text-white shadow-sm'
                : 'text-dark-muted hover:text-white hover:bg-dark-input'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span className="tabular-nums">Filas AMQP RabbitMQ ({brokerStatus?.queues?.length || 6})</span>
          </button>
        </div>

        {/* Quick Task Dispatcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedDispatchType}
            onChange={(e) => setSelectedDispatchType(e.target.value)}
            aria-label="Selecionar tipo de task para disparo"
            className="bg-dark-input border border-dark-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson min-h-[36px]"
          >
            <option value="LEGAL_ANALYSIS">Task: Análise &amp; Contradições</option>
            <option value="TRANSCRIPTION">Task: Transcrição &amp; Diarização</option>
            <option value="TIMESTAMP_REPAIR">Task: Reparo VAD de Timestamps</option>
            <option value="INDEXING">Task: Indexação Elasticsearch</option>
          </select>

          <select
            value={selectedHearingId}
            onChange={(e) => setSelectedHearingId(e.target.value)}
            aria-label="Selecionar audiência alvo da task"
            className="bg-dark-input border border-dark-border rounded-xl px-2.5 py-1.5 text-xs text-white max-w-[230px] truncate focus:outline-none focus:border-crimson min-h-[36px]"
          >
            {hearings.map((h) => (
              <option key={h.id} value={h.id}>
                {h.mediaFilename || h.caseNumber} ({h.caseNumber})
              </option>
            ))}
          </select>

          {(() => {
            const selHearing = hearings.find((item) => item.id === selectedHearingId);
            const selVideoPromptVer = extractPromptVersionNumber(selHearing?.promptVersion, 3);
            const isTranscriptionBlocked =
              selectedDispatchType === 'TRANSCRIPTION' &&
              activePromptVersion <= selVideoPromptVer;
            const isDispatchDisabled =
              Boolean(dispatchingTaskKey) || !selectedHearingId || isTranscriptionBlocked;
            return (
              <button
                type="button"
                onClick={!isDispatchDisabled ? handleDispatchTask : undefined}
                disabled={isDispatchDisabled}
                aria-disabled={isDispatchDisabled}
                title={
                  isTranscriptionBlocked
                    ? `Desabilitado: o vídeo já foi processado na versão atual do prompt (v${selVideoPromptVer}). Só é permitido reprocessar vídeo quando houver prompt mais novo.`
                    : 'Disparar Task na fila RabbitMQ correspondente'
                }
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors min-h-[36px] ${
                  !isDispatchDisabled
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                    : 'bg-dark-card text-gray-400 border border-dark-border opacity-50 cursor-not-allowed select-none'
                }`}
              >
                {isTranscriptionBlocked ? (
                  <Lock className="w-3 h-3 text-gray-400" />
                ) : (
                  <Play className="w-3 h-3 fill-current" />
                )}
                <span>
                  {isTranscriptionBlocked
                    ? `Reprocessar Vídeo Bloqueado (v${selVideoPromptVer} Atual)`
                    : 'Disparar Task no RabbitMQ'}
                </span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* TAB 1: ASYNC TASKS TABLE */}
      {activeTab === 'tasks' && (
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-dark-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar audiência, fila, prompt..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-dark-input border border-dark-border rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson min-h-[36px]"
                />
              </div>

              {['ALL', 'TRANSCRIPTION', 'LEGAL_ANALYSIS', 'INDEXING', 'TIMESTAMP_REPAIR'].map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => setTaskTypeFilter(type)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-semibold border transition-colors cursor-pointer min-h-[32px] ${
                      taskTypeFilter === type
                        ? 'bg-crimson text-white border-crimson'
                        : 'bg-dark-input border-dark-border text-dark-muted hover:text-white'
                    }`}
                  >
                    {type === 'ALL' ? 'Todos Tipos' : type}
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {['ALL', 'COMPLETED', 'PROCESSING', 'QUEUED', 'FAILED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setTaskStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-colors cursor-pointer min-h-[32px] ${
                    taskStatusFilter === st
                      ? 'bg-dark-pill text-white border-slate-600'
                      : 'bg-dark-input border-dark-border text-dark-muted hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? 'Todos Status' : st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-dark-border bg-dark-bg/60 text-dark-muted text-[11px]">
                  <th className="py-3 px-3 font-semibold">Tipo / Fila RabbitMQ</th>
                  <th className="py-3 px-3 font-semibold">Entidade / Audiência</th>
                  <th className="py-3 px-3 font-semibold">Versão do Prompt &amp; Pipeline</th>
                  <th className="py-3 px-3 font-semibold">Status &amp; Progresso</th>
                  <th className="py-3 px-3 font-semibold">Início / Término / Duração</th>
                  <th className="py-3 px-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40">
                {filteredTasks.map((t) => {
                  const badge = getTaskStatusBadge(t.status);
                  return (
                    <tr key={t.id} className="hover:bg-dark-pill/25 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-white text-xs">{t.taskType}</div>
                        <div className="text-[11px] font-mono text-emerald-400 mt-0.5">
                          {t.queueName}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <Link
                          href={`/hearings/${t.entityId}`}
                          className="font-bold text-white hover:text-crimson transition-colors flex items-center gap-1"
                        >
                          <span className="truncate max-w-[240px]">{t.entityTitle}</span>
                          <ArrowRight className="w-3 h-3 text-crimson shrink-0" />
                        </Link>
                        {t.resultSummary && (
                          <p className="text-[11px] text-dark-muted truncate max-w-[280px] mt-0.5">
                            {t.resultSummary}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1 items-start">
                          <Link
                            href="/config?tab=prompts&prompt=PROMPT_AUDIO_VIDEO_TRANSCRIPTION"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 hover:text-indigo-200 border border-indigo-800/40 font-mono text-[11px] font-semibold transition-colors"
                            title={`${t.promptVersion} — Clique para abrir nas Configurações do Sistema`}
                          >
                            <Sparkles className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                            <span>
                              Prompt: {formatPromptVersionBadge(t.promptVersion, t.pipelineVersion)}
                            </span>
                          </Link>
                          {t.pipelineVersion && (
                            <span className="text-[11px] font-mono text-slate-400">
                              Pipeline: {t.pipelineVersion}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="space-y-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.badgeClass}`}
                          >
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                          <div className="w-28 h-1.5 bg-dark-input rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-400 rounded-full"
                              style={{ width: `${Math.max(5, Math.min(100, t.progressPct || 0))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-300 space-y-0.5 tabular-nums">
                        <div>Início: {formatDateTime(t.startedAt || t.createdAt)}</div>
                        <div>Fim: {formatDateTime(t.completedAt)}</div>
                        <div className="text-emerald-300 font-bold">
                          Duração: {formatDurationMs(t.durationMs)}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        {(() => {
                          const taskPromptVer = extractPromptVersionNumber(t.promptVersion, 3);
                          const isVideoReprocessLocked =
                            t.taskType === 'TRANSCRIPTION' &&
                            t.status !== 'FAILED' &&
                            activePromptVersion <= taskPromptVer;
                          const isBtnDisabled =
                            dispatchingTaskKey === `retry:${t.id}` || isVideoReprocessLocked;
                          return (
                            <button
                              type="button"
                              onClick={!isBtnDisabled ? () => handleRetryTask(t) : undefined}
                              disabled={isBtnDisabled}
                              aria-disabled={isBtnDisabled}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors min-h-[36px] ${
                                !isBtnDisabled
                                  ? 'bg-dark-input hover:bg-crimson text-slate-200 hover:text-white border-dark-border cursor-pointer'
                                  : 'bg-dark-card text-gray-400 border-dark-border opacity-50 cursor-not-allowed select-none'
                              }`}
                              title={
                                isVideoReprocessLocked
                                  ? `Desabilitado: vídeo já processado com a versão atual do prompt (v${taskPromptVer}). Só é habilitado quando houver versão de prompt mais nova.`
                                  : 'Reenfileirar Task no RabbitMQ'
                              }
                            >
                              {isVideoReprocessLocked ? (
                                <Lock className="w-3 h-3 text-gray-400" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              <span>
                                {t.taskType === 'TRANSCRIPTION'
                                  ? isVideoReprocessLocked
                                    ? `Reprocessar Vídeo (v${taskPromptVer} Atual)`
                                    : 'Reprocessar Vídeo'
                                  : 'Reexecutar'}
                              </span>
                            </button>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS TABLE */}
      {activeTab === 'audit' && (
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-dark-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filtrar ação, usuário, entidade..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-dark-input border border-dark-border rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson min-h-[36px]"
                />
              </div>

              {['ALL', 'TASK', 'HEARING', 'CASE', 'ADMIN_CONFIG', 'SYSTEM'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setAuditCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-semibold border transition-colors cursor-pointer min-h-[32px] ${
                    auditCategoryFilter === cat
                      ? 'bg-crimson text-white border-crimson'
                      : 'bg-dark-input border-dark-border text-dark-muted hover:text-white'
                  }`}
                >
                  {cat === 'ALL' ? 'Todas Categorias' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-dark-border bg-dark-bg/60 text-dark-muted text-[11px]">
                  <th className="py-3 px-3 font-semibold">Data / Hora</th>
                  <th className="py-3 px-3 font-semibold">Ator / Perfil</th>
                  <th className="py-3 px-3 font-semibold">Categoria &amp; Ação</th>
                  <th className="py-3 px-3 font-semibold">Entidade Alvo</th>
                  <th className="py-3 px-3 font-semibold">Fila RabbitMQ</th>
                  <th className="py-3 px-3 text-right font-semibold">Detalhes JSON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40">
                {filteredAuditLogs.map((log) => {
                  const isExpanded = expandedAuditId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-dark-pill/25 transition-colors">
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-300 whitespace-nowrap tabular-nums">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white">{log.actorName}</div>
                          <div className="text-[11px] font-mono text-dark-muted">
                            {log.actorEmail} ({log.actorRole})
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-dark-input border border-dark-border font-mono text-[11px] text-crimson font-bold mr-1.5">
                            {log.category}
                          </span>
                          <span className="font-mono font-semibold text-slate-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-white truncate max-w-[240px]">
                            {log.entityName || log.entityId}
                          </div>
                          <div className="text-[11px] font-mono text-dark-muted">
                            {log.entityType}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-emerald-400">
                          {log.rabbitmqQueue || 'judy.audit.events'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setExpandedAuditId(isExpanded ? null : log.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-input hover:bg-dark-pill border border-dark-border text-[11px] font-mono text-slate-300 cursor-pointer transition-colors min-h-[32px]"
                          >
                            <FileCode className="w-3 h-3 text-indigo-400" />
                            <span>Payload</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-dark-bg/80">
                          <td colSpan={6} className="p-3">
                            <pre className="text-[11px] font-mono text-emerald-300 bg-black/50 p-3 rounded-xl border border-dark-border overflow-x-auto">
                              {typeof log.detailsJson === 'string'
                                ? log.detailsJson
                                : JSON.stringify(log.detailsJson || log, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RABBITMQ QUEUES */}
      {activeTab === 'queues' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(brokerStatus?.queues || []).map((q) => (
            <div
              key={q.name}
              className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-3 shadow-lg flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-400 truncate">
                    {q.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold status-badge-success border">
                    {q.state}
                  </span>
                </div>
                <p className="text-xs text-dark-muted leading-relaxed">{q.description}</p>
              </div>

              <div className="grid grid-cols-3 divide-x divide-dark-border/60 pt-2 border-t border-dark-border/60 text-center font-mono tabular-nums">
                <div className="py-1.5 px-2">
                  <div className="text-sm font-bold text-white">{q.messagesReady}</div>
                  <div className="text-[11px] text-dark-muted">Ready</div>
                </div>
                <div className="py-1.5 px-2">
                  <div className="text-sm font-bold text-amber-300">
                    {q.messagesUnacknowledged}
                  </div>
                  <div className="text-[11px] text-dark-muted">Unacked</div>
                </div>
                <div className="py-1.5 px-2">
                  <div className="text-sm font-bold text-emerald-300">{q.consumers}</div>
                  <div className="text-[11px] text-dark-muted">Consumers</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
