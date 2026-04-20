'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWiki } from '@/context/WikiContext';

export default function TimelinePage() {
  const searchParams = useSearchParams();
  const pageFilter = searchParams.get('page');
  const { gitHistory, fetchHistory, handleRevert } = useWiki();

  useEffect(() => {
    fetchHistory(pageFilter || undefined);
  }, [pageFilter]);

  return (
    <section className="panel" id="panel-timeline">
      <h1 className="panel-title">Timeline</h1>
      <p className="panel-sub">{pageFilter ? `History for ${pageFilter.replace(/_/g, ' ')}` : 'System-wide version history and team activity.'}</p>

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
    </section>
  );
}
