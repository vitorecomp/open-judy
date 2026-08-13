import { UserRole, UserProfile } from './types';

export interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}

export const KEYCLOAK_CONFIG: KeycloakConfig = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'open-judy',
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'open-judy-ui',
};

export interface KeycloakTokenPayload {
  sub: string;
  preferred_username?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<string, { roles: string[] }>;
  courtJurisdiction?: string | string[];
  documentNumber?: string | string[];
  title?: string | string[];
  avatarUrl?: string | string[];
  exp?: number;
  iat?: number;
  iss?: string;
  [key: string]: any;
}

export interface KeycloakAuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  user: {
    keycloakId: string;
    username: string;
    email: string;
    fullName: string;
    role: UserRole;
    courtJurisdiction?: string;
    documentNumber?: string;
    avatarUrl?: string;
  };
}

/**
 * Parses and decodes a JWT token safely without external dependencies.
 */
export function parseJwt(token: string): KeycloakTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.warn('Failed to decode JWT token:', e);
    return null;
  }
}

/**
 * Maps Keycloak realm / client roles or heuristics to an Open Judy UserRole.
 */
export function mapKeycloakRole(roles: string[] = [], email?: string, username?: string): UserRole {
  for (const r of roles) {
    const norm = r.trim().toUpperCase();
    if (norm === 'ADMIN' || norm === 'ADMINISTRADOR' || norm === 'REALM-ADMIN') {
      return 'ADMIN';
    }
    if (norm === 'MAGISTRADO' || norm === 'MAGISTRADA' || norm === 'JUIZ' || norm === 'JUIZA') {
      return 'MAGISTRADO';
    }
    if (norm === 'ASSESSOR' || norm === 'ASSESSORA' || norm === 'ACESSOR') {
      return 'ASSESSOR';
    }
    if (norm === 'ADVOGADO' || norm === 'ADVOGADA') {
      return 'ADVOGADO';
    }
  }

  // Fallback to username/email
  const u = (username || '').toLowerCase();
  if (u.includes('admin')) return 'ADMIN';
  if (u.includes('camila') || u.includes('magistrad') || u.includes('juiz')) return 'MAGISTRADO';
  if (u.includes('marcos') || u.includes('assessor')) return 'ASSESSOR';
  if (u.includes('lucas') || u.includes('advoga')) return 'ADVOGADO';

  const em = (email || '').toLowerCase();
  if (em.includes('admin')) return 'ADMIN';
  if (em.includes('magistrad') || em.includes('juiz') || em.includes('camila')) return 'MAGISTRADO';
  if (em.includes('advocacia') || em.includes('advogado') || em.includes('oab')) return 'ADVOGADO';

  return 'ASSESSOR';
}

/**
 * Extracts a normalized UserProfile identity from a Keycloak JWT.
 */
