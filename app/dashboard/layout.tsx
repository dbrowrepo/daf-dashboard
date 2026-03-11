'use client';

import { Sidebar } from '@/components/sidebar';
import { DataFreshness } from '@/components/data-freshness';
import { SocieteProvider } from '@/lib/societe-context';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <SocieteProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-64">
          <div className="flex items-center justify-end gap-3 p-6 pb-0">
            <DataFreshness />
            <button
              onClick={() => router.refresh()}
              className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary bg-card border border-card-border rounded-lg transition-colors hover:bg-white/5"
            >
              <RefreshCw size={16} />
              Actualiser
            </button>
          </div>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </SocieteProvider>
  );
}
