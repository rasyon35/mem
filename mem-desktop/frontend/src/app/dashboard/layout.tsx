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
    <div className="app relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[120px]" />
        <div className="absolute bottom-[0%] right-[-5%] w-[35%] h-[35%] rounded-full bg-success/10 blur-[100px]" />
      </div>

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
