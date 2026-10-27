'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole, UserPermissions, UserConfiguration, SystemConfiguration, getUserPermissions } from './types';
import { api } from './api';
import {
  KEYCLOAK_CONFIG,
  extractUserFromKeycloakToken,
  loginWithKeycloakDirect,
  getKeycloakLoginUrl,
  getKeycloakLogoutUrl,
  generateMockKeycloakToken,
  getStoredKeycloakToken,
  setStoredKeycloakToken,
  clearStoredKeycloakToken,
} from './keycloak';

export interface ProfilePreset {
  role: UserRole;
  username: string;
  name: string;
  title: string;
  email: string;
  jurisdiction: string;
  description: string;
  badgeColor: string;
  avatarUrl: string;
}

export const PROFILE_PRESETS: ProfilePreset[] = [
  {
    role: 'MAGISTRADO',
    username: 'camila.vasconcelos',
    name: 'Dra. Camila Vasconcelos',
    title: 'Juíza de Direito Titular',
    email: 'camila.vasconcelos@tjsp.jus.br',
    jurisdiction: '3ª Vara Cível Central da Comarca de São Paulo/SP',
    description: 'Condução de audiências, análise jurídica integral, aprovação e assinatura digital de atas',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    avatarUrl: 'https://ui-avatars.com/api/?name=Camila+Vasconcelos&background=e63946&color=fff',
  },
  {
    role: 'ASSESSOR',
    username: 'marcos.assessor',
    name: 'Marcos Vinicius de Souza',
    title: 'Assessor de Gabinete',
    email: 'marcos.assessor@tjsp.jus.br',
    jurisdiction: '3ª Vara Cível Central da Comarca de São Paulo/SP',
    description: 'Elaboração de minutas de atas, análise de contradições, pesquisas jurídicas e suporte ao gabinete',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    avatarUrl: 'https://ui-avatars.com/api/?name=Marcos+Souza&background=4f46e5&color=fff',
  },
  {
    role: 'ADMIN',
    username: 'admin.judy',
    name: 'Administrador Geral Open Judy',
    title: 'Administrador do Sistema',
    email: 'admin@openjudy.org',
    jurisdiction: 'Tribunal de Justiça - Coordenação de TI e IA',
    description: 'Acesso irrestrito a usuários, configurações globais, modelos de IA e auditoria',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    avatarUrl: 'https://ui-avatars.com/api/?name=Open+Judy+Admin&background=10b981&color=fff',
  },
  {
    role: 'ADVOGADO',
    username: 'lucas.menezes',
    name: 'Dr. Lucas Menezes Braga',
    title: 'Advogado Constituído',
    email: 'lucas.menezes@advocacia.com.br',
    jurisdiction: 'São Paulo/SP (OAB/SP 389.122)',
    description: 'Consulta pública de autos, reprodução de audiências e revisão de transcrições',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    avatarUrl: 'https://ui-avatars.com/api/?name=Lucas+Menezes&background=0284c7&color=fff',
  },
];

export const ACCENT_PRESETS = [
  { id: 'teal', name: 'Teal', color: '#0d9488', dark: '#0f766e', light: '#2dd4bf', glow: 'rgba(13, 148, 136, 0.25)' },
  { id: 'red', name: 'Red', color: '#e63946', dark: '#be123c', light: '#fb7185', glow: 'rgba(230, 57, 70, 0.25)' },
  { id: 'orange', name: 'Orange', color: '#ea580c', dark: '#c2410c', light: '#fb923c', glow: 'rgba(234, 88, 12, 0.25)' },
];

