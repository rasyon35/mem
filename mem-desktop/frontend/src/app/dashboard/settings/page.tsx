'use client';

import { useEffect, useState } from 'react';
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
    autoApprove, setAutoApprove, contradictions, resolveContradiction, 
    criticalPages, addCritical, removeCritical, newCritical, setNewCritical,
    fetchWikiPages
  } = useWiki();

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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard');
    } catch {
      alert('Unable to copy. Please copy manually.');
    }
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

  const [publishing, setPublishing] = useState(false);
  const [publishUrl, setPublishUrl] = useState('');
  const [kpiCounts, setKpiCounts] = useState<Record<string, number>>({});

  const handlePublish = async () => {
    setPublishing(true);
    setPublishUrl('');
    try {
      const res = await axios.post(`${API}/publish`);
      setPublishUrl(res.data.url);
    } catch {
      alert('Failed to publish wiki.');
    } finally {
      setPublishing(false);
    }
  };

  const loadKpiSummary = async () => {
    try {
      const res = await axios.get(`${API}/metrics/summary`);
      setKpiCounts(res.data.event_counts || {});
    } catch {
      setKpiCounts({});
    }
  };

  useEffect(() => {
    loadKpiSummary();
  }, []);

  const changedCount = reorgPreview.filter(item => {
    const proposed = reorgEdits[item.title] ?? item.proposed_category;
    return proposed !== item.current_category;
  }).length;

  return (
    <section className="panel" id="panel-settings">
      <header className="panel-header">
        <h1 className="panel-title">Settings</h1>
        <p className="panel-sub">Manage your workspace preferences and data.</p>
      </header>

      <div className="card">
        <h2 className="text-lg font-semibold text-text-primary">Preferences</h2>
        <div className="mt-2">
          <label className="toggle-label">
            <div className={`toggle ${autoApprove ? 'on' : ''}`} onClick={() => setAutoApprove(!autoApprove)}>
              <span className="toggle-thumb" />
            </div>
            <span>Auto-approve non-critical updates</span>
          </label>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Data Export & Archival</h2>
            <p className="text-sm text-text-secondary mt-1">Download a complete snapshot of your knowledge base or publish a public site.</p>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? <Spinner /> : 'Publish'}
            </button>
            <a
              href={`${API}/export_all`}
              download
              className="btn-primary"
            >
              Download Archive
            </a>
          </div>
        </div>
        {publishUrl && (
          <div className="mt-4 p-3 bg-surface-3 border border-border-strong rounded-md flex justify-between items-center">
            <p className="text-sm text-text-primary">Site published: <code className="text-accent">{publishUrl}</code></p>
            <button className="btn-ghost !text-xs" onClick={() => copyToClipboard(publishUrl)}>Copy</button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Category Organization</h2>
            <p className="text-sm text-text-secondary mt-1">Use the LLM to propose categories for all wiki pages.</p>
          </div>
          <button className="btn-secondary" onClick={handleReorganize} disabled={reorgLoading}>
            {reorgLoading ? <Spinner /> : 'Reorganize'}
          </button>
        </div>

        {reorgDone && (
          <div className="mt-4 p-3 border border-success text-success bg-surface-2 rounded-md text-sm">
            Categories applied successfully.
          </div>
        )}

        {reorgPreview.length > 0 && (
          <div className="mt-6 border-t border-border-subtle pt-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-text-secondary">
                <strong className="text-text-primary">{changedCount}</strong> of {reorgPreview.length} pages will be re-categorized.
              </p>
              <button 
                className="btn-success" 
                onClick={handleApplyReorg} 
                disabled={reorgApplying}
              >
                {reorgApplying ? <Spinner /> : 'Apply Changes'}
              </button>
            </div>

            <div className="overflow-y-auto rounded-md border border-border-subtle bg-surface-2" style={{ maxHeight: '400px' }}>
              <table className="w-full text-sm text-left">
                <thead className="bg-surface-3 text-text-muted sticky top-0">
                  <tr>
                    <th className="p-3 font-medium border-b border-border-subtle">Page</th>
                    <th className="p-3 font-medium border-b border-border-subtle">Current</th>
                    <th className="p-3 font-medium border-b border-border-subtle">Proposed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {reorgPreview.map(item => {
                    const proposed = reorgEdits[item.title] ?? item.proposed_category;
                    const changed = proposed !== item.current_category;
                    return (
                      <tr key={item.title} className={changed ? 'bg-surface-3' : ''}>
                        <td className="p-3 font-medium text-text-primary">{item.title.replace(/_/g, ' ')}</td>
                        <td className="p-3 text-text-secondary">{item.current_category}</td>
                        <td className="p-3">
                          <input
                            type="text"
                            className="text-input !py-1 !text-xs"
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

      <div className="card">
        <h2 className="text-lg font-semibold text-text-primary">Contradiction Hub</h2>
        <p className="text-sm text-text-secondary mt-1 mb-4">Review and resolve claims that conflict across sources.</p>

        <div className="contradiction-list">
          {contradictions.length === 0 ? (
            <div className="empty-state !p-6">No pending contradictions.</div>
          ) : (
            contradictions.map(c => (
              <div key={c.id} className="contradiction-box">
                <div className="contradiction-header">
                  <strong className="font-semibold">{c.page}</strong>
                  <span className={`badge badge-${c.confidence}`}>{c.confidence}</span>
                </div>
                <div className="contradiction-comparison">
                  <div className="comparison-pane">
                    <label>Existing Claim</label>
                    <div className="pane-content">{c.existing}</div>
                  </div>
                  <div className="comparison-pane">
                    <label>New Claim ({c.source_name})</label>
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
        <h2 className="text-lg font-semibold text-text-primary">Critical Pages</h2>
        <p className="text-sm text-text-secondary mt-1 mb-4">Changes to these pages always require human review.</p>

        <div className="flex gap-2 mb-4">
          <input
            className="text-input"
            placeholder="Page title (e.g., Overview)"
            value={newCritical}
            onChange={e => setNewCritical(e.target.value)}
          />
          <button className="btn-secondary" onClick={addCritical}>Add</button>
        </div>

        <div className="flex flex-col gap-2">
          {criticalPages.length === 0 ? (
            <p className="text-sm text-text-muted">No critical pages defined.</p>
          ) : (
            criticalPages.map(p => (
              <div key={p.id} className="critical-page-item">
                <span>{p.title}</span>
                <button className="btn-ghost !text-xs" onClick={() => removeCritical(p.title)}>Remove</button>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-text-primary">KPI Snapshot</h2>
          <button className="btn-ghost !text-xs" onClick={loadKpiSummary}>Refresh</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1 p-3 bg-surface-3 rounded-md">
            <span className="text-xs text-text-muted">Ingests</span>
            <span className="text-xl font-semibold">{kpiCounts.frontend_ingest_completed || 0}</span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-surface-3 rounded-md">
            <span className="text-xs text-text-muted">Approvals</span>
            <span className="text-xl font-semibold">{kpiCounts.frontend_approve_completed || 0}</span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-surface-3 rounded-md">
            <span className="text-xs text-text-muted">Chats</span>
            <span className="text-xl font-semibold">{kpiCounts.frontend_chat_completed || 0}</span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-surface-3 rounded-md">
            <span className="text-xs text-text-muted">Pages</span>
            <span className="text-xl font-semibold">{kpiCounts.frontend_page_opened || 0}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
