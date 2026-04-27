'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  Star,
  MessageSquare,
  Share2,
  MoreHorizontal,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { GoogleDocsEditor } from './GoogleDocsEditor';
import { ChatSidebar } from './ChatSidebar';
import { ZenChat } from './ZenChat';
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
  onPageUpdate,
}: PageEditorProps) {
  const { setWikiSidebarOpen, zenMode, setZenMode } = useWiki();

  const [titleDraft, setTitleDraft] = useState(page.title);
  const [editorDraft, setEditorDraft] = useState('');
  const [isFavorite, setIsFavorite] = useState(page.is_favorite || false);
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
    if (page.id) setEditorDraft(plainText);
  }, [page.id, plainText, page.title, page.is_favorite]);

  useEffect(() => {
    if (!page.id) return;

    const timer = setTimeout(() => {
      if (editorDraft !== plainText) {
        saveEditorDraft(editorDraft);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [editorDraft]);

  const saveEditorDraft = async (text: string) => {
    if (!page.id) return;
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

        for (let i = 1; i < ordered.length; i++) {
          await axios.delete(`${API}/knowledge/pages/${page.id}/blocks`, {
            data: { block_id: ordered[i].id },
          });
        }
      }

      onPageUpdate();
    } catch (e) {
      console.error('Save failed:', e);
    }
  };

  const savePageTitle = async () => {
    if (!page.id || !titleDraft.trim() || titleDraft === page.title) return;

    try {
      await axios.patch(`${API}/wiki/page/${page.id}`, {
        title: titleDraft.trim(),
        updated_at: page.updated_at,
      });

      onPageUpdate();
    } catch (e) {
      console.error('Title save failed:', e);
    }
  };

  const handleToggleFavorite = async () => {
    const newState = !isFavorite;
    setIsFavorite(newState);

    await axios.patch(`${API}/wiki/page/${page.id}`, {
      is_favorite: newState,
    });

    onPageUpdate();
  };

  return (
    <div
      className={`flex flex-col h-full overflow-hidden bg-[var(--bg-900)] ${
        zenMode ? 'zen-active' : ''
      }`}
    >
      {/* ───────────────────────── Toolbar ───────────────────────── */}
      <div className="flex items-center justify-center h-16 border-b border-[var(--border-subtle)] bg-[var(--surface-1)]">
        <div className="flex items-center justify-between w-full max-w-4xl px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1 px-2 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <div className="w-px h-5 bg-[var(--border-subtle)] mx-2" />

            <button
              onClick={() => setWikiSidebarOpen(true)}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleFavorite}
              className={`p-1.5 ${
                isFavorite ? 'text-yellow-500' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="p-1.5 text-[var(--text-secondary)]"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <button className="p-1.5 text-[var(--text-secondary)]">
              <Share2 className="w-4 h-4" />
            </button>

            <button className="p-1.5 text-[var(--text-secondary)]">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────── Main Area ───────────────────────── */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="px-6 pt-6 pb-4 border-b border-[var(--border-subtle)]">
            <input
              className="w-full bg-transparent outline-none text-4xl font-semibold text-[var(--text-primary)]"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={savePageTitle}
              placeholder="Untitled"
            />
          </div>

          <div className="flex-1 overflow-hidden">
            <GoogleDocsEditor
              initialText={editorDraft || plainText}
              onChange={setEditorDraft}
              onSave={() => saveEditorDraft(editorDraft)}
            />
          </div>
        </div>

        {/* ───────────────────────── Chat Overlay (NO LAYOUT SHIFT) ───────────────────────── */}
        <div
          className={`absolute right-0 top-0 h-full w-80 border-l border-[var(--border-subtle)] bg-[var(--surface-1)] flex flex-col transition-transform duration-200 ${
            isChatOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <header className="p-4 border-b border-[var(--border-subtle)] flex justify-between">
            <span className="text-sm font-medium">Assistant</span>
            <button onClick={() => setIsChatOpen(false)}>
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
          </header>

          <div className="flex-1 min-h-0">
            <ChatSidebar pageTitle={page.title} />
          </div>
        </div>
      </div>

      {/* Zen Mode */}
      {zenMode && <ZenChat />}

      {!zenMode && (
        <button className="zen-opener" onClick={() => setZenMode(true)}>
          <Sparkles className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}