import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Open Judy | Assistente de IA para o Judiciário',
  description: 'Plataforma open-source de transcrição, sumarização e minuta de ata de audiências com Inteligência Artificial Gemini e AlloyDB.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-dark-bg text-slate-100 min-h-screen antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

