import React, { useState } from 'react';
import axios from 'axios';

export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-lg font-bold">{title}</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
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
    <div className="diff-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
      {diffLines.map((l, idx) => (
        <div key={idx} className={`diff-line diff-${l.type}`}>
          <span className="diff-line-num">{idx + 1}</span>
          <span>{l.type === 'added' ? '+ ' : l.type === 'removed' ? '- ' : '  '}{l.text}</span>
        </div>
      ))}
    </div>
  );
}

// CollisionWizard (CollisionWizard.tsx) has replaced MergeModal for a more structured resolution flow.
