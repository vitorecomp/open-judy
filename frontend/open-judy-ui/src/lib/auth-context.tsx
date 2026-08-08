'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, UserPermissions, UserConfiguration, SystemConfiguration, getUserPermissions } from './types';
import { api } from './api';

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
];

const DEFAULT_CONFIG: UserConfiguration = {
  userId: 'a0000000-0000-0000-0000-000000000001',
  theme: 'DARK',
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
};

const DEFAULT_SYSTEM_CONFIG: SystemConfiguration = {
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
    alloyDbVectorDimensions: 768
  }
};

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
  isPreferencesOpen: boolean;
  setIsPreferencesOpen: (open: boolean) => void;
  preferencesInitialTab?: 'ui' | 'audio' | 'ai' | 'notifications' | 'system';
  openPreferencesWithTab: (tab?: 'ui' | 'audio' | 'ai' | 'notifications' | 'system') => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [activeUsername, setActiveUsername] = useState<string>('camila.vasconcelos');
  const [config, setConfig] = useState<UserConfiguration>(DEFAULT_CONFIG);
  const [systemConfig, setSystemConfig] = useState<SystemConfiguration>(DEFAULT_SYSTEM_CONFIG);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [preferencesInitialTab, setPreferencesInitialTab] = useState<'ui' | 'audio' | 'ai' | 'notifications' | 'system'>('ui');
  const [isLoading, setIsLoading] = useState(false);

  const [user, setUser] = useState<UserProfile>(() => {
    const preset = PROFILE_PRESETS[0];
    return {
      id: 'a0000000-0000-0000-0000-000000000001',
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

  useEffect(() => {
    // 1. Load active profile from storage
    const savedProfile = localStorage.getItem('openjudy_active_profile');
    if (savedProfile) {
      const match = PROFILE_PRESETS.find(
        (p) => p.username === savedProfile || p.role.toUpperCase() === savedProfile.toUpperCase()
      );
      if (match) {
        setActiveUsername(match.username);
        applyPreset(match);
      }
    }

    // 2. Load configurations from localStorage or API
    const savedConfig = localStorage.getItem('openjudy_user_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        applyThemeToDOM(parsed.theme || 'DARK');
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
        } else {
          applyThemeToDOM('dark');
        }
      });
    }

    // 3. Load system configurations
    api.getSystemConfig().then((sysData) => {
      if (sysData) {
        setSystemConfig((prev) => ({ ...prev, ...sysData }));
      }
    });
  }, []);

  const applyPreset = (preset: ProfilePreset) => {
    setUser({
      id: preset.username === 'camila.vasconcelos'
        ? 'a0000000-0000-0000-0000-000000000001'
        : preset.username === 'marcos.assessor'
        ? 'a0000000-0000-0000-0000-000000000002'
        : 'a0000000-0000-0000-0000-000000000004',
      username: preset.username,
      email: preset.email,
      fullName: preset.name,
      role: preset.role,
      courtJurisdiction: preset.jurisdiction,
      status: 'ACTIVE',
      avatarUrl: preset.avatarUrl,
      configuration: config,
      createdAt: '2026-08-06T10:00:00Z',
      updatedAt: '2026-08-06T10:00:00Z',
    });
  };

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

  const updateConfig = async (newConfig: Partial<UserConfiguration>) => {
    const updated = { ...config, ...newConfig, updatedAt: new Date().toISOString() };
    setConfig(updated);
    localStorage.setItem('openjudy_user_config', JSON.stringify(updated));

    if (updated.theme) {
      applyThemeToDOM(updated.theme);
    }

    try {
      await api.updateUserConfig(user.id, updated);
    } catch (e) {
      console.warn('user-service offline fallback, updated locally');
    }
  };

  const resetConfig = async () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.setItem('openjudy_user_config', JSON.stringify(DEFAULT_CONFIG));
    applyThemeToDOM(DEFAULT_CONFIG.theme);
    try {
      await api.updateUserConfig(user.id, DEFAULT_CONFIG);
    } catch (e) {}
  };

  const updateSystemConfig = async (newSysConfig: Partial<SystemConfiguration>) => {
    const updated = { ...systemConfig, ...newSysConfig, updatedAt: new Date().toISOString() };
    setSystemConfig(updated);
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
        isPreferencesOpen,
        setIsPreferencesOpen,
        preferencesInitialTab,
        openPreferencesWithTab,
        isLoading,
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
