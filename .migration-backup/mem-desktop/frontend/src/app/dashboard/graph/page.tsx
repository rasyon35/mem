'use client';

import dynamic from 'next/dynamic';

const GraphViewer = dynamic(() => import('@/components/GraphViewer'), { ssr: false });

export default function GraphPage() {
  return (
    <div className="h-[calc(100vh-48px)] w-full bg-bg-900 overflow-hidden relative">
      <div className="h-full w-full overflow-hidden relative z-10">
        <GraphViewer />
      </div>
    </div>
  );
}
