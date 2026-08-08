'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Citation } from '@/lib/types';
import { Bot, Send, User, Sparkles, Clock } from 'lucide-react';

interface CopilotChatProps {
  hearingId: string;
  onSeek: (ms: number) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

const QUICK_PROMPTS = [
  'Houve tentativa de conciliação e qual foi o resultado?',
  'O que a autora declarou sobre as notificações extrajudiciais?',
  'Quais foram as deliberações e prazos finais fixados pela juíza?',
  'Identifique se houve confissão ou contradição sobre a obra.',
];

export default function CopilotChat({ hearingId, onSeek }: CopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Olá! Sou o Copilot Judiciário do Open Judy. Posso responder qualquer dúvida sobre os depoimentos e deliberações desta audiência com base nos vetores semânticos do AlloyDB e Gemini. Faça uma pergunta ou selecione uma sugestão abaixo.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || isLoading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setIsLoading(true);

    try {
      const response = await api.chatCopilot(hearingId, q);
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
          content: 'Desculpe, ocorreu uma falha ao consultar o Copilot.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-dark-border bg-dark-bg/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-crimson shadow-md shadow-crimson/25">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Copilot Judiciário</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-crimson/10 border border-crimson/30 text-red-400 font-semibold">
                RAG pgvector
              </span>
            </h2>
            <p className="text-[11px] text-dark-muted">
              Perguntas fundamentadas com citações auditáveis
            </p>
          </div>
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
                        onClick={() => onSeek(c.startTimeMs)}
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
