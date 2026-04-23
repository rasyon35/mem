'use client';

import React, { useEffect, useState } from 'react';
import { useWiki } from '@/context/WikiContext';
import { Spinner } from '@/components/Icons';
import axios from 'axios';

const API = 'http://localhost:8000/api';

export default function ReviewPage() {
  const { pullRequests, fetchPullRequests, approvePullRequest, setModalDiff } = useWiki();
  const [loadingPr, setLoadingPr] = useState<string | null>(null);
  const [selectedPr, setSelectedPr] = useState<any>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  useEffect(() => {
    fetchPullRequests();
  }, []);

  const handleApprove = async (branchName: string) => {
    setLoadingPr(branchName);
    await approvePullRequest(branchName);
    setLoadingPr(null);
    setSelectedPr(null); // Clear selected PR after merging
  };

  const loadPrDiff = async (pr: any) => {
    setSelectedPr(pr);
    setDiffLoading(true);
    try {
      const res = await axios.get(`${API}/pull_requests/diff?branch=${encodeURIComponent(pr.branch)}`);
      setSelectedPr({ ...pr, changes: res.data.changes });
    } catch (e) {
      alert("Failed to load PR diff");
    } finally {
      setDiffLoading(false);
    }
  };

  const showDiffModal = (change: any) => {
    // For now we just show the raw patch in the modal using the old/new diff view
    setModalDiff({
      open: true,
      title: `Diff: ${change.file}`,
      old: '',
      new: change.patch || 'No visible patch' // The patch contains the unified diff
    });
  };

  return (
    <section className="panel" id="panel-review">
      <header className="flex flex-col gap-1 mb-6 pb-4 border-b border-white/5">
        <h1 className="panel-title">AI Staging Area</h1>
        <p className="panel-sub">Review and merge pending AI-generated changes.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        {/* PR List */}
        <div className="w-full md:w-1/3 flex flex-col gap-3">
          <h2 className="text-sm font-bold text-muted uppercase tracking-widest mb-2">Pending Branches</h2>
          {pullRequests.length === 0 ? (
            <div className="empty-state">No pending AI changes.</div>
          ) : (
            pullRequests.map(pr => (
              <div 
                key={pr.branch} 
                onClick={() => loadPrDiff(pr)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedPr?.branch === pr.branch ? 'bg-accent/10 border-accent/40' : 'bg-white/5 border-white/8 hover:border-white/20'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-xs font-mono text-muted">{pr.branch}</span>
                </div>
                <h3 className="font-bold text-sm text-white mb-1">{pr.message}</h3>
                <p className="text-[10px] text-muted-dark uppercase font-bold tracking-wider">
                  {new Date(pr.timestamp).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>

        {/* PR Details */}
        <div className="w-full md:w-2/3">
          {selectedPr ? (
            <div className="card h-full flex flex-col">
              <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-xl font-black text-white">{selectedPr.message}</h2>
                  <p className="text-xs font-mono text-muted mt-1">{selectedPr.branch}</p>
                </div>
                <button 
                  className="btn-success"
                  onClick={() => handleApprove(selectedPr.branch)}
                  disabled={loadingPr === selectedPr.branch}
                >
                  {loadingPr === selectedPr.branch ? <Spinner /> : 'Merge to Main'}
                </button>
              </div>

              {diffLoading ? (
                <div className="flex justify-center items-center py-20">
                  <Spinner />
                </div>
              ) : (
                <div className="flex flex-col gap-4 flex-1">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-widest">Changes</h3>
                  {selectedPr.changes && selectedPr.changes.length > 0 ? (
                    selectedPr.changes.map((change: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-bg-700 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <span className={`tag flex-shrink-0 ${change.type === 'A' ? 'tag-new' : change.type === 'M' ? 'tag-updated' : 'tag-conflict'}`}>
                            {change.type === 'A' ? 'ADDED' : change.type === 'M' ? 'MODIFIED' : change.type}
                          </span>
                          <span className="font-mono text-sm text-white">{change.file}</span>
                        </div>
                        <button className="btn-ghost text-xs" onClick={() => showDiffModal(change)}>
                          View Diff
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted">No file changes detected.</div>
                  )}
                </div>
              )}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-full py-40 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                <p className="text-muted font-bold">Select a branch to review changes</p>
             </div>
          )}
        </div>
      </div>
    </section>
  );
}