export function hexToRgba(hex: string, alpha: number = 0.25): string {
  let clean = hex.replace('#', '');
  if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
  const num = parseInt(clean, 16) || 0;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function adjustHexBrightness(hex: string, percent: number): string {
  let clean = hex.replace('#', '');
  if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
  const num = parseInt(clean, 16) || 0;
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 255) + Math.round(255 * (percent / 100));
  let b = (num & 255) + Math.round(255 * (percent / 100));
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function applyAccentColorToDOM(colorOrPreset: string) {
  if (typeof document === 'undefined') return;
  const preset = ACCENT_PRESETS.find(
    (p) =>
      p.id === colorOrPreset?.toLowerCase() ||
      p.color.toLowerCase() === colorOrPreset?.toLowerCase()
  );

  let primary = colorOrPreset || '#e63946';
  let dark = '#be123c';
  let light = '#fb7185';
  let glow = 'rgba(230, 57, 70, 0.25)';

  if (preset) {
    primary = preset.color;
    dark = preset.dark;
    light = preset.light;
    glow = preset.glow;
  } else if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(colorOrPreset)) {
    primary = colorOrPreset;
    dark = adjustHexBrightness(colorOrPreset, -20);
    light = adjustHexBrightness(colorOrPreset, 25);
    glow = hexToRgba(colorOrPreset, 0.25);
  }

  document.documentElement.style.setProperty('--accent-color', primary);
  document.documentElement.style.setProperty('--accent-color-dark', dark);
  document.documentElement.style.setProperty('--accent-color-light', light);
  document.documentElement.style.setProperty('--accent-color-glow', glow);
  document.documentElement.setAttribute('data-accent', colorOrPreset || 'red');
}

const DEFAULT_CONFIG: UserConfiguration = {
  userId: 'a0000000-0000-0000-0000-000000000001',
  theme: 'DARK',
  accentColor: '#e63946',
  language: 'pt-BR',
  fontSize: 'MEDIUM',
  highContrast: false,
  compactView: false,
  defaultLandingPage: 'DASHBOARD',
  playbackRate: 1.0,
  autoPlayNextSegment: true,
  autoScrollTranscript: true,
  showWaveform: true,
  skipSilence: false,
  defaultSkipSeconds: 5,
  autoGenerateAtaDraft: true,
  autoDetectContradictions: true,
  defaultAtaTemplate: 'PADRAO_CIVEL',
  aiTemperature: 0.2,
  enableCopilotSuggestions: true,
  citationStyle: 'TIMESTAMPS_ONLY',
  emailNotifications: true,
  hearingCompletedAlert: true,
  contradictionDetectedAlert: true,
  ataReadyAlert: true,
  dailyDigest: false,
  autoSignApprovedMinutes: false,
  judgeSignatureTitle: 'Juíza de Direito Titular da 3ª Vara Cível Central',
  hearingsViewMode: 'TABLE',
};

const DEFAULT_SYSTEM_CONFIG: SystemConfiguration = {
  systemName: 'Open Judy',
  systemTagline: 'IA Judiciária Zero-Trust (Keycloak IAM)',
  logoUrl: '',
  accentColor: '#e63946',
  geminiModel: 'gemini-2.0-flash',
  geminiEmbeddingModel: 'text-embedding-004',
  maxAudioDurationMinutes: 240,
  vectorSimilarityThreshold: 0.75,
  zeroTrustEnforced: true,
  auditLogRetentionDays: 365,
  maintenanceMode: false,
  defaultLanguage: 'pt-BR',
  audioStorageBucket: 'open-judy-audio-archive',
  systemProperties: {
    copilotMaxHistoryTurns: 20,
    enableMultimodalDiarization: true,
    alloyDbVectorDimensions: 768,
    keycloakRealm: 'open-judy',
    keycloakAuthServerUrl: 'http://localhost:8080/realms/open-judy',
  }
};

export type KeycloakStatus = 'AUTHENTICATED' | 'DEV_MODE' | 'CONNECTING' | 'UNAUTHENTICATED';

interface AuthContextType {
  user: UserProfile;
  role: UserRole;
  permissions: UserPermissions;
  currentPreset: ProfilePreset;
  availablePresets: ProfilePreset[];
  switchProfile: (roleOrUsername: 'MAGISTRADO' | 'ASSESSOR' | 'ADMIN' | string) => void;
  config: UserConfiguration;
  updateConfig: (newConfig: Partial<UserConfiguration>) => Promise<void>;
  resetConfig: () => Promise<void>;
  systemConfig: SystemConfiguration;
  updateSystemConfig: (newSysConfig: Partial<SystemConfiguration>) => Promise<void>;
  systemName: string;
  systemTagline: string;
  logoUrl: string;
  accentColor: string;
  setAccentColor: (color: string) => Promise<void>;
  isPreferencesOpen: boolean;
  setIsPreferencesOpen: (open: boolean) => void;
  preferencesInitialTab?: 'ui' | 'audio' | 'ai' | 'notifications' | 'system';
  openPreferencesWithTab: (tab?: 'ui' | 'audio' | 'ai' | 'notifications' | 'system') => void;
  isAdminConfigOpen: boolean;
  setIsAdminConfigOpen: (open: boolean) => void;
  adminConfigInitialTab?: 'prompts' | 'models' | 'dashboards' | 'notifications' | 'settings';
  openAdminConfig: (tab?: 'prompts' | 'models' | 'dashboards' | 'notifications' | 'settings') => void;
  isLoading: boolean;

