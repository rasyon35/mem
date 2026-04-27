'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useWiki } from '@/context/WikiContext';
import { Modal, DiffView } from '@/components/UI';
import CollisionWizard from '@/components/CollisionWizard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { 
    modalDiff, setModalDiff, 
    mergeModalOpen, setMergeModalOpen, 
    conflicts, fetchConflicts, fetchHistory,
  } = useWiki();

  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const getPageTitle = () => {
    const path = pathname.split('/').pop() || 'Dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <div className={`app relative ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <main className="main">
        <div className="top-bar">
          <span className="top-bar-item">Mem Desktop</span>
          <span className="opacity-50">/</span>
          <span className="top-bar-item">{getPageTitle()}</span>
        </div>
        {children}
      </main>

      <Modal
        isOpen={modalDiff.open}
        onClose={() => setModalDiff({ ...modalDiff, open: false })}
        title={modalDiff.title}
      >
        <DiffView oldText={modalDiff.old} newText={modalDiff.new} />
      </Modal>

      {conflicts.length > 0 && (
         <CollisionWizard 
            isOpen={mergeModalOpen} 
            onClose={() => setMergeModalOpen(false)}
            conflicts={conflicts}
            onResolve={() => { fetchConflicts(); fetchHistory(); }}
         />
      )}
    </div>
  );
}
