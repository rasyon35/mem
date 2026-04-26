'use client';

import { useState, useMemo } from 'react';
import {
  FileText,
  Star,
  ChevronDown,
  Loader2,
  FolderOpen,
  Wand2,
  Circle,
  Layout,
  Plus,
  ArrowRight,
  BookOpen,
  Users,
  Zap
} from 'lucide-react';
import { GoogleDocsEditor } from './GoogleDocsEditor';
import { useTheme } from '@/context/ThemeContext';
import axios from 'axios';

const API = 'http://localhost:8000/api';

const STUDIO_TEMPLATES = [
  { id: 'blank', label: 'Blank Node', icon: Circle },
  {
    id: 'research',
    label: 'Research Paper',
    icon: BookOpen,
    markdown: ['## Abstract', '', '## Methodology', '', '## Findings', '', '## Conclusion'].join('\n'),
  },
  {
    id: 'startup',
    label: 'Startup Idea',
    icon: Zap,
    markdown: ['## Problem', '', '## Solution', '', '## Market', '', '## Business Model'].join('\n'),
  },
  {
    id: 'meeting',
    label: 'Meeting Notes',
    icon: Users,
    markdown: ['## Agenda', '- ', '', '## Action Items', '- [ ] '].join('\n'),
  },
];

interface KnowledgeStudioProps {
  onCreated: (pageId: number) => void;
  onCancel: () => void;
  onOpenMarkdown?: () => void;
}

export function KnowledgeStudio({ onCreated, onCancel, onOpenMarkdown }: KnowledgeStudioProps) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const pageType = 'note';
  const tags: string[] = [];
  const [isFavorite, setIsFavorite] = useState(false);
  const [editorDraft, setEditorDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  const autoSlug = useMemo(() => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }, [title]);

  const applyTemplate = (markdown: string) => {
    setEditorDraft(markdown);
    setTemplateOpen(false);
  };

  const handlePublish = async () => {
    const cleanTitle = title.trim() || 'Untitled Note';
    const finalBody = editorDraft.trim();

    setIsSaving(true);
    try {
      // Direct ingestion to global knowledge
      const res = await axios.post(`${API}/ingest/text`, {
        title: cleanTitle,
        text: finalBody,
        auto_approve: true,
      });
      
      // If the ingestion created a new page, we try to find its ID to open it
      // Note: Backend process_text returns {status: 'applied', proposed_changes: {...}}
      // We might need to wait for sync or use a temporary loading state
      alert('Node published to global knowledge! AI is now synthesizing connections in the wiki.');
      onCreated(-1); // Signal that we're done, -1 means "refresh and go to dashboard" or similar
    } catch (e) {
      console.error('Publish failed:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const isDark = theme === 'dark';
  const wordCount = editorDraft.trim() ? editorDraft.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-950)' }}>
      {/* Streamlined Studio Header */}
      <div
        className="flex flex-col border-b shrink-0 z-40 transition-all h-24"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-900)' }}
      >
        <div className="flex items-center justify-between px-10 h-full">
          <div className="flex items-center gap-6">
            <button
              onClick={onCancel}
              className="p-2 rounded-xl hover:bg-white/5 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <ChevronDown className="w-5 h-5 rotate-90" />
            </button>
            
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shadow-[0_0_20px_-5px_var(--accent)]">
                  <Layout className="w-4 h-4 text-white" />
               </div>
               <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30" style={{ color: 'var(--text-primary)' }}>New Node</span>
                  <span className="text-xs font-black tracking-tight block" style={{ color: 'var(--text-primary)' }}>Knowledge Creator</span>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onOpenMarkdown}
              className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Explorer
            </button>

            <button
              onClick={handlePublish}
              className="group flex items-center gap-3 bg-[var(--accent)] text-white text-[11px] font-black uppercase tracking-widest px-8 py-3 rounded-xl shadow-[0_10px_20px_-5px_var(--accent)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
              disabled={isSaving || !title.trim()}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
              {isSaving ? 'Publishing...' : 'Publish to Knowledge'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-10 py-10">
          <div className="max-w-none">
            <input
              className="w-full bg-transparent border-none outline-none text-5xl font-black tracking-tighter mb-4"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
                 <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Word Count</span>
                 <span className="text-[11px] font-bold text-[var(--text-primary)]">{wordCount} Units</span>
              </div>
              <div className="text-[10px] opacity-20 font-bold uppercase tracking-widest">
                AI Ingestion will process this node into the global wiki
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <GoogleDocsEditor 
            initialText={editorDraft} 
            onChange={setEditorDraft} 
            onSave={handlePublish} 
          />
        </div>
      </div>
    </div>
  );
}


