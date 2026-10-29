'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, applyAccentColorToDOM, applyThemeToDOM } from '@/lib/auth-context';
import { UserConfiguration, SystemConfiguration } from '@/lib/types';
import {
  X,
  Settings,
  Sun,
  Moon,
  Monitor,
  Volume2,
  Sparkles,
  Bell,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Save,
  CheckCircle2,
  Server,
  ShieldCheck,
  Database,
  Cpu,
  Lock,
  Palette,
  KeyRound,
  LayoutGrid,
  UserCheck,
} from 'lucide-react';

interface UserPreferencesModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialTab?: 'ui' | 'audio' | 'ai' | 'notifications' | 'system';
  mode?: 'modal' | 'page';
}

export default function UserPreferencesModal({
  isOpen = true,
  onClose = () => {},
  initialTab = 'ui',
  mode = 'page',
}: UserPreferencesModalProps) {
  const {
    user,
    config,
    updateConfig,
    resetConfig,
    systemConfig,
    updateSystemConfig,
    role,
    permissions,
    availablePresets,
    currentPreset,
    switchProfile,
    preferencesInitialTab,
    accentColor,
    setIsKeycloakModalOpen,
  } = useAuth();
  const isPage = mode === 'page';

  const [activeTab, setActiveTab] = useState<'ui' | 'audio' | 'ai' | 'notifications' | 'system'>('ui');
  const [formData, setFormData] = useState<UserConfiguration>(config);
  const [sysFormData, setSysFormData] = useState<SystemConfiguration>(systemConfig);
  const [selectedAccent, setSelectedAccent] = useState<string>(config.accentColor || accentColor || '#e63946');
  const [customHex, setCustomHex] = useState<string>(config.accentColor || accentColor || '#e63946');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const isAdmin = role === 'ADMIN' || permissions.canEditSystemConfig;

  useEffect(() => {
    if (!isOpen && !isPage) return;
    setFormData(config);
    setSysFormData(systemConfig);
    const color = config.accentColor || systemConfig.accentColor || accentColor || '#e63946';
    setSelectedAccent(color);
    setCustomHex(color);
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (preferencesInitialTab) {
      setActiveTab(preferencesInitialTab);
    }
  }, [isOpen, isPage, preferencesInitialTab, initialTab, config, systemConfig, accentColor]);

  if (!isOpen && !isPage) return null;

  const handleChangeTheme = (theme: 'DARK' | 'LIGHT' | 'SYSTEM') => {
    setFormData((prev) => ({ ...prev, theme }));
    applyThemeToDOM(theme);
    void updateConfig({ theme });
  };

  const handleSelectAccent = (color: string) => {
    setSelectedAccent(color);
    setCustomHex(color);
    setFormData((prev) => ({ ...prev, accentColor: color }));
    setSysFormData((prev) => ({ ...prev, accentColor: color }));
    applyAccentColorToDOM(color);
  };

  const handleCustomHexChange = (hex: string) => {
    setCustomHex(hex);
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
      setSelectedAccent(hex);
      setFormData((prev) => ({ ...prev, accentColor: hex }));
      setSysFormData((prev) => ({ ...prev, accentColor: hex }));
      applyAccentColorToDOM(hex);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateConfig(formData);
      if (isAdmin) {
        await updateSystemConfig(sysFormData);
      }
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        if (!isPage) onClose();
      }, 2000);
    } catch (err) {
      console.error('Falha ao salvar configurações:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Deseja realmente restaurar todas as configurações para o padrão do sistema?')) {
      setIsSaving(true);
      try {
        await resetConfig();
        setSavedSuccess(true);
        setTimeout(() => {
          setSavedSuccess(false);
          if (!isPage) onClose();
        }, 2000);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className={
        isPage
          ? 'w-full max-w-none flex-1 flex flex-col space-y-6 min-h-[calc(100vh-6rem)]'
          : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in'
      }
    >
      {/* Full-Width Top Page Header */}
      <div className="w-full flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-dark-muted mb-1">
            <Link href="/" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-crimson font-semibold">
              Preferências do Usuário &amp; Perfil RBAC
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5 flex-wrap">
            {activeTab === 'system' ? (
              <Server className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <Settings className="w-6 h-6 text-crimson shrink-0" />
            )}
            <span>
              {activeTab === 'system'
                ? 'Configurações Globais do Sistema Open Judy'
                : 'Preferências do Usuário, Perfil RBAC & Tema'}
            </span>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-dark-card text-dark-muted border border-dark-border">
              user-service :8085
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentPreset.badgeColor}`}>
              {role} • {user.fullName}
            </span>
          </h1>
          <p className="text-xs text-dark-muted mt-0.5">
            {activeTab === 'system'
              ? 'Gerencie parâmetros globais de infraestrutura, modelos Gemini, AlloyDB pgvector e retenção zero-trust'
              : 'Personalize o perfil RBAC simulado, aparência visual (Dark/Light/System), reprodução de áudio 60fps e automações judiciais'}
          </p>
        </div>

        {/* Full-Width Top Action Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                if (!isPage) onClose();
                setIsKeycloakModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-crimson/15 hover:bg-crimson/25 border border-crimson/40 text-xs font-bold text-white transition-colors min-h-[38px]"
              title="Autenticação Keycloak IAM (OIDC)"
            >
              <KeyRound className="w-3.5 h-3.5 text-crimson shrink-0" />
              <span>Keycloak IAM (OIDC)</span>
              <span className="px-1.5 py-0.5 rounded text-xs font-bold status-badge-success border">
                Admin
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dark-card hover:bg-dark-pill border border-dark-border text-xs font-semibold text-dark-muted hover:text-white transition-colors disabled:opacity-50 min-h-[38px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrões</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-colors disabled:opacity-50 min-h-[38px] ${
              activeTab === 'system'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
                : 'bg-crimson hover:bg-crimson-dark shadow-crimson/25'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {isSaving
                ? 'Salvando...'
                : activeTab === 'system'
                ? 'Salvar Sistema'
                : 'Salvar Preferências'}
            </span>
          </button>

          {!isPage && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-dark-muted hover:text-white hover:bg-dark-pill transition-colors min-h-[38px] min-w-[38px] touch-target-expand inline-flex items-center justify-center"
              title="Fechar"
              aria-label="Fechar preferências do usuário"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {savedSuccess && (
        <div className="w-full p-3.5 rounded-2xl status-badge-success border text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {activeTab === 'system'
                ? 'Configurações globais do sistema salvas com sucesso no user-service!'
                : 'Configurações e preferências do usuário salvas com sucesso!'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSavedSuccess(false)}
            className="text-emerald-300 hover:text-white text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Full-Width Section Navigation Strip */}
      <div className="w-full flex items-center justify-between gap-3 flex-wrap bg-dark-card border border-dark-border rounded-2xl p-2 shadow-lg">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('ui')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[38px] ${
              activeTab === 'ui'
                ? 'bg-crimson text-white shadow-sm'
                : 'text-dark-muted hover:text-white hover:bg-dark-input'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Interface, Perfil &amp; Tema</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[38px] ${
              activeTab === 'audio'
                ? 'bg-crimson text-white shadow-sm'
                : 'text-dark-muted hover:text-white hover:bg-dark-input'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Áudio &amp; Player Sincronizado</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[38px] ${
              activeTab === 'ai'
                ? 'bg-crimson text-white shadow-sm'
                : 'text-dark-muted hover:text-white hover:bg-dark-input'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>IA Gemini &amp; Automação</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[38px] ${
              activeTab === 'notifications'
                ? 'bg-crimson text-white shadow-sm'
                : 'text-dark-muted hover:text-white hover:bg-dark-input'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notificações &amp; Assinatura</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[38px] ${
                activeTab === 'system'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-300 hover:text-emerald-200 hover:bg-dark-input'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Configurações do Sistema</span>
              <span className="px-1.5 py-0.5 rounded text-[11px] font-extrabold uppercase bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                Admin
              </span>
            </button>
          )}
        </div>

        {isAdmin && (
          <Link
            href="/config?tab=prompts"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/50 text-xs font-bold text-emerald-300 hover:text-emerald-200 transition-colors min-h-[36px]"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ir para Painel de Prompts &amp; IA (/config)</span>
          </Link>
        )}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: UI, RBAC PROFILE & THEME (Full-Screen 12-Col Grid)             */}
      {/* ===================================================================== */}
      {activeTab === 'ui' && (
        <div className="w-full max-w-none flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Row 1 (12 cols): Active User Profile & Simulated RBAC Role Switcher */}
          <div className="lg:col-span-12 bg-dark-card border border-dark-border rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dark-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-crimson/15 border border-crimson/30 text-crimson flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Perfil &amp; Papel Simulado (RBAC Keycloak IAM)
                  </h2>
                  <p className="text-xs text-dark-muted">
                    Alterne em tempo real entre os perfis judiciais homologados para testar permissões de magistratura, assessoria, advocacia e administração TI.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-dark-muted">
                Sessão ativa: <strong className="text-white">{user.email}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {availablePresets.map((preset) => {
                const isActiveRole = role === preset.role;
                return (
                  <button
                    key={preset.username}
                    type="button"
                    onClick={() => switchProfile(preset.role)}
                    className={`p-4 rounded-xl border text-left transition-colors flex flex-col justify-between gap-3 cursor-pointer ${
                      isActiveRole
                        ? 'bg-dark-input border-crimson shadow-lg shadow-crimson/15 ring-1 ring-crimson'
                        : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/60 hover:bg-dark-input/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${preset.badgeColor}`}>
                        {preset.role}
                      </span>
                      {isActiveRole && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-crimson">
                          <Check className="w-4 h-4 shrink-0" />
                          <span>Ativo</span>
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white truncate">{preset.name}</p>
                      <p className="text-xs text-dark-muted truncate">{preset.title}</p>
                      <p className="text-[11px] font-mono text-slate-400 truncate">{preset.email}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2 Left (6 cols): Theme Selection */}
          <div className="lg:col-span-6 bg-dark-card border border-dark-border rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-1 border-b border-dark-border/60 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Tema Visual do Sistema</span>
              </h2>
              <p className="text-xs text-dark-muted">
                Escolha entre o modo escuro de sala de sessão, modo claro ou sincronização automática com o sistema operacional.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 items-stretch">
              {/* Dark Theme */}
              <div
                onClick={() => handleChangeTheme('DARK')}
                className={`p-4 rounded-xl border cursor-pointer transition-colors flex flex-col justify-between gap-4 ${
                  formData.theme === 'DARK'
                    ? 'bg-dark-input border-crimson shadow-md shadow-crimson/15 ring-1 ring-crimson'
                    : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-slate-200" />
                    <span className="text-xs font-bold text-white">Escuro (Dark)</span>
                  </div>
                  {formData.theme === 'DARK' && (
                    <div className="w-4 h-4 rounded-full bg-crimson flex items-center justify-center text-white text-[11px]">
                      ✓
                    </div>
                  )}
                </div>
                <div className="h-12 rounded-lg bg-[#0d0e12] border border-[#23252d] p-2 flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-crimson" />
                  <div className="h-2.5 w-14 rounded bg-[#25272e]" />
                  <div className="h-2.5 w-10 rounded bg-[#1e2026]" />
                </div>
              </div>

              {/* Light Theme */}
              <div
                onClick={() => handleChangeTheme('LIGHT')}
                className={`p-4 rounded-xl border cursor-pointer transition-colors flex flex-col justify-between gap-4 ${
                  formData.theme === 'LIGHT'
                    ? 'bg-dark-input border-crimson shadow-md shadow-crimson/15 ring-1 ring-crimson'
                    : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Claro (Light)</span>
                  </div>
                  {formData.theme === 'LIGHT' && (
                    <div className="w-4 h-4 rounded-full bg-crimson flex items-center justify-center text-white text-[11px]">
                      ✓
                    </div>
                  )}
                </div>
                <div className="h-12 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-2 flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-crimson" />
                  <div className="h-2.5 w-14 rounded bg-[#cbd5e1]" />
                  <div className="h-2.5 w-10 rounded bg-[#e2e8f0]" />
                </div>
              </div>

              {/* System Theme */}
              <div
                onClick={() => handleChangeTheme('SYSTEM')}
                className={`p-4 rounded-xl border cursor-pointer transition-colors flex flex-col justify-between gap-4 ${
                  formData.theme === 'SYSTEM'
                    ? 'bg-dark-input border-crimson shadow-md shadow-crimson/15 ring-1 ring-crimson'
                    : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-white">Automático</span>
                  </div>
                  {formData.theme === 'SYSTEM' && (
                    <div className="w-4 h-4 rounded-full bg-crimson flex items-center justify-center text-white text-[11px]">
                      ✓
                    </div>
                  )}
                </div>
                <div className="h-12 rounded-lg bg-dark-card border border-dark-border p-2 flex items-center justify-center text-[11px] text-dark-muted font-mono">
                  Sincronizado com SO
                </div>
              </div>
            </div>
          </div>

          {/* Row 2 Right (6 cols): Accent Color Selection */}
          <div className="lg:col-span-6 bg-dark-card border border-dark-border rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-1 border-b border-dark-border/60 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-crimson" />
                <span>Cor de Destaque do Sistema (Accent Color)</span>
              </h2>
              <p className="text-xs text-dark-muted">
                Personalize a cor primária de destaque aplicada em botões, indicadores ativos, timeline de vídeo e badges.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 items-stretch">
              {/* Preset 1: Teal */}
              <button
                type="button"
                onClick={() => handleSelectAccent('#0d9488')}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 transition-colors text-left ${
                  selectedAccent?.toLowerCase() === '#0d9488' || selectedAccent?.toLowerCase() === 'teal'
                    ? 'bg-dark-input border-teal-500 ring-2 ring-teal-500/50 shadow-md shadow-teal-500/10'
                    : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-[#0d9488] shrink-0 ring-2 ring-white/20 shadow" />
                  <span className="text-xs font-bold text-white truncate">Teal</span>
                </div>
                {(selectedAccent?.toLowerCase() === '#0d9488' || selectedAccent?.toLowerCase() === 'teal') && (
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                )}
              </button>

              {/* Preset 2: Red / Crimson */}
              <button
                type="button"
                onClick={() => handleSelectAccent('#e63946')}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 transition-colors text-left ${
                  selectedAccent?.toLowerCase() === '#e63946' || selectedAccent?.toLowerCase() === 'red'
                    ? 'bg-dark-input border-rose-500 ring-2 ring-rose-500/50 shadow-md shadow-rose-500/10'
                    : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-[#e63946] shrink-0 ring-2 ring-white/20 shadow" />
                  <span className="text-xs font-bold text-white truncate">Crimson</span>
                </div>
                {(selectedAccent?.toLowerCase() === '#e63946' || selectedAccent?.toLowerCase() === 'red') && (
                  <Check className="w-4 h-4 text-rose-400 shrink-0" />
                )}
              </button>

              {/* Preset 3: Orange */}
              <button
                type="button"
                onClick={() => handleSelectAccent('#ea580c')}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 transition-colors text-left ${
                  selectedAccent?.toLowerCase() === '#ea580c' || selectedAccent?.toLowerCase() === 'orange'
                    ? 'bg-dark-input border-orange-500 ring-2 ring-orange-500/50 shadow-md shadow-orange-500/10'
                    : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-[#ea580c] shrink-0 ring-2 ring-white/20 shadow" />
                  <span className="text-xs font-bold text-white truncate">Orange</span>
                </div>
                {(selectedAccent?.toLowerCase() === '#ea580c' || selectedAccent?.toLowerCase() === 'orange') && (
                  <Check className="w-4 h-4 text-orange-400 shrink-0" />
                )}
              </button>

              {/* Custom Hex Color Option */}
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 transition-colors ${
                  selectedAccent &&
                  !['#0d9488', '#e63946', '#ea580c', 'teal', 'red', 'orange'].includes(selectedAccent.toLowerCase())
                    ? 'bg-dark-input border-crimson ring-2 ring-crimson/50'
                    : 'bg-dark-bg/60 border-dark-border'
                }`}
              >
                <input
                  type="color"
                  value={customHex.startsWith('#') && (customHex.length === 7 || customHex.length === 4) ? customHex : '#e63946'}
                  onChange={(e) => handleCustomHexChange(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 shrink-0 p-0"
                  title="Escolher cor personalizada"
                  aria-label="Escolher cor personalizada de destaque"
                />
                <input
                  type="text"
                  value={customHex}
                  onChange={(e) => handleCustomHexChange(e.target.value)}
                  placeholder="#HEX"
                  aria-label="Código hexadecimal da cor de destaque"
                  className="w-full bg-transparent text-xs font-mono text-white focus:outline-none uppercase"
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          {/* Row 3 Left (7 cols): Font Size, Landing Page & Hearings View Mode */}
          <div className="lg:col-span-7 bg-dark-card border border-dark-border rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-1 border-b border-dark-border/60 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-sky-400" />
                <span>Tipografia, Navegação &amp; Modos de Visualização Padrão</span>
              </h2>
              <p className="text-xs text-dark-muted">
                Defina a escala tipográfica de leitura forense, tela inicial padrão e o layout das pautas de audiência.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tamanho da Fonte
                </label>
                <select
                  value={formData.fontSize}
                  onChange={(e) => setFormData({ ...formData, fontSize: e.target.value })}
                  aria-label="Selecionar tamanho da fonte"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-crimson min-h-[40px]"
                >
                  <option value="SMALL">Pequeno (Compacto - 13px)</option>
                  <option value="MEDIUM">Médio (Padrão - 14px)</option>
                  <option value="LARGE">Grande (Confortável - 16px)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Página Inicial Padrão
                </label>
                <select
                  value={formData.defaultLandingPage}
                  onChange={(e) => setFormData({ ...formData, defaultLandingPage: e.target.value })}
                  aria-label="Selecionar página inicial padrão"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-crimson min-h-[40px]"
                >
                  <option value="DASHBOARD">Dashboard Geral</option>
                  <option value="HEARINGS">Pauta de Audiências</option>
                  <option value="CASES">Processos &amp; Varas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Visualização das Audiências
                </label>
                <select
                  value={formData.hearingsViewMode || 'TABLE'}
                  onChange={(e) =>
                    setFormData({ ...formData, hearingsViewMode: e.target.value as 'TABLE' | 'CARDS' })
                  }
                  aria-label="Selecionar modo de visualização das audiências"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-crimson min-h-[40px]"
                >
                  <option value="TABLE">Tabela de Dados</option>
                  <option value="CARDS">Grade de Cards</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 3 Right (5 cols): Accessibility & Density Toggles */}
          <div className="lg:col-span-5 bg-dark-card border border-dark-border rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-1 border-b border-dark-border/60 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Acessibilidade &amp; Densidade de Dados</span>
              </h2>
              <p className="text-xs text-dark-muted">
                Ajustes de contraste WCAG AAA e compactação de linhas em tabelas processuais.
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition-colors">
                <div>
                  <span className="text-xs font-bold text-white block">Alto Contraste</span>
                  <span className="text-[11px] text-dark-muted">
                    Aumenta o contraste das bordas e texto para acessibilidade
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.highContrast}
                  onChange={(e) => setFormData({ ...formData, highContrast: e.target.checked })}
                  className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition-colors">
                <div>
                  <span className="text-xs font-bold text-white block">Modo Compacto de Listagem</span>
                  <span className="text-[11px] text-dark-muted">
                    Reduz o espaçamento vertical em tabelas e listas de audiência
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.compactView}
                  onChange={(e) => setFormData({ ...formData, compactView: e.target.checked })}
                  className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: AUDIO & PLAYER (Full-Screen 12-Col Grid)                       */}
      {/* ===================================================================== */}
      {activeTab === 'audio' && (
        <div className="w-full max-w-none flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-6 bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-5">
            <div className="space-y-1 border-b border-dark-border/60 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-crimson" />
                <span>Velocidade Padrão de Reprodução &amp; Motor 60fps</span>
              </h2>
              <p className="text-xs text-dark-muted">
                Defina a velocidade inicial ao abrir gravações judiciais de vídeo e áudio na Sala de Sessão.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setFormData({ ...formData, playbackRate: rate })}
                  className={`py-3.5 rounded-xl text-sm font-bold border transition-colors tabular-nums cursor-pointer ${
                    formData.playbackRate === rate
                      ? 'bg-crimson text-white border-crimson shadow-md shadow-crimson/25'
                      : 'bg-dark-bg border-dark-border text-dark-muted hover:text-white hover:bg-dark-pill'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-dark-bg/70 border border-dark-border text-xs text-dark-muted space-y-1">
              <p className="font-bold text-slate-200">Sincronia Broadcast 60fps Ativa</p>
              <p className="text-[11px] leading-relaxed">
                O player utiliza <code>requestVideoFrameCallback</code> e loop de 60fps com ajuste fino de offset (<code>±0.1s</code>) por audiência.
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-1 border-b border-dark-border/60 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Automação de Transcrição, Waveform &amp; Silêncio</span>
              </h2>
              <p className="text-xs text-dark-muted">
                Configure o acompanhamento visual da transcrição diarizada durante a reprodução.
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition-colors">
                <div>
                  <span className="text-xs font-bold text-white block">Auto-scroll da Transcrição</span>
                  <span className="text-[11px] text-dark-muted">
                    Rola automaticamente a lista para o orador ativo durante a reprodução
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoScrollTranscript}
                  onChange={(e) => setFormData({ ...formData, autoScrollTranscript: e.target.checked })}
                  className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition-colors">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Visualizar Forma de Onda (Waveform)
                  </span>
                  <span className="text-[11px] text-dark-muted">
                    Exibe equalizador e forma de onda estilizável no player de áudio
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.showWaveform}
                  onChange={(e) => setFormData({ ...formData, showWaveform: e.target.checked })}
                  className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition-colors">
                <div>
                  <span className="text-xs font-bold text-white block">Pular Trechos em Silêncio</span>
                  <span className="text-[11px] text-dark-muted">
                    Avança automaticamente pausas sem fala nas sessões de instrução
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.skipSilence}
                  onChange={(e) => setFormData({ ...formData, skipSilence: e.target.checked })}
                  className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: AI & GEMINI (Full-Screen 12-Col Grid)                          */}
      {/* ===================================================================== */}
      {activeTab === 'ai' && (
        <div className="w-full max-w-none flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-6 bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-1 border-b border-dark-border/60 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-crimson" />
                <span>Automação de Minutas &amp; Detector RAG de Contradições</span>
              </h2>
              <p className="text-xs text-dark-muted">
                Acione agentes jurídicos automaticamente após a conclusão da transcrição de cada audiência.
              </p>
            </div>

            <div className="space-y-3 flex-1">
              <label className="p-4 rounded-xl bg-dark-input/60 border border-dark-border flex items-center justify-between cursor-pointer hover:bg-dark-input transition-colors">
                <div>
                  <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-crimson" />
                    Gerar Minuta de Ata Automaticamente
                  </span>
                  <span className="text-[11px] text-dark-muted">
                    Aciona o Gemini 4 Argon para redigir o termo imediatamente após a conclusão da transcrição
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoGenerateAtaDraft}
                  onChange={(e) => setFormData({ ...formData, autoGenerateAtaDraft: e.target.checked })}
                  className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>

              <label className="p-4 rounded-xl bg-dark-input/60 border border-dark-border flex items-center justify-between cursor-pointer hover:bg-dark-input transition-colors">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Detector Automático de Contradições
                  </span>
                  <span className="text-[11px] text-dark-muted">
                    Compara depoimentos e identifica divergências factuais em tempo real via RAG
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoDetectContradictions}
                  onChange={(e) =>
                    setFormData({ ...formData, autoDetectContradictions: e.target.checked })
                  }
                  className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>
            </div>
          </div>

          <div className="lg:col-span-6 bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-5">
            <div className="space-y-1 border-b border-dark-border/60 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                <span>Parâmetros de Redação Judicial &amp; Temperatura Gemini</span>
              </h2>
              <p className="text-xs text-dark-muted">
                Escolha o modelo ritualístico de ata e o grau de determinismo da inferência.
              </p>
            </div>

            <div className="space-y-5 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Modelo Padrão de Ata Judicial
                </label>
                <select
                  value={formData.defaultAtaTemplate}
                  onChange={(e) => setFormData({ ...formData, defaultAtaTemplate: e.target.value })}
                  aria-label="Selecionar modelo padrão de ata"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-crimson min-h-[40px]"
                >
                  <option value="PADRAO_CIVEL">Padrão Cível (Instrução e Julgamento / Conciliação)</option>
                  <option value="PADRAO_TRABALHISTA">Padrão Trabalhista (Audiência Una / Rito Sumaríssimo)</option>
                  <option value="PADRAO_CRIMINAL">Padrão Criminal (Interrogatório / Instrução Penal)</option>
                  <option value="PADRAO_FAMILIA">Padrão Família e Sucessões</option>
                </select>
              </div>

              <div className="p-4 rounded-xl bg-dark-bg/60 border border-dark-border space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Temperatura do Modelo Gemini (Precisão vs Criatividade)</span>
                  <span className="font-mono text-crimson tabular-nums">{formData.aiTemperature || 0.2}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.7"
                  step="0.05"
                  value={formData.aiTemperature || 0.2}
                  onChange={(e) =>
                    setFormData({ ...formData, aiTemperature: parseFloat(e.target.value) })
                  }
                  aria-label="Ajustar temperatura do modelo Gemini"
                  className="w-full accent-crimson cursor-pointer"
                />
                <p className="text-[11px] text-dark-muted">
                  Recomendado <code>0.15</code>–<code>0.20</code> para máxima fidelidade probatória sem alucinações.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: NOTIFICATIONS & SIGNATURE (Full-Screen 12-Col Grid)            */}
      {/* ===================================================================== */}
      {activeTab === 'notifications' && (
        <div className="w-full max-w-none flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-6 bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-1 border-b border-dark-border/60 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-crimson" />
                <span>Alertas Operacionais de Pipeline &amp; Contradições</span>
              </h2>
              <p className="text-xs text-dark-muted">
                Gerencie os eventos assíncronos do RabbitMQ que disparam alertas no topo da interface.
              </p>
            </div>

            <div className="space-y-3 flex-1">
              <label className="flex items-center justify-between p-4 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition-colors">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Alertas de Transcrição Concluída
                  </span>
                  <span className="text-[11px] text-dark-muted">
                    Notificação in-app/email quando o vídeo ou áudio terminar a diarização
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.hearingCompletedAlert}
                  onChange={(e) =>
                    setFormData({ ...formData, hearingCompletedAlert: e.target.checked })
                  }
                  className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition-colors">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Alertas de Contradições Relevantes
                  </span>
                  <span className="text-[11px] text-dark-muted">
                    Avisa quando divergências factuais de alto impacto forem detectadas
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.contradictionDetectedAlert}
                  onChange={(e) =>
                    setFormData({ ...formData, contradictionDetectedAlert: e.target.checked })
                  }
                  className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>
            </div>
          </div>

          <div className="lg:col-span-6 bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-1 border-b border-dark-border/60 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Assinatura Digital &amp; Qualificação nos Termos de Audiência</span>
              </h2>
              <p className="text-xs text-dark-muted">
                Cargo e qualificação inseridos automaticamente no fecho das atas geradas pela IA.
              </p>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Título para Assinatura Digital do Magistrado
                </label>
                <input
                  type="text"
                  value={formData.judgeSignatureTitle || ''}
                  placeholder="Ex: Juíza de Direito Titular da 3ª Vara Cível Central"
                  onChange={(e) => setFormData({ ...formData, judgeSignatureTitle: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson min-h-[40px]"
                />
              </div>

              <div className="p-4 rounded-xl bg-dark-bg/60 border border-dark-border text-xs text-dark-muted space-y-1">
                <p className="font-bold text-slate-200">Padrão ICP-Brasil / PJe CNJ</p>
                <p className="text-[11px] leading-relaxed">
                  Utilizado na homologação e exportação do Termo de Audiência com hash SHA-256 auditável.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: ADMIN SYSTEM CONFIGURATIONS (Full-Screen 12-Col Grid)          */}
      {/* ===================================================================== */}
      {activeTab === 'system' && isAdmin && (
        <div className="w-full max-w-none flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch animate-in fade-in">
          <div className="lg:col-span-12 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-emerald-300">
                  Modo de Administração de Infraestrutura Ativo
                </p>
                <p className="text-emerald-200 text-[11px]">
                  Gerenciamento de Prompts, Modelos de IA, Dashboards e Tipos de Notificações via{' '}
                  <strong>config-service (:8086)</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (!isPage) onClose();
                  setIsKeycloakModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-xs font-bold text-white shadow-md transition-colors shrink-0 min-h-[36px]"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Keycloak IAM (OIDC)</span>
              </button>

              <Link
                href="/config"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md transition-colors shrink-0 min-h-[36px]"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Abrir Painel Completo do config-service (/config)</span>
              </Link>
            </div>
          </div>

          {/* System Branding & Identity (6 cols) */}
          <div className="lg:col-span-6 bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-dark-border/60 pb-3">
              <Palette className="w-4 h-4 text-emerald-400" />
              <span>Identidade Visual &amp; Marca do Sistema</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome do Sistema
                </label>
                <input
                  type="text"
                  value={sysFormData.systemName || 'Open Judy'}
                  onChange={(e) => setSysFormData({ ...sysFormData, systemName: e.target.value })}
                  placeholder="Ex: Open Judy"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  URL da Logo (Opcional)
                </label>
                <input
                  type="url"
                  value={sysFormData.logoUrl || ''}
                  onChange={(e) => setSysFormData({ ...sysFormData, logoUrl: e.target.value })}
                  placeholder="https://exemplo.gov.br/logo.svg"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono min-h-[40px]"
                />
              </div>
            </div>
          </div>

          {/* LLM & Model Engine (6 cols) */}
          <div className="lg:col-span-6 bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-dark-border/60 pb-3">
              <Cpu className="w-4 h-4 text-crimson" />
              <span>Modelos de Inteligência Artificial (Google Gemini)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Modelo LLM Principal (Transcrição, Atas e RAG)
                </label>
                <select
                  value={sysFormData.geminiModel}
                  onChange={(e) => setSysFormData({ ...sysFormData, geminiModel: e.target.value })}
                  aria-label="Selecionar modelo LLM principal"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 min-h-[40px]"
                >
                  <option value="gemini-4-argon">
                    Gemini 4 Argon (gemini-4-argon • Texto, Atas e RAG)
                  </option>
                  <option value="gemini-3.8-flash">
                    Gemini 3.8 Flash (gemini-3.8-flash • Vídeo e Áudio)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Modelo de Vetorização de Depoimentos
                </label>
                <select
                  value={sysFormData.geminiEmbeddingModel}
                  onChange={(e) =>
                    setSysFormData({ ...sysFormData, geminiEmbeddingModel: e.target.value })
                  }
                  aria-label="Selecionar modelo de vetorização"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 min-h-[40px]"
                >
                  <option value="text-embedding-004">text-embedding-004 (768 dimensões)</option>
                  <option value="embedding-gecko-001">embedding-gecko-001</option>
                </select>
              </div>
            </div>
          </div>

          {/* AlloyDB & RAG Vector Parameters (6 cols) */}
          <div className="lg:col-span-6 bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-dark-border/60 pb-3">
              <Database className="w-4 h-4 text-sky-400" />
              <span>Banco de Dados AlloyDB &amp; Parâmetros pgvector</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                  <span>Corte de Similaridade RAG (Cosine Threshold)</span>
                  <span className="font-mono text-emerald-400 tabular-nums">
                    {sysFormData.vectorSimilarityThreshold}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="0.95"
                  step="0.05"
                  value={sysFormData.vectorSimilarityThreshold}
                  onChange={(e) =>
                    setSysFormData({
                      ...sysFormData,
                      vectorSimilarityThreshold: parseFloat(e.target.value),
                    })
                  }
                  aria-label="Ajustar corte de similaridade RAG"
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Duração Máxima de Áudio por Audiência (minutos)
                </label>
                <input
                  type="number"
                  value={sysFormData.maxAudioDurationMinutes}
                  onChange={(e) =>
                    setSysFormData({
                      ...sysFormData,
                      maxAudioDurationMinutes: parseInt(e.target.value) || 240,
                    })
                  }
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 tabular-nums min-h-[40px]"
                />
              </div>
            </div>
          </div>

          {/* Security & Storage (6 cols) */}
          <div className="lg:col-span-6 bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-dark-border/60 pb-3">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Políticas Zero-Trust e Armazenamento MinIO/GCS</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Bucket S3 / MinIO para Gravações Judiciais
                </label>
                <input
                  type="text"
                  value={sysFormData.audioStorageBucket}
                  onChange={(e) =>
                    setSysFormData({ ...sysFormData, audioStorageBucket: e.target.value })
                  }
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Retenção de Logs de Auditoria
                </label>
                <select
                  value={sysFormData.auditLogRetentionDays}
                  onChange={(e) =>
                    setSysFormData({
                      ...sysFormData,
                      auditLogRetentionDays: parseInt(e.target.value),
                    })
                  }
                  aria-label="Selecionar período de retenção de logs de auditoria"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 min-h-[40px]"
                >
                  <option value={180}>180 dias (6 meses)</option>
                  <option value={365}>365 dias (1 ano)</option>
                  <option value={730}>730 dias (2 anos)</option>
                  <option value={1825}>1825 dias (5 anos - Padrão CNJ)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center justify-between p-3 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition-colors">
                <div>
                  <span className="text-xs font-bold text-white block">Zero-Trust &amp; IAP</span>
                  <span className="text-[11px] text-dark-muted">mTLS/IAP nos microsserviços</span>
                </div>
                <input
                  type="checkbox"
                  checked={sysFormData.zeroTrustEnforced}
                  onChange={(e) =>
                    setSysFormData({ ...sysFormData, zeroTrustEnforced: e.target.checked })
                  }
                  className="rounded bg-dark-bg border-dark-border text-emerald-500 focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition-colors">
                <div>
                  <span className="text-xs font-bold text-amber-400 block">Modo de Manutenção</span>
                  <span className="text-[11px] text-dark-muted">Bloqueia novas ingestões</span>
                </div>
                <input
                  type="checkbox"
                  checked={sysFormData.maintenanceMode}
                  onChange={(e) =>
                    setSysFormData({ ...sysFormData, maintenanceMode: e.target.checked })
                  }
                  className="rounded bg-dark-bg border-dark-border text-amber-500 focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
