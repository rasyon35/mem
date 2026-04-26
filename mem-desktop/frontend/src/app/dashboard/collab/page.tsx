'use client';

export default function CollabPage() {
  return (
    <div className="panel animate-in">
      <header className="panel-header">
        <h1 className="panel-title">Collaboration</h1>
        <p className="panel-sub">This area is not wired up yet.</p>
      </header>
      <div className="panel-body">
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            If you expected real-time collaboration features here, the route now exists (so you won’t hit a 404),
            but the feature UI still needs implementation.
          </p>
        </div>
      </div>
    </div>
  );
}

