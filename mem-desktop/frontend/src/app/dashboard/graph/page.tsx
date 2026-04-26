'use client';

import dynamic from 'next/dynamic';

const GraphViewer = dynamic(() => import('@/components/GraphViewer'), { ssr: false });


export default function GraphPage() {
  return (
    <div className="h-screen w-full bg-[var(--bg-950)]">
      <div className="h-full w-full overflow-hidden relative">
        <GraphViewer />
      </div>
    </div>
  );
}
