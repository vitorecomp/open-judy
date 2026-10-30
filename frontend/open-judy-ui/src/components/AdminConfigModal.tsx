'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, applyAccentColorToDOM, applyThemeToDOM } from '@/lib/auth-context';
import {
  PromptTemplate,
  AiModel,
  DashboardType,
  NotificationType,
  SystemSetting,
  PromptCategory,
  AiModelType,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
} from '@/lib/types';
import { api } from '@/lib/api';
import JudyLogo from '@/components/JudyLogo';
import {
  X,
  SlidersHorizontal,
  FileCode2,
  Cpu,
  LayoutGrid,
  BellRing,
  ShieldCheck,
  Save,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Play,
  Check,
  Edit3,
  Search,
  ExternalLink,
  Plus,
  Trash2,
  Lock,
  Layers,
  Database,
  Volume2,
  Key,
  Image as ImageIcon,
  Palette,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';

interface AdminConfigModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialTab?: 'prompts' | 'models' | 'dashboards' | 'notifications' | 'settings';
  initialPromptCode?: string;
  mode?: 'modal' | 'page';
}

export default function AdminConfigModal({
  isOpen = true,
  onClose = () => {},
  initialTab = 'prompts',
  initialPromptCode,
  mode = 'modal',
}: AdminConfigModalProps) {
  const {
    role,
    permissions,
    switchProfile,
    adminConfigInitialTab,
    systemName,
    systemTagline,
    logoUrl,
    config,
    updateConfig,
    accentColor,
    setAccentColor,
    systemConfig,
    updateSystemConfig,
  } = useAuth();
  const isAdmin = role === 'ADMIN' || permissions.canEditSystemConfig;
  const isPage = mode === 'page';

  const [activeTab, setActiveTab] = useState<'prompts' | 'models' | 'dashboards' | 'notifications' | 'settings'>('prompts');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // System Branding & Appearance state
  const [brandingName, setBrandingName] = useState(systemName || 'Open Judy');
  const [brandingTagline, setBrandingTagline] = useState(systemTagline || 'PODER JUDICIÁRIO • CNJ');
  const [brandingLogoUrl, setBrandingLogoUrl] = useState(logoUrl || '');
  const [brandingTheme, setBrandingTheme] = useState<string>(config?.theme || 'DARK');
  const [brandingAccentColor, setBrandingAccentColor] = useState(accentColor || systemConfig.accentColor || '#2563eb');
  const [brandingCustomHex, setBrandingCustomHex] = useState(accentColor || systemConfig.accentColor || '#2563eb');
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // Data states
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [dashboards, setDashboards] = useState<DashboardType[]>([]);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);

  // Search & filter states
  const [promptSearch, setPromptSearch] = useState('');
  const [selectedPromptCategory, setSelectedPromptCategory] = useState<string>('ALL');

  // Editing modal / state for Prompt
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
  const [testingPrompt, setTestingPrompt] = useState<PromptTemplate | null>(null);
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  const [renderedPreview, setRenderedPreview] = useState<{ userPrompt: string; systemInstruction?: string } | null>(null);

  // Editing modal / state for Model
  const [editingModel, setEditingModel] = useState<AiModel | null>(null);

  // Editing modal / state for Dashboard
  const [editingDashboard, setEditingDashboard] = useState<DashboardType | null>(null);

  // Editing modal / state for Notification
  const [editingNotification, setEditingNotification] = useState<NotificationType | null>(null);

  useEffect(() => {
    if (!isOpen && !isPage) return;
    setBrandingName(systemName || 'Open Judy');
    setBrandingTagline(systemTagline || 'PODER JUDICIÁRIO • CNJ');
    setBrandingLogoUrl(logoUrl || '');
    if (config?.theme) {
      setBrandingTheme(config.theme.toUpperCase());
    }
    const color = accentColor || systemConfig.accentColor || '#2563eb';
    setBrandingAccentColor(color);
    setBrandingCustomHex(color);
  }, [systemName, systemTagline, logoUrl, config?.theme, accentColor, systemConfig.accentColor, isOpen, isPage]);

  const handleAdminSelectTheme = async (themeMode: 'DARK' | 'LIGHT' | 'SYSTEM') => {
    setBrandingTheme(themeMode);
    applyThemeToDOM(themeMode);
    await updateConfig({ theme: themeMode });
    setSettings((prev) =>
      prev.some((s) => s.key === 'system.theme')
        ? prev.map((s) => (s.key === 'system.theme' ? { ...s, value: themeMode } : s))
        : prev
    );
    try {
      await api.updateSystemSetting('system.theme', { value: themeMode });
    } catch (_) {}
  };

  const handleAdminSelectAccent = async (color: string) => {
    setBrandingAccentColor(color);
    setBrandingCustomHex(color);
    applyAccentColorToDOM(color);
    await setAccentColor(color);
    setSettings((prev) =>
      prev.map((s) => (s.key === 'system.accent_color' ? { ...s, value: color } : s))
    );
  };

  const handleSaveBranding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingBranding(true);
    try {
      applyThemeToDOM(brandingTheme);
      applyAccentColorToDOM(brandingAccentColor);
      await updateConfig({
        theme: brandingTheme,
        accentColor: brandingAccentColor,
      });
      await updateSystemConfig({
        systemName: brandingName,
        systemTagline: brandingTagline,
        logoUrl: brandingLogoUrl,
        accentColor: brandingAccentColor,
      });
      await api.updateSystemSetting('system.name', { value: brandingName });
      await api.updateSystemSetting('system.tagline', { value: brandingTagline });
      await api.updateSystemSetting('system.logo_url', { value: brandingLogoUrl });
      await api.updateSystemSetting('system.accent_color', { value: brandingAccentColor });
      setSettings((prev) =>
        prev.map((s) => {
          if (s.key === 'system.name') return { ...s, value: brandingName };
          if (s.key === 'system.tagline') return { ...s, value: brandingTagline };
          if (s.key === 'system.logo_url') return { ...s, value: brandingLogoUrl };
          if (s.key === 'system.accent_color') return { ...s, value: brandingAccentColor };
          return s;
        })
      );
      showSuccess('Identidade visual, tema e cor de destaque atualizados com sucesso!');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingBranding(false);
    }
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (adminConfigInitialTab) {
      setActiveTab(adminConfigInitialTab);
    }
  }, [adminConfigInitialTab, initialTab, isOpen]);

  useEffect(() => {
    if (isOpen || isPage) {
      loadAllConfigs();
    }
  }, [isOpen, isPage]);

  useEffect(() => {
    if (initialPromptCode && prompts.length > 0) {
      const target = prompts.find(
        (p) => p.code.toLowerCase() === initialPromptCode.toLowerCase()
      );
      if (target) {
        setActiveTab('prompts');
        setEditingPrompt(target);
      }
    }
  }, [initialPromptCode, prompts]);

  const loadAllConfigs = async () => {
    setIsLoading(true);
    try {
      const [promptsData, modelsData, dashboardsData, notifsData, settingsData] = await Promise.all([
        api.getPromptTemplates(),
        api.getAiModels(),
        api.getDashboardTypes(),
        api.getNotificationTypes(),
        api.getSystemSettings()
      ]);
      setPrompts(promptsData || []);
      setModels(modelsData || []);
      setDashboards(dashboardsData || []);
      setNotifications(notifsData || []);
      const loadedSettings = settingsData || [];
      const savedLocalAccent =
        typeof window !== 'undefined' ? localStorage.getItem('openjudy_accent_color') : null;
      const settingAccent = loadedSettings.find((s: SystemSetting) => s.key === 'system.accent_color')?.value;
      const effectiveAccent = savedLocalAccent || settingAccent || accentColor || '#2563eb';
      setBrandingAccentColor(effectiveAccent);
      setBrandingCustomHex(effectiveAccent);
      setSettings(
        loadedSettings.map((s: SystemSetting) =>
          s.key === 'system.accent_color' ? { ...s, value: effectiveAccent } : s
        )
      );
    } catch (e) {
      console.error('Falha ao carregar configurações do config-service:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  // ----------------------------------------------------
  // PROMPT HANDLERS
  // ----------------------------------------------------
  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrompt) return;
    setIsSaving(true);
    try {
      const updated = await api.updatePromptTemplate(editingPrompt.id, editingPrompt);
      setPrompts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingPrompt(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-judy-prompt-updated', { detail: updated }));
      }
      showSuccess(`Prompt ${updated.code} (v${updated.version}) atualizado com sucesso!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestRenderPrompt = async () => {
    if (!testingPrompt) return;
    try {
      const res = await api.renderPromptTemplate(testingPrompt.code, testVariables);
      setRenderedPreview({
        userPrompt: res.renderedUserPrompt,
        systemInstruction: res.renderedSystemInstruction
      });
    } catch (e) {
      console.error(e);
    }
  };

  // ----------------------------------------------------
  // MODEL HANDLERS
  // ----------------------------------------------------
  const handleSetDefaultModel = async (id: string, modelType: string) => {
    try {
      await api.setDefaultAiModel(id);
      setModels((prev) =>
        prev.map((m) => {
          if (m.modelType === modelType) {
            return { ...m, isDefault: m.id === id };
          }
          return m;
        })
      );
      showSuccess('Modelo padrão atualizado!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel) return;
    setIsSaving(true);
    try {
      const updated = await api.updateAiModel(editingModel.id, editingModel);
      setModels((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setEditingModel(null);
      showSuccess(`Modelo ${updated.name} atualizado com sucesso!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // ----------------------------------------------------
  // DASHBOARD HANDLERS
  // ----------------------------------------------------
  const handleSaveDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDashboard) return;
    setIsSaving(true);
    try {
      const updated = await api.updateDashboardType(editingDashboard.id, editingDashboard);
      setDashboards((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setEditingDashboard(null);
      showSuccess(`Dashboard ${updated.name} salvo com sucesso!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // ----------------------------------------------------
  // NOTIFICATION HANDLERS
  // ----------------------------------------------------
  const handleSaveNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotification) return;
    setIsSaving(true);
    try {
      const updated = await api.updateNotificationType(editingNotification.id, editingNotification);
      setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setEditingNotification(null);
      showSuccess(`Notificação ${updated.name} salva com sucesso!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // ----------------------------------------------------
  // SETTING HANDLERS
  // ----------------------------------------------------
  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await api.updateSystemSetting(key, { value });
      setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
      if (key === 'system.accent_color') {
        setBrandingAccentColor(value);
        setBrandingCustomHex(value);
        applyAccentColorToDOM(value);
        await setAccentColor(value);
      } else if (key === 'system.theme') {
        const mode = value.toUpperCase() as 'DARK' | 'LIGHT' | 'SYSTEM';
        setBrandingTheme(mode);
        applyThemeToDOM(mode);
        await updateConfig({ theme: mode });
      }
      showSuccess(`Configuração '${key}' salva!`);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen && !isPage) return null;

  if (isPage && !isAdmin) {
    return (
      <div className="w-full max-w-none flex-1 flex items-center justify-center min-h-[70vh] p-6">
        <div className="w-full p-8 rounded-2xl bg-dark-card border border-dark-border text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl status-badge-danger border flex items-center justify-center">
            <Lock className="w-6 h-6 text-rose-400" />
          </div>
          <h2 className="text-base font-bold text-white">
            Acesso Restrito — Configurações do Sistema (Admin)
          </h2>
          <p className="text-xs text-dark-muted leading-relaxed">
            Esta página gerencia templates de prompts forenses (<code>tb_prompt_templates</code>), modelos LLM do Vertex AI e parâmetros globais do cluster (<code>config-service :8086</code>). Seu perfil atual (<strong>{role}</strong>) não possui permissão de administrador.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => switchProfile('ADMIN')}
              className="px-4 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-xs font-bold text-white transition-colors min-h-[38px]"
            >
              Alternar para Perfil Admin TI (CNJ)
            </button>
            <a
              href="/"
              className="px-4 py-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-xs font-semibold text-slate-200 hover:text-white transition-colors min-h-[38px] inline-flex items-center"
            >
              Voltar ao Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const filteredPrompts = prompts.filter((p) => {
    const matchesCategory = selectedPromptCategory === 'ALL' || p.category === selectedPromptCategory;
    const matchesSearch =
      promptSearch.trim() === '' ||
      p.code.toLowerCase().includes(promptSearch.toLowerCase()) ||
      p.name.toLowerCase().includes(promptSearch.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(promptSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      className={
        isPage
          ? 'w-full max-w-none flex-1 flex flex-col space-y-6 min-h-[calc(100vh-6rem)]'
          : 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in'
      }
    >
      <div
        className={
          isPage
            ? 'w-full max-w-none flex-1 flex flex-col space-y-6'
            : 'bg-dark-card border border-dark-border rounded-2xl w-full overflow-hidden shadow-2xl flex flex-col h-[90vh] animate-in zoom-in-95 duration-150'
        }
      >
        {/* Full-Width Page Header */}
        <div
          className={
            isPage
              ? 'w-full flex flex-col lg:flex-row lg:items-center justify-between gap-4'
              : 'p-4 sm:px-6 border-b border-dark-border bg-dark-bg/80 flex items-center justify-between gap-3 flex-wrap'
          }
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-crimson/15 border border-crimson/40 text-crimson flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              {isPage && (
                <div className="flex items-center gap-2 text-xs text-dark-muted mb-1">
                  <a href="/" className="hover:text-white transition-colors">
                    Gabinete Judicial
                  </a>
                  <span>/</span>
                  <span className="text-crimson font-semibold">
                    Administração Judiciária • Governança de IA (Res. CNJ nº 332/2020)
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Administração Judiciária — Governança de Modelos e Prompts (Res. CNJ nº 332/2020)
                </h1>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-crimson/15 text-crimson-light border border-crimson/40">
                  Res. CNJ nº 332/2020
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded status-badge-success border">
                  ADMINISTRAÇÃO JUDICIÁRIA
                </span>
              </div>
              <p className="text-xs text-dark-muted mt-0.5">
                Governança institucional de Modelos de Linguagem (LLMs), Matrizes de Prompts Forenses, Painéis de Gabinete e Identidade Visual do Tribunal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAllConfigs}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dark-card hover:bg-dark-pill border border-dark-border text-xs font-semibold text-dark-muted hover:text-white transition-colors disabled:opacity-50 min-h-[38px]"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Recarregar dados</span>
            </button>
            {!isPage && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-dark-muted hover:text-white hover:bg-dark-pill transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                title="Fechar"
                aria-label="Fechar painel de configurações do sistema"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Full-Width Tab Navigation Bar */}
        <div
          className={
            isPage
              ? 'w-full flex items-center gap-2 flex-wrap bg-dark-card border border-dark-border rounded-2xl p-2 shadow-lg'
              : 'flex border-b border-dark-border bg-dark-bg/40 px-4 sm:px-6 pt-2 gap-2 overflow-x-auto no-scrollbar'
          }
        >
          <button
            onClick={() => setActiveTab('prompts')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-colors shrink-0 min-h-[38px] ${
              activeTab === 'prompts'
                ? 'bg-crimson text-white shadow-sm'
                : 'text-dark-muted hover:text-slate-200 hover:bg-dark-input'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>Prompts do Sistema</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-black/25 text-white font-mono tabular-nums">
              {prompts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-colors shrink-0 min-h-[38px] ${
              activeTab === 'models'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-dark-muted hover:text-slate-200 hover:bg-dark-input'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Modelos de IA & LLM</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-black/25 text-white font-mono tabular-nums">
              {models.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('dashboards')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-colors shrink-0 min-h-[38px] ${
              activeTab === 'dashboards'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-dark-muted hover:text-slate-200 hover:bg-dark-input'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Tipos de Dashboard</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-black/25 text-white font-mono tabular-nums">
              {dashboards.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-colors shrink-0 min-h-[38px] ${
              activeTab === 'notifications'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-dark-muted hover:text-slate-200 hover:bg-dark-input'
            }`}
          >
            <BellRing className="w-4 h-4" />
            <span>Tipos de Notificações</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-black/25 text-white font-mono tabular-nums">
              {notifications.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-colors shrink-0 min-h-[38px] ${
              activeTab === 'settings'
                ? 'bg-crimson text-white shadow-sm'
                : 'text-dark-muted hover:text-slate-200 hover:bg-dark-input'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Parâmetros Globais &amp; Tema</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-black/25 text-white font-mono tabular-nums">
              {settings.length}
            </span>
          </button>
        </div>

        {/* Feedback Alert */}
        {successMessage && (
          <div className="w-full p-3.5 rounded-2xl status-badge-success border text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className={isPage ? 'w-full max-w-none flex-1 flex flex-col' : 'flex-1 overflow-y-auto p-4 sm:p-6'}>
          {/* ================================================================= */}
          {/* TAB 1: PROMPTS */}
          {/* ================================================================= */}
          {activeTab === 'prompts' && (
            <div className="w-full max-w-none space-y-4">
              <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-dark-card p-3.5 rounded-2xl border border-dark-border shadow-lg">
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 text-dark-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Pesquisar por código, nome ou descrição do prompt..."
                    value={promptSearch}
                    onChange={(e) => setPromptSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-dark-input border border-dark-border rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={selectedPromptCategory}
                    onChange={(e) => setSelectedPromptCategory(e.target.value)}
                    aria-label="Filtrar prompts por categoria"
                    className="bg-dark-input border border-dark-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-crimson"
                  >
                    <option value="ALL">Todas as Categorias</option>
                    <option value="DOCUMENT_GENERATION">Geração de Atas (Document)</option>
                    <option value="LEGAL_ANALYSIS">Análise Jurídica & Contradições</option>
                    <option value="COPILOT">Copilot & RAG</option>
                    <option value="TRANSCRIPTION">Transcrição & Diarização</option>
                    <option value="SUMMARIZATION">Sínteses Executivas</option>
                  </select>
                </div>
              </div>

              {/* Prompts Cards Grid */}
              <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredPrompts.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border transition-colors flex flex-col gap-3 ${
                      p.code === 'PROMPT_AUDIO_VIDEO_TRANSCRIPTION'
                        ? 'bg-dark-input/90 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                        : 'bg-dark-input/60 border-dark-border hover:border-dark-muted/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-white bg-dark-pill px-2 py-0.5 rounded border border-dark-border">
                            {p.code}
                          </span>
                          <span className="text-xs font-bold text-slate-200">{p.name}</span>
                          <span className="text-[11px] uppercase font-bold px-2 py-0.5 rounded-full bg-crimson/15 text-crimson border border-crimson/30">
                            {p.category}
                          </span>
                          {p.code === 'PROMPT_AUDIO_VIDEO_TRANSCRIPTION' && (
                            <span className="text-[11px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Pipeline de Produção (Otimizado Argon)</span>
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-dark-muted">v{p.version}</span>
                        </div>
                        <p className="text-xs text-dark-muted mt-1">{p.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setTestingPrompt(p);
                            const sampleDefaults: Record<string, string> = {
                              case_number: '1000001-88.2026.8.26.0100',
                              media_filename: '00 - video 2h 194MB .mp4',
                              block_index: '2',
                              total_parts: '14',
                              core_start_hms: '09:17',
                              core_end_hms: '18:34',
                              padding_mmss: '02:00',
                              clip_dur_mmss: '11:17',
                              target_range_instruction: 'de `02:00` até `11:17` deste clipe (não repita as falas do padding inicial `00:00`–`02:00`)',
                              context_section: '=== CONTEXTO DA PARTE 1/14 (ÚLTIMOS 5 MINUTOS + 2 MIN PADDING) ===',
                              detected_hearing_type: 'INSTRUCAO_E_JULGAMENTO',
                            };
                            const initialVars: Record<string, string> = {};
                            (p.variables || []).forEach((v) => {
                              initialVars[v] = sampleDefaults[v] || `[Exemplo ${v}]`;
                            });
                            setTestVariables(initialVars);
                            setRenderedPreview(null);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-pill hover:bg-dark-card border border-dark-border text-xs text-slate-200 hover:text-white transition"
                          title="Testar Renderização com Variáveis"
                        >
                          <Play className="w-3 h-3 text-emerald-400" />
                          <span>Testar</span>
                        </button>
                        <button
                          onClick={() => setEditingPrompt(p)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-crimson/20 hover:bg-crimson/30 border border-crimson/40 text-xs font-bold text-crimson-light hover:text-white transition"
                          title="Editar Template"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>

                    {p.userPromptTemplate && (
                      <div className="p-2.5 rounded-lg bg-dark-bg/80 border border-dark-border/50 text-[11px] font-mono text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {p.userPromptTemplate}
                      </div>
                    )}

                    <div className="flex items-center gap-4 flex-wrap text-[11px] text-dark-muted bg-dark-bg/60 p-2 rounded-lg border border-dark-border/40 font-mono">
                      <span>Modelo: <strong className="text-white">{p.defaultModel || 'gemini-4-argon'}</strong></span>
                      <span>Temp: <strong className="text-white">{p.defaultTemperature}</strong></span>
                      <span>Max Tokens: <strong className="text-white">{p.defaultMaxTokens}</strong></span>
                      <span>Variáveis: <strong className="text-slate-300">{(p.variables || []).join(', ')}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: AI MODELS */}
          {/* ================================================================= */}
          {activeTab === 'models' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-800/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-sky-200">
                  <Cpu className="w-5 h-5 text-sky-400 shrink-0" />
                  <span>
                    Modelos de Inteligência Artificial registrados no catálogo do <strong>config-service</strong>. Os modelos com a etiqueta <strong>PADRÃO</strong> são invocados automaticamente pelos serviços de transcrição, atas e RAG.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {models.map((m) => (
                  <div
                    key={m.id}
                    className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                      m.isDefault
                        ? 'bg-dark-input/90 border-sky-500/60 shadow-lg shadow-sky-500/5'
                        : 'bg-dark-input/50 border-dark-border hover:border-dark-muted/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white">{m.name}</span>
                            {m.isDefault && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40">
                                Padrão ({m.modelType})
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-dark-muted">{m.modelId}</span>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-dark-pill text-slate-300 border border-dark-border">
                          {m.provider}
                        </span>
                      </div>

                      <p className="text-xs text-dark-muted mt-2">{m.description}</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-dark-border/50 text-xs">
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-dark-muted tabular-nums">
                        <div>Janela: <strong className="text-slate-200">{m.contextWindowTokens.toLocaleString()} tokens</strong></div>
                        <div>Max Output: <strong className="text-slate-200">{m.maxOutputTokens.toLocaleString()}</strong></div>
                        <div>Multimodal: <strong className="text-slate-200">{m.supportsMultimodal ? 'Sim' : 'Não'}</strong></div>
                        <div>Áudio Nativo: <strong className="text-slate-200">{m.supportsAudio ? 'Sim' : 'Não'}</strong></div>
                      </div>

                      <div className="flex items-center justify-between pt-2 gap-2">
                        {!m.isDefault ? (
                          <button
                            onClick={() => handleSetDefaultModel(m.id, m.modelType)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-xs font-bold text-sky-300 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Definir como Padrão</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Modelo Ativo Padrão
                          </span>
                        )}

                        <button
                          onClick={() => setEditingModel(m)}
                          className="px-3 py-1.5 rounded-xl bg-dark-pill hover:bg-dark-card border border-dark-border text-xs font-medium text-white transition-colors"
                        >
                          Configurar Parâmetros
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: DASHBOARD TYPES */}
          {/* ================================================================= */}
          {activeTab === 'dashboards' && (
            <div className="w-full max-w-none space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-center gap-3 text-xs text-amber-200">
                <LayoutGrid className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  Tipos de Painéis e Layouts de Widgets associados a cada perfil de acesso judicial (Magistrado, Assessor, Secretaria de Vara e TI).
                </span>
              </div>

              <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-4">
                {dashboards.map((d) => (
                  <div
                    key={d.id}
                    className="p-4 rounded-2xl bg-dark-card border border-dark-border hover:border-dark-muted/60 transition-colors flex flex-col justify-between gap-3 shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-white bg-dark-pill px-2 py-0.5 rounded border border-dark-border">
                            {d.code}
                          </span>
                          <span className="text-xs font-bold text-slate-200">{d.name}</span>
                          <span className="text-[11px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Perfil: {d.targetRole}
                          </span>
                          <span className="text-[11px] font-mono text-dark-muted">Layout: {d.layoutType}</span>
                        </div>
                        <p className="text-xs text-dark-muted mt-1">{d.description}</p>
                      </div>

                      <button
                        onClick={() => setEditingDashboard(d)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-pill hover:bg-dark-card border border-dark-border text-xs font-bold text-white transition-colors"
                      >
                        <Edit3 className="w-3 h-3 text-amber-400" />
                        <span>Editar Layout</span>
                      </button>
                    </div>

                    <div className="p-3 rounded-lg bg-dark-bg/80 border border-dark-border/40 space-y-2">
                      <span className="text-[11px] font-bold text-slate-300 block">
                        Widgets Configurados ({(d.widgets || []).length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {(d.widgets || []).map((w: any, idx: number) => (
                          <div key={idx} className="p-2 rounded bg-dark-card border border-dark-border text-[11px]">
                            <p className="font-semibold text-white truncate">{w.title || w.id}</p>
                            <div className="flex items-center justify-between text-dark-muted text-[11px] mt-1 font-mono tabular-nums">
                              <span>Tipo: {w.type}</span>
                              <span>Span: {w.colSpan || 4} col</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: NOTIFICATIONS */}
          {/* ================================================================= */}
          {activeTab === 'notifications' && (
            <div className="w-full max-w-none space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 flex items-center gap-3 text-xs text-purple-200">
                <BellRing className="w-5 h-5 text-purple-400 shrink-0" />
                <span>
                  Catálogo de Notificações, prioridades de disparo e canais suportados (In-App, Email, WebSocket e Webhook).
                </span>
              </div>

              <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-4">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-4 rounded-2xl bg-dark-card border border-dark-border hover:border-dark-muted/60 transition-colors flex flex-col justify-between gap-3 shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-white bg-dark-pill px-2 py-0.5 rounded border border-dark-border">
                            {n.code}
                          </span>
                          <span className="text-xs font-bold text-slate-200">{n.name}</span>
                          <span className={`text-[11px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            n.defaultPriority === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : n.defaultPriority === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          }`}>
                            {n.defaultPriority}
                          </span>
                          <span className="text-[11px] uppercase font-bold px-2 py-0.5 rounded-full bg-dark-pill text-dark-muted border border-dark-border">
                            {n.category}
                          </span>
                        </div>
                        <p className="text-xs text-dark-muted mt-1">{n.description}</p>
                      </div>

                      <button
                        onClick={() => setEditingNotification(n)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-pill hover:bg-dark-card border border-dark-border text-xs font-bold text-white transition-colors"
                      >
                        <Edit3 className="w-3 h-3 text-purple-400" />
                        <span>Editar Template</span>
                      </button>
                    </div>

                    <div className="p-3 rounded-lg bg-dark-bg/80 border border-dark-border/40 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-dark-muted text-[11px]">Canais Habilitados:</span>
                        <div className="flex gap-1.5">
                          {(n.supportedChannels || []).map((ch) => (
                            <span key={ch} className="px-2 py-0.5 rounded bg-dark-pill text-[11px] font-mono text-slate-200 border border-dark-border">
                              {ch}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-[11px] font-mono">
                        <span className="text-dark-muted">Template: </span>
                        <span className="text-slate-300 font-semibold">{n.templateTitle}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5: SYSTEM SETTINGS, THEME & BRANDING */}
          {/* ================================================================= */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* SYSTEM IDENTITY, THEME MODE & ACCENT COLOR BRANDING CARD */}
              <div className="p-5 rounded-2xl bg-dark-bg/80 border border-crimson/40 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-dark-border/60 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-crimson/15 border border-crimson/40 text-crimson flex items-center justify-center">
                      <Palette className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">
                        Identidade Visual, Tema &amp; Marca do Sistema (Whitelabel Institucional)
                      </h3>
                      <p className="text-[11px] text-dark-muted">
                        Defina o nome oficial, o slogan institucional, o modo de tema (Escuro / Claro / Sistema) e a cor de destaque exibidos em todo o Tribunal.
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-crimson/15 text-crimson-light border border-crimson/40">
                    system.theme &amp; system.accent_color
                  </span>
                </div>

                <form onSubmit={handleSaveBranding} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Field 1: System Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Nome do Sistema
                      </label>
                      <input
                        type="text"
                        value={brandingName}
                        onChange={(e) => setBrandingName(e.target.value)}
                        placeholder="Ex: Open Judy, Tribunal AI..."
                        className="w-full bg-dark-input border border-dark-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-crimson font-bold"
                        required
                      />
                    </div>

                    {/* Field 2: Subtitle / Tagline */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Slogan / Subtítulo Institucional
                      </label>
                      <input
                        type="text"
                        value={brandingTagline}
                        onChange={(e) => setBrandingTagline(e.target.value)}
                        placeholder="Ex: PODER JUDICIÁRIO • CNJ"
                        className="w-full bg-dark-input border border-dark-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-crimson"
                      />
                    </div>

                    {/* Field 3: Logo URL */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        URL da Imagem da Logo (Opcional)
                      </label>
                      <div className="relative">
                        <ImageIcon className="w-3.5 h-3.5 text-dark-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          value={brandingLogoUrl}
                          onChange={(e) => setBrandingLogoUrl(e.target.value)}
                          placeholder="https://exemplo.gov.br/logo.svg ou PNG"
                          className="w-full pl-9 pr-3.5 py-2 bg-dark-input border border-dark-border rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* System Theme Mode Selection Row (DARK / LIGHT / SYSTEM) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span>Modo de Tema Global da Interface (Escuro / Claro / Automático)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => handleAdminSelectTheme('DARK')}
                        className={`p-3 rounded-lg border flex items-center justify-between gap-2 transition-colors text-left cursor-pointer ${
                          brandingTheme === 'DARK'
                            ? 'bg-dark-input border-crimson ring-2 ring-crimson/50 shadow-sm'
                            : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Moon className="w-4 h-4 text-sky-400 shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-white block">Escuro Judiciário (Dark)</span>
                            <span className="text-[11px] text-dark-muted block">Alto contraste para salas de audiência</span>
                          </div>
                        </div>
                        {brandingTheme === 'DARK' && (
                          <Check className="w-4 h-4 text-crimson shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdminSelectTheme('LIGHT')}
                        className={`p-3 rounded-lg border flex items-center justify-between gap-2 transition-colors text-left cursor-pointer ${
                          brandingTheme === 'LIGHT'
                            ? 'bg-dark-input border-crimson ring-2 ring-crimson/50 shadow-sm'
                            : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-white block">Claro Institucional (Light)</span>
                            <span className="text-[11px] text-dark-muted block">Leitura diurna de autos e despachos</span>
                          </div>
                        </div>
                        {brandingTheme === 'LIGHT' && (
                          <Check className="w-4 h-4 text-crimson shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdminSelectTheme('SYSTEM')}
                        className={`p-3 rounded-lg border flex items-center justify-between gap-2 transition-colors text-left cursor-pointer ${
                          brandingTheme === 'SYSTEM'
                            ? 'bg-dark-input border-crimson ring-2 ring-crimson/50 shadow-sm'
                            : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Monitor className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-white block">Automático (Sistema)</span>
                            <span className="text-[11px] text-dark-muted block">Sincronizado com o sistema operacional</span>
                          </div>
                        </div>
                        {brandingTheme === 'SYSTEM' && (
                          <Check className="w-4 h-4 text-crimson shrink-0" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Accent Color Selection Row */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-crimson" />
                      <span>Cor de Destaque Global do Sistema (Accent Color)</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {/* 1. Judicial Blue (CNJ Recommended) */}
                      <button
                        type="button"
                        onClick={() => handleAdminSelectAccent('#2563eb')}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-colors text-left cursor-pointer ${
                          brandingAccentColor?.toLowerCase() === '#2563eb' || brandingAccentColor?.toLowerCase() === 'blue'
                            ? 'bg-dark-input border-blue-500 ring-2 ring-blue-500/50 shadow-sm'
                            : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-4 h-4 rounded-full bg-[#2563eb] shrink-0 ring-2 ring-white/20 shadow" />
                          <span className="text-xs font-bold text-white truncate">Azul CNJ</span>
                        </div>
                        {(brandingAccentColor?.toLowerCase() === '#2563eb' || brandingAccentColor?.toLowerCase() === 'blue') && (
                          <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        )}
                      </button>

                      {/* 2. Teal / Emerald */}
                      <button
                        type="button"
                        onClick={() => handleAdminSelectAccent('#0d9488')}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-colors text-left cursor-pointer ${
                          brandingAccentColor?.toLowerCase() === '#0d9488' || brandingAccentColor?.toLowerCase() === 'teal'
                            ? 'bg-dark-input border-teal-500 ring-2 ring-teal-500/50 shadow-sm'
                            : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-4 h-4 rounded-full bg-[#0d9488] shrink-0 ring-2 ring-white/20 shadow" />
                          <span className="text-xs font-bold text-white truncate">Verde Esmeralda</span>
                        </div>
                        {(brandingAccentColor?.toLowerCase() === '#0d9488' || brandingAccentColor?.toLowerCase() === 'teal') && (
                          <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        )}
                      </button>

                      {/* 3. Crimson / Red */}
                      <button
                        type="button"
                        onClick={() => handleAdminSelectAccent('#e63946')}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-colors text-left cursor-pointer ${
                          brandingAccentColor?.toLowerCase() === '#e63946' ||
                          brandingAccentColor?.toLowerCase() === '#e11d48' ||
                          brandingAccentColor?.toLowerCase() === 'red' ||
                          brandingAccentColor?.toLowerCase() === 'crimson'
                            ? 'bg-dark-input border-rose-500 ring-2 ring-rose-500/50 shadow-sm'
                            : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-4 h-4 rounded-full bg-[#e63946] shrink-0 ring-2 ring-white/20 shadow" />
                          <span className="text-xs font-bold text-white truncate">Carmim Clássico</span>
                        </div>
                        {(brandingAccentColor?.toLowerCase() === '#e63946' ||
                          brandingAccentColor?.toLowerCase() === '#e11d48' ||
                          brandingAccentColor?.toLowerCase() === 'red' ||
                          brandingAccentColor?.toLowerCase() === 'crimson') && (
                          <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        )}
                      </button>

                      {/* 4. Purple / Violet */}
                      <button
                        type="button"
                        onClick={() => handleAdminSelectAccent('#7c3aed')}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-colors text-left cursor-pointer ${
                          brandingAccentColor?.toLowerCase() === '#7c3aed' || brandingAccentColor?.toLowerCase() === 'purple'
                            ? 'bg-dark-input border-purple-500 ring-2 ring-purple-500/50 shadow-sm'
                            : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-4 h-4 rounded-full bg-[#7c3aed] shrink-0 ring-2 ring-white/20 shadow" />
                          <span className="text-xs font-bold text-white truncate">Violeta Regimental</span>
                        </div>
                        {(brandingAccentColor?.toLowerCase() === '#7c3aed' || brandingAccentColor?.toLowerCase() === 'purple') && (
                          <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        )}
                      </button>

                      {/* 5. Sovereign Gold / Amber */}
                      <button
                        type="button"
                        onClick={() => handleAdminSelectAccent('#d97706')}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-colors text-left cursor-pointer ${
                          brandingAccentColor?.toLowerCase() === '#d97706' || brandingAccentColor?.toLowerCase() === 'amber'
                            ? 'bg-dark-input border-amber-500 ring-2 ring-amber-500/50 shadow-sm'
                            : 'bg-dark-bg/60 border-dark-border hover:border-dark-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-4 h-4 rounded-full bg-[#d97706] shrink-0 ring-2 ring-white/20 shadow" />
                          <span className="text-xs font-bold text-white truncate">Ouro Soberano</span>
                        </div>
                        {(brandingAccentColor?.toLowerCase() === '#d97706' || brandingAccentColor?.toLowerCase() === 'amber') && (
                          <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </button>

                      {/* 6. Custom Hex */}
                      <div
                        className={`p-2 rounded-lg border flex items-center gap-2 transition-colors ${
                          brandingAccentColor &&
                          ![
                            '#2563eb',
                            '#0d9488',
                            '#e63946',
                            '#e11d48',
                            '#7c3aed',
                            '#d97706',
                            'blue',
                            'teal',
                            'red',
                            'crimson',
                            'purple',
                            'amber',
                          ].includes(brandingAccentColor.toLowerCase())
                            ? 'bg-dark-input border-crimson ring-2 ring-crimson/50'
                            : 'bg-dark-bg/60 border-dark-border'
                        }`}
                      >
                        <input
                          type="color"
                          value={brandingCustomHex.startsWith('#') && (brandingCustomHex.length === 7 || brandingCustomHex.length === 4) ? brandingCustomHex : '#2563eb'}
                          onChange={(e) => {
                            handleAdminSelectAccent(e.target.value);
                          }}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 shrink-0 p-0"
                          title="Escolher cor personalizada"
                        />
                        <input
                          type="text"
                          value={brandingCustomHex}
                          onChange={(e) => {
                            setBrandingCustomHex(e.target.value);
                            if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(e.target.value)) {
                              handleAdminSelectAccent(e.target.value);
                            }
                          }}
                          placeholder="#HEX"
                          className="w-full bg-transparent text-[11px] font-mono text-white focus:outline-none uppercase"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Preview Box & Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-dark-card/90 border border-dark-border">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-dark-muted block">
                        Pré-visualização da Marca na Interface:
                      </span>
                      <div className="p-2.5 rounded-xl bg-dark-sidebar border border-dark-border inline-flex items-center">
                        <JudyLogo
                          size="md"
                          showText={true}
                          systemName={brandingName || 'Open Judy'}
                          subtitle={brandingTagline || undefined}
                          logoUrl={brandingLogoUrl}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          setBrandingName('Open Judy');
                          setBrandingTagline('PODER JUDICIÁRIO • CNJ');
                          setBrandingLogoUrl('');
                          handleAdminSelectTheme('DARK');
                          handleAdminSelectAccent('#2563eb');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-dark-pill hover:bg-dark-input text-xs text-dark-muted hover:text-white border border-dark-border transition-colors"
                      >
                        Restaurar Padrão CNJ
                      </button>

                      <button
                        type="submit"
                        disabled={isSavingBranding}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-xs font-bold text-white shadow-md shadow-crimson/25 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingBranding ? 'Salvando Marca & Tema...' : 'Salvar Identidade & Tema'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-3.5 rounded-xl bg-crimson/10 border border-crimson/30 flex items-center gap-3 text-xs text-slate-200">
                <ShieldCheck className="w-5 h-5 text-crimson shrink-0" />
                <span>
                  Propriedades chave-valor globais mantidas na tabela <code>tb_system_settings</code> do <strong>config-service</strong>.
                </span>
              </div>

              <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-4">
                {settings.map((s) => (
                  <div
                    key={s.key}
                    className="p-4 rounded-2xl bg-dark-card border border-dark-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-crimson-light">{s.key}</span>
                        <span className="text-[11px] uppercase font-bold px-1.5 py-0.5 rounded bg-dark-pill text-dark-muted border border-dark-border">
                          {s.category}
                        </span>
                      </div>
                      {s.description && (
                        <p className="text-xs text-dark-muted mt-0.5">{s.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <input
                        key={`${s.key}-${s.value}`}
                        type="text"
                        defaultValue={s.value}
                        aria-label={`Valor de ${s.key}`}
                        onBlur={(e) => {
                          if (e.target.value !== s.value) {
                            handleUpdateSetting(s.key, e.target.value);
                          }
                        }}
                        className="bg-dark-bg border border-dark-border rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-crimson w-full sm:w-64"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer (Modal Mode Only) */}
        {!isPage && (
          <div className="p-4 border-t border-dark-border bg-dark-bg/60 flex items-center justify-between">
            <button
              type="button"
              onClick={loadAllConfigs}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-xs font-medium text-dark-muted hover:text-white transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Recarregar do config-service</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-dark-pill hover:bg-dark-card border border-dark-border text-white transition-colors"
            >
              Concluir &amp; Fechar
            </button>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* SUB-MODAL 1: EDIT PROMPT TEMPLATE */}
      {/* ================================================================= */}
      {editingPrompt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-dark-border bg-dark-bg/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-crimson" />
                <h3 className="text-sm font-bold text-white">
                  Editar Template de Prompt: <span className="font-mono text-crimson-light">{editingPrompt.code}</span>
                </h3>
              </div>
              <button
                onClick={() => setEditingPrompt(null)}
                aria-label="Fechar modal de edição de prompt"
                className="p-1.5 rounded-lg text-dark-muted hover:text-white touch-target-expand"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePrompt} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Prompt</label>
                  <input
                    type="text"
                    value={editingPrompt.name}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-crimson"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Modelo de IA Padrão</label>
                  <select
                    value={editingPrompt.defaultModel || 'gemini-4-argon'}
                    aria-label="Modelo de IA Padrão"
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, defaultModel: e.target.value })}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-crimson font-mono"
                  >
                    <option value="gemini-4-argon">gemini-4-argon — Gemini 4 Argon (Texto, Atas &amp; RAG)</option>
                    <option value="gemini-3.8-flash">gemini-3.8-flash — Gemini 3.8 Flash (Vídeo &amp; Áudio)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Temperatura (Inferência)</span>
                    <span className="font-mono text-crimson">{editingPrompt.defaultTemperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.8"
                    step="0.05"
                    aria-label="Temperatura de inferência"
                    aria-valuetext={String(editingPrompt.defaultTemperature || 0.2)}
                    value={editingPrompt.defaultTemperature || 0.2}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, defaultTemperature: parseFloat(e.target.value) })}
                    className="w-full accent-crimson cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Output Tokens</label>
                  <input
                    type="number"
                    value={editingPrompt.defaultMaxTokens || 8192}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, defaultMaxTokens: parseInt(e.target.value) || 8192 })}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-crimson font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  System Instruction (Papel Jurídico & Regras da IA)
                </label>
                <textarea
                  rows={4}
                  value={editingPrompt.systemInstruction || ''}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, systemInstruction: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-crimson font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Template de Prompt do Usuário (Utilize {'{{variavel}}'} para interpolação dinâmica)
                </label>
                <textarea
                  rows={14}
                  value={editingPrompt.userPromptTemplate}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, userPromptTemplate: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-crimson font-mono leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setEditingPrompt(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-dark-muted hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-xs font-bold text-white shadow-md transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Prompt'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-MODAL 2: TEST / RENDER PROMPT PREVIEW */}
      {/* ================================================================= */}
      {testingPrompt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-dark-border bg-dark-bg/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Testar Renderização: <span className="font-mono text-emerald-300">{testingPrompt.code}</span>
                </h3>
              </div>
              <button
                onClick={() => setTestingPrompt(null)}
                aria-label="Fechar modal de teste de prompt"
                className="p-1.5 rounded-lg text-dark-muted hover:text-white touch-target-expand"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-200 mb-2">
                  Variáveis de Teste
                </h4>
                <div className="space-y-2">
                  {(testingPrompt.variables || []).map((v) => (
                    <div key={v} className="flex items-center gap-3">
                      <span className="font-mono text-xs text-crimson w-40 truncate">{`{{${v}}}`}</span>
                      <input
                        type="text"
                        aria-label={`Variável ${v}`}
                        value={testVariables[v] || ''}
                        onChange={(e) => setTestVariables({ ...testVariables, [v]: e.target.value })}
                        className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestRenderPrompt}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md transition"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Executar Interpolação no config-service</span>
                </button>
              </div>

              {renderedPreview && (
                <div className="space-y-3 pt-3 border-t border-dark-border animate-in fade-in">
                  <h4 className="text-xs font-bold text-emerald-300">
                    Resultado da Renderização Final
                  </h4>

                  {renderedPreview.systemInstruction && (
                    <div>
                      <span className="text-[11px] text-dark-muted block mb-1">System Instruction:</span>
                      <div className="p-3 rounded-xl bg-dark-bg border border-dark-border text-xs text-slate-200 font-mono whitespace-pre-wrap">
                        {renderedPreview.systemInstruction}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-[11px] text-dark-muted block mb-1">User Prompt:</span>
                    <div className="p-3 rounded-xl bg-dark-bg border border-dark-border text-xs text-slate-200 font-mono whitespace-pre-wrap">
                      {renderedPreview.userPrompt}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-MODAL 3: EDIT AI MODEL */}
      {/* ================================================================= */}
      {editingModel && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-dark-border bg-dark-bg/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white">
                  Configurar Modelo de IA: <span className="font-mono text-sky-300">{editingModel.modelId}</span>
                </h3>
              </div>
              <button
                onClick={() => setEditingModel(null)}
                aria-label="Fechar modal de configuração de modelo"
                className="p-1.5 rounded-lg text-dark-muted hover:text-white touch-target-expand"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModel} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome de Exibição</label>
                <input
                  type="text"
                  value={editingModel.name}
                  onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={editingModel.description || ''}
                  onChange={(e) => setEditingModel({ ...editingModel, description: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Janela de Contexto (Tokens)</label>
                  <input
                    type="number"
                    value={editingModel.contextWindowTokens}
                    onChange={(e) => setEditingModel({ ...editingModel, contextWindowTokens: parseInt(e.target.value) || 0 })}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Output Tokens</label>
                  <input
                    type="number"
                    value={editingModel.maxOutputTokens}
                    onChange={(e) => setEditingModel({ ...editingModel, maxOutputTokens: parseInt(e.target.value) || 0 })}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setEditingModel(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-dark-muted hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Modelo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-MODAL 4: EDIT DASHBOARD */}
      {/* ================================================================= */}
      {editingDashboard && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-dark-border bg-dark-bg/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Editar Dashboard: <span className="font-mono text-amber-300">{editingDashboard.code}</span>
                </h3>
              </div>
              <button
                onClick={() => setEditingDashboard(null)}
                aria-label="Fechar modal de edição de dashboard"
                className="p-1.5 rounded-lg text-dark-muted hover:text-white touch-target-expand"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDashboard} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Painel</label>
                <input
                  type="text"
                  value={editingDashboard.name}
                  onChange={(e) => setEditingDashboard({ ...editingDashboard, name: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Perfil de Destino (Role)</label>
                <select
                  value={editingDashboard.targetRole}
                  aria-label="Perfil de Destino (Role)"
                  onChange={(e) => setEditingDashboard({ ...editingDashboard, targetRole: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="MAGISTRADO">MAGISTRADO</option>
                  <option value="ASSESSOR">ASSESSOR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="ALL">TODOS (Geral)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Layout Type</label>
                <select
                  value={editingDashboard.layoutType}
                  aria-label="Layout Type"
                  onChange={(e) => setEditingDashboard({ ...editingDashboard, layoutType: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="GRID">Grade Responsiva (Grid)</option>
                  <option value="TABBED">Abas Temáticas (Tabbed)</option>
                  <option value="COMPACT">Compacto (Compact)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setEditingDashboard(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-dark-muted hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Dashboard'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-MODAL 5: EDIT NOTIFICATION */}
      {/* ================================================================= */}
      {editingNotification && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-dark-border bg-dark-bg/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">
                  Configurar Notificação: <span className="font-mono text-purple-300">{editingNotification.code}</span>
                </h3>
              </div>
              <button
                onClick={() => setEditingNotification(null)}
                aria-label="Fechar modal de configuração de notificação"
                className="p-1.5 rounded-lg text-dark-muted hover:text-white touch-target-expand"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNotification} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome da Notificação</label>
                <input
                  type="text"
                  value={editingNotification.name}
                  onChange={(e) => setEditingNotification({ ...editingNotification, name: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Prioridade Padrão</label>
                <select
                  value={editingNotification.defaultPriority}
                  aria-label="Prioridade Padrão"
                  onChange={(e) => setEditingNotification({ ...editingNotification, defaultPriority: e.target.value as NotificationPriority })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="LOW">Baixa (LOW)</option>
                  <option value="NORMAL">Normal (NORMAL)</option>
                  <option value="HIGH">Alta (HIGH)</option>
                  <option value="CRITICAL">Crítica (CRITICAL)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Template de Título</label>
                <input
                  type="text"
                  value={editingNotification.templateTitle}
                  onChange={(e) => setEditingNotification({ ...editingNotification, templateTitle: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Template do Corpo da Mensagem</label>
                <textarea
                  rows={4}
                  value={editingNotification.templateBody}
                  onChange={(e) => setEditingNotification({ ...editingNotification, templateBody: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setEditingNotification(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-dark-muted hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Notificação'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
