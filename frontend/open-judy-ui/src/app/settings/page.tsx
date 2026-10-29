'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import UserPreferencesModal from '@/components/UserPreferencesModal';

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as
    | 'ui'
    | 'audio'
    | 'ai'
    | 'notifications'
    | 'system'
    | null;

  const validTab =
    tabParam && ['ui', 'audio', 'ai', 'notifications', 'system'].includes(tabParam)
      ? tabParam
      : 'ui';

  return (
    <div className="w-full max-w-none flex-1 flex flex-col min-h-[calc(100vh-5rem)] pb-6 animate-fade-in">
      <UserPreferencesModal mode="page" isOpen={true} initialTab={validTab} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-live="polite"
          className="w-full max-w-none flex-1 flex items-center justify-center min-h-[60vh] text-text-secondary text-sm font-medium"
        >
          Carregando Preferências e Perfil...
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
