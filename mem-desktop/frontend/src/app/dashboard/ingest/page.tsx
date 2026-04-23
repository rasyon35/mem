'use client';

import { useState } from 'react';
import { useWiki } from '@/context/WikiContext';
import { UploadIcon, Spinner } from '@/components/Icons';
import { motion, AnimatePresence } from 'framer-motion';

export default function IngestPage() {
  const { 
    file, setFile, url, setUrl, autoApprove, setAutoApprove, 
    loading, result, setResult, handleIngest, handleApprove, setModalDiff 
  } = useWiki();

  // Local state for editable categories on staged results
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});

  const updateCategory = (title: string, newCat: string) => {
    setCategoryOverrides(prev => ({ ...prev, [title]: newCat }));
  };

  // Wrap handleApprove to inject category overrides into proposed_changes before sending
  const handleApproveWithCategories = async () => {
    if (result?.proposed_changes) {
      const changes = result.proposed_changes as any;
      // Apply overrides to new_pages
      if (changes.new_pages) {
        changes.new_pages = changes.new_pages.map((p: any) => ({
          ...p,
          category: categoryOverrides[p.title] || p.category || 'Miscellaneous'
        }));
      }
      // Apply overrides to updated_pages
      if (changes.updated_pages) {
        changes.updated_pages = changes.updated_pages.map((p: any) => ({
          ...p,
          category: categoryOverrides[p.title] || p.category || ''
        }));
      }
    }
    await handleApprove();
    setCategoryOverrides({});
  };

  return (
    <section className="panel" id="panel-ingest">
      <header className="flex flex-col gap-1">
        <h1 className="panel-title">Add Knowledge</h1>
        <p className="panel-sub">Drop a file or paste a URL to ingest into your wiki.</p>
      </header>

      <div className="card">
        <label className="dropzone relative overflow-hidden group">
          <UploadIcon />
          <span className="dz-text">{file ? file.name : 'Click to upload or drag & drop'}</span>
          <span className="dz-hint">PDF · DOCX · MD · TXT · IMG (PNG/JPG) · URL</span>
          <input
            type="file"
            accept=".pdf,.docx,.md,.txt,.html,.png,.jpg,.jpeg,.webp"
            style={{ display: 'none' }}
            onChange={e => { setFile(e.target.files?.[0] || null); setUrl(''); }}
          />
          
          {loading && (
            <motion.div 
              className="absolute top-0 left-0 right-0 h-1 bg-accent shadow-[0_0_15px_var(--accent)] z-10"
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </label>

        <div className="divider"><span>or</span></div>

        <input
          className="text-input"
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
