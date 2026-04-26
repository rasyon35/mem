'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  FileText,
  Clock,
  Star,
  ChevronRight,
  X,
  FilePlus,
  RefreshCw,
  Hash,
  ArrowRight
} from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:8000/api';

type Page = {
  id: number;
  slug: string;
  title: string;
  filename?: string;
  updated_at: string;
  is_favorite?: boolean;
  page_type?: string;
  tags?: string[];
  content_summary?: string;
};

interface OpenMarkdownProps {
  onOpen: (pageId: number) => void;
  onClose: () => void;
  onNewMarkdown?: () => void;
}

export function OpenMarkdown({ onOpen, onClose, onNewMarkdown }: OpenMarkdownProps) {
  const [search, setSearch] = useState('');
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const fetchPages = async () => {
    setIsLoading(true);
    try {
      const pagesRes = await axios.get(`${API}/wiki/markdown-files`);
      const fetchedPages = pagesRes.data?.pages || [];
      setPages(fetchedPages);
    } catch (e) {
      console.error('Failed to fetch pages:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const pool = [...pages].filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx);
    if (!q) return pool;
    return pool.filter(
      (p) =>
        (p.filename || '').toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [pages, search]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [search]);

  const selectedPage = filtered[selectedIdx];

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="markdown-modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-20 animate-fade-in backdrop-blur-xl bg-black/80">
      {/* Search Input Container - Floating Above Modal */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 z-20">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 opacity-40 group-focus-within:opacity-100 group-focus-within:text-accent transition-all duration-200" />
          <input
            className="markdown-search-input w-full pl-16 pr-8 py-6 rounded-full border-none text-2xl font-black outline-none transition-all shadow-2xl bg-white/10 text-text-primary placeholder-text-secondary/40 focus:bg-white/15 focus:shadow-lg focus:shadow-accent/20"
            style={{
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Knowledge Vault..."
            autoFocus
          />
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
             <span className="text-[10px] font-black uppercase tracking-widest opacity-30">ESC to close</span>
             <button 
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 opacity-40 hover:opacity-60" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Explorer Modal - Oversized Refinement */}
      <div
        className="markdown-modal-content w-full max-w-6xl h-full max-h-[75vh] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex animate-modal-in bg-gradient-to-b from-surface-2 to-surface-3 backdrop-blur"
      >
        {/* Left Side: List of Results */}
        <div className="markdown-modal-list w-2/5 border-r border-border-subtle flex flex-col min-h-0 bg-surface-3/50">
          <div className="px-8 py-4 flex items-center justify-between border-b border-border-subtle bg-gradient-to-r from-accent/5 to-transparent">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                {isLoading ? 'Scanning Vault...' : `${filtered.length} Indexed Nodes`}
             </span>
             <button onClick={fetchPages} className="hover:rotate-180 transition-transform duration-500 text-accent/60 hover:text-accent">
                <RefreshCw className="w-4 h-4" />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                 <RefreshCw className="w-8 h-8 animate-spin opacity-20" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-4">
                 <FileText className="w-12 h-12 opacity-10" />
                 <p className="text-sm opacity-40 italic">No nodes found matching "{search}"</p>
                 <button onClick={onNewMarkdown} className="text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-full bg-[var(--accent)] text-white hover:scale-105 transition-transform">
                    Initialize New Node
                 </button>
              </div>
            ) : (
              <div className="flex flex-col">
                {filtered.map((p, idx) => (
                  <button
                    key={p.id}
                    className={`markdown-list-item w-full text-left px-8 py-5 transition-all relative group border-b border-border-subtle/30 ${selectedIdx === idx ? 'bg-accent/10 border-accent/30' : 'hover:bg-white/5'}`}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    onClick={() => onOpen(p.id)}
                  >
                    {selectedIdx === idx && (
                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-accent to-accent/40 shadow-lg shadow-accent/20" />
                    )}
                    
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${selectedIdx === idx ? 'bg-gradient-to-br from-accent to-accent-dark text-white scale-105 shadow-lg shadow-accent/30' : 'bg-white/5 opacity-50 hover:opacity-70'}`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-black truncate transition-colors ${selectedIdx === idx ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
                            {p.title || p.slug}
                          </p>
                          <p className="text-[9px] font-bold opacity-30 truncate uppercase tracking-tighter mt-0.5">
                            {p.page_type || 'note'} · {formatDate(p.updated_at)}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-all text-accent ${selectedIdx === idx ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
             <button onClick={onNewMarkdown} className="w-full py-4 rounded-2xl border border-dashed border-white/10 hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition-all flex items-center justify-center gap-3 group">
                <FilePlus className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:text-[var(--accent)]" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 group-hover:text-[var(--accent)]">Create New Node</span>
             </button>
          </div>
        </div>

        {/* Right Side: Intelligence Preview Pane */}
        <div className="markdown-modal-preview flex-1 flex flex-col min-h-0 bg-gradient-to-br from-bg-900/50 to-bg-950/50">
          {selectedPage ? (
            <div className="flex-1 flex flex-col p-16 overflow-y-auto custom-scrollbar animate-slide-in-right duration-500">
               <div className="flex items-center gap-3 mb-8">
                  <span className="px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 text-[10px] font-black uppercase tracking-widest">
                     {selectedPage.page_type || 'Markdown'}
                  </span>
                  <span className="text-[10px] font-bold opacity-30 flex items-center gap-2 uppercase tracking-tighter">
                     <Clock className="w-3 h-3" />
                     {formatDate(selectedPage.updated_at)}
                  </span>
               </div>

               <h2 className="text-5xl font-black tracking-tighter mb-8 leading-none" style={{ color: 'var(--text-primary)' }}>
                  {selectedPage.title}
               </h2>

               <div className="flex flex-wrap gap-2 mb-12">
                  {selectedPage.tags?.map(tag => (
                     <span key={tag} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest opacity-30 px-3 py-1 rounded-lg border border-white/5 bg-white/5">
                        <Hash className="w-2.5 h-2.5" />
                        {tag}
                     </span>
                  ))}
               </div>

               <div className="prose prose-invert max-w-none relative">
                  <div className="absolute -left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--accent)]/40 to-transparent" />
                  <p className="text-xl leading-relaxed opacity-60 font-serif italic">
                     {selectedPage.content_summary || "Automated intelligence analysis pending. Enter the workspace to synthesize new conceptual mappings and strengthen the knowledge graph."}
                  </p>
               </div>

               <div className="mt-auto pt-16">
                  <button 
                    onClick={() => onOpen(selectedPage.id)}
                    className="flex items-center gap-4 px-10 py-5 rounded-3xl bg-white text-black font-black text-[12px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] group"
                  >
                    Enter Workspace
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
               </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-10 p-20 text-center gap-4">
               <div className="relative">
                  <Search className="w-24 h-24" />
                  <div className="absolute inset-0 animate-ping opacity-20 bg-[var(--accent)] rounded-full blur-3xl scale-150" />
               </div>
               <p className="text-xl font-black uppercase tracking-[0.3em] mt-8">Intelligence Scan Active</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
