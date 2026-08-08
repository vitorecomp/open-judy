'use client';

import React, { useState } from 'react';
import {
  Search,
  ChevronDown,
  Bell,
  Menu,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

interface HeaderProps {
  title?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onToggleSidebar?: () => void;
}

export default function Header({
  title = 'Dashboard',
  isCollapsed = false,
  onToggleCollapse,
  onToggleSidebar,
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Audiências');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

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

      {/* Center: Centralized Search Bar and Dropdown (Audiências) */}
      <div className="flex-1 max-w-xl mx-auto hidden md:flex items-center justify-center gap-2">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-dark-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Pesquisar audiências, termos, oradores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 bg-dark-input hover:bg-dark-pill border border-dark-border rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson transition-all duration-150"
          />
        </div>

        {/* Category Dropdown (Audiências only) */}
        <div className="relative shrink-0">
          <button
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-xs font-medium text-slate-200 transition"
          >
            <span>{filterCategory}</span>
            <ChevronDown className="w-3 h-3 text-dark-muted" />
          </button>

          {isCategoryOpen && (
            <div className="absolute right-0 mt-1 w-36 py-1 bg-dark-card border border-dark-border rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95">
              {['Audiências'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setFilterCategory(cat);
                    setIsCategoryOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-white bg-dark-pill/60 hover:bg-dark-pill transition font-medium"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Notification Bell */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          className="relative p-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition"
          title="3 Notificações"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-crimson ring-2 ring-dark-bg" />
        </button>
      </div>
    </header>
  );
}
