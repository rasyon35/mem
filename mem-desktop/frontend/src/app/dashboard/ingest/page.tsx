'use client';

import { useState } from 'react';
import { useWiki } from '@/context/WikiContext';
import { UploadIcon, Spinner } from '@/components/Icons';
import { motion } from 'framer-motion';
import axios from 'axios';

const API = 'http://localhost:8000/api';

type ProposedPageChange = {
  title: string;
  category?: string;
  content?: string;
  original_content?: string;
};

type ProposedChanges = {
  new_pages?: ProposedPageChange[];
  updated_pages?: ProposedPageChange[];
  [key: string]: unknown;
};

export default function IngestPage() {
  const { 
    file, setFile, url, setUrl, autoApprove, setAutoApprove, 
    loading, result, setResult, handleIngest, setModalDiff 
  } = useWiki();

  // Local state for editable categories on staged results
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});

  const updateCategory = (title: string, newCat: string) => {
    setCategoryOverrides(prev => ({ ...prev, [title]: newCat }));
  };

  // Wrap handleApprove to inject category overrides into proposed_changes before sending
  const handleApproveWithCategories = async () => {
    const proposed = result?.proposed_changes as ProposedChanges | undefined;
    if (!proposed) return;

    const changes: ProposedChanges = {
      ...proposed,
      new_pages: proposed.new_pages?.map((p) => ({
        ...p,
        category: categoryOverrides[p.title] || p.category || 'Miscellaneous',
      })),
      updated_pages: proposed.updated_pages?.map((p) => ({
        ...p,
        category: categoryOverrides[p.title] || p.category || '',
      })),
    };

    try {
      const res = await axios.post(`${API}/approve`, { changes });
      setResult({ ...res.data });
    } catch {
      setResult({ error: 'Approval request failed' });
    }
    setCategoryOverrides({});
  };

  return (
    <section className="panel bg-gradient-to-b from-surface-2 to-surface-3 rounded-2xl shadow-lg overflow-hidden" id="panel-ingest">
      <header className="flex flex-col gap-1 bg-gradient-to-r from-accent/10 to-transparent px-8 py-6 border-b border-border-subtle">
        <h1 className="panel-title text-2xl font-black text-text-primary">Add Knowledge</h1>
        <p className="panel-sub text-sm text-text-secondary">Drop a file or paste a URL to ingest into your wiki.</p>
      </header>

      <div className="card mx-8 my-6 bg-gradient-to-br from-surface-3 to-surface-2 border border-accent/20 hover:border-accent/40 transition-all">
        <label className="dropzone relative overflow-hidden group rounded-xl border-2 border-dashed border-border-subtle hover:border-accent/50 transition-all p-12 cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <UploadIcon className="relative z-10 mx-auto mb-4 w-12 h-12 text-accent opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all" />
          <span className="dz-text relative z-10 block font-bold text-text-primary text-lg">{file ? file.name : 'Click to upload or drag & drop'}</span>
          <span className="dz-hint relative z-10 block text-sm text-text-secondary mt-2">PDF · DOCX · MD · TXT · IMG (PNG/JPG) · URL</span>
          <input
            type="file"
            accept=".pdf,.docx,.md,.txt,.html,.png,.jpg,.jpeg,.webp"
            style={{ display: 'none' }}
            onChange={e => { setFile(e.target.files?.[0] || null); setUrl(''); }}
          />
          
          {loading && (
            <motion.div 
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-accent-light to-accent shadow-lg shadow-accent/50 z-10"
              animate={{ left: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </label>

        <div className="divider my-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-gradient-to-r from-border-subtle to-transparent" />
          <span className="text-xs font-bold uppercase tracking-widest text-text-secondary/60">or</span>
          <div className="flex-1 h-px bg-gradient-to-l from-border-subtle to-transparent" />
        </div>

        <input
          className="text-input px-6 py-4 rounded-xl bg-surface-2 border border-border-subtle focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-text-primary placeholder-text-secondary/50"
          placeholder="https://example.com/article"
          value={url}
          onChange={e => { setUrl(e.target.value); setFile(null); }}
        />

        <div className="row-space-between">
          <label className="toggle-label">
            <span>Auto-approve changes</span>
            <div className={`toggle ${autoApprove ? 'on' : ''}`} onClick={() => setAutoApprove(!autoApprove)}>
              <span className="toggle-thumb" />
            </div>
          </label>

          <button className="btn-primary" onClick={handleIngest} disabled={loading || (!file && !url.trim())}>
            {loading ? <Spinner /> : 'Ingest'}
          </button>
        </div>
      </div>

      {result && (
        <div className={`result-card ${result.error ? 'error' : ''}`}>
          {result.error && <p className="result-error">⚠️ {result.error}</p>}

          {result.status === 'staged' && result.preview && (
            <>
              <div className="result-header">
                <span className="badge badge-staged">Staged</span>
                <span className="result-title">Proposed changes ready for review</span>
              </div>
              <p className="result-summary">{result.preview.summary}</p>

              {/* --- New Pages with Category Editing --- */}
              {result.proposed_changes?.new_pages && (result.proposed_changes.new_pages as any[]).length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">New Pages</h3>
                  <div className="flex flex-col gap-2">
                    {(result.proposed_changes.new_pages as any[]).map((p: any) => (
                      <div key={p.title} className="flex justify-between items-center p-3 bg-bg-700 rounded-lg border border-border gap-3">
                        <span className="tag tag-new flex-shrink-0">+ {p.title}</span>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-muted uppercase font-bold">Category:</label>
                          <input
                            type="text"
                            className="text-input"
                            style={{ width: '180px', padding: '4px 8px', fontSize: '12px' }}
                            value={categoryOverrides[p.title] ?? p.category ?? 'Miscellaneous'}
                            onChange={e => updateCategory(p.title, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* --- Updated Pages with Category Editing & Diff --- */}
              {result.proposed_changes?.updated_pages && (result.proposed_changes.updated_pages as any[]).length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Updated Pages</h3>
                  <div className="flex flex-col gap-2">
                    {(result.proposed_changes.updated_pages as any[]).map((p: any) => (
                      <div key={p.title} className="flex justify-between items-center p-3 bg-bg-700 rounded-lg border border-border gap-3">
                        <span className="tag tag-updated flex-shrink-0">{p.title}</span>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-muted uppercase font-bold">Category:</label>
                          <input
                            type="text"
                            className="text-input"
                            style={{ width: '180px', padding: '4px 8px', fontSize: '12px' }}
                            value={categoryOverrides[p.title] ?? p.category ?? ''}
                            onChange={e => updateCategory(p.title, e.target.value)}
                            placeholder="Keep existing"
                          />
                          <button className="btn-ghost" onClick={() => setModalDiff({ open: true, title: `Reviewing: ${p.title}`, old: p.original_content, new: p.content })}>
                            View Diff
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="result-tags mt-3">
                {(result.preview.contradictions ?? 0) > 0 && <span className="tag tag-conflict">⚡ {result.preview.contradictions} contradiction(s)</span>}
              </div>
              <button className="btn-success mt-3" onClick={handleApproveWithCategories} disabled={loading}>
                {loading ? <Spinner /> : '✓ Approve & Apply'}
              </button>
            </>
          )}

          {result.status === 'applied' && (
            <>
              <div className="result-header">
                <span className="badge badge-applied">Applied</span>
                <span className="result-title">Wiki updated successfully</span>
              </div>
              <p className="result-summary">{result.summary}</p>
              <ul className="changes-list">
                {result.changes?.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
              <button className="btn-ghost" onClick={() => { setResult(null); setFile(null); setUrl(''); setCategoryOverrides({}); }}>
                Ingest another
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
