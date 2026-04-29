'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWiki } from '@/context/WikiContext';
import { Spinner } from '@/components/Icons';
import axios from 'axios';

const API = 'http://localhost:8000/api';

function TimelineContent() {
  const searchParams = useSearchParams();
  const pageFilter = searchParams.get('page');
  const { gitHistory, fetchHistory, handleRevert } = useWiki();
  const [activeTab, setActiveTab] = useState<'history' | 'snapshots'>('history');
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchHistory(pageFilter || undefined);
    fetchSnapshots();
  }, [pageFilter]);

  const fetchSnapshots = async () => {
    try {
      const res = await axios.get(`${API}/list_snapshots`);
      setSnapshots(res.data.snapshots || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!newSnapshotName.trim()) return;
    setCreating(true);
    try {
      await axios.post(`${API}/create_snapshot`, { name: newSnapshotName });
      setNewSnapshotName('');
      fetchSnapshots();
    } catch (e) {
      alert("Failed to create snapshot");
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="panel" id="panel-timeline">
      <header className="panel-header flex justify-between items-end">
        <div>
          <h1 className="panel-title">Timeline</h1>
          <p className="panel-sub">{pageFilter ? `History for ${pageFilter.replace(/_/g, ' ')}` : 'System-wide version history and team activity.'}</p>
        </div>
        <div className="flex bg-surface-2 border border-border-subtle p-1 rounded-md gap-1">
          <button 
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${activeTab === 'history' ? 'bg-surface-3 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            onClick={() => setActiveTab('history')}
          >
            Commits
          </button>
          <button 
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${activeTab === 'snapshots' ? 'bg-surface-3 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            onClick={() => setActiveTab('snapshots')}
          >
            Snapshots
          </button>
        </div>
      </header>

      {activeTab === 'history' ? (
        <div className="social-feed">
          {gitHistory.length === 0 ? (
            <div className="empty-state">No history yet.</div>
          ) : (
            gitHistory.map(commit => (
              <div key={commit.hash} className="feed-item">
                 <div className="feed-avatar">{commit.author.charAt(0).toUpperCase()}</div>
                 <div className="feed-content">
                    <div className="feed-header">
                       <span className="feed-author">{commit.author}</span>
                       <span className="feed-time">{new Date(commit.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="feed-msg">{commit.message}</p>
                    <div className="flex gap-4 mt-2">
                       <span className="text-xs text-text-muted font-mono">{commit.short_hash}</span>
                       <button className="text-xs font-medium text-text-secondary hover:text-accent" onClick={() => handleRevert(commit.hash)}>Revert</button>
                    </div>
                 </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-1">Create Milestone</h2>
            <p className="text-sm text-text-secondary mb-4">Tag the current state of the entire knowledge base.</p>
            <div className="flex gap-3">
              <input 
                className="text-input" 
                placeholder="e.g. End of AI Research Phase" 
                value={newSnapshotName}
                onChange={e => setNewSnapshotName(e.target.value)}
              />
              <button 
                className="btn-secondary whitespace-nowrap" 
                onClick={handleCreateSnapshot}
                disabled={creating || !newSnapshotName.trim()}
              >
                {creating ? <Spinner /> : 'Save Snapshot'}
              </button>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            {snapshots.length === 0 ? (
              <div className="empty-state">No snapshots created yet.</div>
            ) : (
              snapshots.map(snap => (
                <div key={snap.name} className="flex justify-between items-center p-4 bg-surface-2 border border-border-subtle rounded-md">
                  <div>
                    <h3 className="font-semibold text-text-primary">{snap.name.replace(/_/g, ' ')}</h3>
                    <p className="text-sm text-text-muted mt-1 font-mono">Commit: {snap.commit.substring(0, 7)} · {new Date(snap.time).toLocaleString()}</p>
                  </div>
                  <button className="btn-ghost">View</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<div className="panel"><div className="empty-state"><Spinner /></div></div>}>
      <TimelineContent />
    </Suspense>
  );
}
