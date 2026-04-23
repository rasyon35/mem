'use client';

import { useEffect, useMemo, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWiki } from '@/context/WikiContext';
import { WikiIcon, TimelineIcon, ChatIcon, SourceIcon, Spinner } from '@/components/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import axios from 'axios';

const API = 'http://localhost:8000/api';

type MiniMsg = { role: 'user' | 'ai'; text: string };

function WikiContent() {
  const searchParams = useSearchParams();
  const pageTitle = searchParams.get('page');
  const { 
    wikiPages, selectedPage, fetchWikiPages, openPage, locks, trackActivity,
    handleLock, handleUnlock,
    suggestedLinks, suggestionsLoading, fetchSuggestions, addLinkToPage
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
    if (pageTitle) {
      openPage(pageTitle);
      fetchSuggestions(pageTitle);
    }
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
      <div className="wiki-list-col bg-white/[0.02] border-r border-white/5 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
           <h1 className="text-sm font-black text-muted uppercase tracking-[0.2em]">Knowledge Base</h1>
           <button className="btn-ghost !py-1 !px-3 text-[10px] font-black uppercase tracking-widest" onClick={fetchWikiPages}>Refresh</button>
        </div>
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
        {!selectedPage ? (
          <div className="wiki-empty">
            <WikiIcon />
            <p>Select a page to read</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={selectedPage.title}
            transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
            className="w-full"
          >
            {/* Lock Banner */}
            {locks.find((l: any) => l.page === selectedPage.title) && (
              <div className={`p-4 rounded-2xl mb-4 flex items-center justify-between border ${
                locks.find((l: any) => l.page === selectedPage.title).owner === 'Me' 
                ? 'bg-accent/10 border-accent/30' 
                : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{locks.find((l: any) => l.page === selectedPage.title).owner === 'Me' ? '✏️' : '🔒'}</span>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {locks.find((l: any) => l.page === selectedPage.title).owner === 'Me' 
                        ? 'You have locked this page for editing.' 
                        : `This page is locked by ${locks.find((l: any) => l.page === selectedPage.title).owner}`}
                    </p>
                    <p className="text-[11px] text-muted">Active since {new Date(locks.find((l: any) => l.page === selectedPage.title).timestamp * 1000).toLocaleTimeString()}</p>
                  </div>
                </div>
                {locks.find((l: any) => l.page === selectedPage.title).owner === 'Me' && (
                  <button className="btn-ghost py-1 px-4 text-xs font-black" onClick={() => handleUnlock(selectedPage.title, 'Me')}>Release Lock</button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 mb-8">
               <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-black text-white tracking-tight font-outfit">
                    {selectedPage.title.replace(/_/g, ' ')}
                  </h2>
                  <div className="flex gap-2">
                     <Link href={`/dashboard/timeline?page=${encodeURIComponent(selectedPage.title.replace(/ /g, '_'))}`} className="btn-ghost !py-2 !px-4 text-[11px] font-black uppercase tracking-widest">
                       History
                     </Link>
                     <a 
                       href={`${API}/export_page?page=${encodeURIComponent(selectedPage.title)}&format=pdf`}
                       download
                       className="btn-primary !py-2 !px-4 text-[11px] font-black uppercase tracking-widest" 
                     >
                       Export PDF
                     </a>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <span className="tag tag-updated text-[10px] font-black uppercase tracking-widest">
                    {selectedPage.category || 'General'}
                  </span>
                  {!locks.find((l: any) => l.page === selectedPage.title) && (
                    <button className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline" onClick={() => handleLock(selectedPage.title, 'Me')}>
                      Lock for Editing
                    </button>
                  )}
               </div>
            </div>

            <div className={`prose-editor ${locks.find((l: any) => l.page === selectedPage.title && l.owner !== 'Me') ? 'opacity-50 pointer-events-none' : ''}`}>
               <pre className="text-base leading-relaxed text-secondary whitespace-pre-wrap font-inter">
                 {selectedPage.content}
               </pre>
            </div>

            {/* Knowledge Provenance Section */}
            {selectedPage.provenance && selectedPage.provenance.length > 0 && (
              <div className="mt-12 p-8 rounded-3xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3 mb-8">
                   <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                      <SourceIcon size={20} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-white tracking-tight">Knowledge Provenance</h3>
                      <p className="text-xs text-muted font-medium mt-0.5">Traceable source fragments that inspired this page</p>
                   </div>
                </div>

                <div className="space-y-6">
                  {selectedPage.provenance.map((prov, i) => (
                    <div key={i} className="relative group">
                      <div className="absolute -left-4 top-0 bottom-0 w-1 bg-accent/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-start justify-between mb-3">
                         <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/10 px-2 py-1 rounded-md border border-accent/20">
                               {prov.source_type}
                            </span>
                            <span className="text-sm font-bold text-white hover:text-accent transition-colors cursor-pointer">
                               {prov.source_name}
                            </span>
                            {prov.page_reference && (
                              <span className="text-[10px] font-black text-muted-dark uppercase tracking-wider border-l border-white/10 pl-3">
                                Ref: {prov.page_reference}
                              </span>
                            )}
                         </div>
                         <span className="text-[9px] font-bold text-muted uppercase tracking-tighter">
                            {new Date(prov.timestamp).toLocaleDateString()}
                         </span>
                      </div>
                      
                      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 group-hover:border-white/10 transition-all">
                        <p className="text-sm text-secondary leading-relaxed italic">
                          "{prov.chunk_text}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Relationships Panel */}
            <div className="mt-8 p-8 rounded-3xl bg-white/3 border border-white/8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black text-white">Suggested Relationships</h3>
                  <p className="text-xs text-muted mt-1">AI-detected conceptual links for this page</p>
                </div>
                <button 
                  onClick={() => fetchSuggestions(selectedPage.title)} 
                  disabled={suggestionsLoading}
                  className="btn-ghost text-[10px] uppercase font-black tracking-widest py-1.5 px-3"
                >
                  {suggestionsLoading ? <Spinner /> : 'Refresh'}
                </button>
              </div>

              {suggestionsLoading ? (
                <div className="flex items-center gap-4 py-4">
                  <Spinner /> <span className="text-xs text-muted">Analyzing local knowledge graph...</span>
                </div>
              ) : suggestedLinks.length === 0 ? (
                <p className="text-sm text-muted italic">No additional relationships detected yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestedLinks.map(s => (
                    <div key={s.title} className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-accent/40 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[10px] font-black">
                          {Math.round(s.score * 100)}%
                        </div>
                        <span className="text-sm font-bold text-secondary group-hover:text-white transition-colors">{s.title.replace(/_/g, ' ')}</span>
                      </div>
                      <button 
                        onClick={() => addLinkToPage(selectedPage.title, s.title)}
                        className="btn-primary py-1 px-3 text-[10px] font-black tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Add Link
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
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

export default function WikiPage() {
  return (
    <Suspense fallback={<div>Loading wiki...</div>}>
      <WikiContent />
    </Suspense>
  );
}