  // Keycloak OIDC Authentication Additions
  authProvider: 'KEYCLOAK';
  isAuthenticated: boolean;
  keycloakToken: string | null;
  keycloakStatus: KeycloakStatus;
  isKeycloakModalOpen: boolean;
  setIsKeycloakModalOpen: (open: boolean) => void;
  loginWithKeycloak: (username?: string, password?: string) => Promise<boolean>;
  loginWithKeycloakRedirect: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [activeUsername, setActiveUsername] = useState<string>('camila.vasconcelos');
  const [config, setConfig] = useState<UserConfiguration>(DEFAULT_CONFIG);
  const [systemConfig, setSystemConfig] = useState<SystemConfiguration>(DEFAULT_SYSTEM_CONFIG);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [preferencesInitialTab, setPreferencesInitialTab] = useState<'ui' | 'audio' | 'ai' | 'notifications' | 'system'>('ui');
  const [isAdminConfigOpen, setIsAdminConfigOpen] = useState(false);
  const [adminConfigInitialTab, setAdminConfigInitialTab] = useState<'prompts' | 'models' | 'dashboards' | 'notifications' | 'settings'>('prompts');
  const [isLoading, setIsLoading] = useState(false);

  // Keycloak States
  const [keycloakToken, setKeycloakToken] = useState<string | null>(null);
  const [keycloakStatus, setKeycloakStatus] = useState<KeycloakStatus>('DEV_MODE');
  const [isKeycloakModalOpen, setIsKeycloakModalOpen] = useState(false);

  const [user, setUser] = useState<UserProfile>(() => {
    const preset = PROFILE_PRESETS[0];
    return {
      id: 'a0000000-0000-0000-0000-000000000001',
      keycloakId: 'u0000000-0000-0000-0000-000000000001',
      username: preset.username,
      email: preset.email,
      fullName: preset.name,
      role: preset.role,
      courtJurisdiction: preset.jurisdiction,
      status: 'ACTIVE',
      avatarUrl: preset.avatarUrl,
      configuration: DEFAULT_CONFIG,
      createdAt: '2026-08-06T10:00:00Z',
      updatedAt: '2026-08-06T10:00:00Z',
    };
  });

  // Apply theme to document
  const applyThemeToDOM = (theme: string) => {
    const effectiveTheme =
      theme === 'SYSTEM'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme.toLowerCase();
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  };

  const applyPreset = useCallback((preset: ProfilePreset) => {
    const keycloakSub =
      preset.username === 'camila.vasconcelos'
        ? 'u0000000-0000-0000-0000-000000000001'
        : preset.username === 'marcos.assessor'
        ? 'u0000000-0000-0000-0000-000000000002'
        : preset.username === 'lucas.menezes'
        ? 'u0000000-0000-0000-0000-000000000004'
        : 'u0000000-0000-0000-0000-000000000003';

    const userId =
      preset.username === 'camila.vasconcelos'
        ? 'a0000000-0000-0000-0000-000000000001'
        : preset.username === 'marcos.assessor'
        ? 'a0000000-0000-0000-0000-000000000002'
        : preset.username === 'lucas.menezes'
        ? 'a0000000-0000-0000-0000-000000000003'
        : 'a0000000-0000-0000-0000-000000000004';

    setUser((prev) => ({
      id: userId,
      keycloakId: keycloakSub,
      username: preset.username,
      email: preset.email,
      fullName: preset.name,
      role: preset.role,
      courtJurisdiction: preset.jurisdiction,
      status: 'ACTIVE',
      avatarUrl: preset.avatarUrl,
      configuration: prev.configuration,
      createdAt: '2026-08-06T10:00:00Z',
      updatedAt: '2026-08-06T10:00:00Z',
    }));

    // Generate simulated Keycloak JWT token so outgoing API requests pass valid Keycloak OIDC headers
    const mockToken = generateMockKeycloakToken(preset);
    setKeycloakToken(mockToken);
    setStoredKeycloakToken(mockToken);
    setKeycloakStatus('DEV_MODE');
  }, []);

