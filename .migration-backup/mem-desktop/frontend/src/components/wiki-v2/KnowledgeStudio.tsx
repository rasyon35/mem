'use client';

import { useState, useEffect, useRef, } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  ChevronLeft,
  Loader2,
  FolderOpen,
  ArrowRight,
  Sparkles,
  Search,
  Clock,
} from 'lucide-react';
import { GoogleDocsEditor } from './GoogleDocsEditor';
import { ZenChat } from './ZenChat';
import { useWiki } from '@/context/WikiContext';
import { useTheme } from '@/context/ThemeContext';
import { ReviewPublish } from './ReviewPublish';
import axios from 'axios';
import { API_BASE as API } from '@/lib/api';

interface KnowledgeStudioProps {
  onCreated: (pageId: number) => void;
  onCancel: () => void;
  onOpenMarkdown?: () => void;
  onSelectPage?: (pageId: number) => void;
}

type Page = {
  id?: number;
  slug: string;
  title: string;
  updated_at?: string;
};

export function KnowledgeStudio({
  onCreated,
  onCancel,
  onOpenMarkdown,
  onSelectPage,
}: KnowledgeStudioProps) {
  const router = useRouter();
  const { zenMode, setZenMode, wikiPages, fetchWikiPages } = useWiki();
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [editorDraft, setEditorDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [stagedChanges, setStagedChanges] = useState<any>(null);
  const [autoApprove, setAutoApprove] = useState(false);

  const [showPageSelector, setShowPageSelector] = useState(false);
  const [pageSearch, setPageSearch] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ─────────────────────────────────────────────
     LOAD PAGES
     ───────────────────────────────────────────── */
  useEffect(() => {
    fetchWikiPages();
  }, [fetchWikiPages]);

  /* ─────────────────────────────────────────────
     CLOSE DROPDOWN ON OUTSIDE CLICK
     ───────────────────────────────────────────── */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowPageSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ─────────────────────────────────────────────
     FILTER PAGES
     ───────────────────────────────────────────── */
  const filteredPages = wikiPages.filter(
    (p) =>
      p.title.toLowerCase().includes(pageSearch.toLowerCase()) ||
      p.slug.toLowerCase().includes(pageSearch.toLowerCase())
  );

  /* ─────────────────────────────────────────────
     OPEN EXISTING PAGE
     ───────────────────────────────────────────── */
  const handleSelectPage = (page: Page) => {
    setShowPageSelector(false);

    if (onSelectPage && page.id) {
      onSelectPage(page.id);
      return;
    }

    const slug = page.slug || page.title;
    router.push(`/dashboard/markdown?page=${encodeURIComponent(slug)}`);
  };

  /* ─────────────────────────────────────────────
     PUBLISH
     ───────────────────────────────────────────── */
  const handlePublish = async () => {
    const cleanTitle = title.trim() || 'Untitled Note';
    const finalBody = editorDraft.trim();

    if (!cleanTitle.trim()) return;

    setIsSaving(true);

    try {
      const res = await axios.post(`${API}/ingest/text`, {
        title: cleanTitle,
        text: finalBody,
        auto_approve: autoApprove,
      });

      if (res.data.status === 'staged') {
        setStagedChanges(res.data.proposed_changes);
      } else {
        onCreated(-1);
      }
    } catch (error) {
      console.error('Publish failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  /* ─────────────────────────────────────────────
     DATE FORMATTER
     ───────────────────────────────────────────── */
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';

    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  if (stagedChanges) {
    return (
      <ReviewPublish
        isOpen={true}
        onClose={() => setStagedChanges(null)}
        staged={stagedChanges}
        onApproved={() => onCreated(-1)}
      />
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-[var(--bg-900)]"
    >
      {/* ─────────────────────────────────────────────
          TOP BAR
         ───────────────────────────────────────────── */
      }
      <div className="flex items-center justify-center h-16 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--surface-1)] overflow-visible">
        <div className="flex items-center justify-between w-full max-w-4xl px-6">
          {/* Left */}
          <div className="flex items-center gap-4">
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-all duration-150"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <div className="w-px h-5 bg-[var(--border-subtle)]" />

            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--accent-primary)]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                New Note
              </span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 relative">
            {/* OPEN EXISTING */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => {
                  if (onOpenMarkdown) {
                    onOpenMarkdown();
                  } else {
                    setShowPageSelector(!showPageSelector);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-all duration-150"
              >
                <FolderOpen className="w-4 h-4" />
                Open Existing
              </button>

              {showPageSelector && (
                <div className="absolute right-0 top-full mt-3 w-80 bg-[var(--surface-1)] border border-[var(--border-subtle)] shadow-2xl z-[100] overflow-hidden">
                  {/* Search */}
                  <div className="p-3 border-b border-[var(--border-subtle)]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        placeholder="Search pages..."
                        value={pageSearch}
                        onChange={(e) => setPageSearch(e.target.value)}
                        className="w-full bg-[var(--surface-2)] border border-[var(--border-subtle)] py-3 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)]"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Pages */}
                  <div className="max-h-72 overflow-y-auto custom-scrollbar p-2">
                    {filteredPages.length === 0 ? (
                      <div className="py-8 text-center">
                        <FileText className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
                        <p className="text-sm text-[var(--text-muted)]">
                          No pages found
                        </p>
                      </div>
                    ) : (
                      filteredPages.map((page, index) => (
                        <button
                          key={page.slug || index}
                          onClick={() => handleSelectPage(page)}
                          className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[var(--surface-2)] transition-all text-left group border border-transparent"
                        >
                          <div className="w-10 h-10 bg-[var(--surface-3)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {page.title.replace(/_/g, ' ')}
                            </div>

                            {page.updated_at && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                                <span className="text-xs text-[var(--text-muted)]">
                                  {formatDate(page.updated_at)}
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* PUBLISH BUTTON — FULL THEME RESPONSIVE */}
            <div className="flex items-center gap-2 mr-2">
              <input
                type="checkbox"
                id="autoApprove"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border-subtle)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] bg-[var(--surface-3)]"
              />
              <label htmlFor="autoApprove" className="text-xs text-[var(--text-muted)] cursor-pointer select-none">
                Auto-apply
              </label>
            </div>

            <button
              onClick={handlePublish}
              disabled={isSaving || !title.trim()}
              className={`
                flex items-center gap-2
                px-4 py-2
                text-sm font-semibold
                border border-[var(--border-subtle)]
                ${autoApprove ? 'bg-[var(--accent-primary)]' : 'bg-[var(--surface-3)]'}
                ${theme === 'dark' ? 'text-white' : 'text-black'}
                hover:opacity-90
                disabled:opacity-50
                transition-all duration-150
              `}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}

              {isSaving ? 'Processing...' : 'Publish'}
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────
          TITLE + EDITOR
         ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden animate-fade-in">
        {/* Title */}
        <div className="w-full px-6 pt-8 pb-6 border-b border-[var(--border-subtle)] bg-[var(--surface-1)]">
          <input
            className="w-full bg-transparent border-none outline-none text-4xl font-bold tracking-tight mb-2 text-[var(--text-primary)] placeholder-[var(--text-muted)]"
            placeholder="Untitled"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          <p className="text-sm text-[var(--text-muted)]">
            Write your thoughts, findings, or documentation below.
          </p>
        </div>

        {/* Editor */}
        <div className="flex-1 relative overflow-hidden">
          <GoogleDocsEditor
            initialText={editorDraft}
            onChange={setEditorDraft}
            onSave={handlePublish}
          />
        </div>
      </div>

      {zenMode && <ZenChat />}

      {!zenMode && (
        <button
          className="zen-opener"
          onClick={() => setZenMode(true)}
          title="Enter Zen Synthesis"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}