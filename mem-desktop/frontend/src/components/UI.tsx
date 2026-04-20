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

export function MergeModal({ isOpen, onClose, conflicts, onResolve }: { isOpen: boolean; onClose: () => void; conflicts: any[]; onResolve: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  if (!isOpen || !conflicts || conflicts.length === 0) return null;
  
  const current = conflicts[currentIndex] || conflicts[0];
  const API = 'http://localhost:8000/api';

  const handleAction = async (action: 'ours' | 'theirs') => {
    try {
      await axios.post(`${API}/resolve_conflict`, { filename: current.filename, action });
      if (currentIndex < conflicts.length - 1) setCurrentIndex(v => v + 1);
      else { onResolve(); onClose(); }
    } catch (e) { alert('Resolution failed'); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '1000px', width: '90%' }}>
        <div className="modal-header">
           <h3 className="text-xl font-bold">Visual Merge: {current.filename} ({currentIndex+1}/{conflicts.length})</h3>
           <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body p-0">
           <div className="merge-grid" style={{ height: '60vh' }}>
              <div className="merge-pane">
                 <div className="merge-pane-header">
                    <span>LOCAL (OURS)</span>
                    <button className="btn-success py-1 px-2 text-xs" onClick={() => handleAction('ours')}>KEEP LOCAL</button>
                 </div>
                 <pre className="merge-pane-content">{current.ours}</pre>
              </div>
              <div className="merge-pane">
                 <div className="merge-pane-header">
                    <span>REMOTE (THEIRS)</span>
                    <button className="btn-success py-1 px-2 text-xs" onClick={() => handleAction('theirs')}>KEEP REMOTE</button>
                 </div>
                 <pre className="merge-pane-content">{current.theirs}</pre>
              </div>
           </div>
           <div className="p-4 bg-bg-700 border-t border-border flex justify-between items-center">
              <p className="text-xs text-muted">Resolving conflicts will automatically commit the result.</p>
              <div className="flex gap-2">
                 <button className="btn-ghost" onClick={onClose}>Skip for now</button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
