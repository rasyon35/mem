'use client';

import { useState } from 'react';
import axios from 'axios';
import { useWiki } from '@/context/WikiContext';
import { Spinner } from '@/components/Icons';

const API = 'http://localhost:8000/api';

type ReorgItem = {
  title: string;
  current_category: string;
  proposed_category: string;
};

export default function SettingsPage() {
  const { 
    autoApprove, setAutoApprove, contradictions, resolveContradiction, openPage, 
    criticalPages, addCritical, removeCritical, newCritical, setNewCritical,
    fetchWikiPages
  } = useWiki();

  // Bulk reorganization state
  const [reorgPreview, setReorgPreview] = useState<ReorgItem[]>([]);
  const [reorgLoading, setReorgLoading] = useState(false);
  const [reorgApplying, setReorgApplying] = useState(false);
  const [reorgDone, setReorgDone] = useState(false);
  const [reorgEdits, setReorgEdits] = useState<Record<string, string>>({});

  const handleReorganize = async () => {
    setReorgLoading(true);
    setReorgDone(false);
    setReorgEdits({});
    try {
      const res = await axios.post(`${API}/reorganize_categories`);
      setReorgPreview(res.data.preview || []);
    } catch (err) {
      alert('Failed to get LLM suggestions. Check the backend console.');
    } finally {
      setReorgLoading(false);
    }
  };

  const updateProposedCategory = (title: string, value: string) => {
    setReorgEdits(prev => ({ ...prev, [title]: value }));
  };

  const handleApplyReorg = async () => {
    setReorgApplying(true);
    const assignments = reorgPreview.map(item => ({
      title: item.title,
      category: reorgEdits[item.title] ?? item.proposed_category,
    }));
    try {
      await axios.post(`${API}/apply_categories`, { assignments });
      setReorgDone(true);
      setReorgPreview([]);
      fetchWikiPages();
    } catch {
      alert('Failed to apply categories.');
    } finally {
      setReorgApplying(false);
    }
  };

  // Count how many categories will change
  const changedCount = reorgPreview.filter(item => {
    const proposed = reorgEdits[item.title] ?? item.proposed_category;
    return proposed !== item.current_category;
  }).length;

  return (
    <section className="panel" id="panel-settings">
      <h1 className="panel-title">Management</h1>

      <div className="card">
        <h2 className="text-xl font-bold mb-2">Preferences</h2>
        <div className="flex flex-col gap-3">
          <label className="toggle-switch">
            <input
              type="checkbox"
              className="toggle-input"
              checked={autoApprove}
              onChange={e => setAutoApprove(e.target.checked)}
            />
            <div className="toggle-track">
              <div className="toggle-thumb" />
            </div>
            <span>Auto-approve non-critical updates</span>
          </label>
        </div>
      </div>

      {/* --- Data Export & Archival Card --- */}
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-xl font-bold">Data Export & Archival</h2>
            <p className="panel-sub">Download a complete snapshot of your knowledge base, including all markdown files.</p>
          </div>
          <a
            href={`${API}/export_all`}
            download
            className="btn-primary flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Archive (.zip)
          </a>
        </div>
      </div>

      {/* --- Bulk Reorganization Card --- */}
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-xl font-bold">Category Organization</h2>
            <p className="panel-sub">Use the LLM to propose categories for all wiki pages, then review and apply.</p>
          </div>
          <button className="btn-primary" onClick={handleReorganize} disabled={reorgLoading}>
            {reorgLoading ? <><Spinner /> Analyzing...</> : '🧠 Reorganize with AI'}
          </button>
        </div>

        {reorgDone && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm font-medium mt-2">
            ✓ Categories applied successfully! Sidebar will update on next refresh.
          </div>
        )}

        {reorgPreview.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-muted">
                <strong className="text-white">{changedCount}</strong> of {reorgPreview.length} pages will be re-categorized.
                You can edit any category before applying.
              </p>
              <button 
                className="btn-success" 
                onClick={handleApplyReorg} 
                disabled={reorgApplying}
              >
                {reorgApplying ? <><Spinner /> Applying...</> : `✓ Apply ${changedCount} Changes`}
              </button>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
              <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr className="text-xs text-muted uppercase tracking-wider">
                    <th className="text-left p-2 sticky top-0 bg-bg-800 z-10">Page</th>
                    <th className="text-left p-2 sticky top-0 bg-bg-800 z-10">Current</th>
                    <th className="text-left p-2 sticky top-0 bg-bg-800 z-10">→</th>
                    <th className="text-left p-2 sticky top-0 bg-bg-800 z-10">Proposed (editable)</th>
                  </tr>
                </thead>
                <tbody>
                  {reorgPreview.map(item => {
                    const proposed = reorgEdits[item.title] ?? item.proposed_category;
                    const changed = proposed !== item.current_category;
                    return (
                      <tr 
                        key={item.title} 
                        className={`border-b border-border/30 ${changed ? 'bg-accent/5' : ''}`}
                      >
                        <td className="p-2 font-medium text-white truncate" style={{ maxWidth: '220px' }} title={item.title}>
                          {item.title.replace(/_/g, ' ')}
                        </td>
                        <td className="p-2 text-muted">{item.current_category}</td>
                        <td className="p-2">{changed ? <span className="text-accent">→</span> : <span className="text-muted">—</span>}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            className="text-input"
                            style={{ padding: '3px 8px', fontSize: '12px', width: '200px' }}
                            value={proposed}
                            onChange={e => updateProposedCategory(item.title, e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="flex flex-col gap-1" style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-xl font-bold">Contradiction Hub</h2>
          <p className="panel-sub">Review and resolve claims that conflict across sources.</p>
        </div>

        <div className="contradiction-list">
          {contradictions.length === 0 ? (
            <div className="empty-state">No pending contradictions! ✓</div>
          ) : (
            contradictions.map(c => (
              <div key={c.id} className="contradiction-box">
                <div className="contradiction-header">
                  <strong>Conflict in: {c.page}</strong>
                  <span className={`badge badge-${c.confidence}`}>{c.confidence}</span>
                </div>
                <div className="contradiction-comparison">
                  <div className="comparison-pane">
                    <label>Existing Wiki Claim</label>
                    <div className="pane-content">{c.existing}</div>
                  </div>
                  <div className="comparison-divider" />
                  <div className="comparison-pane">
                    <label>New Source Claim ({c.source_name})</label>
                    <div className="pane-content">{c.new}</div>
                  </div>
                </div>
                <div className="contradiction-actions">
                  <button className="btn-success" onClick={() => resolveContradiction(c.id, 'accept')}>Accept New</button>
                  <button className="btn-secondary" onClick={() => resolveContradiction(c.id, 'dismiss')}>Keep Existing</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-2">Critical Pages</h2>
        <p className="panel-sub mb-4">Changes to these pages always require human review.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          <input
            className="text-input"
            style={{ flex: '1 1 200px' }}
            placeholder="Page title (e.g., Overview)"
            value={newCritical}
            onChange={e => setNewCritical(e.target.value)}
          />
          <button className="btn-primary" style={{ flex: '0 0 auto' }} onClick={addCritical}>Add</button>
        </div>

        <div className="flex flex-col gap-2">
          {criticalPages.length === 0 ? (
            <p className="text-sm text-muted">No critical pages defined.</p>
          ) : (
            criticalPages.map(p => (
              <div key={p.id} className="critical-page-item">
                <span>{p.title}</span>
                <button className="btn-ghost" onClick={() => removeCritical(p.title)}>Remove</button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
