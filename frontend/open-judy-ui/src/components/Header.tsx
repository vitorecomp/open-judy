'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronDown,
  Bell,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCheck,
  Radio,
  FileText,
  AlertTriangle,
  Shield,
  Sparkles,
  ExternalLink,
  Layers,
  Scale,
  Bot,
  ArrowRight,
  BookOpen,
  MessageSquare,
  Landmark,
} from 'lucide-react';
import { JudicialNotification } from '@/lib/types';
import {
  getJudicialNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  api,
} from '@/lib/api';

interface HeaderProps {
  title?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onToggleSidebar?: () => void;
}

interface SearchFilterOption {
  id: string;
  label: string;
  shortLabel: string;
  entityType: string;
  placeholder: string;
  icon: any;
  targetPath: string;
}

const SEARCH_FILTER_OPTIONS: SearchFilterOption[] = [
  {
    id: 'ALL',
    label: 'Acervo Processual Integral',
    shortLabel: 'Acervo Integral',
    entityType: 'ALL',
    placeholder: 'Pesquisar nº único CNJ, autos, termos de audiência e depoimentos...',
    icon: Landmark,
    targetPath: '/cases',
  },
  {
    id: 'CASE',
    label: 'Autos Processuais (CNJ)',
    shortLabel: 'Autos CNJ',
    entityType: 'CASE',
    placeholder: 'Pesquisar nº único CNJ, classe, assunto, partes ou vara...',
    icon: Layers,
    targetPath: '/cases',
  },
  {
    id: 'CASE_DOCUMENT',
    label: 'Peças, Laudos e Decisões',
    shortLabel: 'Peças & Autos',
    entityType: 'CASE_DOCUMENT',
    placeholder: 'Pesquisar em petições, termos, laudos periciais e decisões...',
    icon: FileText,
    targetPath: '/cases',
  },
  {
    id: 'HEARING_TRANSCRIPT',
    label: 'Audiências & Depoimentos Orais',
    shortLabel: 'Depoimentos',
    entityType: 'HEARING_TRANSCRIPT',
    placeholder: 'Pesquisar falas degravadas e depoimentos em audiência...',
    icon: Scale,
    targetPath: '/hearings',
  },
  {
    id: 'HEARING_CHAT',
    label: 'Consultas de Instrução em Audiência',
    shortLabel: 'Consultas',
    entityType: 'HEARING_CHAT',
    placeholder: 'Pesquisar consultas probatórias da sessão...',
    icon: MessageSquare,
    targetPath: '/hearings',
  },
  {
    id: 'NOTEBOOK_CONVERSATION',
    label: 'Cadernos de Instrução Probatória',
    shortLabel: 'Cadernos',
    entityType: 'NOTEBOOK_CONVERSATION',
    placeholder: 'Pesquisar anotações e sínteses nos cadernos de instrução...',
    icon: BookOpen,
    targetPath: '/notebooks',
  },
  {
    id: 'AGENT_CONVERSATION',
    label: 'Assessoria Jurisdicional (Histórico)',
    shortLabel: 'Assessoria',
    entityType: 'AGENT_CONVERSATION',
    placeholder: 'Pesquisar pareceres e minutas da assessoria jurisdicional...',
    icon: Bot,
    targetPath: '/agents',
  },
  {
    id: 'AGENT_KNOWLEDGE',
    label: 'Módulos de Assessoria Jurisdicional',
    shortLabel: 'Módulos',
    entityType: 'AGENT_KNOWLEDGE',
    placeholder: 'Pesquisar módulos de apoio à decisão (Res. CNJ 332/2020)...',
    icon: Bot,
    targetPath: '/agents',
  },
];

