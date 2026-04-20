'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWiki } from '@/context/WikiContext';
import { 
  IngestIcon, ChatIcon,  WikiIcon, GraphIcon,
  TimelineIcon, CollabIcon, SettingsIcon 
} from './Icons';

export default function Sidebar() {
  const pathname = usePathname();
  const { wikiPages, contradictions, openPage, locks, presence } = useWiki();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'AGI & Cognitive': true,
    'Algorithms': true,
    'Finance': true,
    'Logic & Reasoning': true,
    'Operating Systems': true,
    'AI Tech': true,
    'Software & Systems': true,
    'Miscellaneous': true
  });

  const groupedPages = useMemo(() => {
    const groups: Record<string, typeof wikiPages> = {};
    wikiPages.forEach(p => {
      const cat = p.category || 'Miscellaneous';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [wikiPages]);

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const navItems = [
    { title: 'Ingest', path: '/dashboard/ingest', icon: <IngestIcon /> },
    { title: 'Chat', path: '/dashboard/chat', icon: <ChatIcon /> },
    { title: 'Wiki', path: '/dashboard/wiki', icon: <WikiIcon /> },
    { title: 'Graph', path: '/dashboard/graph', icon: <GraphIcon /> },
    { title: 'Timeline', path: '/dashboard/timeline', icon: <TimelineIcon /> },
    { title: 'Collab', path: '/dashboard/collab', icon: <CollabIcon /> },
    { title: 'Settings', path: '/dashboard/settings', icon: <SettingsIcon />, badge: contradictions.length },
  ];

  return (
    <aside className="sidebar">
      <div className="logo">
        <span className="logo-mark">M</span>
        <span className="logo-text">em</span>
      </div>

      <nav className="nav">
        {navItems.map(item => (
          <Link
            key={item.path}
            href={item.path}
            className={`nav-btn ${pathname === item.path ? 'active' : ''}`}
            id={`nav-${item.title.toLowerCase()}`}
          >
            <div style={{ position: 'relative' }}>
              {item.icon}
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </div>
            <span>{item.title}</span>
          </Link>
        ))}
      </nav>

      {wikiPages.length > 0 && (
        <div className="sidebar-pages flex-1 overflow-y-auto pr-2 mt-4 space-y-4">
          {Object.entries(groupedPages).map(([category, pages]) => {
            if (pages.length === 0) return null;
            const isOpen = openCategories[category];
            return (
              <div key={category} className="sidebar-category">
                <button 
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between sidebar-pages-label mb-2 cursor-pointer hover:text-white transition-colors"
                >
                  <span className="uppercase">{category}S ({pages.length})</span>
                  <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isOpen && (
                  <div className="space-y-0.5">
                    {pages.map(p => (
                      <Link
                        key={p.title}
                        href={`/dashboard/wiki?page=${encodeURIComponent(p.title)}`}
                        className="sidebar-page-link"
                        onClick={() => openPage(p.title)}
                        title={p.description}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                           <span className={`status-dot flex-shrink-0 ${
                             locks.find((l: any) => l.page === p.title) ? 'status-locked' : 
                             presence[p.title] ? 'status-active' : 'status-safe'
                           }`} />
                           <span className="truncate">{p.title.replace(/_/g, ' ')}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
