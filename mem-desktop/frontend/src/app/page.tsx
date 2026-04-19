'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000/api';

type WikiPage = { title: string; description: string };
type ChatMsg = { role: 'user' | 'ai'; text: string };

type IngestResult = {
  status?: 'staged' | 'applied';
  error?: string;
  needs_approval?: boolean;
  proposed_changes?: Record<string, unknown>;
  preview?: {
    summary?: string;
    new_pages?: string[];
    updated_pages?: string[];
    contradictions?: number;
  };
  changes?: string[];
  contradictions?: { existing_page: string; existing_claim: string; new_claim: string; confidence: string }[];
  summary?: string;
};

export default function Home() {
  // ── Ingest state ────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);

  // ── Chat state ───────────────────────────────────────────────────
  const [question, setQuestion] = useState('');
  const [chatLog, setChatLog] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Wiki state ───────────────────────────────────────────────────
  const [wikiPages, setWikiPages] = useState<WikiPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<{ title: string; content: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'ingest' | 'chat' | 'wiki' | 'timeline' | 'settings'>('ingest');
  const [gitHistory, setGitHistory] = useState<any[]>([]);
  const [contradictions, setContradictions] = useState<any[]>([]);
  const [criticalPages, setCriticalPages] = useState<any[]>([]);
  const [newCritical, setNewCritical] = useState('');

  // Modal state
  const [modalDiff, setModalDiff] = useState<{ open: boolean; old: string; new: string; title: string }>({
    open: false, old: '', new: '', title: ''
  });

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  // Load wiki pages when tab is opened
  useEffect(() => {
    if (activeTab === 'wiki') fetchWikiPages();
    if (activeTab === 'timeline') fetchHistory();
    if (activeTab === 'settings') {
      fetchContradictions();
      fetchCriticalPages();
    }
  }, [activeTab]);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleIngest = async () => {
    if (!file && !url.trim()) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    if (file) formData.append('file', file);
    else formData.append('url', url.trim());
    formData.append('auto_approve', String(autoApprove));

    try {
      const res = await axios.post(`${API}/ingest`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch {
      setResult({ error: 'Request failed – is the backend running?' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!result?.proposed_changes) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/approve`, { changes: result.proposed_changes });
      setResult({ ...res.data });
    } catch {
      setResult({ error: 'Approval request failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!question.trim()) return;
    const q = question.trim();
    setChatLog(prev => [...prev, { role: 'user', text: q }]);
    setQuestion('');
    setChatLoading(true);
    try {
      const res = await axios.post(`${API}/chat`, { question: q });
      setChatLog(prev => [...prev, { role: 'ai', text: res.data.answer }]);
    } catch {
      setChatLog(prev => [...prev, { role: 'ai', text: '⚠️ Could not reach backend.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const fetchWikiPages = async () => {
    try {
      const res = await axios.get(`${API}/wiki`);
      setWikiPages(res.data.pages || []);
    } catch { /* ignore */ }
  };

  const openPage = async (title: string) => {
    try {
      const res = await axios.get(`${API}/wiki/${encodeURIComponent(title)}`);
      setSelectedPage(res.data);
    } catch { /* ignore */ }
  };

  const fetchHistory = async (pageTitle?: string) => {
    try {
      const url = pageTitle ? `${API}/history?page=${encodeURIComponent(pageTitle)}` : `${API}/history`;
      const res = await axios.get(url);
      setGitHistory(res.data.commits || []);
    } catch { /* ignore */ }
  };

  const handleRevert = async (hash: string) => {
    if (!confirm('Revert wiki to this version?')) return;
    try {
      await axios.post(`${API}/revert`, { commit_hash: hash });
      fetchHistory();
      fetchWikiPages();
      alert('Reverted successfully');
    } catch { alert('Revert failed'); }
  };

  const fetchContradictions = async () => {
    try {
      const res = await axios.get(`${API}/contradictions`);
      setContradictions(res.data.contradictions || []);
    } catch { /* ignore */ }
  };

  const resolveContradiction = async (id: number, action: 'accept' | 'dismiss') => {
    try {
      await axios.patch(`${API}/contradictions`, { id, action });
      fetchContradictions();
    } catch { /* ignore */ }
  };

  const fetchCriticalPages = async () => {
    try {
      const res = await axios.get(`${API}/critical`);
      setCriticalPages(res.data.critical_pages || []);
    } catch { /* ignore */ }
  };

  const addCritical = async () => {
    if (!newCritical.trim()) return;
    try {
      await axios.post(`${API}/critical`, { title: newCritical.trim() });
      setNewCritical('');
      fetchCriticalPages();
    } catch { /* ignore */ }
  };

  const removeCritical = async (title: string) => {
    try {
      await axios.delete(`${API}/critical`, { data: { title } });
      fetchCriticalPages();
    } catch { /* ignore */ }
  };

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-mark">M</span>
          <span className="logo-text">em</span>
        </div>

        <nav className="nav">
          {(['ingest', 'chat', 'wiki', 'timeline', 'settings'] as const).map(tab => (
            <button
              key={tab}
              className={`nav-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              id={`nav-${tab}`}
            >
              {tab === 'ingest' && <IngestIcon />}
              {tab === 'chat' && <ChatIcon />}
              {tab === 'wiki' && <WikiIcon />}
              {tab === 'settings' && (
                <div style={{ position: 'relative' }}>
                  <SettingsIcon />
                  {contradictions.length > 0 && <span className="nav-badge">{contradictions.length}</span>}
                </div>
              )}
              <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
            </button>
          ))}
        </nav>

        {/* Mini wiki list in sidebar */}
        {wikiPages.length > 0 && (
          <div className="sidebar-pages">
            <p className="sidebar-pages-label">PAGES</p>
            {wikiPages.slice(0, 12).map(p => (
              <button
                key={p.title}
                className="sidebar-page-link"
                onClick={() => { setActiveTab('wiki'); openPage(p.title); }}
                title={p.description}
              >
                {p.title.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <main className="main">

        {/* ════ INGEST TAB ════ */}
        {activeTab === 'ingest' && (
          <section className="panel" id="panel-ingest">
            <header className="flex flex-col gap-1">
              <h1 className="panel-title">Add Knowledge</h1>
              <p className="panel-sub">Drop a file or paste a URL to ingest into your wiki.</p>
            </header>

            <div className="card">
              {/* File drop zone */}
              <label className="dropzone" id="dropzone">
                <UploadIcon />
                <span className="dz-text">
                  {file ? file.name : 'Click to upload or drag & drop'}
                </span>
                <span className="dz-hint">PDF · DOCX · MD · TXT · HTML</span>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.docx,.md,.txt,.html"
                  style={{ display: 'none' }}
                  onChange={e => { setFile(e.target.files?.[0] || null); setUrl(''); }}
                />
              </label>

              <div className="divider"><span>or</span></div>

              <input
                id="url-input"
                className="text-input"
                type="text"
                placeholder="https://example.com/article"
                value={url}
                onChange={e => { setUrl(e.target.value); setFile(null); }}
              />

              <div className="row-space-between">
                <label className="toggle-label" htmlFor="auto-approve-toggle">
                  <span>Auto-approve changes</span>
                  <div className={`toggle ${autoApprove ? 'on' : ''}`} onClick={() => setAutoApprove(v => !v)}>
                    <span className="toggle-thumb" />
                  </div>
                </label>

                <button
                  id="ingest-btn"
                  className="btn-primary"
                  onClick={handleIngest}
                  disabled={loading || (!file && !url.trim())}
                >
                  {loading ? <Spinner /> : 'Ingest'}
                </button>
              </div>
            </div>

            {/* Result panel */}
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

                    {/* Diff Review (Modal Trigger) */}
                    {result.proposed_changes?.updated_pages && (result.proposed_changes.updated_pages as any[]).length > 0 && (
                      <div className="mt-4 flex flex-col gap-2">
                        <p className="text-sm font-semibold">Updates to Review:</p>
                        {(result.proposed_changes.updated_pages as any[]).map((p: any) => (
                          <div key={p.title} className="flex justify-between items-center p-2 bg-bg-700 rounded border border-border">
                            <span className="tag tag-updated">{p.title}</span>
                            <button
                              className="btn-ghost"
                              onClick={() => setModalDiff({ open: true, title: `Reviewing: ${p.title}`, old: p.original_content, new: p.content })}
                            >
                              View Diff
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="result-tags">
                      {(result.preview.new_pages ?? []).map(p => (
                        <span key={p} className="tag tag-new">+ {p}</span>
                      ))}
                      {(result.preview.contradictions ?? 0) > 0 && (
                        <span className="tag tag-conflict">⚡ {result.preview.contradictions} contradiction(s)</span>
                      )}
                    </div>
                    <button id="approve-btn" className="btn-success" onClick={handleApprove} disabled={loading}>
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
                    {(result.contradictions ?? []).length > 0 && (
                      <div className="contradiction-preview">
                        <p className="contradiction-title">⚡ Contradictions found:</p>
                        {result.contradictions!.map((c, i) => (
                          <div key={i} className="contradiction-item">
                            <strong>{c.existing_page}</strong>
                            <p className="text-sm">Existing: {c.existing_claim}</p>
                            <p className="text-sm">New: {c.new_claim}</p>
                            <span className={`badge badge-${c.confidence}`}>{c.confidence}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button className="btn-ghost" onClick={() => { setResult(null); setFile(null); setUrl(''); }}>
                      Ingest another
                    </button>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {/* ════ CHAT TAB ════ */}
        {activeTab === 'chat' && (
          <section className="chat-panel" id="panel-chat">
            <header className="chat-header">
              <h1 className="panel-title">Ask Your Wiki</h1>
              <p className="panel-sub">Powered by Groq — answers are grounded in your knowledge base.</p>
            </header>

            <div className="chat-container">
              {chatLog.length === 0 && (
                <div className="chat-empty">
                  <ChatIcon />
                  <p>No messages yet. Ask anything!</p>
                </div>
              )}

              {chatLog.map((msg, i) => (
                <div key={i} className={`chat-bubble ${msg.role}`}>
                  {msg.role === 'ai' && <span className="ai-label">Mem</span>}
                  <p className="bubble-text">{msg.text}</p>
                </div>
              ))}

              {chatLoading && (
                <div className="chat-bubble ai">
                  <span className="ai-label">Mem</span>
                  <p className="bubble-text typing-dots"><span /><span /><span /></p>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <div className="chat-input-wrapper">
              <div className="chat-input-inner">
                <input
                  id="chat-input"
                  className="text-input"
                  type="text"
                  placeholder="What are the main concepts discussed?"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !chatLoading && handleChat()}
                />
                <button
                  id="chat-send-btn"
                  className="btn-primary"
                  onClick={handleChat}
                  disabled={chatLoading || !question.trim()}
                >
                  {chatLoading ? <Spinner /> : 'Ask'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ════ WIKI TAB ════ */}
        {activeTab === 'wiki' && (
          <section className="panel wiki-panel" id="panel-wiki">
            <div className="wiki-list-col">
              <h1 className="panel-title">Wiki</h1>
              <button className="btn-ghost" style={{ marginBottom: '1rem' }} onClick={fetchWikiPages}>↻ Refresh</button>
              {wikiPages.length === 0 ? (
                <p className="panel-sub">No pages yet. Ingest your first source!</p>
              ) : (
                wikiPages.map(p => (
                  <button
                    key={p.title}
                    className={`wiki-page-btn ${selectedPage?.title === p.title ? 'active' : ''}`}
                    onClick={() => openPage(p.title)}
                    id={`wiki-page-${p.title}`}
                  >
                    <span className="wiki-page-title">{p.title.replace(/_/g, ' ')}</span>
                    {p.description && <span className="wiki-page-desc">{p.description}</span>}
                  </button>
                ))
              )}
            </div>

            <div className="wiki-content-col">
              {selectedPage ? (
                <>
                  <div className="row-space-between mb-4">
                    <h2 className="wiki-content-title">{selectedPage.title.replace(/_/g, ' ')}</h2>
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        fetchHistory(selectedPage.title.replace(/ /g, '_'));
                        setActiveTab('timeline');
                      }}
                    >
                      <TimelineIcon /> View History
                    </button>
                  </div>
                  <pre className="wiki-content-body">{selectedPage.content}</pre>
                </>
              ) : (
                <div className="wiki-empty">
                  <WikiIcon />
                  <p>Select a page to read</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ════ TIMELINE TAB ════ */}
        {activeTab === 'timeline' && (
          <section className="panel" id="panel-timeline">
            <h1 className="panel-title">Timeline</h1>
            <p className="panel-sub">Version history for your knowledge base.</p>

            <div className="card" style={{ padding: 0 }}>
              {gitHistory.length === 0 ? (
                <div className="empty-state">No history yet.</div>
              ) : (
                gitHistory.map(commit => (
                  <div key={commit.hash} className="timeline-item">
                    <div className="timeline-marker" />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-msg">{commit.message}</span>
                        <button className="btn-ghost" onClick={() => handleRevert(commit.hash)}>Revert</button>
                      </div>
                      <div className="timeline-meta">
                        <span>{commit.author}</span> • <span>{new Date(commit.timestamp).toLocaleString()}</span>
                      </div>
                      <span className="timeline-hash">{commit.short_hash}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ════ SETTINGS TAB ════ */}
        {activeTab === 'settings' && (
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
                        <button className="btn-ghost" onClick={() => {
                          openPage(c.page);
                          setActiveTab('wiki');
                        }}>Edit Wiki Page</button>
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
        )}
      </main>

      {/* Modal for Diffs */}
      <Modal
        isOpen={modalDiff.open}
        onClose={() => setModalDiff({ ...modalDiff, open: false })}
        title={modalDiff.title}
      >
        <DiffView oldText={modalDiff.old} newText={modalDiff.new} />
      </Modal>
    </div>
  );
}

// ── Components ───────────────────────────────────────────────────

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-lg font-bold">{title}</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────
function IngestIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}
function WikiIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
    </svg>
  );
}
function Spinner() {
  return <span className="spinner" />;
}

function TimelineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const diffLines: { text: string; type: 'added' | 'removed' | 'unchanged' }[] = [];
  let i = 0, j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diffLines.push({ text: oldLines[i], type: 'unchanged' });
      i++; j++;
    } else if (j < newLines.length && (i >= oldLines.length || !oldLines.slice(i).includes(newLines[j]))) {
      diffLines.push({ text: newLines[j], type: 'added' });
      j++;
    } else if (i < oldLines.length) {
      diffLines.push({ text: oldLines[i], type: 'removed' });
      i++;
    }
  }

  return (
    <div className="diff-container">
      {diffLines.map((l, idx) => (
        <div key={idx} className={`diff-line diff-${l.type}`}>
          <span className="diff-line-num">{idx + 1}</span>
          <span>{l.type === 'added' ? '+ ' : l.type === 'removed' ? '- ' : '  '}{l.text}</span>
        </div>
      ))}
    </div>
  );
}
