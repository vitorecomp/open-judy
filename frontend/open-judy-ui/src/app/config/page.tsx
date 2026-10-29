'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminConfigModal from '@/components/AdminConfigModal';

function SystemConfigPageContent() {
  const searchParams = useSearchParams();
  const rawTab = (searchParams?.get('tab') || 'prompts').toLowerCase();
  const validTab = (
    ['prompts', 'models', 'dashboards', 'notifications', 'settings'].includes(rawTab)
      ? rawTab
      : 'prompts'
  ) as 'prompts' | 'models' | 'dashboards' | 'notifications' | 'settings';
  const promptCode = searchParams?.get('prompt') || undefined;

  return (
    <AdminConfigModal
      mode="page"
      isOpen={true}
      initialTab={validTab}
      initialPromptCode={promptCode}
    />
  );
}

export default function SystemConfigPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-dark-muted text-xs">
          Carregando configurações do sistema...
        </div>
      }
    >
      <SystemConfigPageContent />
    </Suspense>
  );
}