export function extractUserFromKeycloakToken(token: string) {
  const payload = parseJwt(token);
  if (!payload) return null;

  const roles: string[] = [];
  if (payload.realm_access?.roles) {
    roles.push(...payload.realm_access.roles);
  }
  if (payload.resource_access) {
    for (const client of Object.values(payload.resource_access)) {
      if (client.roles) roles.push(...client.roles);
    }
  }

  const username = payload.preferred_username || (payload.email ? payload.email.split('@')[0] : 'user');
  const email = payload.email || `${username}@openjudy.org`;
  let fullName = payload.name;
  if (!fullName && (payload.given_name || payload.family_name)) {
    fullName = `${payload.given_name || ''} ${payload.family_name || ''}`.trim();
  }
  if (!fullName) fullName = username;

  const role = mapKeycloakRole(roles, email, username);

  const getAttr = (key: string) => {
    const val = payload[key];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  return {
    keycloakId: payload.sub,
    username,
    email,
    fullName,
    role,
    courtJurisdiction: getAttr('courtJurisdiction') || '3ª Vara Cível Central da Comarca de São Paulo/SP',
    documentNumber: getAttr('documentNumber') || (role === 'MAGISTRADO' ? 'TJSP-44910' : role === 'ADMIN' ? 'SYS-001' : 'ASSESS-8831'),
    avatarUrl: getAttr('avatarUrl') || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=${role === 'MAGISTRADO' ? 'e63946' : role === 'ADMIN' ? '10b981' : '4f46e5'}&color=fff`,
    roles,
    exp: payload.exp,
  };
}

/**
 * Logs in directly using Keycloak Direct Access Grants (OAuth2 password grant).
 */
export async function loginWithKeycloakDirect(username: string, password: string): Promise<KeycloakAuthResult | null> {
  const tokenEndpoint = `${KEYCLOAK_CONFIG.url}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`;

  const params = new URLSearchParams();
  params.append('client_id', KEYCLOAK_CONFIG.clientId);
  params.append('grant_type', 'password');
  params.append('username', username);
  params.append('password', password);
  params.append('scope', 'openid profile email roles');

  try {
    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (res.ok) {
      const data = await res.json();
      const user = extractUserFromKeycloakToken(data.access_token);
      if (user) {
        setStoredKeycloakToken(data.access_token, data.refresh_token);
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
          user,
        };
      }
    } else {
      console.warn('Keycloak authentication failed with status:', res.status);
    }
  } catch (err) {
    console.warn('Keycloak server offline or unreachable, falling back to simulated dev authentication:', err);
  }

  // Fallback for development simulation if Keycloak container is offline
  return generateSimulatedAuthResult(username);
}

/**
 * Generates an OpenID Connect Authorization Code Flow login URL for redirect login.
 */
export function getKeycloakLoginUrl(redirectUri: string = typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000'): string {
  const authEndpoint = `${KEYCLOAK_CONFIG.url}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/auth`;
  const state = Math.random().toString(36).substring(2, 15);
  const nonce = Math.random().toString(36).substring(2, 15);

  const params = new URLSearchParams({
    client_id: KEYCLOAK_CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email roles',
    state,
    nonce,
  });

  return `${authEndpoint}?${params.toString()}`;
}

/**
 * Generates a Keycloak Logout URL.
 */
export function getKeycloakLogoutUrl(redirectUri: string = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'): string {
  const logoutEndpoint = `${KEYCLOAK_CONFIG.url}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/logout`;
  const params = new URLSearchParams({
    client_id: KEYCLOAK_CONFIG.clientId,
    post_logout_redirect_uri: redirectUri,
  });
  return `${logoutEndpoint}?${params.toString()}`;
}

/**
 * Generates a valid Base64-encoded mock JWT token for development and offline mode.
 */
export function generateMockKeycloakToken(preset: {
  role: UserRole;
  username: string;
  name: string;
  email: string;
  jurisdiction: string;
  avatarUrl: string;
}): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const sub =
    preset.username === 'camila.vasconcelos'
      ? 'u0000000-0000-0000-0000-000000000001'
      : preset.username === 'marcos.assessor'
      ? 'u0000000-0000-0000-0000-000000000002'
      : 'u0000000-0000-0000-0000-000000000003';

  const now = Math.floor(Date.now() / 1000);
  const payload: KeycloakTokenPayload = {
    sub,
    iss: `${KEYCLOAK_CONFIG.url}/realms/${KEYCLOAK_CONFIG.realm}`,
    iat: now,
    exp: now + 36000,
    preferred_username: preset.username,
    email: preset.email,
    name: preset.name,
    realm_access: {
      roles: [preset.role, 'offline_access', 'uma_authorization', 'default-roles-open-judy'],
    },
    courtJurisdiction: [preset.jurisdiction],
    documentNumber: [preset.role === 'MAGISTRADO' ? 'TJSP-44910' : preset.role === 'ADMIN' ? 'SYS-001' : 'ASSESS-8831'],
    title: [preset.role === 'MAGISTRADO' ? 'Juíza de Direito Titular' : preset.role === 'ADMIN' ? 'Administrador do Sistema' : 'Assessor de Gabinete'],
    avatarUrl: [preset.avatarUrl],
  };

  const encodeBase64Url = (obj: object) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  const unsignedToken = `${encodeBase64Url(header)}.${encodeBase64Url(payload)}`;
  return `${unsignedToken}.MOCK_SIGNATURE_${btoa(preset.username).substring(0, 16)}`;
}

function generateSimulatedAuthResult(username: string): KeycloakAuthResult {
  const norm = username.toLowerCase();
  let role: UserRole = 'ASSESSOR';
  let name = 'Marcos Vinicius de Souza';
  let email = 'marcos.assessor@tjsp.jus.br';
  let jurisdiction = '3ª Vara Cível Central da Comarca de São Paulo/SP';
  let avatarUrl = 'https://ui-avatars.com/api/?name=Marcos+Souza&background=4f46e5&color=fff';
  let keycloakId = 'u0000000-0000-0000-0000-000000000002';

  if (norm.includes('camila') || norm.includes('magistrad') || norm.includes('juiz')) {
    role = 'MAGISTRADO';
    name = 'Dra. Camila Vasconcelos de Albuquerque';
    email = 'camila.vasconcelos@tjsp.jus.br';
    avatarUrl = 'https://ui-avatars.com/api/?name=Camila+Vasconcelos&background=e63946&color=fff';
    keycloakId = 'u0000000-0000-0000-0000-000000000001';
  } else if (norm.includes('admin')) {
    role = 'ADMIN';
    name = 'Administrador Geral Open Judy';
    email = 'admin@openjudy.org';
    jurisdiction = 'Tribunal de Justiça - Coordenação de TI e IA';
    avatarUrl = 'https://ui-avatars.com/api/?name=Open+Judy+Admin&background=10b981&color=fff';
    keycloakId = 'u0000000-0000-0000-0000-000000000003';
  }

  const token = generateMockKeycloakToken({
    role,
    username,
    name,
    email,
    jurisdiction,
    avatarUrl,
  });

  setStoredKeycloakToken(token, 'mock-refresh-token');

  return {
    accessToken: token,
    refreshToken: 'mock-refresh-token',
    expiresIn: 36000,
    user: {
      keycloakId,
      username,
      email,
      fullName: name,
      role,
      courtJurisdiction: jurisdiction,
      documentNumber: role === 'MAGISTRADO' ? 'TJSP-44910' : role === 'ADMIN' ? 'SYS-001' : 'ASSESS-8831',
      avatarUrl,
    },
  };
}

export function getStoredKeycloakToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('openjudy_keycloak_token');
}

export function setStoredKeycloakToken(token: string, refreshToken?: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('openjudy_keycloak_token', token);
  if (refreshToken) {
    localStorage.setItem('openjudy_keycloak_refresh_token', refreshToken);
  }
}

export function clearStoredKeycloakToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('openjudy_keycloak_token');
  localStorage.removeItem('openjudy_keycloak_refresh_token');
}
