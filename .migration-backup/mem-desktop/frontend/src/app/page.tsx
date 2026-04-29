'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the default dashboard view
    router.push('/dashboard/ingest');
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-bg-900">
      <div className="text-sm font-mono text-text-muted flex items-center gap-3">
        <div className="spinner" />
        <span>Loading workspace...</span>
      </div>
    </div>
  );
}
