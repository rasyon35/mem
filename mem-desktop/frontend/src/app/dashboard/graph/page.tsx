'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const GraphViewer = dynamic(() => import('@/components/GraphViewer'), { ssr: false });


export default function GraphPage() {
  return (
    <div className="h-screen w-full p-4">
      <div className="h-full w-full rounded-2xl overflow-hidden relative" style={{ border: '1px solid var(--border)', background: 'var(--bg-900)' }}>
        <GraphViewer />
      </div>
    </div>
  );
}
