import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import AppShell from '@/components/AppShell';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Open Judy | Assistente de IA para o Judiciário',
  description: 'Plataforma open-source de transcrição, sumarização e minuta de ata de audiências com Inteligência Artificial Gemini e AlloyDB.',
};

const ACCENT_MAP: Record<string, { color: string; dark: string; light: string; glow: string }> = {
  teal: { color: '#0d9488', dark: '#0f766e', light: '#2dd4bf', glow: 'rgba(13, 148, 136, 0.25)' },
  '#0d9488': { color: '#0d9488', dark: '#0f766e', light: '#2dd4bf', glow: 'rgba(13, 148, 136, 0.25)' },
  red: { color: '#e63946', dark: '#be123c', light: '#fb7185', glow: 'rgba(230, 57, 70, 0.25)' },
  '#e63946': { color: '#e63946', dark: '#be123c', light: '#fb7185', glow: 'rgba(230, 57, 70, 0.25)' },
  orange: { color: '#ea580c', dark: '#c2410c', light: '#fb923c', glow: 'rgba(234, 88, 12, 0.25)' },
  '#ea580c': { color: '#ea580c', dark: '#c2410c', light: '#fb923c', glow: 'rgba(234, 88, 12, 0.25)' },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let ssrTheme: 'dark' | 'light' = 'dark';
  let ssrAccentKey = 'red';
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
      ssrAccentKey = decodeURIComponent(accentVal);
    }
  } catch (_) {}

  const accentPreset = ACCENT_MAP[ssrAccentKey.toLowerCase()];
  const htmlStyle: React.CSSProperties = {
    colorScheme: ssrTheme,
    ...(accentPreset
      ? ({
          '--accent-color': accentPreset.color,
          '--accent-color-dark': accentPreset.dark,
          '--accent-color-light': accentPreset.light,
          '--accent-color-glow': accentPreset.glow,
        } as React.CSSProperties)
      : {}),
  };

  return (
    <html
      lang="pt-BR"
      data-theme={ssrTheme}
      data-accent={ssrAccentKey}
      className={`${ssrTheme} theme-${ssrTheme} ${plusJakartaSans.variable} ${jetBrainsMono.variable}`}
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

