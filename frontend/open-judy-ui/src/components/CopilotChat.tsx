'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Citation, TranscriptBlock } from '@/lib/types';
import { Bot, Send, User, Sparkles, Clock, Layers, CheckCircle2, ChevronRight } from 'lucide-react';

interface CopilotChatProps {
  hearingId: string;
  onSeek: (ms: number) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  blockContext?: number;
}

const QUICK_PROMPTS = [
  'Qual é a síntese dos debates e manifestações desta sessão?',
  'Quais foram as principais teses apresentadas pelos participantes?',
  'Quais foram as deliberações ou votos proferidos na sessão?',
  'Identifique os pontos controvertidos ou divergências debatidos.',
];

export default function CopilotChat({ hearingId, onSeek }: CopilotChatProps) {
  const [blocks, setBlocks] = useState<TranscriptBlock[]>([]);
  const [selectedBlockIndices, setSelectedBlockIndices] = useState<number[]>([]);
  const [useFullTranscript, setUseFullTranscript] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Olá! Sou o Gemini Multimodal Chat do Open Judy. Você pode selecionar até 2 blocos de vídeo (~256k tokens cada) ou a transcrição textual completa como contexto focal para suas perguntas.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    api.getBlocks(hearingId).then(setBlocks);
  }, [hearingId]);

  const toggleBlock = (blockIndex: number) => {
    setUseFullTranscript(false);
    if (selectedBlockIndices.includes(blockIndex)) {
      setSelectedBlockIndices((prev) => prev.filter((i) => i !== blockIndex));
    } else {
      if (selectedBlockIndices.length >= 2) {
        // Enforce max 2 blocks: keep the most recent selection and add the new one
        setSelectedBlockIndices([selectedBlockIndices[1], blockIndex]);
      } else {
        setSelectedBlockIndices((prev) => [...prev, blockIndex]);
      }
    }
  };

  const handleSelectFullTranscript = () => {
    setSelectedBlockIndices([]);
    setUseFullTranscript(true);
  };

  const handleClearContext = () => {
    setSelectedBlockIndices([]);
    setUseFullTranscript(false);
  };

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || isLoading) return;

    setInput('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: q }
    ]);
    setIsLoading(true);

    try {
      const response = await api.chatCopilot(
        hearingId,
        q,
        selectedBlockIndices.slice(0, 2),
        useFullTranscript
      );
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.answer,
          citations: response.citations,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Desculpe, ocorreu uma falha ao consultar o Gemini Chat.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedBlocks = blocks.filter((b) => selectedBlockIndices.includes(b.blockIndex));
  const totalTokens = selectedBlocks.reduce((acc, b) => acc + b.estimatedTokens, 0);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Header with Title and Model Badges */}
      <div className="p-4 border-b border-dark-border bg-dark-bg/40 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-crimson shadow-md shadow-crimson/25">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Gemini Multimodal Chat</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-crimson/10 border border-crimson/30 text-red-400 font-semibold">
                  Janela Multimodal
                </span>
              </h2>
              <p className="text-[11px] text-dark-muted">
                Perguntas fundamentadas com seleção de até 2 blocos de vídeo (~256k tokens cada)
              </p>
            </div>
          </div>
        </div>

        {/* 256k Context Block Selector with Max 2 Limit */}
        <div className="pt-2 border-t border-dark-border/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-crimson" />
              <span>Contexto no Chat (Máximo 2 blocos de ~256k tokens):</span>
            </span>
            <span className="text-[10px] font-mono text-dark-muted">
              {selectedBlockIndices.length}/2 selecionados
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* General RAG */}
            <button
              onClick={handleClearContext}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                selectedBlockIndices.length === 0 && !useFullTranscript
                  ? 'bg-crimson text-white shadow-sm'
                  : 'bg-dark-input hover:bg-dark-pill text-dark-muted hover:text-slate-200 border border-dark-border'
              }`}
            >
              Visão Geral
            </button>

            {/* Full Transcript (with 512k token auto-chunking rule) */}
            <button
              onClick={handleSelectFullTranscript}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                useFullTranscript
                  ? 'bg-crimson text-white shadow-sm'
                  : 'bg-dark-input hover:bg-dark-pill text-dark-muted hover:text-slate-200 border border-dark-border'
              }`}
              title="Utilizar a transcrição textual completa. Se exceder 512k tokens, o sistema divide automaticamente em blocos."
            >
              <span>Transcrição Completa</span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-dark-pill text-slate-300">
                &le; 512k
              </span>
            </button>

            {/* Video / Audio Blocks */}
            {blocks.map((blk) => {
              const isSelected = selectedBlockIndices.includes(blk.blockIndex);
              return (
                <button
                  key={blk.id}
                  onClick={() => toggleBlock(blk.blockIndex)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    isSelected
                      ? 'bg-crimson text-white shadow-sm ring-1 ring-white/20'
                      : 'bg-dark-input hover:bg-dark-pill text-dark-muted hover:text-slate-200 border border-dark-border'
                  }`}
                  title={`${blk.title} (${blk.startTimeFormatted} - ${blk.endTimeFormatted}) • ~${Math.round(blk.estimatedTokens / 1000)}k tokens`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isSelected ? 'bg-white text-crimson' : 'bg-dark-pill text-slate-400'
                  }`}>
                    {isSelected ? '✓' : blk.blockIndex}
                  </span>
                  <span>Bloco {blk.blockIndex}</span>
                  <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-dark-pill text-slate-400'
                  }`}>
                    {blk.startTimeFormatted}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Selection Details Banner */}
          {selectedBlocks.length > 0 && (
            <div className="mt-2 p-2 rounded-xl bg-crimson/10 border border-crimson/30 space-y-1 animate-in fade-in">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-white font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-crimson" />
                  <span>
                    {selectedBlocks.length === 1 ? '1 Bloco Selecionado' : '2 Blocos Selecionados (Limite Máximo)'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-red-300 font-bold">
                  ~{Math.round(totalTokens / 1000)}k tokens totais
                </span>
              </div>
              <div className="text-[11px] text-slate-300 flex flex-col gap-0.5">
                {selectedBlocks.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">• <strong className="text-white">{b.title}</strong>: {b.summary}</span>
                    <button
                      onClick={() => onSeek(b.startTimeMs)}
                      className="text-[10px] text-crimson hover:underline shrink-0 font-mono"
                    >
                      Pular p/ {b.startTimeFormatted}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {useFullTranscript && (
            <div className="mt-2 p-2 rounded-xl bg-sky-950/30 border border-sky-800/40 flex items-start gap-2 animate-in fade-in">
              <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-300">
                <span className="font-bold text-white">Contexto da Transcrição Completa Ativo:</span> Perguntas consultarão o texto integral da audiência (com partição automática em blocos de 256k tokens caso exceda 512k tokens).
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 text-xs leading-relaxed ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-crimson/20 border border-crimson/30 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-crimson" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 ${
                msg.role === 'user'
                  ? 'bg-crimson text-white shadow-md shadow-crimson/20 rounded-br-none font-medium'
                  : 'bg-dark-input border border-dark-border text-slate-200 shadow-md rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* Timestamp Citation Badges */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-dark-border/80 space-y-1.5">
                  <span className="text-[10px] font-semibold text-dark-muted uppercase tracking-wider">
                    Fontes citadas nos depoimentos:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.citations.map((c, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSeek(c.startTimeMs || 0)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-dark-bg hover:bg-dark-pill border border-dark-border text-[11px] font-mono text-red-400 hover:text-red-300 transition"
                        title={`Ouvir citação: ${c.snippet}`}
                      >
                        <Clock className="w-3 h-3 text-crimson" />
                        <span>{c.timestampFormatted}</span>
                        <span className="text-dark-muted font-sans truncate max-w-[120px]">
                          ({c.speakerName})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-slate-800 border border-dark-border flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-slate-300" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-dark-muted italic pl-9">
            <Sparkles className="w-3.5 h-3.5 text-crimson animate-spin" />
            <span>Consultando vetores do AlloyDB e raciocinando com Gemini...</span>
          </div>
        )}
      </div>

      {/* Suggested Prompts */}
      <div className="px-4 py-2 bg-dark-bg/40 border-t border-dark-border overflow-x-auto flex gap-1.5 no-scrollbar">
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="shrink-0 px-3 py-1 text-[11px] bg-dark-input hover:bg-dark-pill border border-dark-border rounded-full text-slate-300 hover:text-white transition whitespace-nowrap"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-dark-bg/80 border-t border-dark-border flex gap-2"
      >
        <input
          type="text"
          placeholder="Pergunte sobre depoimentos, teses ou deliberações..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-dark-input border border-dark-border rounded-xl px-3.5 py-2 text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson transition"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-white text-xs font-bold shadow-md shadow-crimson/25 disabled:opacity-40 transition flex items-center justify-center"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