  useEffect(() => {
    // 1. Check for stored Keycloak token or active profile
    const storedToken = getStoredKeycloakToken();
    if (storedToken) {
      const extracted = extractUserFromKeycloakToken(storedToken);
      if (extracted) {
        setKeycloakToken(storedToken);
        setKeycloakStatus('AUTHENTICATED');
        setActiveUsername(extracted.username);
        setUser((prev) => ({
          ...prev,
          keycloakId: extracted.keycloakId,
          username: extracted.username,
          email: extracted.email,
          fullName: extracted.fullName,
          role: extracted.role,
          courtJurisdiction: extracted.courtJurisdiction,
          documentNumber: extracted.documentNumber,
          avatarUrl: extracted.avatarUrl,
        }));
      }
    } else {
      const savedProfile = localStorage.getItem('openjudy_active_profile');
      if (savedProfile) {
        const match = PROFILE_PRESETS.find(
          (p) => p.username === savedProfile || p.role.toUpperCase() === savedProfile.toUpperCase()
        );
        if (match) {
          setActiveUsername(match.username);
          applyPreset(match);
        }
      } else {
        applyPreset(PROFILE_PRESETS[0]);
      }
    }

    // 2. Load configurations from localStorage or API
    const savedConfig = localStorage.getItem('openjudy_user_config');
    const savedAccent = localStorage.getItem('openjudy_accent_color');
    if (savedAccent) {
      applyAccentColorToDOM(savedAccent);
    }

    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        applyThemeToDOM(parsed.theme || 'DARK');
        if (parsed.accentColor) {
          applyAccentColorToDOM(parsed.accentColor);
        }
      } catch (_) {
        applyThemeToDOM('dark');
      }
    } else {
      // Fetch from user-service
      api.getCurrentUser().then((userData) => {
        if (userData && userData.configuration) {
          const merged = { ...DEFAULT_CONFIG, ...userData.configuration };
          setConfig(merged);
          applyThemeToDOM(merged.theme);
          if (merged.accentColor) {
            applyAccentColorToDOM(merged.accentColor);
          }
        } else {
          applyThemeToDOM('dark');
        }
      });
    }

