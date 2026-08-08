'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Headphones,
  Settings,
  Scale,
  Briefcase,
  ShieldAlert,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Server
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
  href?: string;
  onClick?: () => void;
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
  const { user, role, permissions, currentPreset, openPreferencesWithTab, switchProfile, availablePresets } = useAuth();

  const baseNavItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      name: 'Audiências',
      href: '/#hearings-table',
      icon: Scale,
      badge: '5',
      active: pathname.startsWith('/hearings'),
    },
    {
      name: 'Minutas de Atas',
      href: '#',
      icon: FileText,
      badge: role === 'MAGISTRADO' ? '2' : '3',
      active: false,
    },
    {
      name: 'Processos & Varas',
      href: '#',
      icon: Briefcase,
      active: false,
    },
    {
      name: 'Pauta do Gabinete',
      href: '#',
      icon: Calendar,
      active: false,
    },
  ];

  // Admin-only nav items
  const adminNavItems: NavItem[] = (permissions.canEditSystemConfig || permissions.canManageUsers || role === 'ADMIN')
    ? [
        {
          name: 'Configurações do Sistema',
          onClick: () => openPreferencesWithTab('system'),
          icon: Server,
          badge: 'Admin',
          active: false,
        },
        {
          name: 'Gestão de Usuários (IAP)',
          href: '#',
          icon: UserCog,
          badge: 'Admin',
          active: false,
        },
        {
          name: 'Logs de Auditoria',
          href: '#',
          icon: ShieldAlert,
          active: false,
        },
      ]
    : [];

  const navItems: NavItem[] = [...baseNavItems, ...adminNavItems];

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
        {/* Brand Header */}
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-dark-border/60">
            <Link
              href="/"
              className={`flex items-center gap-3 group min-w-0 ${
                isCollapsed ? 'justify-center w-full' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-crimson shrink-0 flex items-center justify-center text-white font-black text-base shadow-md shadow-crimson/30 group-hover:scale-105 transition-transform">
                <span>J</span>
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 truncate">
                  <span className="font-bold text-base text-white tracking-tight truncate">
                    Open Judy
                  </span>
                  <span className="text-[10px] text-dark-muted font-medium -mt-0.5 truncate">
                    IA Judiciária Zero-Trust
                  </span>
                </div>
              )}
            </Link>

            {/* Desktop Collapse / Expand Toggle Button */}
            {!isCollapsed && onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-lg text-dark-muted hover:text-white hover:bg-dark-pill transition"
                title="Recolher barra lateral"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Expand Button when collapsed */}
          {isCollapsed && onToggleCollapse && (
            <div className="hidden lg:flex justify-center py-2 border-b border-dark-border/30">
              <button
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-dark-muted hover:text-white hover:bg-dark-pill transition"
                title="Expandir barra lateral"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Main Navigation Links */}
          <nav className="px-2.5 py-4 space-y-1.5">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const handleClick = (e: React.MouseEvent) => {
                if (item.onClick) {
                  e.preventDefault();
                  item.onClick();
                }
                if (onClose) onClose();
              };

              return (
                <Link
                  key={idx}
                  href={item.href || '#'}
                  onClick={handleClick}
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
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full text-white shadow-sm shrink-0 ${
                          item.badge === 'Admin' ? 'bg-emerald-600/90 shadow-emerald-600/30' : 'bg-crimson/80 shadow-crimson/30'
                        }`}>
                          {item.badge}
                        </span>
                      ) : (
                        <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-dark-sidebar ${
                          item.badge === 'Admin' ? 'bg-emerald-500' : 'bg-crimson'
                        }`} />
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

            {/* Quick Profile Switcher for Pair Programming & Testing */}
            {!isCollapsed && (
              <div className="mt-2 flex items-center justify-between gap-1 px-1">
                <span className="text-[9px] text-dark-muted font-semibold uppercase">Alternar Perfil:</span>
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
