'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { listNotebooks, createNotebook } from '@/lib/api';
import { Notebook } from '@/lib/types';
import {
  BookOpen,
  Plus,
  Layers,
  Sparkles,
  Search,
  Clock,
  ArrowRight,
  Bot,
  FileText,
  Video,
  Bookmark
} from 'lucide-react';

export default function NotebooksHubPage() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCaseNumber, setNewCaseNumber] = useState('');
  const [newEmoji, setNewEmoji] = useState('⚖️');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('search');
      if (q) setSearchTerm(q);
    }
    listNotebooks().then((nbs) => {
      const map = new Map<string, Notebook>();
      nbs.forEach((n) => map.set(n.id, n));
      setNotebooks(Array.from(map.values()));
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const created = await createNotebook({
        title: newTitle.trim(),
        description: newDescription.trim(),
        caseNumber: newCaseNumber.trim() || undefined,
        emoji: newEmoji,
        color: '#2563eb'
      });
      setNotebooks((prev) => {
        const map = new Map<string, Notebook>();
        map.set(created.id, created);
        prev.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewCaseNumber('');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredNotebooks = notebooks.filter((nb) => {
    const q = searchTerm.toLowerCase();
    return (
      nb.title.toLowerCase().includes(q) ||
      (nb.description && nb.description.toLowerCase().includes(q)) ||
      (nb.caseNumber && nb.caseNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 animate-in fade-in">
      <div className="flex-1 w-full space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-card border border-dark-border p-5 rounded-lg shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-dark-muted mb-1">
              <Link href="/" className="hover:text-white transition-colors">Gabinete &amp; Expediente</Link>
              <span>/</span>
              <span className="text-white font-medium">Cadernos de Instrução (Res. CNJ nº 332/2020)</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <BookOpen className="w-6 h-6 text-crimson shrink-0" />
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-serif">
                Cadernos de Instrução e Pesquisa Probatória
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded bg-dark-input border border-dark-border text-slate-300 font-semibold">
                Res. CNJ nº 332/2020
              </span>
            </div>
            <p className="text-xs text-dark-muted max-w-2xl">
              Organize cadernos de instrução processual, vincule blocos de degravação audiovisual, petições e laudos, e realize consultas fundamentadas com citação direta às fontes dos autos.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-crimson hover:bg-crimson-dark text-white text-xs font-semibold shadow-sm transition-colors min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            <span>Instaurar Caderno de Instrução</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-dark-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar caderno por título, objeto probatório ou Nº Único CNJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-card border border-dark-border rounded-lg text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson transition-colors"
            />
          </div>
        </div>

        {/* Notebooks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotebooks.map((nb) => {
            const totalTokens = nb.sources.reduce((acc, s) => acc + (s.isActiveForChat ? s.estimatedTokens : 0), 0);
            return (
              <Link
                key={nb.id}
                href={`/notebooks/${nb.id}`}
                className="group flex flex-col justify-between p-5 bg-dark-card hover:bg-dark-hover border border-dark-border hover:border-crimson/50 rounded-lg shadow-sm transition-colors duration-200"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xl p-2 rounded-md bg-dark-input border border-dark-border">
                      {nb.emoji || '⚖️'}
                    </span>
                    {nb.caseNumber && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-dark-input text-slate-300 border border-dark-border tabular-nums">
                        {nb.caseNumber}
                      </span>
                    )}
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-white group-hover:text-crimson transition-colors line-clamp-1 font-serif">
                      {nb.title}
                    </h2>
                    {nb.description && (
                      <p className="text-xs text-dark-muted line-clamp-2 mt-1 leading-relaxed">
                        {nb.description}
                      </p>
                    )}
                  </div>

                  {/* Sources Preview Pills */}
                  <div className="pt-2 border-t border-dark-border/60 flex items-center gap-1.5 flex-wrap tabular-nums">
                    <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                      <Layers className="w-3 h-3 text-crimson" />
                      <span>{nb.sources.length} peças / registros</span>
                    </span>
                    <span className="text-dark-muted">•</span>
                    <span className="text-[11px] font-mono text-slate-300">
                      ~{Math.round(totalTokens / 1000)}k tokens indexados
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-dark-border/40 flex items-center justify-between text-xs text-dark-muted tabular-nums">
                  <span className="flex items-center gap-1">
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{nb.notes.length} cotas / notas</span>
                  </span>
                  <span className="flex items-center gap-1 text-crimson font-semibold group-hover:translate-x-1 transition-transform">
                    <span>Abrir Caderno</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Modal Criar Novo Caderno */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-dark-card border border-dark-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-dark-border pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Novo Caderno Judicial</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-lg text-dark-muted hover:text-white hover:bg-dark-input text-sm transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                aria-label="Fechar modal de novo caderno"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ícone / Emoji
                </label>
                <div className="flex items-center gap-2">
                  {['⚖️', '📓', '🏛️', '📜', '🔍', '💼'].map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setNewEmoji(e)}
                      className={`text-xl p-2 rounded-xl border transition ${
                        newEmoji === e
                          ? 'bg-crimson/20 border-crimson shadow-sm'
                          : 'bg-dark-input border-dark-border hover:border-slate-500'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Título do Caderno *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Análise de Controvérsias - Processo 0014238-19"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-dark-input border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-crimson"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Processo Vinculado (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 0014238-19.2024.8.26.0100"
                  value={newCaseNumber}
                  onChange={(e) => setNewCaseNumber(e.target.value)}
                  className="w-full px-3.5 py-2 bg-dark-input border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-crimson font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Objetivo / Descrição
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva o escopo da pesquisa jurídica ou teses a serem confrontadas..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-dark-input border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-crimson"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-dark-input transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-crimson hover:bg-crimson-hover text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {isCreating ? 'Criando...' : 'Criar Caderno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
