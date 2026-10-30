'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Scale,
  Settings,
  SlidersHorizontal,
  Bot,
  Layers,
  BookOpen,
  ShieldCheck,
  Landmark,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
}

export default function Sidebar({
  isOpen,
  onClose,
  isCollapsed = false,
}: SidebarProps) {
  const pathname = usePathname();
  const {
    user,
    role,
    permissions,
    systemName,
    logoUrl,
    switchProfile,
    availablePresets,
    currentPreset,
  } = useAuth();
  const isAdmin = role === 'ADMIN' || permissions.canEditSystemConfig;

  const navItems: NavItem[] = [
    {
      name: 'Gabinete & Expediente',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      name: 'Autos Processuais',
      href: '/cases',
      icon: Layers,
      active: pathname.startsWith('/cases'),
    },
    {
      name: 'Pauta de Audiências',
      href: '/hearings',
      icon: Scale,
      active: pathname.startsWith('/hearings'),
    },
    {
      name: 'Cadernos de Instrução',
      href: '/notebooks',
      icon: BookOpen,
      active: pathname.startsWith('/notebooks'),
    },
    {
      name: 'Assessoria Jurisdicional',
      href: '/agents',
      icon: Bot,
      active: pathname.startsWith('/agents'),
    },
    ...(isAdmin
      ? [
          {
            name: 'Corregedoria & Auditoria',
            href: '/audit',
            icon: ShieldCheck,
            active: pathname.startsWith('/audit'),
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 bg-dark-sidebar border-r border-dark-border flex flex-col justify-between transition-[width,transform] duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Section */}
        <div>
          {/* Institutional Tribunal Brand Header */}
          <div className="relative h-16 border-b border-dark-border bg-dark-bg/40">
            <Link
              href="/"
              className={`h-full flex items-center group min-w-0 ${
                isCollapsed ? 'justify-center w-full px-0' : 'px-3.5 gap-3'
              }`}
            >
              {/* Sovereign Institutional Emblem (Judicial Navy & Brass) */}
              <div className="w-10 h-10 rounded-lg bg-crimson/15 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-sm relative">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={systemName || 'Poder Judiciário'}
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  <Landmark className="w-5 h-5 text-amber-400" />
                )}
              </div>

              {/* Institutional Header Title */}
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 truncate">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 truncate">
                    PODER JUDICIÁRIO
                  </span>
                  <span className="font-judicial-serif font-bold text-sm text-white tracking-tight truncate">
                    SISTEMA {(systemName || 'OPEN JUDY').toUpperCase()} • CNJ
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* Main Navigation Links */}
          <nav className="px-2.5 py-3 space-y-1">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  href={item.href}
                  onClick={onClose}
                  title={isCollapsed ? item.name : undefined}
                  aria-label={item.name}
                  className={`flex items-center rounded-lg text-xs font-medium transition-colors group relative min-h-[36px] border ${
                    isCollapsed
                      ? 'justify-center p-2.5'
                      : 'justify-between px-3 py-2'
                  } ${
                    item.active
                      ? 'bg-crimson text-white border-crimson/80 shadow-sm font-semibold'
                      : 'border-transparent text-dark-muted hover:text-white hover:bg-dark-pill/60'
                  }`}
                >
                  <div
                    className={`flex items-center gap-3 ${
                      isCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        item.active
                          ? 'text-white'
                          : 'text-dark-muted group-hover:text-white'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Governance, Credentials, Current Magistrate/Server Profile */}
        <div className="p-2.5 border-t border-dark-border space-y-2 bg-dark-bg/30">
          <div className="space-y-1">
            <Link
              href="/settings"
              onClick={onClose}
              title={isCollapsed ? 'Credenciais & Gabinete' : undefined}
              aria-label="Credenciais & Gabinete"
              className={`w-full flex items-center rounded-lg text-xs font-medium transition-colors min-h-[36px] border ${
                isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
              } ${
                pathname.startsWith('/settings')
                  ? 'bg-crimson text-white border-crimson/80 shadow-sm font-semibold'
                  : 'border-transparent text-dark-muted hover:text-white hover:bg-dark-pill/60'
              }`}
            >
              <Settings
                className={`w-4 h-4 shrink-0 ${
                  pathname.startsWith('/settings') ? 'text-white' : 'text-dark-muted'
                }`}
              />
              {!isCollapsed && <span className="truncate">Credenciais &amp; Gabinete</span>}
            </Link>

            {/* ADMIN ONLY TRIBUNAL PARAMETERS LINK */}
            {isAdmin && (
              <Link
                href="/config"
                onClick={onClose}
                title={isCollapsed ? 'Parâmetros do Tribunal (Admin)' : undefined}
                aria-label="Parâmetros do Tribunal (Admin)"
                className={`w-full flex items-center rounded-lg text-xs font-bold transition-colors shadow-sm min-h-[36px] border ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
                } ${
                  pathname.startsWith('/config')
                    ? 'bg-crimson text-white border-crimson/80 shadow-sm'
                    : 'text-crimson-light hover:text-white bg-crimson/10 hover:bg-crimson/20 border-crimson/30'
                }`}
              >
                <SlidersHorizontal
                  className={`w-4 h-4 shrink-0 ${
                    pathname.startsWith('/config') ? 'text-white' : 'text-crimson'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Parâmetros do Tribunal</span>}
              </Link>
            )}
          </div>

          {/* Official Magistrate / Court Officer Credential Card */}
          <div className="pt-2 border-t border-dark-border/60">
            <Link
              href="/settings?tab=ui"
              onClick={onClose}
              aria-label="Abrir credenciais e preferências do gabinete"
              className={`w-full text-left flex items-center rounded-lg bg-dark-card/90 hover:bg-dark-card border transition-colors ${
                pathname.startsWith('/settings')
                  ? 'border-crimson/60 bg-dark-card'
                  : 'border-dark-border hover:border-crimson/40'
              } ${
                isCollapsed ? 'justify-center p-2' : 'gap-2.5 p-2'
              }`}
              title={
                isCollapsed
                  ? `${user.fullName} (${role}) — Credenciais & Gabinete`
                  : 'Abrir Credenciais & Gabinete'
              }
            >
              <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 border border-amber-500/40 bg-dark-input flex items-center justify-center">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-crimson flex items-center justify-center text-white font-bold text-xs">
                    {user.fullName.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {user.fullName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${currentPreset.badgeColor}`}
                    >
                      {role}
                    </span>
                    <span className="text-[11px] text-dark-muted truncate">
                      {currentPreset.title}
                    </span>
                  </div>
                </div>
              )}
            </Link>

            {/* Quick Institutional Role Switcher */}
            {!isCollapsed && (
              <div className="mt-2 grid grid-cols-4 gap-1 px-0.5">
                {availablePresets.map((p) => (
                  <button
                    type="button"
                    key={p.username}
                    onClick={() => switchProfile(p.role)}
                    aria-label={`Alternar perfil para ${p.name}`}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors whitespace-nowrap text-center touch-target-expand ${
                      role === p.role
                        ? 'bg-crimson text-white shadow-sm'
                        : 'text-dark-muted hover:text-white hover:bg-dark-pill'
                    }`}
                    title={p.name}
                  >
                    {p.role === 'MAGISTRADO'
                      ? 'Juíza'
                      : p.role === 'ASSESSOR'
                      ? 'Assessor'
                      : p.role === 'ADMIN'
                      ? 'Admin'
                      : 'Advogado'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
