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
      <div className="flex justify-between items-center mb-6 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h1 className="panel-title mb-1">Timeline</h1>
          <p className="panel-sub">{pageFilter ? `History for ${pageFilter.replace(/_/g, ' ')}` : 'System-wide version history and team activity.'}</p>
        </div>
        <div className="flex rounded-xl p-1 border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-subtle)' }}>
          <button 
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'history' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-white'}`}
            onClick={() => setActiveTab('history')}
          >
            Commits
          </button>
          <button 
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'snapshots' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-white'}`}
            onClick={() => setActiveTab('snapshots')}
          >
            Snapshots
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        <div className="social-feed">
          {gitHistory.length === 0 ? (
            <div className="empty-state">No history yet.</div>
          ) : (
            gitHistory.map(commit => (
              <div key={commit.hash} className="feed-item">
                 <div className="feed-avatar">{commit.author.charAt(0)}</div>
                 <div className="feed-content">
                    <div className="feed-header">
                       <span className="feed-author">{commit.author}</span>
                       <span className="feed-time">{new Date(commit.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="feed-msg">{commit.message}</p>
                    <div className="flex gap-4 mt-2">
                       <span className="text-xs text-muted font-mono">{commit.short_hash}</span>
                       <button className="text-xs text-accent font-bold cursor-pointer hover:underline" onClick={() => handleRevert(commit.hash)}>Revert</button>
                    </div>
                 </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="card">
            <h2 className="text-lg font-bold mb-2">Create Knowledge Milestone</h2>
            <p className="panel-sub mb-4">Tag the current state of the entire knowledge base.</p>
            <div className="flex gap-3">
              <input 
                className="text-input flex-1" 
                placeholder="e.g. End of Artificial Intelligence Research Phase" 
                value={newSnapshotName}
                onChange={e => setNewSnapshotName(e.target.value)}
              />
              <button 
                className="btn-primary" 
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
                <div key={snap.name} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/8 hover:border-accent/30 transition-all">
                  <div>
                    <h3 className="font-bold text-white text-base">{snap.name.replace(/_/g, ' ')}</h3>
                    <p className="text-xs text-muted mt-1 font-mono">Commit: {snap.commit.substring(0, 7)} · {new Date(snap.time).toLocaleString()}</p>
                  </div>
                  <button className="btn-ghost" title="Reverting to snapshots can be done via git CLI for now">View</button>
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
    <Suspense fallback={<div>Loading timeline...</div>}>
      <TimelineContent />
    </Suspense>
  );
}