export default function Header({
  isCollapsed = false,
  onToggleCollapse,
  onToggleSidebar,
}: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<SearchFilterOption>(SEARCH_FILTER_OPTIONS[0]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<JudicialNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const list = await getJudicialNotifications();
      const count = await getUnreadNotificationCount();
      setNotifications(list);
      setUnreadCount(count);
    } catch (_) {}
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationAsRead(id);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    loadNotifications();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearchFocused(false);
    router.push(`${selectedFilter.targetPath}?search=${encodeURIComponent(q)}`);
  };

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const queryClean = searchQuery.toLowerCase().trim();
  const showResults = isSearchFocused && queryClean.length > 0;

  useEffect(() => {
    if (!queryClean) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      api
        .searchUnified(queryClean, selectedFilter.entityType, 10)
        .then((res) => {
          setSearchResults(res?.results || []);
        })
        .catch(() => {});
    }, 150);
    return () => clearTimeout(timer);
  }, [queryClean, selectedFilter]);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'AUDIO_PROCESSING':
        return <Radio className="w-3.5 h-3.5 text-crimson" />;
      case 'DOCUMENT_WORKFLOW':
        return <FileText className="w-3.5 h-3.5 text-amber-400" />;
      case 'LEGAL_ANALYSIS':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      case 'SECURITY_AUDIT':
        return <Shield className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-dark-header/95 backdrop-blur border-b border-dark-border px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Left: Sidebar Toggle Button & Compact Institutional Identifier */}
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-dark-muted hover:text-white hover:bg-dark-pill transition-colors"
            aria-label="Abrir menu"
            title="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-2 rounded-lg text-dark-muted hover:text-white hover:bg-dark-pill transition-colors"
            aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            title={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        <div className="hidden xl:flex items-center gap-2 min-w-0 text-[11px] pl-1 border-l border-dark-border/80">
          <Landmark className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-2" />
          <span className="font-mono font-bold tracking-wider uppercase text-slate-300 truncate">
            PODER JUDICIÁRIO • RES. CNJ Nº 105/2010 &amp; Nº 332/2020
          </span>
        </div>
      </div>

      {/* Center: Centralized Judicial Search Bar & Scope Selector */}
      <div
        ref={searchContainerRef}
        className="flex-1 max-w-xl mx-auto hidden md:flex items-center justify-center gap-2 relative"
      >
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-dark-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={selectedFilter.placeholder}
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              className="w-full pl-9 pr-3.5 py-1.5 bg-dark-input hover:bg-dark-pill border border-dark-border rounded-lg text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson transition-colors duration-150"
            />
          </form>

          {/* Category Dropdown */}
          <div ref={filterDropdownRef} className="relative shrink-0">
            <button
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-input hover:bg-dark-pill border border-dark-border text-xs font-medium text-slate-200 transition-colors"
            >
              {React.createElement(selectedFilter.icon, { className: 'w-3.5 h-3.5 text-crimson' })}
              <span className="truncate max-w-[115px]">{selectedFilter.shortLabel}</span>
              <ChevronDown className="w-3 h-3 text-dark-muted" />
            </button>

            {isCategoryOpen && (
              <div className="absolute right-0 mt-1.5 w-64 py-1.5 bg-dark-card border border-dark-border rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95 divide-y divide-dark-border/40">
                <div className="px-3 py-1 text-[11px] uppercase font-mono font-bold text-dark-muted">
                  Escopo da Pesquisa Processual:
                </div>
                <div className="py-1">
                  {SEARCH_FILTER_OPTIONS.map((opt) => {
                    const isSelected = selectedFilter.id === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setSelectedFilter(opt);
                          setIsCategoryOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left ${
                          isSelected
                            ? 'bg-crimson/20 text-white font-bold'
                            : 'text-slate-300 hover:bg-dark-pill hover:text-white'
                        }`}
                      >
                        <Icon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected ? 'text-crimson' : 'text-dark-muted'
                          }`}
                        />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Instant Search Results Dropdown Overlay */}
          {showResults && (
            <div className="absolute left-0 right-0 top-10 bg-dark-card border border-dark-border rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 divide-y divide-dark-border/60">
              <div className="px-3.5 py-2 bg-dark-bg/80 flex items-center justify-between text-[11px] text-dark-muted font-mono">
                <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <Search className="w-3.5 h-3.5 text-crimson" />
                  <span>
                    Escopo: <strong className="text-white">{selectedFilter.label}</strong>
                  </span>
                </span>
                <span className="text-[11px] text-sky-300 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/40 font-bold">
                  Índice Unificado do Acervo (CNJ)
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto p-2 space-y-1.5 divide-y divide-dark-border/40">
                {searchResults.length === 0 ? (
                  <div className="text-xs text-dark-muted px-3 py-4 text-center">
                    Nenhum registro localizado para &ldquo;{searchQuery}&rdquo; em {selectedFilter.label}.
                  </div>
                ) : (
                  searchResults.map((item) => {
                    const getBadge = (type: string) => {
                      switch (type) {
                        case 'CASE':
                          return {
                            label: 'Autos CNJ',
                            bg: 'bg-sky-950/50',
                            text: 'text-sky-300',
                            border: 'border-sky-800/40',
                          };
                        case 'CASE_DOCUMENT':
                          return {
                            label: 'Peça Processual',
                            bg: 'bg-indigo-950/50',
                            text: 'text-indigo-300',
                            border: 'border-indigo-800/40',
                          };
                        case 'HEARING_TRANSCRIPT':
                          return {
                            label: 'Depoimento',
                            bg: 'bg-crimson/15',
                            text: 'text-sky-200',
                            border: 'border-crimson/30',
                          };
                        case 'HEARING_CHAT':
                          return {
                            label: 'Consulta Audiência',
                            bg: 'bg-amber-950/50',
                            text: 'text-amber-300',
                            border: 'border-amber-800/40',
                          };
                        case 'NOTEBOOK_CONVERSATION':
                          return {
                            label: 'Caderno de Instrução',
                            bg: 'bg-purple-950/50',
                            text: 'text-purple-300',
                            border: 'border-purple-800/40',
                          };
                        case 'AGENT_CONVERSATION':
                          return {
                            label: 'Assessoria',
                            bg: 'bg-teal-950/50',
                            text: 'text-teal-300',
                            border: 'border-teal-800/40',
                          };
                        case 'AGENT_KNOWLEDGE':
                          return {
                            label: 'Módulo CNJ',
                            bg: 'bg-emerald-950/50',
                            text: 'text-emerald-300',
                            border: 'border-emerald-800/40',
                          };
                        default:
                          return {
                            label: 'Registro',
                            bg: 'bg-slate-900',
                            text: 'text-slate-300',
                            border: 'border-slate-700',
                          };
                      }
                    };
                    const badge = getBadge(item.entityType);

                    return (
                      <Link
                        key={item.id}
                        href={item.targetUrl || '/'}
                        onClick={() => setIsSearchFocused(false)}
                        className="flex items-start justify-between p-2.5 rounded-lg hover:bg-dark-input transition-colors group gap-3 pt-2"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] font-bold uppercase font-mono border ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              {badge.label}
                            </span>

                            <span className="text-xs font-bold text-white group-hover:text-crimson-light transition-colors font-mono truncate">
                              {item.title}
                            </span>
                          </div>

                          {item.highlightSnippet && (
                            <div
                              className="text-[11px] text-dark-muted line-clamp-2 leading-relaxed pl-1"
                              dangerouslySetInnerHTML={{ __html: item.highlightSnippet }}
                            />
                          )}

                          <div className="text-[11px] text-dark-muted flex items-center gap-2 pl-1 font-mono">
                            {item.courtJurisdiction && <span>{item.courtJurisdiction}</span>}
                            {item.score && (
                              <span className="text-slate-400">Relevância: {item.score.toFixed(1)}</span>
                            )}
                          </div>
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-dark-muted group-hover:text-white shrink-0 mt-1" />
                      </Link>
                    );
                  })
                )}
              </div>

              <div className="p-2.5 bg-dark-bg/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-dark-muted">
                  Pressione <strong>Enter</strong> para consultar no acervo
                </span>
                <button
                  onClick={handleSearchSubmit}
                  className="text-xs font-bold text-crimson hover:underline"
                >
                  Consultar todos os registros
                </button>
              </div>
            </div>
          )}
        </div>

      {/* Right Controls: Court Unit Badge & Notification Bell Popover */}
      <div className="relative flex items-center gap-2.5 shrink-0">
        <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-md bg-dark-pill border border-dark-border text-[11px] font-mono font-semibold text-amber-300">
          1ª Vara Criminal / Gabinete
        </span>

        <button
          onClick={() => setIsNotifOpen(!isNotifOpen)}
          className={`relative p-2 rounded-lg border transition-colors ${
            isNotifOpen
              ? 'bg-crimson/20 border-crimson/50 text-white'
              : 'bg-dark-input hover:bg-dark-pill border-dark-border text-dark-muted hover:text-white'
          }`}
          title={`${unreadCount} Intimações e Alertas de Expediente`}
          aria-label="Abrir notificações e alertas de expediente"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-crimson text-white text-[11px] font-bold flex items-center justify-center shadow-lg ring-2 ring-dark-bg">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {isNotifOpen && (
          <div className="absolute right-0 top-11 w-80 sm:w-96 bg-dark-card border border-dark-border rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-4 py-3 border-b border-dark-border/80 flex items-center justify-between bg-dark-bg/60">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-crimson" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Expediente &amp; Alertas Judiciais
                </span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-crimson/20 text-crimson-light text-[11px] font-semibold">
                    {unreadCount} pendente{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] text-dark-muted hover:text-slate-200 transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Dar ciência</span>
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-dark-border/50">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-dark-muted">
                  Nenhum alerta de expediente pendente.
                </div>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 transition-colors flex gap-3 items-start ${
                      !n.read ? 'bg-crimson/5 hover:bg-crimson/10' : 'hover:bg-dark-pill/40 opacity-75'
                    }`}
                  >
                    <div className="p-1.5 rounded-md bg-dark-bg border border-dark-border shrink-0 mt-0.5">
                      {getCategoryIcon(n.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4 className="text-xs font-semibold text-white truncate">{n.title}</h4>
                        {!n.read && (
                          <button
                            onClick={(e) => handleMarkAsRead(n.id, e)}
                            className="text-[11px] text-dark-muted hover:text-crimson transition-colors shrink-0"
                            title="Marcar como lida"
                          >
                            <CheckCheck className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      {n.actionUrl && (
                        <Link
                          href={n.actionUrl}
                          onClick={() => {
                            if (!n.read) markNotificationAsRead(n.id);
                            setIsNotifOpen(false);
                          }}
                          className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-crimson hover:underline"
                        >
                          <span>Abrir Termo de Audiência</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
