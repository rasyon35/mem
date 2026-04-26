'use client';

import dynamic from 'next/dynamic';

const GraphViewer = dynamic(() => import('@/components/GraphViewer'), { ssr: false });


export default function GraphPage() {
  return (
    <div className="h-screen w-full bg-gradient-to-b from-bg-900 to-bg-950 overflow-hidden relative shadow-inner">
      <div className="absolute inset-0 bg-gradient-radial from-accent/5 via-transparent to-transparent pointer-events-none" />
      <div className="h-full w-full overflow-hidden relative z-10">
        <GraphViewer />
      </div>
    </div>
  );
}
