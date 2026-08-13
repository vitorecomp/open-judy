'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { EnterpriseAgent, AgentGardenSession, Citation } from '@/lib/types';
import {
  ArrowLeft,
  Bot,
  Sparkles,
  Scale,
  AlertTriangle,
  FileText,
  Calendar,
  MessageSquare,
  Plus,
  Send,
  ExternalLink,
  Terminal,
  Database,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  ChevronRight,
  RefreshCw,
  Cpu
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  plannerSteps?: string[];
  citations?: Citation[];
  timestamp?: string;
}

export default function AgentConversationsPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = (params?.id as string) || 'agent-juris-01';

  const [agent, setAgent] = useState<EnterpriseAgent | null>(null);
  const [sessions, setSessions] = useState<AgentGardenSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activePlannerSteps, setActivePlannerSteps] = useState<string[]>([]);
  const [sessionSearch, setSessionSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load agent details
    api.getEnterpriseAgent(agentId).then(setAgent);

    // Load conversation sessions for this agent
    api.getAgentSessions(agentId).then((sessList) => {
      setSessions(sessList);
      if (sessList.length > 0) {
        setSelectedSessionId(sessList[0].sessionId);
        loadSessionMessages(sessList[0]);
      } else {
        startNewConversation(agentId);
      }
    });
  }, [agentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activePlannerSteps]);

  const loadSessionMessages = (session: AgentGardenSession) => {
    const defaultAgentName = agent?.name || 'Agente Judicial';
    if (session.queryHistory && session.queryHistory.length > 0) {
      const historyMessages: ChatMessage[] = [];
      session.queryHistory.forEach((q, idx) => {
        historyMessages.push({
          role: 'user',
          content: q,
          timestamp: new Date(Date.now() - (session.queryHistory.length - idx) * 600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        historyMessages.push({
          role: 'assistant',
          content: `Fundamentação jurídica fornecida por **${defaultAgentName}** via corpora do Gemini Enterprise para: "${q}".\n\n- Conforme precedentes vinculantes do tribunal, os requisitos formais foram observados.`,
          citations: [
            {
              title: 'STF - Precedente com Repercussão Geral',
              uri: 'https://portal.stf.jus.br',
              court: 'STF',
              precedentNumber: 'Tema 1046',
              confidenceScore: 0.95
            }
          ],
          timestamp: new Date(Date.now() - (session.queryHistory.length - idx) * 600000 + 30000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      });
      setMessages(historyMessages);
    } else {
      setMessages([
        {
          role: 'assistant',
          content: `Olá! Sou o agente **${defaultAgentName}**. Como posso ajudar nesta nova conversa?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const startNewConversation = async (currentAgentId: string) => {
    const newSess = await api.createAgentSession(currentAgentId, 'Nova Conversa');
    setSessions((prev) => [newSess, ...prev]);
    setSelectedSessionId(newSess.sessionId);
    setMessages([
      {
        role: 'assistant',
        content: `Nova sessão iniciada com **${agent?.name || 'o agente'}**. Faça uma pergunta para consultar os data stores via StreamAssist.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSelectSession = (session: AgentGardenSession) => {
    setSelectedSessionId(session.sessionId);
    loadSessionMessages(session);
  };

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isStreaming) return;

    setInputQuery('');
    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { role: 'user', content: q, timestamp: userTimestamp }]);
    setIsStreaming(true);
    setActivePlannerSteps([]);

    // Update queryHistory in active session
    setSessions((prev) =>
      prev.map((s) =>
        s.sessionId === selectedSessionId
          ? { ...s, turnCount: s.turnCount + 1, queryHistory: [...s.queryHistory, q], lastActiveAt: new Date().toISOString() }
          : s
      )
    );

    try {
      const res = await api.chatAgentGarden(q, selectedSessionId, agentId);

      // Simulate real-time planner steps
      if (res.plannerSteps && res.plannerSteps.length > 0) {
        for (const step of res.plannerSteps) {
          setActivePlannerSteps((prev) => [...prev, step]);
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 250));

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.answer,
          citations: res.citations,
          plannerSteps: res.plannerSteps,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Ocorreu um erro ao comunicar com a StreamAssist API do Gemini Enterprise.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsStreaming(false);
      setActivePlannerSteps([]);
    }
  };

  const getAgentIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Scale':
        return <Scale className="w-5 h-5 text-crimson" />;
      case 'AlertTriangle':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'FileText':
        return <FileText className="w-5 h-5 text-indigo-400" />;
      case 'Calendar':
        return <Calendar className="w-5 h-5 text-emerald-400" />;
      default:
        return <Bot className="w-5 h-5 text-sky-400" />;
    }
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(sessionSearch.toLowerCase()) ||
    s.queryHistory?.some((q) => q.toLowerCase().includes(sessionSearch.toLowerCase()))
  );

  return (
    <div className="w-full flex-1 flex flex-col space-y-4 animate-in fade-in">
      {/* ========================================================================= */}
      {/* Top Header Card */}
      {/* ========================================================================= */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/agents"
              className="p-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition"
              title="Voltar para o Catálogo de Agentes"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="p-1.5 rounded-xl bg-dark-input border border-dark-border">
              {getAgentIcon(agent?.icon)}
            </div>

            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>{agent?.name || 'Carregando Agente...'}</span>
            </h1>

            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-dark-input text-slate-200 border border-dark-border uppercase font-mono">
              {agent?.agentType.replace(/_/g, ' ') || 'GEMINI ENTERPRISE'}
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-crimson/15 text-red-300 border border-crimson/30">
              <Sparkles className="w-3 h-3 text-crimson" />
              <span>StreamAssist Ativo</span>
            </span>
          </div>

          <p className="text-xs text-dark-muted pl-8 flex items-center gap-1.5">
            <span>{agent?.description}</span>
          </p>
        </div>

        {/* Action Button: Start New Conversation */}
        <div className="flex items-center gap-2.5 pl-8 md:pl-0">
          <button
            onClick={() => startNewConversation(agentId)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-white text-xs font-bold transition shadow-md shadow-crimson/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Conversa</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Main Workspace: Left (All Conversations with this Agent) vs Right (Live Chat) */}
      {/* ========================================================================= */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[640px]">
        {/* Left Column (4 cols): User's Conversation Sessions with this Agent */}
        <div className="lg:col-span-4 flex flex-col bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl">
          {/* Header & Search */}
          <div className="p-3.5 border-b border-dark-border bg-dark-bg/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-crimson" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Minhas Conversas
                </h2>
              </div>
              <span className="text-[11px] font-mono text-dark-muted px-2 py-0.5 bg-dark-input rounded-md border border-dark-border">
                {sessions.length}
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-dark-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar conversas..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-dark-input border border-dark-border rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson transition"
              />
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {filteredSessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-dark-muted">
                Nenhuma conversa encontrada. Clique em <strong>Nova Conversa</strong> acima.
              </div>
            ) : (
              filteredSessions.map((sess) => {
                const isSelected = selectedSessionId === sess.sessionId;
                return (
                  <div
                    key={sess.sessionId}
                    onClick={() => handleSelectSession(sess)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'bg-dark-pill border-crimson shadow-md text-white'
                        : 'bg-dark-input/60 hover:bg-dark-input border-dark-border text-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold line-clamp-1 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-crimson' : 'bg-slate-500'}`} />
                        <span>{sess.title}</span>
                      </h3>
                    </div>

                    {sess.queryHistory && sess.queryHistory.length > 0 && (
                      <p className="text-[11px] text-dark-muted line-clamp-1 pl-3 font-mono">
                        &ldquo;{sess.queryHistory[sess.queryHistory.length - 1]}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-dark-muted pt-1 pl-3 border-t border-dark-border/40">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-dark-muted" />
                        <span>{sess.turnCount} intervenç{sess.turnCount === 1 ? 'ão' : 'ões'}</span>
                      </span>
                      <span className="font-mono">
                        {new Date(sess.lastActiveAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (8 cols): Interactive StreamAssist Chat with the Agent */}
        <div className="lg:col-span-8 flex flex-col bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl">
          {/* Chat Header */}
          <div className="p-3.5 border-b border-dark-border bg-dark-bg/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-crimson shadow-md shadow-crimson/20">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{agent?.name}</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-crimson/15 text-red-300 border border-crimson/30 font-semibold font-mono">
                    StreamAssist API
                  </span>
                </h2>
                <p className="text-[11px] text-dark-muted">
                  Data Stores: {agent?.dataStores?.join(', ')} • Raciocínio em Múltiplos Passos
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setMessages([
                  {
                    role: 'assistant',
                    content: `Sessão reiniciada com **${agent?.name || 'o agente'}**. Faça uma pergunta para consultar os data stores.`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                ]);
              }}
              className="p-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition"
              title="Reiniciar diálogo"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 text-xs leading-relaxed ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-crimson/20 border border-crimson/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-red-400" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 space-y-2.5 ${
                    msg.role === 'user'
                      ? 'bg-crimson text-white shadow-md shadow-crimson/10 font-medium'
                      : 'bg-dark-input border border-dark-border text-slate-100'
                  }`}
                >
                  {/* Planner Steps */}
                  {msg.plannerSteps && msg.plannerSteps.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-dark-bg/60 border border-dark-border/80 space-y-1.5 text-[11px] text-dark-muted">
                      <div className="flex items-center gap-1.5 font-bold text-slate-300">
                        <Terminal className="w-3 h-3 text-crimson" />
                        <span>Trilha de Raciocínio (Planner Steps):</span>
                      </div>
                      <ul className="space-y-1 pl-3 list-disc">
                        {msg.plannerSteps.map((step, sIdx) => (
                          <li key={sIdx} className="text-slate-400">{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Text Content */}
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-dark-border/60 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        Fontes & Precedentes Citados:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.citations.map((c, cIdx) => (
                          <a
                            key={cIdx}
                            href={c.uri || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-dark-bg/80 hover:bg-dark-pill border border-dark-border text-[11px] text-slate-200 transition group flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-red-300 truncate">{c.court || 'Jurisprudência'} - {c.precedentNumber || 'Acórdão'}</span>
                              <ExternalLink className="w-3 h-3 text-dark-muted group-hover:text-white shrink-0" />
                            </div>
                            <p className="text-[10px] text-dark-muted truncate mt-0.5">{c.title || c.snippet}</p>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`text-[10px] text-right ${msg.role === 'user' ? 'text-red-200' : 'text-dark-muted'}`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {/* Active Streaming Indicator */}
            {isStreaming && (
              <div className="flex gap-3 text-xs leading-relaxed justify-start">
                <div className="w-7 h-7 rounded-full bg-crimson/20 border border-crimson/40 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                  <Bot className="w-4 h-4 text-red-400" />
                </div>
                <div className="bg-dark-input border border-dark-border rounded-2xl p-3.5 space-y-2 max-w-[85%]">
                  <div className="flex items-center gap-2 text-xs text-red-300 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Processando via Gemini Enterprise StreamAssist...</span>
                  </div>
                  {activePlannerSteps.length > 0 && (
                    <div className="p-2 rounded-lg bg-dark-bg/80 border border-dark-border/60 space-y-1 text-[11px]">
                      {activePlannerSteps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-slate-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-4 py-2 bg-dark-bg/60 border-t border-dark-border flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-dark-muted shrink-0 font-medium">Sugestões:</span>
            {[
              'Qual a tese fixada no Tema 1.046 do STF?',
              'Houve contradição sobre a entrega da obra?',
              'Elabore minuta de despacho saneador',
              'Quais os prazos fixados na última audiência?'
            ].map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(suggestion)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-dark-input hover:bg-dark-pill border border-dark-border text-[11px] text-slate-300 hover:text-white transition whitespace-nowrap"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Query Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-dark-bg/90 border-t border-dark-border flex gap-2"
          >
            <input
              type="text"
              placeholder={`Enviar mensagem para ${agent ? agent.name : 'o agente'}...`}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isStreaming}
              className="flex-1 bg-dark-input border border-dark-border rounded-xl px-3.5 py-2 text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isStreaming || !inputQuery.trim()}
              className="px-4 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-white text-xs font-bold shadow-md shadow-crimson/25 disabled:opacity-40 transition flex items-center justify-center gap-1.5"
            >
              <span>Enviar</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
