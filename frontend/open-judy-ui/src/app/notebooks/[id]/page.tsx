'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getNotebook,
  toggleNotebookSource,
  addNotebookSource,
  deleteNotebookSource,
  chatNotebook,
  createNotebookNote
} from '@/lib/api';
import { Notebook, NotebookSource, NotebookNote } from '@/lib/types';
import {
  BookOpen,
  Plus,
  Layers,
  Sparkles,
  Bot,
  Send,
  User,
  CheckCircle2,
  Trash2,
  Bookmark,
  FileText,
  Video,
  Scale,
  ExternalLink,
  Copy,
  ChevronLeft,
  Clock
} from 'lucide-react';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  activeSourceTitles?: string[];
  citations?: { sourceTitle: string; snippet: string; referenceUrl?: string }[];
}

export default function NotebookDetailPage() {
  const params = useParams();
  const notebookId = (params?.id as string) || 'a1111111-2222-3333-4444-555555555555';

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content:
        'Olá! Sou o assistente do seu Caderno Judicial. Todas as respostas serão fundamentadas exclusivamente nas fontes ativas que você selecionar na barra lateral. Pergunte sobre contradições, teses aplicáveis ou peça a redação de minutas.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Add Source Modal
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);
  const [newSourceType, setNewSourceType] = useState<'VIDEO_BLOCK' | 'JURISPRUDENCE' | 'CASE_PETICAO' | 'CUSTOM_TEXT'>('VIDEO_BLOCK');
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceContent, setNewSourceContent] = useState('');
  const [newSourceTokens, setNewSourceTokens] = useState<number>(256000);

  // New Note
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  useEffect(() => {
    getNotebook(notebookId).then(setNotebook);
  }, [notebookId]);

  const activeSources = notebook?.sources.filter((s) => s.isActiveForChat) || [];
  const totalActiveTokens = activeSources.reduce((acc, s) => acc + s.estimatedTokens, 0);

  const handleToggleSource = async (sourceId: string, current: boolean) => {
    const next = !current;
    await toggleNotebookSource(notebookId, sourceId, next);
    setNotebook((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sources: prev.sources.map((s) => (s.id === sourceId ? { ...s, isActiveForChat: next } : s)),
      };
    });
  };

  const handleDeleteSource = async (sourceId: string) => {
    await deleteNotebookSource(notebookId, sourceId);
    setNotebook((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sources: prev.sources.filter((s) => s.id !== sourceId),
      };
    });
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceTitle.trim()) return;

    const created = await addNotebookSource(notebookId, {
      sourceType: newSourceType,
      title: newSourceTitle.trim(),
      content: newSourceContent.trim(),
      estimatedTokens: newSourceTokens,
      isActiveForChat: true,
    });

    setNotebook((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sources: [...prev.sources, created],
      };
    });

    setIsAddSourceModalOpen(false);
    setNewSourceTitle('');
    setNewSourceContent('');
  };

  const handleSendMessage = async (promptText?: string) => {
    const q = (promptText || input).trim();
    if (!q || isLoading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setIsLoading(true);

    try {
      const activeIds = activeSources.map((s) => s.id);
      const res = await chatNotebook(notebookId, q, activeIds);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.answer,
          activeSourceTitles: res.activeSourceTitles,
          citations: res.citations,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Ocorreu um erro ao consultar o assistente do caderno.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToNotes = async (title: string, text: string) => {
    const note = await createNotebookNote(notebookId, {
      title,
      content: text,
      noteType: 'FINDING',
    });
    setNotebook((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        notes: [note, ...prev.notes],
      };
    });
  };

  const handleAddCustomNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    const note = await createNotebookNote(notebookId, {
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      noteType: 'NOTE',
    });
    setNotebook((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        notes: [note, ...prev.notes],
      };
    });
    setNewNoteTitle('');
    setNewNoteContent('');
  };

  return (
    <div className="lg:h-[calc(100vh-7rem)] lg:min-h-[640px] bg-dark-bg text-slate-100 flex flex-col rounded-lg border border-dark-border overflow-hidden shadow-sm">
      {/* Sub-header Bar */}
      <div className="px-6 py-2.5 bg-dark-card border-b border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/notebooks"
            className="p-2 rounded-lg bg-dark-input hover:bg-dark-pill text-dark-muted hover:text-white transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
            title="Voltar para Cadernos de Instrução"
            aria-label="Voltar para a lista de cadernos"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <span className="text-xl">{notebook?.emoji || '📓'}</span>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{notebook?.title || 'Carregando Caderno...'}</span>
              {notebook?.caseNumber && (
                <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded bg-dark-input text-slate-300 border border-dark-border">
                  {notebook.caseNumber}
                </span>
              )}
            </h1>
            <p className="text-[11px] text-dark-muted line-clamp-1">
              {notebook?.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-crimson/10 border border-crimson/30 text-red-300 flex items-center gap-1.5 tabular-nums">
            <Sparkles className="w-3.5 h-3.5 text-crimson" />
            <span>{activeSources.length} Fontes Ativas (~{Math.round(totalActiveTokens / 1000)}k tokens)</span>
          </span>
        </div>
      </div>

      {/* 3-Column Interactive NotebookLM Workspace */}
      <div className="flex-1 grid grid-cols-12 lg:overflow-hidden">
        {/* LEFT COLUMN: Sources & Context Selectors (3 cols) */}
        <div className="col-span-12 lg:col-span-3 border-b lg:border-b-0 lg:border-r border-dark-border bg-dark-bg/60 flex flex-col lg:overflow-hidden">
          <div className="p-4 border-b border-dark-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-crimson" />
              <h2 className="text-xs font-bold text-slate-200 tabular-nums">
                Fontes de Contexto ({notebook?.sources.length || 0})
              </h2>
            </div>
            <button
              onClick={() => setIsAddSourceModalOpen(true)}
              className="p-2 rounded-lg bg-crimson hover:bg-crimson-hover text-white text-xs font-semibold shadow-sm transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
              title="Adicionar Nova Fonte de Contexto"
              aria-label="Adicionar nova fonte de contexto"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 text-[11px] text-dark-muted bg-dark-card/40 border-b border-dark-border">
            Marque as fontes abaixo para direcionar o que o Gemini deve analisar no chat:
          </div>

          {/* Sources List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[360px] lg:max-h-none">
            {notebook?.sources.map((source) => (
              <div
                key={source.id}
                className={`p-3 rounded-xl border transition-colors ${
                  source.isActiveForChat
                    ? 'bg-dark-card border-crimson/40 shadow-sm'
                    : 'bg-dark-input/30 border-dark-border opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={source.isActiveForChat}
                      onChange={() => handleToggleSource(source.id, source.isActiveForChat)}
                      className="mt-0.5 rounded border-dark-border text-crimson focus:ring-crimson accent-crimson w-4 h-4 touch-target-expand"
                    />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-dark-pill text-slate-300">
                          {source.sourceType === 'VIDEO_BLOCK' && '🎬 Vídeo ~256k'}
                          {source.sourceType === 'JURISPRUDENCE' && '⚖️ Jurisprudência'}
                          {source.sourceType === 'CASE_PETICAO' && '📄 Petição'}
                          {source.sourceType === 'CUSTOM_TEXT' && '📝 Texto'}
                        </span>
                        <span className="text-[11px] font-mono text-red-300 tabular-nums">
                          ~{Math.round(source.estimatedTokens / 1000)}k tks
                        </span>
                      </div>
                      <h3 className="text-xs font-semibold text-white leading-tight">
                        {source.title}
                      </h3>
                      {source.content && (
                        <p className="text-[11px] text-dark-muted line-clamp-2 leading-relaxed">
                          {source.content}
                        </p>
                      )}
                    </div>
                  </label>

                  <button
                    onClick={() => handleDeleteSource(source.id)}
                    className="text-dark-muted hover:text-red-400 p-1.5 transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                    title="Remover Fonte"
                    aria-label={`Remover fonte ${source.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER COLUMN: Open Gemini Chat (6 cols) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col bg-dark-bg lg:overflow-hidden min-h-[420px]">
          {/* Active Context Banner */}
          <div className="p-3 border-b border-dark-border bg-dark-card/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Bot className="w-4 h-4 text-crimson" />
              <span className="tabular-nums">Chat do Caderno com <strong>{activeSources.length} fontes ativas</strong></span>
            </div>
            <span className="text-[11px] font-mono text-dark-muted">
              Gemini 4 Argon
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-crimson flex items-center justify-center text-white shrink-0 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 space-y-3 ${
                    m.role === 'user'
                      ? 'bg-crimson text-white rounded-br-none shadow-md'
                      : 'bg-dark-card border border-dark-border rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </p>

                  {/* Assistant Citations & Actions */}
                  {m.role === 'assistant' && m.citations && m.citations.length > 0 && (
                    <div className="pt-2 border-t border-dark-border space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400">
                        Fontes Citadas:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {m.citations.map((c, cIdx) => (
                          <div
                            key={cIdx}
                            className="text-[11px] px-2 py-0.5 rounded-lg bg-dark-input border border-dark-border text-red-300 flex items-center gap-1"
                            title={c.snippet}
                          >
                            <Bookmark className="w-2.5 h-2.5 text-crimson" />
                            <span>{c.sourceTitle}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-1 flex items-center justify-end">
                        <button
                          onClick={() => handleSaveToNotes(`Conclusão da Análise (${new Date().toLocaleTimeString()})`, m.content)}
                          className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 bg-dark-input hover:bg-dark-pill px-2.5 py-1.5 rounded-lg border border-dark-border transition-colors min-h-[32px]"
                        >
                          <Plus className="w-2.5 h-2.5 text-crimson" />
                          <span>Salvar no Studio / Notas</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-dark-pill flex items-center justify-center text-slate-200 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-crimson flex items-center justify-center text-white shrink-0 animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3 bg-dark-card border border-dark-border rounded-2xl text-xs text-dark-muted flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-crimson animate-spin" />
                  <span>Sintetizando fontes de contexto ativas com o Gemini...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 border-t border-dark-border/60 bg-dark-bg/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              'Qual o impacto das notificações na rescisão?',
              'Confronte o depoimento com a Súmula 543 do STJ',
              'Gere minuta de fundamentação da sentença',
            ].map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p)}
                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-dark-card hover:bg-dark-hover border border-dark-border text-slate-300 whitespace-nowrap transition-colors min-h-[32px]"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-4 border-t border-dark-border bg-dark-card flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={
                activeSources.length > 0
                  ? `Perguntar considerando as ${activeSources.length} fontes ativas...`
                  : 'Selecione fontes na barra lateral para iniciar o chat...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || activeSources.length === 0}
              className="flex-1 px-4 py-2.5 bg-dark-input border border-dark-border rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || activeSources.length === 0}
              className="p-2.5 rounded-xl bg-crimson hover:bg-crimson-hover text-white transition-colors disabled:opacity-40 min-h-[36px] min-w-[36px] inline-flex items-center justify-center"
              aria-label="Enviar mensagem ao assistente do caderno"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Studio & Anotações Judiciais (3 cols) */}
        <div className="col-span-12 lg:col-span-3 border-t lg:border-t-0 lg:border-l border-dark-border bg-dark-bg/60 flex flex-col lg:overflow-hidden">
          <div className="p-4 border-b border-dark-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-crimson" />
              <h2 className="text-xs font-bold text-slate-200 tabular-nums">
                Studio / Anotações ({notebook?.notes.length || 0})
              </h2>
            </div>
          </div>

          {/* Add Note Form */}
          <form onSubmit={handleAddCustomNote} className="p-3 border-b border-dark-border space-y-2">
            <input
              type="text"
              placeholder="Título da anotação..."
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-dark-input border border-dark-border rounded-lg text-xs text-white focus:outline-none focus:border-crimson"
            />
            <textarea
              rows={2}
              placeholder="Escreva achados ou rascunho de minuta..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-dark-input border border-dark-border rounded-lg text-xs text-white focus:outline-none focus:border-crimson"
            />
            <button
              type="submit"
              disabled={!newNoteTitle.trim() || !newNoteContent.trim()}
              className="w-full py-1.5 rounded-lg bg-dark-input hover:bg-dark-pill text-white text-xs font-semibold border border-dark-border transition-colors disabled:opacity-50 min-h-[36px]"
            >
              + Salvar Anotação
            </button>
          </form>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[360px] lg:max-h-none">
            {notebook?.notes.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-xl bg-dark-card border border-dark-border space-y-1.5 hover:border-dark-muted transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">{note.title}</h4>
                  <span className="text-[11px] uppercase px-1.5 py-0.5 rounded bg-dark-pill text-slate-400">
                    {note.noteType}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>
                <div className="pt-1 flex items-center justify-between text-[11px] text-dark-muted tabular-nums">
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(note.content)}
                    className="hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-dark-input transition-colors"
                    aria-label={`Copiar anotação ${note.title}`}
                  >
                    <Copy className="w-2.5 h-2.5" />
                    <span>Copiar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Adicionar Fonte de Contexto */}
      {isAddSourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-dark-card border border-dark-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-dark-border pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-crimson" />
                <span>Adicionar Fonte de Contexto</span>
              </h3>
              <button
                onClick={() => setIsAddSourceModalOpen(false)}
                className="p-2 rounded-lg text-dark-muted hover:text-white hover:bg-dark-input text-sm transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                aria-label="Fechar modal de adicionar fonte"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSource} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tipo da Fonte
                </label>
                <select
                  value={newSourceType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setNewSourceType(val);
                    if (val === 'VIDEO_BLOCK') setNewSourceTokens(256000);
                    if (val === 'JURISPRUDENCE') setNewSourceTokens(5000);
                    if (val === 'CASE_PETICAO') setNewSourceTokens(15000);
                    if (val === 'CUSTOM_TEXT') setNewSourceTokens(2000);
                  }}
                  aria-label="Selecionar tipo da fonte de contexto"
                  className="w-full px-3 py-2 bg-dark-input border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-crimson"
                >
                  <option value="VIDEO_BLOCK">🎬 Bloco de Vídeo / Áudio (~256k tokens)</option>
                  <option value="JURISPRUDENCE">⚖️ Jurisprudência / Súmula</option>
                  <option value="CASE_PETICAO">📄 Petição do Processo</option>
                  <option value="CUSTOM_TEXT">📝 Texto Personalizado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Título da Fonte *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bloco 3: Encerramento e Memoriais"
                  value={newSourceTitle}
                  onChange={(e) => setNewSourceTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-input border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-crimson"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Conteúdo Textual
                </label>
                <textarea
                  rows={4}
                  placeholder="Cole o trecho dos autos, transcrição ou jurisprudência..."
                  value={newSourceContent}
                  onChange={(e) => setNewSourceContent(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-input border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-crimson"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsAddSourceModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-dark-input"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newSourceTitle.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-crimson hover:bg-crimson-hover text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  Adicionar ao Caderno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
