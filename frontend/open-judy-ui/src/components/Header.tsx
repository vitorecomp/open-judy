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
  X,
  ArrowRight,
  BookOpen,
  MessageSquare,
  Sparkle
} from 'lucide-react';
import { JudicialNotification, Case, Hearing } from '@/lib/types';
import {
  getJudicialNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  api
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
    label: 'Todos os Recursos',
    shortLabel: 'Todos',
    entityType: 'ALL',
    placeholder: 'Buscar em todo o acervo judicial e IA...',
    icon: Sparkles,
    targetPath: '/cases'
  },
  {
    id: 'CASE',
    label: 'Processos Judiciais',
    shortLabel: 'Processos',
    entityType: 'CASE',
    placeholder: 'Buscar processos, CNJ, partes, vara...',
    icon: Layers,
    targetPath: '/cases'
  },
  {
    id: 'CASE_DOCUMENT',
    label: 'Peças & Documentos',
    shortLabel: 'Peças',
    entityType: 'CASE_DOCUMENT',
    placeholder: 'Buscar em petições, laudos, contratos e OCR...',
    icon: FileText,
    targetPath: '/cases'
  },
  {
    id: 'HEARING_TRANSCRIPT',
    label: 'Audiências & Depoimentos',
    shortLabel: 'Audiências',
    entityType: 'HEARING_TRANSCRIPT',
    placeholder: 'Buscar falas diarizadas e depoimentos orais...',
    icon: Scale,
    targetPath: '/hearings'
  },
  {
    id: 'HEARING_CHAT',
    label: 'Chat da Audiência',
    shortLabel: 'Chat Audiência',
    entityType: 'HEARING_CHAT',
    placeholder: 'Buscar perguntas e respostas do chat da audiência...',
    icon: MessageSquare,
    targetPath: '/hearings'
  },
  {
    id: 'NOTEBOOK_CONVERSATION',
    label: 'Cadernos de Pesquisa',
    shortLabel: 'Cadernos IA',
    entityType: 'NOTEBOOK_CONVERSATION',
    placeholder: 'Buscar conversas e notas nos cadernos jurídicos...',
    icon: BookOpen,
    targetPath: '/notebooks'
  },
  {
    id: 'AGENT_CONVERSATION',
    label: 'Gemini Enterprise (Conversas)',
    shortLabel: 'Gemini Enterprise',
    entityType: 'AGENT_CONVERSATION',
    placeholder: 'Buscar conversas com agentes corporativos...',
    icon: Bot,
    targetPath: '/agents'
  },
  {
    id: 'AGENT_KNOWLEDGE',
    label: 'Agentes Corporativos',
    shortLabel: 'Agentes',
    entityType: 'AGENT_KNOWLEDGE',
    placeholder: 'Buscar agentes no Agent Garden...',
    icon: Bot,
    targetPath: '/agents'
  }
];

