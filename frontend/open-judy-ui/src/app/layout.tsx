import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono, Source_Serif_4 } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import AppShell from '@/components/AppShell';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const sourceSerif4 = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PODER JUDICIÁRIO | Sistema Open Judy — Registro Audiovisual e Instrução Processual (CNJ)',
  description:
    'Sistema Institucional de Degravação Audiovisual, Instrução Probatória e Apoio à Decisão Judicial em conformidade com as Resoluções CNJ nº 105/2010 e nº 332/2020.',
};

const ACCENT_MAP: Record<string, { color: string; dark: string; light: string; glow: string }> = {
  blue: { color: '#2563eb', dark: '#1d4ed8', light: '#60a5fa', glow: 'rgba(37, 99, 235, 0.25)' },
  '#2563eb': { color: '#2563eb', dark: '#1d4ed8', light: '#60a5fa', glow: 'rgba(37, 99, 235, 0.25)' },
  '#1d4ed8': { color: '#1d4ed8', dark: '#1e40af', light: '#60a5fa', glow: 'rgba(29, 78, 216, 0.25)' },
  teal: { color: '#0d9488', dark: '#0f766e', light: '#2dd4bf', glow: 'rgba(13, 148, 136, 0.25)' },
  '#0d9488': { color: '#0d9488', dark: '#0f766e', light: '#2dd4bf', glow: 'rgba(13, 148, 136, 0.25)' },
  red: { color: '#e63946', dark: '#be123c', light: '#fb7185', glow: 'rgba(230, 57, 70, 0.25)' },
  crimson: { color: '#e63946', dark: '#be123c', light: '#fb7185', glow: 'rgba(230, 57, 70, 0.25)' },
  '#e63946': { color: '#e63946', dark: '#be123c', light: '#fb7185', glow: 'rgba(230, 57, 70, 0.25)' },
  '#e11d48': { color: '#e11d48', dark: '#be123c', light: '#fb7185', glow: 'rgba(225, 29, 72, 0.25)' },
  purple: { color: '#7c3aed', dark: '#6d28d9', light: '#a78bfa', glow: 'rgba(124, 58, 237, 0.25)' },
  '#7c3aed': { color: '#7c3aed', dark: '#6d28d9', light: '#a78bfa', glow: 'rgba(124, 58, 237, 0.25)' },
  '#8b5cf6': { color: '#8b5cf6', dark: '#6d28d9', light: '#a78bfa', glow: 'rgba(139, 92, 246, 0.25)' },
  amber: { color: '#d97706', dark: '#b45309', light: '#fbbf24', glow: 'rgba(217, 119, 6, 0.25)' },
  '#d97706': { color: '#d97706', dark: '#b45309', light: '#fbbf24', glow: 'rgba(217, 119, 6, 0.25)' },
  orange: { color: '#ea580c', dark: '#c2410c', light: '#fb923c', glow: 'rgba(234, 88, 12, 0.25)' },
  '#ea580c': { color: '#ea580c', dark: '#c2410c', light: '#fb923c', glow: 'rgba(234, 88, 12, 0.25)' },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let ssrTheme: 'dark' | 'light' = 'dark';
  let ssrAccentKey = 'blue';
  try {
    const cookieStore = await cookies();
    const cookieVal =
      cookieStore.get('open_judy_theme')?.value ||
      cookieStore.get('openjudy_theme')?.value;
    if (cookieVal && cookieVal.toLowerCase() === 'light') {
      ssrTheme = 'light';
    }
    const accentVal = cookieStore.get('open_judy_accent')?.value;
    if (accentVal) {
      const decoded = decodeURIComponent(accentVal).trim();
      if (decoded) {
        ssrAccentKey = decoded;
      }
    }
  } catch (_) {}

  const accentPreset =
    ACCENT_MAP[ssrAccentKey.toLowerCase()] ||
    (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(ssrAccentKey)
      ? {
          color: ssrAccentKey,
          dark: ssrAccentKey,
          light: ssrAccentKey,
          glow: 'rgba(37, 99, 235, 0.25)',
        }
      : ACCENT_MAP.blue);
  const htmlStyle: React.CSSProperties = {
    colorScheme: ssrTheme,
    ...(accentPreset
      ? ({
          '--accent-color': accentPreset.color,
          '--accent-color-dark': accentPreset.dark,
          '--accent-color-light': accentPreset.light,
          '--accent-color-glow': accentPreset.glow,
          '--color-accent': accentPreset.color,
        } as React.CSSProperties)
      : {}),
  };

  return (
    <html
      lang="pt-BR"
      data-theme={ssrTheme}
      data-accent={ssrAccentKey}
      className={`${ssrTheme} theme-${ssrTheme} ${plusJakartaSans.variable} ${sourceSerif4.variable} ${jetBrainsMono.variable}`}
      style={htmlStyle}
      suppressHydrationWarning
    >
      <body
        className="bg-dark-bg text-[var(--foreground)] min-h-screen antialiased"
        suppressHydrationWarning
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
