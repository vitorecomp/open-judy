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
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import JudyLogo from './JudyLogo';

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
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const {
    user,
    role,
    permissions,
    systemName,
    logoUrl,
    openPreferencesWithTab,
    openAdminConfig,
    switchProfile,
    availablePresets,
    currentPreset,
  } = useAuth();
  const isAdmin = role === 'ADMIN' || permissions.canEditSystemConfig;

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      name: 'Processos',
      href: '/cases',
      icon: Layers,
      active: pathname.startsWith('/cases'),
    },
    {
      name: 'Audiências',
      href: '/hearings',
      icon: Scale,
      active: pathname.startsWith('/hearings'),
    },
    {
      name: 'Cadernos',
      href: '/notebooks',
      icon: BookOpen,
      active: pathname.startsWith('/notebooks'),
    },
    {
      name: 'Agent Garden',
      href: '/agents',
      icon: Bot,
      active: pathname.startsWith('/agents'),
    },
    ...(isAdmin
      ? [
          {
            name: 'Auditoria & Tasks',
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
          {/* Brand Header */}
          <div className="relative h-16 border-b border-dark-border/60">
          <Link
            href="/"
            className={`h-full flex items-center group min-w-0 ${
              isCollapsed ? 'justify-center w-full px-0' : 'px-4 gap-3'
            }`}
          >
            {/* Hanging Top Banner */}
            <div
              className={`absolute top-0 ${
                isCollapsed ? 'left-1/2 -translate-x-1/2' : 'left-4'
              } transition-transform duration-300 z-10`}
            >
              <JudyLogo
                size="md"
                showText={false}
                systemName={systemName}
                logoUrl={logoUrl}
              />
            </div>

            {/* Brand Title */}
            {!isCollapsed && (
              <div className="pl-14 flex flex-col min-w-0 truncate">
                <span className="font-bold text-base text-white tracking-tight truncate">
                  {systemName || 'Open Judy'}
                </span>
              </div>
            )}
          </Link>
        </div>

          {/* Main Navigation Links (Dashboard & Audiências only) */}
          <nav className="px-2.5 py-4 space-y-1.5">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  href={item.href}
                  onClick={onClose}
                  title={isCollapsed ? item.name : undefined}
                  aria-label={item.name}
                  className={`flex items-center rounded-xl text-xs font-medium transition-colors group relative min-h-[36px] ${
                    isCollapsed
                      ? 'justify-center p-2.5'
                      : 'justify-between px-3 py-2.5'
                  } ${
                    item.active
                      ? 'bg-dark-pill text-white shadow-sm'
                      : 'text-dark-muted hover:text-white hover:bg-dark-pill/50'
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

        {/* Bottom Section: Support, Settings, Current User Profile */}
        <div className="p-2.5 border-t border-dark-border/60 space-y-2">
          <div className="space-y-1">
            <Link
              href="/settings"
              onClick={onClose}
              title={isCollapsed ? 'Preferências' : undefined}
              aria-label="Abrir Preferências"
              className={`w-full flex items-center rounded-xl text-xs font-medium transition-colors min-h-[36px] ${
                isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
              } ${
                pathname.startsWith('/settings')
                  ? 'bg-dark-pill text-white shadow-sm'
                  : 'text-dark-muted hover:text-white hover:bg-dark-pill/50'
              }`}
            >
              <Settings
                className={`w-4 h-4 shrink-0 ${
                  pathname.startsWith('/settings') ? 'text-white' : 'text-dark-muted'
                }`}
              />
              {!isCollapsed && <span className="truncate">Preferências</span>}
            </Link>

            {/* ADMIN ONLY SYSTEM CONFIGURATION LINK */}
            {isAdmin && (
              <Link
                href="/config"
                onClick={onClose}
                title={isCollapsed ? 'Configurações do Sistema (Admin)' : undefined}
                aria-label="Configurações do Sistema (Admin)"
                className={`w-full flex items-center rounded-xl text-xs font-bold transition-colors shadow-sm min-h-[36px] border ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
                } ${
                  pathname.startsWith('/config')
                    ? 'bg-emerald-900/50 text-emerald-200 border-emerald-500/60'
                    : 'text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-800/40'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-emerald-400 shrink-0" />
                {!isCollapsed && <span className="truncate">Configurações do Sistema</span>}
              </Link>
            )}
          </div>

          {/* User Profile Card with Profile Switcher */}
          <div className="pt-2 border-t border-dark-border/40">
            <Link
              href="/settings?tab=ui"
              onClick={onClose}
              aria-label="Abrir preferências do usuário"
              className={`w-full text-left flex items-center rounded-xl bg-dark-card/80 hover:bg-dark-card border transition-colors ${
                pathname.startsWith('/settings')
                  ? 'border-crimson/60 bg-dark-card'
                  : 'border-dark-border hover:border-crimson/40'
              } ${
                isCollapsed ? 'justify-center p-2' : 'gap-3 p-2'
              }`}
              title={isCollapsed ? `${user.fullName} (${role}) — Preferências` : 'Abrir Preferências do Usuário'}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-dark-border">
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

            {/* Quick Profile Switcher */}
            {!isCollapsed && (
              <div className="mt-2 flex items-center justify-between gap-1 px-0.5 flex-nowrap whitespace-nowrap">
                <span className="text-[11px] text-dark-muted font-medium shrink-0">Perfil:</span>
                <div className="flex items-center gap-1 flex-nowrap justify-end min-w-0">
                  {availablePresets.map((p) => (
                    <button
                      type="button"
                      key={p.username}
                      onClick={() => switchProfile(p.role)}
                      aria-label={`Alternar perfil para ${p.name}`}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 touch-target-expand ${
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
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
