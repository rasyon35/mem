import React, { useState } from 'react';
import axios from 'axios';

export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-content animate-modal-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header bg-gradient-to-r from-surface-2 to-surface-3 border-b border-border-subtle">
          <h3 className="text-lg font-bold text-text-primary">{title}</h3>
          <button className="btn-close hover:bg-white/10 transition-colors rounded-lg p-2" onClick={onClose}>&times;</button>
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
    <div className="diff-container rounded-lg border border-border-subtle bg-surface-3/50 overflow-y-auto custom-scrollbar" style={{ maxHeight: '60vh' }}>
      {diffLines.map((l, idx) => (
        <div key={idx} className={`diff-line diff-${l.type} px-4 py-2 border-b border-border-subtle transition-colors hover:bg-white/5 ${
          l.type === 'added' ? 'bg-success/5 text-success' : 
          l.type === 'removed' ? 'bg-error/5 text-error' : 
          'text-text-secondary'
        }`}>
          <span className="diff-line-num text-xs opacity-50 mr-3">{String(idx + 1).padStart(4, ' ')}</span>
          <span className="font-mono text-sm">{l.type === 'added' ? '+ ' : l.type === 'removed' ? '- ' : '  '}{l.text}</span>
        </div>
      ))}
    </div>
  );
}

// CollisionWizard (CollisionWizard.tsx) has replaced MergeModal for a more structured resolution flow.
