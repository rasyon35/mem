'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const GraphViewer = dynamic(() => import('@/components/GraphViewer'), { ssr: false });


export default function GraphPage() {
  return (
    <div className="h-full w-full">
      <GraphViewer />
    </div>
  );
}
