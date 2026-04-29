'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  FilePlus,
  FileEdit,
  AlertTriangle,
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

export function ReviewPublish({
  isOpen,
  onClose,
  staged,
  onApproved
}: ReviewPublishProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localStaged, setLocalStaged] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (staged) {
      setLocalStaged(JSON.parse(JSON.stringify(staged)));
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
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const newPages = localStaged.new_pages || [];
  const updatedPages = localStaged.updated_pages || [];
  const contradictions = localStaged.contradictions || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review & Approve Updates">
      <div className="flex flex-col w-full max-w-5xl max-h-[90vh]">

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-8">

          {/* SUMMARY */}
          <section className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-4">
            <h3 className="text-xs font-bold mb-3 text-[var(--text-muted)] uppercase">
              AI Summary
            </h3>
            <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">
              "{localStaged.summary}"
            </p>
          </section>

          {/* CONTRADICTIONS */}
          {contradictions.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-amber-500 uppercase">
                  Contradictions
                </h3>
              </div>

              {contradictions.map((c: any, i: number) => (
                <div
                  key={i}
                  className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4"
                >
                  <div className="text-sm font-semibold text-amber-500 mb-2">
                    [[{c.existing_page}]]
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="opacity-60 line-through">
                      {c.existing_claim}
                    </div>
                    <div>{c.new_claim}</div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* UPDATED PAGES */}
          {updatedPages.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase">
                Updated Pages
              </h3>

              {updatedPages.map((page: any) => (
                <div
                  key={page.title}
                  className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--surface-1)]"
                >
                  <div
                    className="flex justify-between items-center p-4 cursor-pointer hover:bg-[var(--surface-2)]"
                    onClick={() =>
                      setExpandedId(expandedId === page.title ? null : page.title)
                    }
                  >
                    <div>
                      <div className="text-sm font-semibold">
                        [[{page.title}]]
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {page.changes_summary}
                      </div>
                    </div>

                    {expandedId === page.title ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>

                  {expandedId === page.title && (
                    <div className="p-4 border-t border-[var(--border-subtle)]">
                      {editingId === page.title ? (
                        <div className="space-y-3">
                          <textarea
                            className="w-full h-52 p-3 text-xs bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                          />

                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs px-3 py-1.5"
                            >
                              Cancel
                            </button>

                            <button className="flex items-center gap-1 text-xs px-3 py-1.5 bg-[var(--accent)] text-white rounded-md">
                              <Save className="w-3 h-3" />
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <DiffView
                          oldText={page.original_content || ''}
                          newText={page.content}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* NEW PAGES */}
          {newPages.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase">
                New Pages
              </h3>

              {newPages.map((page: any) => (
                <div
                  key={page.title}
                  className="border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-1)]"
                >
                  <div
                    className="flex justify-between items-center p-4 cursor-pointer hover:bg-[var(--surface-2)]"
                    onClick={() =>
                      setExpandedId(expandedId === page.title ? null : page.title)
                    }
                  >
                    <div>
                      <div className="text-sm font-semibold">
                        [[{page.title}]]
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Category: {page.category}
                      </div>
                    </div>

                    {expandedId === page.title ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>

                  {expandedId === page.title && (
                    <div className="p-4 border-t border-[var(--border-subtle)] text-xs whitespace-pre-wrap">
                      {page.content}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 border-t border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">

          <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            AI Review Mode
          </div>

          <div className="flex gap-2 sm:justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm"
            >
              Close
            </button>

            <button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Approve
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}