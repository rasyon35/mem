'use client';

import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  FilePlus, 
  FileEdit, 
  AlertTriangle, 
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save
} from 'lucide-react';
import { Modal, DiffView } from '@/components/UI';
import axios from 'axios';
import { API_BASE as API } from '@/lib/api';

interface ReviewPublishProps {
  isOpen: boolean;
  onClose: () => void;
  staged: any;
  onApproved: (updatedStaged: any) => void;
}

export function ReviewPublish({ isOpen, onClose, staged, onApproved }: ReviewPublishProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localStaged, setLocalStaged] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (staged) {
      setLocalStaged(JSON.parse(JSON.stringify(staged))); // Deep clone
    }
  }, [staged]);

  if (!localStaged) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await axios.post(`${API}/approve`, {
        changes: localStaged
      });
      onApproved(localStaged);
    } catch (e) {
      console.error('Approval failed:', e);
      alert('Failed to approve changes. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (id: string, initialContent: string) => {
    setEditingId(id);
    setEditContent(initialContent);
  };

  const handleSaveEdit = (type: 'new' | 'updated', title: string) => {
    const next = { ...localStaged };
    if (type === 'new') {
      next.new_pages = next.new_pages.map((p: any) => 
        p.title === title ? { ...p, content: editContent } : p
      );
    } else {
      next.updated_pages = next.updated_pages.map((p: any) => 
        p.title === title ? { ...p, content: editContent } : p
      );
    }
    setLocalStaged(next);
    setEditingId(null);
  };

  const newPages = localStaged.new_pages || [];
  const updatedPages = localStaged.updated_pages || [];
  const contradictions = localStaged.contradictions || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review & Approve Wiki Updates">
      <div className="flex flex-col max-h-[80vh] w-full max-w-4xl">
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
          {/* SUMMARY */}
          <section>
            <h3 className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-widest mb-3">AI Synthesis Summary</h3>
            <div className="p-4 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-secondary)] leading-relaxed italic">
              "{localStaged.summary}"
            </div>
          </section>

          {/* CONTRADICTIONS */}
          {contradictions.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-widest">Potential Contradictions</h3>
              </div>
              <div className="space-y-3">
                {contradictions.map((c: any, i: number) => (
                  <div key={i} className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <div className="text-sm font-semibold text-amber-500 mb-2">Contradiction in [[{c.existing_page}]]</div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="text-[var(--text-dim)] mb-1 uppercase font-bold text-[9px]">Existing</div>
                        <div className="text-[var(--text-secondary)] line-through opacity-50">{c.existing_claim}</div>
                      </div>
                      <div>
                        <div className="text-[var(--text-dim)] mb-1 uppercase font-bold text-[9px]">Proposed</div>
                        <div className="text-[var(--text-primary)]">{c.new_claim}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* UPDATED PAGES */}
          {updatedPages.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-widest mb-3">Updated Pages ({updatedPages.length})</h3>
              <div className="space-y-4">
                {updatedPages.map((page: any) => (
                  <div key={page.title} className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--surface-1)]">
                    <div className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface-2)] transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === page.title ? null : page.title)}>
                      <div className="flex items-center gap-3">
                        <FileEdit className="w-4 h-4 text-blue-500" />
                        <div className="text-left">
                          <div className="text-sm font-semibold text-[var(--text-primary)]">[[{page.title}]]</div>
                          <div className="text-[10px] text-[var(--text-muted)]">{page.changes_summary}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(page.title, page.content); }}
                          className="p-2 hover:bg-[var(--surface-3)] rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {expandedId === page.title ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                    {expandedId === page.title && (
                      <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-900)]">
                        {editingId === page.title ? (
                          <div className="space-y-3">
                            <textarea 
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full h-64 bg-[var(--surface-2)] border border-[var(--accent)] rounded-lg p-4 font-mono text-xs text-[var(--text-primary)] outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs text-[var(--text-secondary)]">Cancel</button>
                              <button onClick={() => handleSaveEdit('updated', page.title)} className="px-3 py-1.5 text-xs bg-[var(--accent)] text-white rounded-md flex items-center gap-1">
                                <Save className="w-3 h-3" /> Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <DiffView oldText={page.original_content || ''} newText={page.content} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* NEW PAGES */}
          {newPages.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-widest mb-3">New Pages ({newPages.length})</h3>
              <div className="space-y-4">
                {newPages.map((page: any) => (
                  <div key={page.title} className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--surface-1)]">
                    <div className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface-2)] transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === page.title ? null : page.title)}>
                      <div className="flex items-center gap-3">
                        <FilePlus className="w-4 h-4 text-emerald-500" />
                        <div className="text-left">
                          <div className="text-sm font-semibold text-[var(--text-primary)]">[[{page.title}]]</div>
                          <div className="text-[10px] text-[var(--text-muted)]">Category: {page.category}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(page.title, page.content); }}
                          className="p-2 hover:bg-[var(--surface-3)] rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {expandedId === page.title ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                    {expandedId === page.title && (
                      <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-900)]">
                         {editingId === page.title ? (
                          <div className="space-y-3">
                            <textarea 
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full h-64 bg-[var(--surface-2)] border border-[var(--accent)] rounded-lg p-4 font-mono text-xs text-[var(--text-primary)] outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs text-[var(--text-secondary)]">Cancel</button>
                              <button onClick={() => handleSaveEdit('new', page.title)} className="px-3 py-1.5 text-xs bg-[var(--accent)] text-white rounded-md flex items-center gap-1">
                                <Save className="w-3 h-3" /> Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-[var(--surface-1)] rounded border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                            {page.content}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--surface-1)] flex items-center justify-between">
          <div className="flex items-center gap-4 text-[10px] text-[var(--text-dim)] uppercase tracking-widest font-bold">
            <span>Git Branch: {localStaged.preview?.branch || localStaged.branch_name}</span>
            <span className="w-1 h-1 rounded-full bg-[var(--text-dim)]" />
            <span>AI Confidence: High</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Close</button>
            <button 
              onClick={handleApprove}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-[var(--accent)] text-white rounded-lg font-semibold hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Approve & Publish
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
