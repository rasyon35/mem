import React, { useState } from 'react';
import axios from 'axios';

export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-content animate-modal-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header bg-surface-2 border-b border-border-subtle p-4 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <button className="text-text-muted hover:text-text-primary transition-colors text-lg leading-none" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

export function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const diffLines: { text: string; type: 'added' | 'removed' | 'unchanged' }[] = [];
  let i = 0, j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diffLines.push({ text: oldLines[i], type: 'unchanged' });
      i++; j++;
    } else if (j < newLines.length && (i >= oldLines.length || !oldLines.slice(i).includes(newLines[j]))) {
      diffLines.push({ text: newLines[j], type: 'added' });
      j++;
    } else if (i < oldLines.length) {
      diffLines.push({ text: oldLines[i], type: 'removed' });
      i++;
    }
  }

  return (
    <div className="diff-container rounded-md border border-border-subtle bg-surface-2 overflow-y-auto custom-scrollbar" style={{ maxHeight: '60vh' }}>
      {diffLines.map((l, idx) => (
        <div key={idx} className={`diff-line diff-${l.type} px-3 py-1.5 border-b border-border-subtle transition-colors ${
          l.type === 'added' ? 'bg-success/10 text-success' : 
          l.type === 'removed' ? 'bg-error/10 text-error' : 
          'text-text-secondary hover:bg-surface-3'
        }`}>
          <span className="diff-line-num text-[10px] text-text-muted mr-3">{String(idx + 1).padStart(4, ' ')}</span>
          <span className="font-mono text-xs">{l.type === 'added' ? '+ ' : l.type === 'removed' ? '- ' : '  '}{l.text}</span>
        </div>
      ))}
    </div>
  );
}

// CollisionWizard (CollisionWizard.tsx) has replaced MergeModal for a more structured resolution flow.
