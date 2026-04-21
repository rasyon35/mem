'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const GraphViewer = dynamic(() => import('@/components/GraphViewer'), { ssr: false });


export default function GraphPage() {
  return (
    <div className="h-screen w-full p-4">
      <div className="h-full w-full rounded-2xl border border-border overflow-hidden bg-bg-900 relative">
        <GraphViewer />
      </div>
    </div>
  );
}