    // 3. Load system configurations
    api.getSystemConfig().then((sysData) => {
      if (sysData) {
        setSystemConfig((prev) => ({ ...prev, ...sysData }));
        if (sysData.accentColor && !savedAccent) {
          applyAccentColorToDOM(sysData.accentColor);
        }
      }
    });
  }, [applyPreset]);

  const switchProfile = (roleOrUsername: string) => {
    const target = roleOrUsername.toLowerCase();
    const match = PROFILE_PRESETS.find(
      (p) =>
        p.username.toLowerCase() === target ||
        p.role.toLowerCase() === target ||
        (target === 'acessor' && p.role === 'ASSESSOR')
    );

    if (match) {
      setActiveUsername(match.username);
      localStorage.setItem('openjudy_active_profile', match.username);
      applyPreset(match);
    }
  };

  const loginWithKeycloak = async (username: string = 'camila.vasconcelos', password: string = 'judy123'): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await loginWithKeycloakDirect(username, password);
      if (result && result.user) {
        setKeycloakToken(result.accessToken);
        setKeycloakStatus('AUTHENTICATED');
        setActiveUsername(result.user.username);
        setUser((prev) => ({
          ...prev,
          keycloakId: result.user.keycloakId,
          username: result.user.username,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
          courtJurisdiction: result.user.courtJurisdiction,
          documentNumber: result.user.documentNumber,
          avatarUrl: result.user.avatarUrl,
        }));
        localStorage.setItem('openjudy_active_profile', result.user.username);
        setIsKeycloakModalOpen(false);
        return true;
      }
    } catch (e) {
      console.error('Keycloak login error:', e);
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const loginWithKeycloakRedirect = () => {
    if (typeof window !== 'undefined') {
      window.location.href = getKeycloakLoginUrl();
    }
  };

  const logout = () => {
    clearStoredKeycloakToken();
    setKeycloakToken(null);
    setKeycloakStatus('UNAUTHENTICATED');
    // Re-initialize to default preset in dev mode
    applyPreset(PROFILE_PRESETS[0]);
  };

  const updateConfig = async (newConfig: Partial<UserConfiguration>) => {
    const updated = { ...config, ...newConfig, updatedAt: new Date().toISOString() };
    setConfig(updated);
    localStorage.setItem('openjudy_user_config', JSON.stringify(updated));

    if (updated.theme) {
      applyThemeToDOM(updated.theme);
    }

    if (updated.accentColor) {
      applyAccentColorToDOM(updated.accentColor);
      localStorage.setItem('openjudy_accent_color', updated.accentColor);
    }

    try {
      await api.updateUserConfig(user.id, updated);
    } catch (e) {
      console.warn('user-service offline fallback, updated locally');
    }
  };

  const setAccentColor = async (color: string) => {
    applyAccentColorToDOM(color);
    localStorage.setItem('openjudy_accent_color', color);
    await updateConfig({ accentColor: color });
    if (user.role === 'ADMIN') {
      await updateSystemConfig({ accentColor: color });
      try {
        await api.updateSystemSetting('system.accent_color', { value: color });
      } catch (_) {}
    }
  };

  const resetConfig = async () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.setItem('openjudy_user_config', JSON.stringify(DEFAULT_CONFIG));
    applyThemeToDOM(DEFAULT_CONFIG.theme);
    applyAccentColorToDOM(DEFAULT_CONFIG.accentColor || '#e63946');
    try {
      await api.updateUserConfig(user.id, DEFAULT_CONFIG);
    } catch (e) {}
  };

  const updateSystemConfig = async (newSysConfig: Partial<SystemConfiguration>) => {
    const updated = { ...systemConfig, ...newSysConfig, updatedAt: new Date().toISOString() };
    setSystemConfig(updated);
    if (updated.accentColor) {
      applyAccentColorToDOM(updated.accentColor);
      localStorage.setItem('openjudy_accent_color', updated.accentColor);
    }
    try {
      await api.updateSystemConfig(updated);
    } catch (e) {
      console.warn('user-service offline fallback, updated system config locally');
    }
  };

  const openPreferencesWithTab = (tab: 'ui' | 'audio' | 'ai' | 'notifications' | 'system' = 'ui') => {
    setPreferencesInitialTab(tab);
    setIsPreferencesOpen(true);
  };

  const openAdminConfig = (tab: 'prompts' | 'models' | 'dashboards' | 'notifications' | 'settings' = 'prompts') => {
    setAdminConfigInitialTab(tab);
    setIsAdminConfigOpen(true);
  };

  const currentPreset =
    PROFILE_PRESETS.find((p) => p.username === activeUsername || p.role === user.role) ||
    PROFILE_PRESETS[0];

  const permissions = getUserPermissions(user.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user.role,
        permissions,
        currentPreset,
        availablePresets: PROFILE_PRESETS,
        switchProfile,
        config,
        updateConfig,
        resetConfig,
        systemConfig,
        updateSystemConfig,
        systemName: systemConfig.systemName || 'Open Judy',
        systemTagline: systemConfig.systemTagline || 'IA Judiciária Zero-Trust (Keycloak IAM)',
        logoUrl: systemConfig.logoUrl || '',
        accentColor: config.accentColor || systemConfig.accentColor || '#e63946',
        setAccentColor,
        isPreferencesOpen,
        setIsPreferencesOpen,
        preferencesInitialTab,
        openPreferencesWithTab,
        isAdminConfigOpen,
        setIsAdminConfigOpen,
        adminConfigInitialTab,
        openAdminConfig,
        isLoading,

        // Keycloak Additions
        authProvider: 'KEYCLOAK',
        isAuthenticated: !!keycloakToken,
        keycloakToken,
        keycloakStatus,
        isKeycloakModalOpen,
        setIsKeycloakModalOpen,
        loginWithKeycloak,
        loginWithKeycloakRedirect,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
