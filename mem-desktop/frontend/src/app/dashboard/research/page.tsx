'use client';

import { useState, useMemo } from 'react';
import { useWiki } from '@/context/WikiContext';
import { WikiIcon, ResearchIcon, Spinner } from '@/components/Icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';

const API = 'http://localhost:8000/api';

export default function ResearchPage() {
  const { wikiPages, loading } = useWiki();
  const [pinnedTitles, setPinnedTitles] = useState<string[]>([]);
  const [pinnedContent, setPinnedContent] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [scratchpad, setScratchpad] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const filteredPages = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return wikiPages.filter(p => 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
      !pinnedTitles.includes(p.title)
    ).slice(0, 8);
  }, [wikiPages, searchTerm, pinnedTitles]);

  const pinPage = async (title: string) => {
    setSearchTerm('');
    if (pinnedTitles.includes(title)) return;
    
    try {
      const res = await axios.get(`${API}/wiki/${encodeURIComponent(title)}`);
      setPinnedContent(prev => ({ ...prev, [title]: res.data.content }));
      setPinnedTitles(prev => [...prev, title]);
    } catch (err) {
      console.error('Failed to fetch page for research:', err);
    }
  };

  const unpinPage = (title: string) => {
    setPinnedTitles(prev => prev.filter(t => t !== title));
    const newContent = { ...pinnedContent };
    delete newContent[title];
    setPinnedContent(newContent);
  };

  const handleSaveSynthesis = async () => {
    if (!scratchpad.trim() || !newTitle.trim()) {
      alert('Please provide a title and content for the synthesis.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        new_pages: [
          {
            title: newTitle.trim(),
            content: scratchpad,
            category: 'Research Synthesis',
            sources: pinnedTitles
          }
        ]
      };
      await axios.post(`${API}/approve`, { changes: payload });
      setScratchpad('');
      setNewTitle('');
      alert('Synthesis saved to Wiki!');
    } catch (err) {
      alert('Failed to save synthesis.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen w-full p-4">
      <div className="h-full flex flex-col bg-bg-950/50 border border-white/5 rounded-3xl overflow-hidden p-8" id="panel-research">
        <header className="flex flex-col gap-1 mb-6">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
             <ResearchIcon size={24} />
           </div>
           <div>
             <h1 className="panel-title">Research Workspace</h1>
             <p className="panel-sub text-xs">Pin sources and synthesize multi-modal knowledge into new records.</p>
           </div>
        </div>
      </header>

      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* --- LEFT: Research Bench (Pinned Sources) --- */}
        <div className="flex-[3] flex flex-col gap-4 min-w-0">
          <div className="relative">
            <input 
              type="text"
              className="text-input w-full"
              placeholder="Search wiki to pin sources..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {filteredPages.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-bg-800 border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                {filteredPages.map(p => (
                  <button 
                    key={p.title}
                    onClick={() => pinPage(p.title)}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
                  >
                    <WikiIcon size={14} className="text-muted" />
                    <span className="text-sm font-medium">{p.title.replace(/_/g, ' ')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-x-auto flex gap-4 pb-4 custom-scrollbar">
            {pinnedTitles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted border-2 border-dashed border-white/5 rounded-3xl opacity-50">
                <ResearchIcon size={48} className="mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">Research Bench Empty</p>
                <p className="text-xs mt-1">Pin pages to start synthesizing</p>
              </div>
            ) : (
              pinnedTitles.map(title => (
                <div key={title} className="flex-shrink-0 w-80 flex flex-col bg-bg-800 border border-border rounded-3xl overflow-hidden shadow-xl">
                  <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-widest truncate">{title.replace(/_/g, ' ')}</span>
                    <button onClick={() => unpinPage(title)} className="text-muted hover:text-white transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 prose prose-invert prose-xs custom-scrollbar bg-black/20">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{pinnedContent[title] || ''}</ReactMarkdown>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- RIGHT: Synthesis Workspace (Scratchpad) --- */}
        <div className="flex-[2] flex flex-col bg-bg-900 border border-accent/20 rounded-3xl overflow-hidden shadow-2xl shadow-accent/5">
          <div className="px-6 py-4 border-b border-white/5 bg-accent/5 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-accent">Synthesis Workspace</h2>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
               <span className="text-[10px] font-bold text-accent/80 uppercase">Active Drafting</span>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col p-6 gap-4">
            <input 
              className="bg-transparent border-b border-white/10 text-xl font-black text-white placeholder:text-white/20 outline-none pb-2"
              placeholder="New Page Title..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <textarea 
              className="flex-1 bg-transparent text-sm leading-relaxed text-secondary placeholder:text-muted outline-none resize-none custom-scrollbar"
              placeholder="Start synthesizing your research here. Use markdown, link to existing pages with [[Page Name]]..."
              value={scratchpad}
              onChange={e => setScratchpad(e.target.value)}
            />
            
            <button 
              className="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs"
              onClick={handleSaveSynthesis}
              disabled={isSaving || !scratchpad.trim() || !newTitle.trim()}
            >
              {isSaving ? <Spinner /> : (
                <>
                  <span>Construct Knowledge Record</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
