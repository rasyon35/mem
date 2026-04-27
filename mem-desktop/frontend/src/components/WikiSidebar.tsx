'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, X, Plus } from 'lucide-react';
import { useWiki } from '@/context/WikiContext';
import axios from 'axios';

const API = 'http://localhost:8000/api';

export default function WikiSidebar() {
  const { wikiSidebarOpen, setWikiSidebarOpen, wikiPages, fetchWikiPages } = useWiki();
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (wikiSidebarOpen) {
      fetchWikiPages();
    }
  }, [wikiSidebarOpen, fetchWikiPages]);

  const filteredPages = useMemo(() => {
    if (!search) return wikiPages;
    return wikiPages.filter(p => 
      p.title.toLowerCase().includes(search.toLowerCase()) || 
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
    );
  }, [wikiPages, search]);

  const handleOpenPage = (slug: string) => {
    router.push(`/dashboard/markdown?page=${encodeURIComponent(slug)}`);
    setWikiSidebarOpen(false);
  };

  const handleNewPage = () => {
    router.push('/dashboard/markdown?action=new');
    setWikiSidebarOpen(false);
  };

  if (!wikiSidebarOpen) return null;

  return (
    <aside className="wiki-sidebar">
      <div className="wiki-sidebar-header">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Knowledge Base</h2>
          <button 
            onClick={() => setWikiSidebarOpen(false)}
            className="p-1 hover:bg-[var(--surface-3)] rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input 
            type="text"
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--surface-3)] border border-[var(--border-subtle)] rounded-lg py-2 pl-9 pr-4 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-all"
            autoFocus
          />
        </div>

        <button 
          onClick={handleNewPage}
          className="w-full flex items-center justify-center gap-2 py-2 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 border border-[var(--accent)]/20 text-[var(--accent)] text-xs font-semibold rounded-lg transition-all active:scale-95 mb-2"
        >
          <Plus className="w-4 h-4" />
          New Markdown
        </button>
      </div>

      <div className="wiki-sidebar-content custom-scrollbar">
        {filteredPages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <FileText className="w-8 h-8 text-[var(--text-muted)] mb-2 opacity-20" />
            <p className="text-xs text-[var(--text-muted)]">No pages found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 px-2">
            {filteredPages.map((page) => (
              <button
                key={page.slug}
                onClick={() => handleOpenPage(page.slug)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-3)] transition-all group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--surface-3)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0 group-hover:border-[var(--accent)]/30 group-hover:bg-[var(--accent)]/5 transition-all">
                  <FileText className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                    {page.title.replace(/_/g, ' ')}
                  </span>
                  {page.category && (
                    <span className="text-[10px] text-[var(--text-muted)] truncate capitalize">
                      {page.category}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
