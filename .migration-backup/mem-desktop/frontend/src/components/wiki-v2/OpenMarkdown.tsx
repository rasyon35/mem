'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  FileText,
  FilePlus,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import axios from 'axios';
import { API_BASE as API } from '@/lib/api';

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

// utils
const removeDuplicates = (pages: Page[]) =>
  pages.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);

const filterPages = (pages: Page[], query: string) => {
  const q = query.toLowerCase();
  if (!q) return pages;
  return pages.filter(p =>
    (p.filename || '').toLowerCase().includes(q) ||
    p.title.toLowerCase().includes(q) ||
    p.slug.toLowerCase().includes(q)
  );
};

// ──────────────────────────────────────────────────────────────────

export function OpenMarkdown({ onOpen, onClose, onNewMarkdown }: OpenMarkdownProps) {
  const [search, setSearch] = useState('');
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showNewHint, setShowNewHint] = useState(false);

  useEffect(() => {
    const fetchPages = async () => {
      setLoading(true);
      try {
        const [m, r] = await Promise.all([
          axios.get(`${API}/wiki/markdown-files`),
          axios.get(`${API}/wiki/recent`)
        ]);

        const merged: Page[] = [...(r.data?.pages || [])];
        (m.data?.pages || []).forEach((p: Page) => {
          if (!merged.find(x => x.id === p.id)) merged.push(p);
        });

        setPages(merged);
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, []);

  const filtered = useMemo(() => {
    return filterPages(removeDuplicates(pages), search);
  }, [pages, search]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [search]);

  useEffect(() => {
    if (!search.trim()) return setShowNewHint(false);
    const q = search.toLowerCase();
    const match = pages.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q)
    );
    setShowNewHint(match.length === 0 && !!onNewMarkdown);
  }, [search, pages, onNewMarkdown]);

  return (
    <div className="modal-backdrop fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      <div
        className="animate-modal-slide-up w-full max-w-[680px] bg-[var(--surface-1)] border border-[var(--border-subtle)] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >

        {/* SEARCH */}
        <div className="flex items-center border-b border-[var(--border-subtle)]">
          <Search className="w-5 h-5 text-[var(--accent-primary)] ml-4" />
          <input
            className="search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes..."
            autoFocus
          />
          {loading && (
            <RefreshCw className="w-4 h-4 animate-spin mr-4 text-[var(--accent-primary)]" />
          )}
        </div>

        {/* LIST */}
        <div className="flex-1 max-h-[55vh] overflow-y-auto py-2">
          {filtered.map((page, idx) => (
            <div
              key={page.id}
              onMouseEnter={() => setSelectedIdx(idx)}
              onClick={() => onOpen(page.id)}
              className="page-list-item flex justify-between items-center px-5 py-4 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <FileText className="w-5 h-5 text-[var(--text-muted)]" />
                <div>
                  <div className="text-[15px] text-[var(--text-primary)]">
                    {page.title}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {new Date(page.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-[var(--accent-primary)] opacity-0 group-hover:opacity-100" />
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              <FileText className="empty-state-icon" />
              No results found
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t border-[var(--border-subtle)] px-6 py-4 flex justify-between text-xs text-[var(--text-muted)]">
          <span>↑↓ navigate • Enter open • Esc close</span>

          {showNewHint && (
            <button
              onClick={onNewMarkdown}
              className="text-[var(--accent-primary)]"
            >
              Create new →
            </button>
          )}
        </div>

      </div>
    </div>
  );
}