'use client';

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
    conflicts, fetchConflicts, fetchHistory 
  } = useWiki();

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        {children}
      </main>

      {/* Global Modals maintained in layout to keep state across navigation */}
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
