'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import UploadModal from '@/components/UploadModal';
import UserPreferencesModal from '@/components/UserPreferencesModal';
import AdminConfigModal from '@/components/AdminConfigModal';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

function AppShellContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const { isPreferencesOpen, setIsPreferencesOpen, isAdminConfigOpen, setIsAdminConfigOpen } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Dynamic header title based on route
  const getHeaderTitle = () => {
    if (pathname === '/') return 'Dashboard';
    if (pathname.startsWith('/hearings/')) return 'Audiência / Sala de Sessão';
    if (pathname.startsWith('/hearings')) return 'Audiências & Pautas';
    return 'Dashboard';
  };

  const handleUploadSuccess = (hearingId: string) => {
    setUploadOpen(false);
    router.push(`/hearings/${hearingId}`);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-slate-100 flex transition-colors duration-200">
      {/* Navigation Sidebar (Collapsible on Desktop, Drawer on Mobile) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
      />

      {/* Main Content Area (Dynamic offset for collapsed w-20 = 5rem or expanded w-64 = 16rem) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <Header
          title={getHeaderTitle()}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global Upload Modal */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* Global User Preferences Modal */}
      <UserPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />

      {/* Global Admin System Configuration Modal */}
      <AdminConfigModal
        isOpen={isAdminConfigOpen}
        onClose={() => setIsAdminConfigOpen(false)}
      />
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShellContent>{children}</AppShellContent>
    </AuthProvider>
  );
}
