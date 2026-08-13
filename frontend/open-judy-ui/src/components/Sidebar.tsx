'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Scale,
  Headphones,
  Settings,
  SlidersHorizontal,
  Bot,
  Layers,
  BookOpen
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
  badge?: string;
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
    systemTagline,
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
      badge: '3',
      active: pathname.startsWith('/cases'),
    },
    {
      name: 'Audiências',
      href: '/hearings',
      icon: Scale,
      badge: '5',
      active: pathname.startsWith('/hearings'),
    },
    {
      name: 'Cadernos',
      href: '/notebooks',
      icon: BookOpen,
      badge: 'Novo',
      active: pathname.startsWith('/notebooks'),
    },
    {
      name: 'Agent Garden',
      href: '/agents',
      icon: Bot,
      badge: 'Gemini',
      active: pathname.startsWith('/agents'),
    },
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
        className={`fixed top-0 left-0 bottom-0 z-50 bg-dark-sidebar border-r border-dark-border flex flex-col justify-between transition-all duration-300 ease-in-out ${
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
              } transition-all duration-300 z-10`}
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
                  className={`flex items-center rounded-xl text-xs font-medium transition-all group relative ${
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

                  {/* Badge */}
                  {item.badge && (
                    <>
                      {!isCollapsed ? (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-crimson/80 text-white shadow-sm shadow-crimson/30 shrink-0">
                          {item.badge}
                        </span>
                      ) : (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-crimson ring-2 ring-dark-sidebar" />
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Support, Settings, Current User Profile */}
        <div className="p-2.5 border-t border-dark-border/60 space-y-2">
          <div className="space-y-0.5">
            <button
              title={isCollapsed ? 'Suporte Judiciário' : undefined}
              className={`w-full flex items-center rounded-xl text-xs font-medium text-dark-muted hover:text-white hover:bg-dark-pill/50 transition ${
                isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
              }`}
            >
              <Headphones className="w-4 h-4 text-dark-muted shrink-0" />
              {!isCollapsed && <span className="truncate">Suporte Judiciário</span>}
            </button>
            <button
              onClick={() => openPreferencesWithTab('ui')}
              title={isCollapsed ? 'Preferências' : undefined}
              className={`w-full flex items-center rounded-xl text-xs font-medium text-dark-muted hover:text-white hover:bg-dark-pill/50 transition ${
                isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
              }`}
            >
              <Settings className="w-4 h-4 text-dark-muted shrink-0" />
              {!isCollapsed && <span className="truncate">Preferências</span>}
            </button>

            {/* ADMIN ONLY SYSTEM CONFIGURATION BUTTON */}
            {isAdmin && (
              <button
                onClick={() => openAdminConfig('prompts')}
                title={isCollapsed ? 'Configurações do Sistema (Admin)' : undefined}
                className={`w-full flex items-center rounded-xl text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-800/40 transition shadow-sm ${
                  isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400 shrink-0" />
                  {!isCollapsed && <span className="truncate">Configurações do Sistema</span>}
                </div>
                {!isCollapsed && (
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                    Admin
                  </span>
                )}
              </button>
            )}
          </div>

          {/* User Profile Card with Profile Switcher */}
          <div className="pt-2 border-t border-dark-border/40">
            <div
              className={`flex items-center rounded-xl bg-dark-card/80 border border-dark-border transition-all ${
                isCollapsed ? 'justify-center p-2' : 'gap-3 p-2'
              }`}
              title={isCollapsed ? `${user.fullName} (${role})` : undefined}
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
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider border ${currentPreset.badgeColor}`}
                    >
                      {role}
                    </span>
                    <span className="text-[9px] text-dark-muted truncate">
                      {currentPreset.title}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Profile Switcher */}
            {!isCollapsed && (
              <div className="mt-2 flex items-center justify-between gap-1 px-1">
                <span className="text-[9px] text-dark-muted font-semibold uppercase">Perfil:</span>
                <div className="flex items-center gap-1">
                  {availablePresets.map((p) => (
                    <button
                      key={p.username}
                      onClick={() => switchProfile(p.role)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition ${
                        role === p.role
                          ? 'bg-crimson text-white shadow-sm'
                          : 'text-dark-muted hover:text-white hover:bg-dark-pill'
                      }`}
                      title={p.name}
                    >
                      {p.role === 'MAGISTRADO' ? 'Juíza' : p.role === 'ASSESSOR' ? 'Assessor' : 'Admin'}
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
