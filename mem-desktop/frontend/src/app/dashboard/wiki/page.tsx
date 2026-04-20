'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWiki } from '@/context/WikiContext';
import { WikiIcon, TimelineIcon, ChatIcon, Spinner } from '@/components/Icons';
import Link from 'next/link';
import axios from 'axios';

const API = 'http://localhost:8000/api';

type MiniMsg = { role: 'user' | 'ai'; text: string };

export default function WikiPage() {
  const searchParams = useSearchParams();
  const pageTitle = searchParams.get('page');
  const { 
    wikiPages, selectedPage, fetchWikiPages, openPage, locks, trackActivity
  } = useWiki();

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const groupedPages = useMemo(() => {
    const groups: Record<string, typeof wikiPages> = {};
    wikiPages.forEach(p => {
      const cat = p.category || 'Miscellaneous';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [wikiPages]);

  // Auto-open all categories when data loads
  useEffect(() => {
    const cats = Object.keys(groupedPages);
    if (cats.length > 0 && Object.keys(openCategories).length === 0) {
      const initial: Record<string, boolean> = {};
      cats.forEach(c => initial[c] = true);
      setOpenCategories(initial);
    }
  }, [groupedPages]);

  useEffect(() => {
    fetchWikiPages();
    if (pageTitle) openPage(pageTitle);
  }, [pageTitle]);

  useEffect(() => {
    if (!selectedPage) return;
    const interval = setInterval(() => {
      trackActivity(selectedPage.title);
    }, 10000);
    trackActivity(selectedPage.title);
    return () => clearInterval(interval);
  }, [selectedPage?.title]);

  // --- Floating Chat Widget State ---
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<MiniMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Reset chat when page changes
  useEffect(() => {
    setChatMessages([]);
    setChatInput('');
  }, [selectedPage?.title]);

  const handleChatSend = async () => {
    if (!chatInput.trim() || !selectedPage) return;
    const q = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: q }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await axios.post(`${API}/chat`, { 
        question: q, 
        page_context: selectedPage.title 
      });
      setChatMessages(prev => [...prev, { role: 'ai', text: res.data.answer }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: '⚠️ Could not reach backend.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <section className="panel wiki-panel" id="panel-wiki">
      <div className="wiki-list-col">
        <h1 className="panel-title">Wiki</h1>
        <button className="btn-ghost" style={{ marginBottom: '1rem' }} onClick={fetchWikiPages}>↻ Refresh</button>
        {wikiPages.length === 0 ? (
          <p className="panel-sub">No pages yet. Ingest your first source!</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(groupedPages).map(([category, pages]) => {
              if (pages.length === 0) return null;
              const isOpen = openCategories[category] ?? true;
              return (
                <div key={category} className="sidebar-category">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer hover:bg-white/5 transition-colors group"
                  >
                    <span className="text-xs font-bold text-muted uppercase tracking-wider group-hover:text-white transition-colors">
                      {category} ({pages.length})
                    </span>
                    <svg className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="space-y-0.5 mt-1 ml-1 pl-3" style={{ borderLeft: '2px solid var(--border)' }}>
                      {pages.map(p => (
                        <button
                          key={p.title}
                          className={`wiki-page-btn ${selectedPage?.title === p.title ? 'active' : ''}`}
                          onClick={() => openPage(p.title)}
                        >
                          <span className="wiki-page-title">{p.title.replace(/_/g, ' ')}</span>
                          <div className="flex justify-between items-center w-full">
                             <span className="wiki-page-desc">{p.description}</span>
                             {locks.find((l: any) => l.page === p.title) && <span className="lock-badge">🔒 {locks.find((l: any) => l.page === p.title).owner}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="wiki-content-col">
        {selectedPage ? (
          <>
            <div className="row-space-between mb-4">
              <h2 className="wiki-content-title">{selectedPage.title.replace(/_/g, ' ')}</h2>
              <div className="flex gap-2">
                 <Link href={`/dashboard/timeline?page=${encodeURIComponent(selectedPage.title.replace(/ /g, '_'))}`} className="btn-ghost">
                   <TimelineIcon /> History
                 </Link>
              </div>
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

      {/* --- Floating Chat FAB --- */}
      {selectedPage && (
        <button
          className="wiki-chat-fab"
          onClick={() => setChatOpen(!chatOpen)}
          title="Ask about this page"
        >
          {chatOpen ? '✕' : '💬'}
        </button>
      )}

      {/* --- Chat Overlay --- */}
      {chatOpen && selectedPage && (
        <div className="wiki-chat-overlay">
          <div className="wiki-chat-header">
            <h3>
              <ChatIcon />
              Ask about <strong style={{ color: 'var(--accent-light)' }}>{selectedPage.title.replace(/_/g, ' ')}</strong>
            </h3>
            <button className="wiki-chat-close" onClick={() => setChatOpen(false)}>×</button>
          </div>

          <div className="wiki-chat-messages">
            {chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '2rem 1rem' }}>
                Ask any question about this wiki page and I'll explain it for you.
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                {msg.role === 'ai' && <span className="ai-label">Mem AI</span>}
                <div className="bubble-text">{msg.text}</div>
              </div>
            ))}
            {chatLoading && (
              <div className="chat-bubble ai">
                <span className="ai-label">Mem AI</span>
                <div className="bubble-text typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="wiki-chat-input">
            <input
              className="text-input"
              placeholder={`Ask about ${selectedPage.title.replace(/_/g, ' ')}...`}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
            />
            <button className="btn-primary" onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              {chatLoading ? <Spinner /> : 'Send'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
