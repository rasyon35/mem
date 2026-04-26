'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  Star,
  Trash2,
  Sun,
  Moon,
  Hash,
  Loader2,
  Save,
  Clock,
  History,
  Info,
  Sparkles,
  Maximize2,
  Share2,
  MoreVertical,
  Layout,
  MessageSquare
} from 'lucide-react';
import { GoogleDocsEditor } from './GoogleDocsEditor';
import { ChatSidebar } from './ChatSidebar';
import { useTheme } from '@/context/ThemeContext';
import { useWiki } from '@/context/WikiContext';
import axios from 'axios';

const API = 'http://localhost:8000/api';

type Page = {
  id: number;
  slug: string;
  title: string;
  updated_at: string;
  tags?: string[];
  page_type?: string;
  is_favorite?: boolean;
  ingestion_status?: string;
  version?: number;
};

type Block = {
  id: number;
  block_type: string;
  content_json: { text?: string; level?: number };
  order_index: number;
};

interface PageEditorProps {
  page: Page;
  blocks: Block[];
  onBack: () => void;
  onOpenMarkdown?: () => void;
  onPageUpdate: () => void;
}

export function PageEditor({
  page,
  blocks,
  onBack,
  onOpenMarkdown,
  onPageUpdate,
}: PageEditorProps) {
  const { theme, toggleTheme } = useTheme();
  const { zenMode, setZenMode } = useWiki();
  const [titleDraft, setTitleDraft] = useState(page.title);
  const [editorDraft, setEditorDraft] = useState('');
  const [isFavorite, setIsFavorite] = useState(page.is_favorite || false);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const plainText = useMemo(
    () =>
      blocks
        .map((b) => (typeof b.content_json?.text === 'string' ? b.content_json.text : ''))
        .filter(Boolean)
        .join('\n\n'),
    [blocks],
  );

  useEffect(() => {
    setTitleDraft(page.title);
    setIsFavorite(page.is_favorite || false);
    if (page.id) {
      setEditorDraft(plainText);
    }
  }, [page.id, plainText, page.title, page.is_favorite]);

  useEffect(() => {
    if (!page.id) return;
    const timer = setTimeout(() => {
      if (editorDraft === plainText) return;
      saveEditorDraft(editorDraft);
    }, 1500);
    return () => clearTimeout(timer);
  }, [editorDraft, page.id, plainText]);

  const saveEditorDraft = async (text: string) => {
    if (!page.id) return;
    setSaveState('saving');
    try {
      const ordered = [...blocks].sort((a, b) => a.order_index - b.order_index);
      if (ordered.length === 0) {
        await axios.post(`${API}/knowledge/pages/${page.id}/blocks`, {
          block_type: 'paragraph',
          content_json: { text },
          order_index: 0,
        });
      } else {
        await axios.patch(`${API}/knowledge/pages/${page.id}/blocks`, {
          block_id: ordered[0].id,
          content_json: { ...ordered[0].content_json, text },
        });
        for (let i = 1; i < ordered.length; i += 1) {
          await axios.delete(`${API}/knowledge/pages/${page.id}/blocks`, {
            data: { block_id: ordered[i].id },
          });
        }
      }
      setSaveState('saved');
      onPageUpdate();
    } catch (e) {
      console.error('Save failed:', e);
      setSaveState('unsaved');
    }
  };

  const handleSynthesize = async () => {
    if (!editorDraft) return;
    setSaveState('saving');
    try {
      const improved = editorDraft + "\n\n---\n*Synthesized by Intelligence Engine*";
      setEditorDraft(improved);
      await saveEditorDraft(improved);
    } catch (e) {
      console.error('Synthesis failed:', e);
    }
  };

  const savePageTitle = async () => {
    if (!page.id || !titleDraft.trim() || titleDraft === page.title) return;
    setSaveState('saving');
    try {
      await axios.patch(`${API}/wiki/page/${page.id}`, {
        title: titleDraft.trim(),
        updated_at: page.updated_at,
      });
      setSaveState('saved');
      onPageUpdate();
    } catch (e) {
      console.error('Title save failed:', e);
      setSaveState('unsaved');
    }
  };

  const handleToggleFavorite = async () => {
    const newState = !isFavorite;
    setIsFavorite(newState);
    await axios.patch(`${API}/wiki/page/${page.id}`, { is_favorite: newState });
    onPageUpdate();
  };

  const isDark = theme === 'dark';
  const wordCount = editorDraft.trim() ? editorDraft.trim().split(/\s+/).length : 0;

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-all duration-500 ${zenMode ? 'bg-[#050505]' : 'bg-[var(--bg-950)]'}`}>
      {/* Immersive Expanded Header - No Shadow */}
      <div
        className={`flex flex-col border-b shrink-0 z-40 transition-all duration-500 ${zenMode ? 'opacity-0 h-0 pointer-events-none' : 'opacity-100 h-36'}`}
        style={{ borderColor: 'var(--border)', background: 'var(--bg-900)' }}
      >
        {/* Top Row: Meta & Controls */}
        <div className="flex items-center justify-between px-10 h-20 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl hover:bg-white/5 transition-colors border border-white/5"
              style={{ color: 'var(--text-muted)' }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3">
               <div className="flex flex-col">
                 <div className="flex items-center gap-2">
                   <span className="text-sm font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{page.title}</span>
                   <span className="px-2 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 rounded-lg text-[9px] font-black uppercase tracking-tight">
                      {page.page_type || 'Knowledge'} Node
                   </span>
                 </div>
                 <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.1em] opacity-20" style={{ color: 'var(--text-primary)' }}>Neural Index</span>
                    <div className="w-1 h-1 rounded-full bg-emerald-500/40" />
                    <span className="text-[9px] font-bold opacity-30 uppercase tracking-tighter" style={{ color: 'var(--text-primary)' }}>Synced {new Date(page.updated_at).toLocaleDateString()}</span>
                 </div>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 pr-6 border-r" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
               <button 
                onClick={handleSynthesize}
                className="flex items-center gap-2 px-5 py-2 bg-[var(--accent)] text-white rounded-xl shadow-[0_10px_20px_-10px_var(--accent)] hover:opacity-90 transition-all group"
              >
                <Sparkles className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Synthesize</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleFavorite}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border hover:bg-white/5 ${isFavorite ? 'text-amber-400 border-amber-400/20 bg-amber-400/5' : 'text-text-muted border-white/5'}`}
              >
                <Star className={`w-4.5 h-4.5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
              <button
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all border border-white/5 hover:bg-white/5 text-text-muted"
                onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Deep Link copied"); }}
              >
                <Share2 className="w-4.5 h-4.5" />
              </button>
              <button
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all border border-white/5 hover:bg-white/5 text-text-muted"
              >
                <MoreVertical className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Row: Integrated Sidebar Navigation */}
        <div className="flex items-center px-10 h-16 gap-10">
           <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all" onClick={onOpenMarkdown}>
              <Layout className="w-4 h-4 opacity-40" />
              <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Library Explorer</span>
           </div>

           <div className="h-6 w-px bg-white/5" />

           <nav className="flex items-center gap-8 overflow-x-auto no-scrollbar">
              {['References', 'Analysis', 'Connected Nodes', 'Provenance', 'History'].map(tab => (
                 <button key={tab} className="text-[10px] font-black uppercase tracking-[0.15em] opacity-40 hover:opacity-100 hover:text-[var(--accent)] transition-all whitespace-nowrap">
                    {tab}
                 </button>
              ))}
           </nav>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Full Page Editor & Sidebar Layout */}
        <div className="flex-1 flex min-h-0 relative">
          <div className="flex-1 overflow-hidden relative">
            <GoogleDocsEditor
              initialText={editorDraft || plainText}
              onChange={setEditorDraft}
              onSave={() => saveEditorDraft(editorDraft)}
            />
          </div>

          {/* Right Sidebar - Chatbot */}
          <div 
            className={`h-full border-l transition-all duration-500 overflow-hidden shrink-0 ${isChatOpen ? 'w-96 opacity-100' : 'w-0 opacity-0'}`}
            style={{ borderColor: 'var(--border)', background: 'var(--bg-900)' }}
          >
            <div className="w-96 h-full flex flex-col">
              <header className="p-6 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Assistant</h3>
                  <p className="text-[10px] opacity-40 uppercase tracking-tighter mt-1">Grounded in [[{page.title}]]</p>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/5 rounded-lg opacity-40 hover:opacity-100 transition-all">
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                </button>
              </header>
              
              <div className="flex-1 overflow-hidden">
                 <ChatSidebar pageTitle={page.title} />
              </div>
            </div>
          </div>
        </div>

        {/* Floating Zen Mode Rail */}
        <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 px-8 py-4 border rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center gap-6 backdrop-blur-3xl z-50 transition-all duration-500 ${zenMode ? 'bg-white/5 border-white/10' : 'bg-[var(--bg-800)]/90 border-[var(--border)]'}`}>
          <button 
            onClick={() => setZenMode(!zenMode)} 
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${zenMode ? 'bg-[var(--accent)] text-white shadow-[0_0_20px_var(--accent)]' : 'text-text-muted hover:bg-white/5'}`}
            title={zenMode ? "Exit Zen Mode" : "Enter Zen Mode"}
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-white/10" />
          <button 
            onClick={toggleTheme} 
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isDark ? 'text-amber-400 hover:bg-white/5' : 'text-text-muted hover:bg-black/5'}`}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="w-px h-6 bg-white/10" />
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)} 
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isChatOpen ? 'bg-[var(--accent)] text-white shadow-[0_0_20px_var(--accent)]' : 'text-text-muted hover:bg-white/5'}`}
            title="Toggle Assistant"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex flex-col items-center min-w-[100px]">
             <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40" style={{ color: 'var(--text-primary)' }}>Paper Canvas</span>
             <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>{wordCount} Words</span>
          </div>
        </div>
      </div>
    </div>
  );
}


