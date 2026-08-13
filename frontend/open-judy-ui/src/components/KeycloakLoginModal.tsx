'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { KEYCLOAK_CONFIG } from '@/lib/keycloak';
import JudyLogo from '@/components/JudyLogo';
import {
  X,
  KeyRound,
  ShieldCheck,
  Lock,
  User,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Server,
  Fingerprint,
  Cpu,
  LogIn,
  LogOut,
  RefreshCw
} from 'lucide-react';

interface KeycloakLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeycloakLoginModal({ isOpen, onClose }: KeycloakLoginModalProps) {
  const {
    user,
    role,
    isAuthenticated,
    keycloakToken,
    keycloakStatus,
    loginWithKeycloak,
    loginWithKeycloakRedirect,
    logout,
    switchProfile,
    systemName
  } = useAuth();

  const [username, setUsername] = useState('camila.vasconcelos');
  const [password, setPassword] = useState('judy123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDirectLogin = async (loginUser: string, loginPass: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const ok = await loginWithKeycloak(loginUser, loginPass);
      if (ok) {
        setSuccessMessage(`Autenticado com sucesso via Keycloak como ${loginUser}`);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setErrorMessage('Não foi possível autenticar no Keycloak. Verifique se o servidor está ativo na porta 8080.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao conectar ao Keycloak');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPreset = (presetUsername: string) => {
    setUsername(presetUsername);
    setPassword('judy123');
    handleDirectLogin(presetUsername, 'judy123');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-dark-card border border-dark-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-border/80 flex items-center justify-between bg-dark-bg/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-crimson/20 border border-crimson/40 flex items-center justify-center text-crimson">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Autenticação Keycloak IAM
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  OIDC Zero-Trust
                </span>
              </h2>
              <p className="text-xs text-dark-muted">
                Provedor de Identidade e Controle de Acesso Baseado em Papéis (RBAC)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-dark-muted hover:text-white hover:bg-dark-pill transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Status Banner */}
          <div className="p-3.5 rounded-xl bg-dark-input/80 border border-dark-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
              <div>
                <p className="font-semibold text-white">
                  Realm: <span className="font-mono text-crimson">{KEYCLOAK_CONFIG.realm}</span>
                </p>
                <p className="text-[11px] text-dark-muted font-mono">
                  {KEYCLOAK_CONFIG.url} (Client: {KEYCLOAK_CONFIG.clientId})
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {keycloakStatus}
            </span>
          </div>

          {/* Current Session Info */}
          <div className="p-3.5 rounded-xl bg-dark-card border border-dark-border/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-dark-muted uppercase font-bold text-[10px] tracking-wider">
                Usuário Conectado
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-dark-pill text-slate-200">
                {role}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-dark-border">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-crimson flex items-center justify-center text-white font-bold">
                    {user.fullName.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{user.fullName}</p>
                <p className="text-dark-muted text-[11px] truncate">{user.email}</p>
                {user.keycloakId && (
                  <p className="text-dark-muted text-[9px] font-mono truncate">Keycloak ID: {user.keycloakId}</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Access Profiles (Judicial Presets) */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-crimson" />
              Acesso Rápido - Perfis Homologados no Keycloak:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickPreset('camila.vasconcelos')}
                disabled={isLoading}
                className="p-2.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border hover:border-rose-500/50 text-left transition group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Magistrada
                  </span>
                </div>
                <p className="font-bold text-white text-xs truncate">Dra. Camila</p>
                <p className="text-[10px] text-dark-muted truncate">camila.vasconcelos</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickPreset('marcos.assessor')}
                disabled={isLoading}
                className="p-2.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border hover:border-indigo-500/50 text-left transition group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Assessor
                  </span>
                </div>
                <p className="font-bold text-white text-xs truncate">Marcos Souza</p>
                <p className="text-[10px] text-dark-muted truncate">marcos.assessor</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickPreset('admin.judy')}
                disabled={isLoading}
                className="p-2.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border hover:border-emerald-500/50 text-left transition group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Admin
                  </span>
                </div>
                <p className="font-bold text-white text-xs truncate">Admin Judy</p>
                <p className="text-[10px] text-dark-muted truncate">admin.judy</p>
              </button>
            </div>
          </div>

          {/* Direct Keycloak Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleDirectLogin(username, password);
            }}
            className="p-4 rounded-xl bg-dark-input/60 border border-dark-border space-y-3"
          >
            <div className="space-y-1">
              <label className="font-medium text-slate-300">Usuário Keycloak / E-mail</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-dark-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="camila.vasconcelos ou usuario@tjsp.jus.br"
                  className="w-full pl-9 pr-3 py-2 bg-dark-card border border-dark-border rounded-xl text-white text-xs focus:outline-none focus:border-crimson transition"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-300">Senha</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-dark-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-dark-card border border-dark-border rounded-xl text-white text-xs focus:outline-none focus:border-crimson transition"
                  required
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-crimson hover:bg-crimson-dark text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-crimson/20"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Autenticando via Keycloak...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Entrar com Credenciais Keycloak
                </>
              )}
            </button>
          </form>

          {/* Keycloak SSO Redirect Option */}
          <div className="pt-2 border-t border-dark-border/60 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={loginWithKeycloakRedirect}
              className="flex-1 py-2 px-3 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition flex items-center justify-center gap-2 text-xs font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Redirecionar para Keycloak SSO (OAuth2 / PKCE)
            </button>

            <button
              type="button"
              onClick={logout}
              className="py-2 px-3 rounded-xl bg-dark-input hover:bg-rose-950/40 border border-dark-border hover:border-rose-800/50 text-rose-400 hover:text-rose-300 transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              Encerrar Sessão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
