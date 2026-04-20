'use client';

import React, { useState } from 'react';
import { useWiki } from '@/context/WikiContext';
import axios from 'axios';

export default function CollisionWizard({ 
  isOpen, conflicts, onResolve, onClose 
}: { 
  isOpen: boolean, conflicts: any[], onResolve: () => void, onClose: () => void 
}) {
  const [step, setStep] = useState(1);
  const [index, setIndex] = useState(0);
  const { trackActivity } = useWiki();
  const API = 'http://localhost:8000/api';

  if (!isOpen || !conflicts || conflicts.length === 0) return null;

  const current = conflicts[index] || conflicts[0];

  const handleAction = async (action: 'ours' | 'theirs') => {
    try {
      await axios.post(`${API}/resolve_conflict`, { filename: current.filename, action });
      if (index < conflicts.length - 1) {
        setIndex(v => v + 1);
        setStep(1); 
      } else {
        onResolve();
        onClose();
      }
    } catch { alert('Failed to resolve'); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content collision-wizard-container">
        <div className="wizard-sidebar">
           <h3 className="wizard-title">Collision Resolution</h3>
           <div className="wizard-steps">
              <div className={`wizard-step ${step === 1 ? 'active' : ''}`}>1. The Situation</div>
              <div className={`wizard-step ${step === 2 ? 'active' : ''}`}>2. Review Changes</div>
              <div className={`wizard-step ${step === 3 ? 'active' : ''}`}>3. Choose Winner</div>
           </div>
           <div className="mt-auto">
              <p className="text-xs text-muted">File {index + 1} of {conflicts.length}</p>
              <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${((index+1)/conflicts.length)*100}%` }} /></div>
           </div>
        </div>

        <div className="wizard-main">
           {step === 1 && (
              <div className="wizard-panel">
                 <div className="collision-header">
                    <span className="collision-icon">⚠️</span>
                    <div>
                       <h2 className="text-xl font-bold">Edit Collision Detected</h2>
                       <p className="text-sm text-secondary">In: {current.filename}</p>
                    </div>
                 </div>
                 <div className="collision-info">
                    <p>While you were editing this page, a teammate pushed their own changes to the Hub. Because your changes overlap, Mem cannot automatically merge them.</p>
                    <div className="collision-map-box">
                       <p className="text-xs font-bold mb-2 uppercase">Conflict Map (Minimap)</p>
                       <div className="collision-minimap">
                          <div className="minimap-block safe" />
                          <div className="minimap-block conflict" />
                          <div className="minimap-block safe" />
                          <div className="minimap-block conflict" />
                       </div>
                    </div>
                 </div>
                 <button className="btn-primary mt-auto" onClick={() => setStep(2)}>Review Differences →</button>
              </div>
           )}

           {step === 2 && (
              <div className="wizard-panel p-0">
                 <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-border bg-bg-800">
                       <h3 className="font-bold">Side-by-Side Comparison</h3>
                       <p className="text-xs text-muted">Compare your local version with the remote version from the Hub.</p>
                    </div>
                    <div className="flex-1 overflow-auto flex">
                       <div className="comparison-pane border-r">
                          <label>YOUR LOCAL VERSION</label>
                          <pre>{current.ours}</pre>
                       </div>
                       <div className="comparison-pane">
                          <label>REMOTE HUB VERSION</label>
                          <pre>{current.theirs}</pre>
                       </div>
                    </div>
                 </div>
                 <div className="p-4 border-t border-border flex justify-between bg-bg-800">
                    <button className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
                    <button className="btn-primary" onClick={() => setStep(3)}>Next Step: Resolve →</button>
                 </div>
              </div>
           )}

           {step === 3 && (
              <div className="wizard-panel">
                 <h3 className="text-xl font-bold mb-4">Choose the Final Version</h3>
                 <p className="text-sm text-secondary mb-6">Select which version you want to keep. This will overwrite the other version and finish the merge.</p>
                 
                 <div className="resolution-options">
                    <div className="resolution-card ours" onClick={() => handleAction('ours')}>
                       <div className="res-icon">🏠</div>
                       <div>
                          <p className="font-bold">Keep My Local Changes</p>
                          <p className="text-xs opacity-70">Discard the incoming remote changes and keep what you wrote.</p>
                       </div>
                    </div>
                    
                    <div className="resolution-card theirs" onClick={() => handleAction('theirs')}>
                       <div className="res-icon">☁️</div>
                       <div>
                          <p className="font-bold">Accept Their Remote Changes</p>
                          <p className="text-xs opacity-70">Discard your local edits and adopt the version from the Hub.</p>
                       </div>
                    </div>
                 </div>

                 <p className="mt-auto text-xs text-center text-muted">Tip: For advanced manual blending, use a code editor. Mem aims for fast resolution here.</p>
              </div>
           )}
        </div>
        <button className="btn-close" style={{ top: '1rem', right: '1rem' }} onClick={onClose}>&times;</button>
      </div>
    </div>
  );
}
