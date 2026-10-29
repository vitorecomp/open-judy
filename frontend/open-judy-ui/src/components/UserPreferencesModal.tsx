'use client';

import React, { useState, useEffect } from 'react';
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
  Sliders,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Save,
  CheckCircle2,
  FileText,
  Server,
  ShieldCheck,
  Database,
  Cpu,
  Lock,
  HardDrive,
  Palette,
  Image as ImageIcon,
  KeyRound
} from 'lucide-react';

interface UserPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'ui' | 'audio' | 'ai' | 'notifications' | 'system';
}

export default function UserPreferencesModal({
  isOpen,
  onClose,
  initialTab = 'ui',
}: UserPreferencesModalProps) {
  const {
    config,
    updateConfig,
    resetConfig,
    systemConfig,
    updateSystemConfig,
    role,
    permissions,
    preferencesInitialTab,
    openAdminConfig,
    accentColor,
    setAccentColor,
    setIsKeycloakModalOpen,
    keycloakStatus
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'ui' | 'audio' | 'ai' | 'notifications' | 'system'>('ui');
  const [formData, setFormData] = useState<UserConfiguration>(config);
  const [sysFormData, setSysFormData] = useState<SystemConfiguration>(systemConfig);
  const [selectedAccent, setSelectedAccent] = useState<string>(config.accentColor || accentColor || '#e63946');
  const [customHex, setCustomHex] = useState<string>(config.accentColor || accentColor || '#e63946');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const isAdmin = role === 'ADMIN' || permissions.canEditSystemConfig;

  useEffect(() => {
    if (!isOpen) return;
    setFormData(config);
    setSysFormData(systemConfig);
    const color = config.accentColor || systemConfig.accentColor || accentColor || '#e63946';
    setSelectedAccent(color);
    setCustomHex(color);
    if (preferencesInitialTab) {
      setActiveTab(preferencesInitialTab);
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, preferencesInitialTab, initialTab]);

  if (!isOpen) return null;

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
        onClose();
      }, 800);
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
          onClose();
        }, 800);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-dark-border bg-dark-bg/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-crimson/10 border border-crimson/30 text-crimson flex items-center justify-center">
              {activeTab === 'system' ? <Server className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>
                  {activeTab === 'system'
                    ? 'Configurações Globais do Sistema Open Judy'
                    : 'Configurações & Preferências do Usuário'}
                </span>
                <span className="text-[11px] uppercase font-bold px-2 py-0.5 rounded-full bg-dark-pill text-dark-muted border border-dark-border">
                  user-service
                </span>
                {isAdmin && activeTab === 'system' && (
                  <span className="text-[11px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Admin Master
                  </span>
                )}
              </h3>
              <p className="text-xs text-dark-muted">
                {activeTab === 'system'
                  ? 'Gerencie parâmetros de infraestrutura, modelos de IA Gemini, AlloyDB e retenção zero-trust'
                  : 'Personalize tema visual, reprodução de áudio e automações judiciais'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setIsKeycloakModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-crimson/15 hover:bg-crimson/25 border border-crimson/40 text-xs font-bold text-white transition-colors min-h-[36px]"
                title="Autenticação Keycloak IAM (OIDC)"
              >
                <KeyRound className="w-3.5 h-3.5 text-crimson shrink-0" />
                <span>Keycloak IAM (OIDC)</span>
                <span className="px-1.5 py-0.5 rounded text-[11px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Admin
                </span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-dark-muted hover:text-white hover:bg-dark-pill transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
              title="Fechar"
              aria-label="Fechar preferências do usuário"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-dark-border bg-dark-bg/40 px-4 pt-2 gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('ui')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-colors border-b-2 shrink-0 ${
              activeTab === 'ui'
                ? 'border-crimson text-white bg-dark-card'
                : 'border-transparent text-dark-muted hover:text-slate-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Interface & Tema</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-colors border-b-2 shrink-0 ${
              activeTab === 'audio'
                ? 'border-crimson text-white bg-dark-card'
                : 'border-transparent text-dark-muted hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Áudio & Player</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-colors border-b-2 shrink-0 ${
              activeTab === 'ai'
                ? 'border-crimson text-white bg-dark-card'
                : 'border-transparent text-dark-muted hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-crimson" />
            <span>IA Gemini</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-colors border-b-2 shrink-0 ${
              activeTab === 'notifications'
                ? 'border-crimson text-white bg-dark-card'
                : 'border-transparent text-dark-muted hover:text-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notificações</span>
          </button>

          {/* ADMIN ONLY SYSTEM CONFIG TAB */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-colors border-b-2 shrink-0 ${
                activeTab === 'system'
                  ? 'border-emerald-500 text-emerald-300 bg-dark-card'
                  : 'border-transparent text-emerald-300 hover:text-emerald-200 hover:bg-dark-pill/30'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span>Configurações do Sistema</span>
              <span className="px-1.5 py-0.5 rounded text-[11px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Admin
              </span>
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: UI & THEME */}
          {activeTab === 'ui' && (
            <div className="space-y-5">
              {/* Theme Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2.5">
                  Tema Visual do Sistema
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Dark Theme */}
                  <div
                    onClick={() => handleChangeTheme('DARK')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-colors flex flex-col justify-between gap-3 ${
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
                    {/* Dark preview */}
                    <div className="h-10 rounded-lg bg-[#0d0e12] border border-[#23252d] p-1.5 flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-crimson" />
                      <div className="h-2 w-12 rounded bg-[#25272e]" />
                      <div className="h-2 w-8 rounded bg-[#1e2026]" />
                    </div>
                  </div>

                  {/* Light Theme */}
                  <div
                    onClick={() => handleChangeTheme('LIGHT')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-colors flex flex-col justify-between gap-3 ${
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
                    {/* Light preview */}
                    <div className="h-10 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-1.5 flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-crimson" />
                      <div className="h-2 w-12 rounded bg-[#cbd5e1]" />
                      <div className="h-2 w-8 rounded bg-[#e2e8f0]" />
                    </div>
                  </div>

                  {/* System Theme */}
                  <div
                    onClick={() => handleChangeTheme('SYSTEM')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-colors flex flex-col justify-between gap-3 ${
                      formData.theme === 'SYSTEM'
                        ? 'bg-dark-input border-crimson shadow-md shadow-crimson/15 ring-1 ring-crimson'
                        : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-sky-400" />
                        <span className="text-xs font-bold text-white">Automático (Sistema)</span>
                      </div>
                      {formData.theme === 'SYSTEM' && (
                        <div className="w-4 h-4 rounded-full bg-crimson flex items-center justify-center text-white text-[11px]">
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="h-10 rounded-lg bg-dark-card border border-dark-border p-1.5 flex items-center justify-center text-[11px] text-dark-muted font-mono">
                      Sincronizado com SO
                    </div>
                  </div>
                </div>
              </div>

              {/* Accent Color Selection (Teal, Red, Orange, Custom HEX) */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2.5 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-crimson" />
                  Cor de Destaque do Sistema (Accent Color)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Preset 1: Teal */}
                  <button
                    type="button"
                    onClick={() => handleSelectAccent('#0d9488')}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-colors text-left ${
                      selectedAccent?.toLowerCase() === '#0d9488' || selectedAccent?.toLowerCase() === 'teal'
                        ? 'bg-dark-input border-teal-500 ring-2 ring-teal-500/50 shadow-md shadow-teal-500/10'
                        : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-[#0d9488] shrink-0 ring-2 ring-white/20 shadow" />
                      <span className="text-xs font-bold text-white truncate">Teal</span>
                    </div>
                    {(selectedAccent?.toLowerCase() === '#0d9488' || selectedAccent?.toLowerCase() === 'teal') && (
                      <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    )}
                  </button>

                  {/* Preset 2: Red / Crimson */}
                  <button
                    type="button"
                    onClick={() => handleSelectAccent('#e63946')}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-colors text-left ${
                      selectedAccent?.toLowerCase() === '#e63946' || selectedAccent?.toLowerCase() === 'red'
                        ? 'bg-dark-input border-rose-500 ring-2 ring-rose-500/50 shadow-md shadow-rose-500/10'
                        : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-[#e63946] shrink-0 ring-2 ring-white/20 shadow" />
                      <span className="text-xs font-bold text-white truncate">Red</span>
                    </div>
                    {(selectedAccent?.toLowerCase() === '#e63946' || selectedAccent?.toLowerCase() === 'red') && (
                      <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                  </button>

                  {/* Preset 3: Orange */}
                  <button
                    type="button"
                    onClick={() => handleSelectAccent('#ea580c')}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-colors text-left ${
                      selectedAccent?.toLowerCase() === '#ea580c' || selectedAccent?.toLowerCase() === 'orange'
                        ? 'bg-dark-input border-orange-500 ring-2 ring-orange-500/50 shadow-md shadow-orange-500/10'
                        : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-[#ea580c] shrink-0 ring-2 ring-white/20 shadow" />
                      <span className="text-xs font-bold text-white truncate">Orange</span>
                    </div>
                    {(selectedAccent?.toLowerCase() === '#ea580c' || selectedAccent?.toLowerCase() === 'orange') && (
                      <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    )}
                  </button>

                  {/* Custom Hex Color Option */}
                  <div
                    className={`p-2 sm:p-2.5 rounded-xl border flex items-center gap-2 transition-colors ${
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
                      className="w-full bg-transparent text-[11px] font-mono text-white focus:outline-none uppercase"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>

              {/* Font Size, Display & Hearings View Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tamanho da Fonte
                  </label>
                  <select
                    value={formData.fontSize}
                    onChange={(e) => setFormData({ ...formData, fontSize: e.target.value })}
                    aria-label="Selecionar tamanho da fonte"
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-crimson"
                  >
                    <option value="SMALL">Pequeno (Compacto - 13px)</option>
                    <option value="MEDIUM">Médio (Padrão - 14px)</option>
                    <option value="LARGE">Grande (Leitura Confortável - 16px)</option>
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
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-crimson"
                  >
                    <option value="DASHBOARD">Dashboard Geral</option>
                    <option value="HEARINGS">Pauta de Audiências</option>
                    <option value="CASES">Processos & Varas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Visualização das Audiências
                  </label>
                  <select
                    value={formData.hearingsViewMode || 'TABLE'}
                    onChange={(e) => setFormData({ ...formData, hearingsViewMode: e.target.value as 'TABLE' | 'CARDS' })}
                    aria-label="Selecionar modo de visualização das audiências"
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-crimson"
                  >
                    <option value="TABLE">Tabela de Dados</option>
                    <option value="CARDS">Grade de Cards</option>
                  </select>
                </div>
              </div>

              {/* High Contrast & Compact Toggles */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition">
                  <div>
                    <span className="text-xs font-bold text-white block">Alto Contraste</span>
                    <span className="text-[11px] text-dark-muted">Aumenta o contraste das bordas e texto para acessibilidade</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.highContrast}
                    onChange={(e) => setFormData({ ...formData, highContrast: e.target.checked })}
                    className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition">
                  <div>
                    <span className="text-xs font-bold text-white block">Modo Compacto de Listagem</span>
                    <span className="text-[11px] text-dark-muted">Reduz o espaçamento vertical em tabelas e listas de audiência</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.compactView}
                    onChange={(e) => setFormData({ ...formData, compactView: e.target.checked })}
                    className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIO & PLAYER */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2">
                  Velocidade Padrão de Reprodução
                </label>
                <div className="flex gap-2">
                  {[1.0, 1.25, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setFormData({ ...formData, playbackRate: rate })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors tabular-nums ${
                        formData.playbackRate === rate
                          ? 'bg-crimson text-white border-crimson shadow-md shadow-crimson/25'
                          : 'bg-dark-bg border-dark-border text-dark-muted hover:text-white hover:bg-dark-pill'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition-colors">
                  <div>
                    <span className="text-xs font-bold text-white block">Auto-scroll da Transcrição</span>
                    <span className="text-[11px] text-dark-muted">Rola automaticamente a lista para o orador ativo durante a reprodução</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.autoScrollTranscript}
                    onChange={(e) => setFormData({ ...formData, autoScrollTranscript: e.target.checked })}
                    className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition-colors">
                  <div>
                    <span className="text-xs font-bold text-white block">Visualizar Forma de Onda (Waveform)</span>
                    <span className="text-[11px] text-dark-muted">Exibe equalizador e forma de onda estilizável no player de áudio</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.showWaveform}
                    onChange={(e) => setFormData({ ...formData, showWaveform: e.target.checked })}
                    className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition-colors">
                  <div>
                    <span className="text-xs font-bold text-white block">Pular Trechos em Silêncio</span>
                    <span className="text-[11px] text-dark-muted">Avança automaticamente pausas sem fala nas sessões de instrução</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.skipSilence}
                    onChange={(e) => setFormData({ ...formData, skipSilence: e.target.checked })}
                    className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: AI & GEMINI */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-dark-input border border-dark-border flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-crimson" />
                    Gerar Minuta de Ata Automaticamente
                  </span>
                  <span className="text-[11px] text-dark-muted">
                    Aciona o Gemini 2.0 para redigir o termo imediatamente após a conclusão da transcrição
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoGenerateAtaDraft}
                  onChange={(e) => setFormData({ ...formData, autoGenerateAtaDraft: e.target.checked })}
                  className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-dark-input border border-dark-border flex items-center justify-between">
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
                  onChange={(e) => setFormData({ ...formData, autoDetectContradictions: e.target.checked })}
                  className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Modelo Padrão de Ata
                </label>
                <select
                  value={formData.defaultAtaTemplate}
                  onChange={(e) => setFormData({ ...formData, defaultAtaTemplate: e.target.value })}
                  aria-label="Selecionar modelo padrão de ata"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-crimson"
                >
                  <option value="PADRAO_CIVEL">Padrão Cível (Instrução e Julgamento / Conciliação)</option>
                  <option value="PADRAO_TRABALHISTA">Padrão Trabalhista (Audiência Una / Rito Sumaríssimo)</option>
                  <option value="PADRAO_CRIMINAL">Padrão Criminal (Interrogatório / Instrução Penal)</option>
                  <option value="PADRAO_FAMILIA">Padrão Família e Sucessões</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Temperatura do Modelo Gemini (Precisão vs Criatividade)</span>
                  <span className="font-mono text-crimson tabular-nums">{formData.aiTemperature || 0.2}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.7"
                  step="0.05"
                  value={formData.aiTemperature || 0.2}
                  onChange={(e) => setFormData({ ...formData, aiTemperature: parseFloat(e.target.value) })}
                  aria-label="Ajustar temperatura do modelo Gemini"
                  className="w-full accent-crimson cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS & SIGNATURE */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition-colors">
                  <div>
                    <span className="text-xs font-bold text-white block">Alertas de Transcrição Concluída</span>
                    <span className="text-[11px] text-dark-muted">Notificação push/email quando o áudio for diarizado</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.hearingCompletedAlert}
                    onChange={(e) => setFormData({ ...formData, hearingCompletedAlert: e.target.checked })}
                    className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition-colors">
                  <div>
                    <span className="text-xs font-bold text-white block">Alertas de Contradições Relevantes</span>
                    <span className="text-[11px] text-dark-muted">Avisa quando divergências de alto impacto forem detectadas</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.contradictionDetectedAlert}
                    onChange={(e) => setFormData({ ...formData, contradictionDetectedAlert: e.target.checked })}
                    className="rounded bg-dark-bg border-dark-border text-crimson focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Título para Assinatura Digital do Magistrado
                </label>
                <input
                  type="text"
                  value={formData.judgeSignatureTitle || ''}
                  placeholder="Ex: Juíza de Direito Titular da 3ª Vara Cível Central"
                  onChange={(e) => setFormData({ ...formData, judgeSignatureTitle: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3.5 py-2 text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson"
                />
              </div>
            </div>
          )}

          {/* TAB 5: ADMIN SYSTEM CONFIGURATIONS */}
          {activeTab === 'system' && isAdmin && (
            <div className="space-y-5 animate-in fade-in">
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-300">Modo de Administração de Infraestrutura Ativo</p>
                    <p className="text-emerald-200 text-[11px]">
                      Gerenciamento de Prompts, Modelos de IA, Dashboards e Tipos de Notificações via <strong>config-service</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setIsKeycloakModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-crimson hover:bg-crimson-dark text-xs font-bold text-white shadow-md transition-colors shrink-0"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Keycloak IAM (OIDC)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openAdminConfig('prompts');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md transition-colors shrink-0"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Abrir Painel do config-service</span>
                  </button>
                </div>
              </div>

              {/* System Branding & Identity */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-emerald-400" />
                  Identidade Visual & Marca do Sistema
                </h4>

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
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
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
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* LLM & Model Engine */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-crimson" />
                  Modelos de Inteligência Artificial (Google Gemini)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Modelo LLM Principal (Transcrição, Atas e RAG)
                    </label>
                    <select
                      value={sysFormData.geminiModel}
                      onChange={(e) => setSysFormData({ ...sysFormData, geminiModel: e.target.value })}
                      aria-label="Selecionar modelo LLM principal"
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="gemini-4-argon">Gemini 4 Argon (gemini-4-argon • Texto, Atas e RAG)</option>
                      <option value="gemini-3.8-flash">Gemini 3.8 Flash (gemini-3.8-flash • Vídeo e Áudio)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Modelo de Vetorização de Depoimentos
                    </label>
                    <select
                      value={sysFormData.geminiEmbeddingModel}
                      onChange={(e) => setSysFormData({ ...sysFormData, geminiEmbeddingModel: e.target.value })}
                      aria-label="Selecionar modelo de vetorização"
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="text-embedding-004">text-embedding-004 (768 dimensões)</option>
                      <option value="embedding-gecko-001">embedding-gecko-001</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* AlloyDB & RAG Vector Parameters */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-sky-400" />
                  Banco de Dados AlloyDB & Parâmetros pgvector
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                      <span>Corte de Similaridade RAG (Cosine Threshold)</span>
                      <span className="font-mono text-emerald-400 tabular-nums">{sysFormData.vectorSimilarityThreshold}</span>
                    </div>
                    <input
                      type="range"
                      min="0.50"
                      max="0.95"
                      step="0.05"
                      value={sysFormData.vectorSimilarityThreshold}
                      onChange={(e) => setSysFormData({ ...sysFormData, vectorSimilarityThreshold: parseFloat(e.target.value) })}
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
                      onChange={(e) => setSysFormData({ ...sysFormData, maxAudioDurationMinutes: parseInt(e.target.value) || 240 })}
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Security & Storage */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-400" />
                  Políticas Zero-Trust e Armazenamento MinIO/GCS
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Bucket S3 / MinIO para Gravações Judiciais
                    </label>
                    <input
                      type="text"
                      value={sysFormData.audioStorageBucket}
                      onChange={(e) => setSysFormData({ ...sysFormData, audioStorageBucket: e.target.value })}
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Retenção de Logs de Auditoria
                    </label>
                    <select
                      value={sysFormData.auditLogRetentionDays}
                      onChange={(e) => setSysFormData({ ...sysFormData, auditLogRetentionDays: parseInt(e.target.value) })}
                      aria-label="Selecionar período de retenção de logs de auditoria"
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value={180}>180 dias (6 meses)</option>
                      <option value={365}>365 dias (1 ano)</option>
                      <option value={730}>730 dias (2 anos)</option>
                      <option value={1825}>1825 dias (5 anos - Padrão CNJ)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition-colors">
                    <div>
                      <span className="text-xs font-bold text-white block">Políticas de Segurança Zero-Trust & IAP</span>
                      <span className="text-[11px] text-dark-muted">Exige autenticação corporativa mTLS/IAP em todas as chamadas aos microsserviços</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={sysFormData.zeroTrustEnforced}
                      onChange={(e) => setSysFormData({ ...sysFormData, zeroTrustEnforced: e.target.checked })}
                      className="rounded bg-dark-bg border-dark-border text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-dark-input/60 border border-dark-border cursor-pointer hover:bg-dark-input transition-colors">
                    <div>
                      <span className="text-xs font-bold text-amber-400 block">Modo de Manutenção do Cluster</span>
                      <span className="text-[11px] text-dark-muted">Bloqueia novas ingestões de áudio e exibe aviso de manutenção</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={sysFormData.maintenanceMode}
                      onChange={(e) => setSysFormData({ ...sysFormData, maintenanceMode: e.target.checked })}
                      className="rounded bg-dark-bg border-dark-border text-amber-500 focus:ring-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Feedback message */}
          {savedSuccess && (
            <div className="p-3 rounded-xl status-badge-success border text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {activeTab === 'system'
                  ? 'Configurações globais do sistema salvas com sucesso no user-service!'
                  : 'Configurações e preferências salvas com sucesso!'}
              </span>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-dark-border">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-xs font-medium text-dark-muted hover:text-white transition disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrões</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-dark-muted hover:text-white hover:bg-dark-pill transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] ${
                  activeTab === 'system'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
                    : 'bg-crimson hover:bg-crimson-dark shadow-crimson/25'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Salvando...' : activeTab === 'system' ? 'Salvar Sistema' : 'Salvar Preferências'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