export default function Header({
  title = 'Dashboard',
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
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  // Close search dropdown on outside click
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
      api.searchUnified(queryClean, selectedFilter.entityType, 10).then((res) => {
        setSearchResults(res?.results || []);
      }).catch(() => {});
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
        return <Sparkles className="w-3.5 h-3.5 text-teal-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-dark-bg/95 backdrop-blur border-b border-dark-border/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Left: Sidebar Toggle Button & Page Title */}
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        {/* Mobile menu trigger */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-dark-muted hover:text-white hover:bg-dark-pill transition"
            aria-label="Abrir menu"
            title="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Desktop Collapse/Expand trigger in header */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-2 rounded-xl text-dark-muted hover:text-white hover:bg-dark-pill transition"
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

        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
            {title}
          </h1>
        </div>
      </div>

      {/* Center: Centralized Search Bar and Multi-Option Category Filter */}
      <div ref={searchContainerRef} className="flex-1 max-w-xl mx-auto hidden md:flex items-center justify-center gap-2 relative">
        {/* Search Bar Form */}
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
            className="w-full pl-9 pr-3.5 py-1.5 bg-dark-input hover:bg-dark-pill border border-dark-border rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson transition-colors duration-150"
          />
        </form>

        {/* Category Dropdown with all System Options */}
        <div ref={filterDropdownRef} className="relative shrink-0">
          <button
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-xs font-medium text-slate-200 transition-colors"
          >
            {React.createElement(selectedFilter.icon, { className: 'w-3.5 h-3.5 text-crimson' })}
            <span className="truncate max-w-[110px]">{selectedFilter.shortLabel}</span>
            <ChevronDown className="w-3 h-3 text-dark-muted" />
          </button>

          {isCategoryOpen && (
            <div className="absolute right-0 mt-1.5 w-56 py-1.5 bg-dark-card border border-dark-border rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 divide-y divide-dark-border/40">
              <div className="px-3 py-1 text-[11px] uppercase font-mono font-bold text-dark-muted">
                Filtrar Índice por:
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
                          ? 'bg-crimson/20 text-red-300 font-bold'
                          : 'text-slate-300 hover:bg-dark-pill hover:text-white'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-crimson' : 'text-dark-muted'}`} />
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
          <div className="absolute left-0 right-0 top-11 bg-dark-card border border-dark-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 divide-y divide-dark-border/60">
            {/* Elasticsearch Results Header */}
            <div className="px-3.5 py-2 bg-dark-bg/80 flex items-center justify-between text-[11px] text-dark-muted font-mono">
              <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                <Search className="w-3.5 h-3.5 text-crimson" />
                <span>Busca em: <strong className="text-white">{selectedFilter.label}</strong></span>
              </span>
              <span className="text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40 font-bold">
                Elasticsearch Indexer
              </span>
            </div>

            {/* Results Items List */}
            <div className="max-h-96 overflow-y-auto p-2 space-y-1.5 divide-y divide-dark-border/40">
              {searchResults.length === 0 ? (
                <div className="text-xs text-dark-muted px-3 py-4 text-center">
                  Nenhum resultado encontrado para &ldquo;{searchQuery}&rdquo; na categoria {selectedFilter.label}.
                </div>
              ) : (
                searchResults.map((item) => {
                  const getBadge = (type: string) => {
                    switch (type) {
                      case 'CASE':
                        return { label: 'Processo', bg: 'bg-sky-950/50', text: 'text-sky-300', border: 'border-sky-800/40' };
                      case 'CASE_DOCUMENT':
                        return { label: 'Peça', bg: 'bg-indigo-950/50', text: 'text-indigo-300', border: 'border-indigo-800/40' };
                      case 'HEARING_TRANSCRIPT':
                        return { label: 'Depoimento', bg: 'bg-crimson/15', text: 'text-red-300', border: 'border-crimson/30' };
                      case 'HEARING_CHAT':
                        return { label: 'Chat Audiência', bg: 'bg-rose-950/50', text: 'text-rose-300', border: 'border-rose-800/40' };
                      case 'NOTEBOOK_CONVERSATION':
                        return { label: 'Caderno IA', bg: 'bg-purple-950/50', text: 'text-purple-300', border: 'border-purple-800/40' };
                      case 'AGENT_CONVERSATION':
                        return { label: 'Gemini Enterprise', bg: 'bg-teal-950/50', text: 'text-teal-300', border: 'border-teal-800/40' };
                      case 'AGENT_KNOWLEDGE':
                        return { label: 'Agente Garden', bg: 'bg-emerald-950/50', text: 'text-emerald-300', border: 'border-emerald-800/40' };
                      default:
                        return { label: 'Item', bg: 'bg-slate-900', text: 'text-slate-300', border: 'border-slate-700' };
                    }
                  };
                  const badge = getBadge(item.entityType);

                  return (
                    <Link
                      key={item.id}
                      href={item.targetUrl || '/'}
                      onClick={() => setIsSearchFocused(false)}
                      className="flex items-start justify-between p-2.5 rounded-xl hover:bg-dark-input transition-colors group gap-3 pt-2"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold uppercase font-mono border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {badge.label}
                          </span>

                          <span className="text-xs font-bold text-white group-hover:text-red-300 transition-colors font-mono truncate">
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
                            <span className="text-slate-400">Score: {item.score.toFixed(1)}</span>
                          )}
                        </div>
                      </div>

                      <ArrowRight className="w-3.5 h-3.5 text-dark-muted group-hover:text-white shrink-0 mt-1" />
                    </Link>
                  );
                })
              )}
            </div>

            {/* View Full Results Footer */}
            <div className="p-2.5 bg-dark-bg/80 flex items-center justify-between text-xs">
              <span className="text-[11px] text-dark-muted">
                Pressione <strong>Enter</strong> para abrir os autos
              </span>
              <button
                onClick={handleSearchSubmit}
                className="text-xs font-bold text-crimson hover:underline"
              >
                Ver todos os resultados
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: Notification Bell & Popover */}
      <div className="relative flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => setIsNotifOpen(!isNotifOpen)}
          className={`relative p-2 rounded-xl border transition-colors ${
            isNotifOpen
              ? 'bg-crimson/20 border-crimson/50 text-white'
              : 'bg-dark-input hover:bg-dark-pill border-dark-border text-dark-muted hover:text-white'
          }`}
          title={`${unreadCount} Notificações Pendentes`}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-crimson text-white text-[11px] font-bold flex items-center justify-center shadow-lg ring-2 ring-dark-bg animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown Panel */}
        {isNotifOpen && (
          <div className="absolute right-0 top-12 w-80 sm:w-96 bg-dark-card border border-dark-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-4 py-3 border-b border-dark-border/80 flex items-center justify-between bg-dark-bg/60">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-crimson" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Notificações Judiciais</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-crimson/20 text-crimson text-[11px] font-semibold">
                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
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
                  <span>Ler todas</span>
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-dark-border/50">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-dark-muted">
                  Nenhuma notificação no momento.
                </div>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 transition-colors flex gap-3 items-start ${
                      !n.read ? 'bg-crimson/5 hover:bg-crimson/10' : 'hover:bg-dark-pill/40 opacity-75'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-dark-bg border border-dark-border shrink-0 mt-0.5">
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
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">{n.message}</p>
                      {n.actionUrl && (
                        <Link
                          href={n.actionUrl}
                          onClick={() => {
                            if (!n.read) markNotificationAsRead(n.id);
                            setIsNotifOpen(false);
                          }}
                          className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-crimson hover:underline"
                        >
                          <span>Acessar audiência</span>
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
