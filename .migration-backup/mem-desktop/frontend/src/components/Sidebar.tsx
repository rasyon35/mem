'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useWikiPages } from '@/context/WikiContext';
import { useTheme } from '@/context/ThemeContext';
import { useTeam } from '@/context/TeamContext';
import { 
  IngestIcon, ChatIcon,  WikiIcon, GraphIcon,
  TimelineIcon, CollabIcon, SettingsIcon
} from './Icons';
import TeamSwitcher from './TeamSwitcher';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { wikiPages } = useWikiPages();
  const { theme, toggleTheme } = useTheme();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ Core: true, Wiki: true, Management: true });

  const groupedPages = useMemo(() => {
    const groups: Record<string, typeof wikiPages> = {};
    wikiPages.forEach(p => {
      const cat = p.category || 'Miscellaneous';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [wikiPages]);

  const toggleCategory = (cat: string) => setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  const toggleSection = (sec: string) => setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));

  type NavItem = {
    title: string;
    path: string;
    icon: React.ReactNode;
    onClick?: () => void;
  };

  const navSections: { key: string; items: NavItem[] }[] = [
    { key: 'Core', items: [
      { title: 'Ingest', path: '/dashboard/ingest', icon: <IngestIcon /> },
      { title: 'Chat', path: '/dashboard/chat', icon: <ChatIcon /> },
    ]},
    { key: 'Wiki', items: [
      { title: 'New Markdown', path: '/dashboard/markdown?action=new', icon: <WikiIcon /> },
    ]},
    { key: 'Management', items: [
      { title: 'Settings', path: '/dashboard/settings', icon: <SettingsIcon /> },
      { title: 'Collab', path: '/dashboard/collab', icon: <CollabIcon /> },
      { title: 'Timeline', path: '/dashboard/timeline', icon: <TimelineIcon /> },
      { title: 'Graph', path: '/dashboard/graph', icon: <GraphIcon /> },
    ]},
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <div className="sidebar-avatar" style={{ border: 'none', background: 'var(--text-primary)', color: 'var(--bg-900)' }}>M</div>
          {!isCollapsed && <span className="logo-text">Mem Desktop</span>}
        </div>
        <button 
          onClick={onToggle}
          className="collapse-toggle"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <nav className="nav px-3 flex-1 overflow-y-auto custom-scrollbar space-y-1">
        {/* Workspace Switcher */}
        <TeamSwitcher isCollapsed={isCollapsed} />

        {navSections.map(section => {
          const isSectionOpen = openSections[section.key] !== false;
          return (
            <div key={section.key} className="nav-section">
              {!isCollapsed && (
                <button
                  onClick={() => toggleSection(section.key)}
                  className="nav-section-header"
                >
                  <span>{section.key}</span>
                </button>
              )}
              {(isSectionOpen || isCollapsed) && section.items.map(item => {
                const [itemPath, itemQuery] = item.path.split('?');
                const isPathActive = pathname === itemPath;
                const isQueryActive = (() => {
                  if (!itemQuery) return true;
                  const itemParams = new URLSearchParams(itemQuery);
                  for (const [k, v] of itemParams.entries()) {
                    if (searchParams.get(k) !== v) return false;
                  }
                  return true;
                })();
                const isActive = isPathActive && isQueryActive;

                const Content = (
                  <>
                    {item.icon}
                    {!isCollapsed && <span>{item.title}</span>}
                  </>
                );

                if ('onClick' in item && item.onClick) {
                  return (
                    <button
                      key={item.path}
                      onClick={item.onClick}
                      className={`nav-btn ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center' : ''}`}
                      title={isCollapsed ? item.title : ''}
                    >
                      {Content}
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`nav-btn ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.title : ''}
                  >
                    {Content}
                  </Link>
                );
              })}
            </div>
          );
        })}

        {!isCollapsed && wikiPages.length > 0 && (
          <div className="sidebar-pages overflow-y-auto custom-scrollbar">
            {Object.entries(groupedPages).map(([category, pages]) => {
              if (pages.length === 0) return null;
              const isOpen = openCategories[category];
              return (
                <div key={category} className="mb-2">
                  <button 
                    onClick={() => toggleCategory(category)}
                    className="nav-section-header"
                  >
                    <span>{category}</span>
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-1 pl-4">
                      {pages.map(p => (
                        <Link
                          key={p.title}
                          href={`/dashboard/markdown?page=${encodeURIComponent(p.slug || p.title)}`}
                          className="nav-btn"
                          style={{ padding: '0.25rem 1rem', fontSize: '0.8rem' }}
                        >
                          <span className="truncate">{p.title.replace(/_/g, ' ')}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">U</div>
          {!isCollapsed && <span className="sidebar-user-name">Local User</span>}
        </div>
        <button
          onClick={() => toggleTheme()}
          className="sidebar-theme-btn"
          title={isCollapsed ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : ''}
        >
          {theme === 'dark' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  );
}
