'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWiki } from '@/context/WikiContext';
import axios from 'axios';
import { API_BASE as API } from '@/lib/api';
import dynamic from 'next/dynamic';
import { Plus, FolderOpen, FileText, Clock } from 'lucide-react';

// ──────────────────────────────────────────────────────────────────
// Dynamic imports
// ──────────────────────────────────────────────────────────────────

const PageEditor = dynamic(
  () => import('@/components/wiki-v2/PageEditor').then(mod => mod.PageEditor),
  {
    ssr: false,
    loading: () => <LoadingView message="Loading Editor..." />
  }
);

const KnowledgeStudio = dynamic(
  () => import('@/components/wiki-v2/KnowledgeStudio').then(mod => mod.KnowledgeStudio),
  {
    ssr: false,
    loading: () => <LoadingView message="Loading Studio..." />
  }
);

const OpenMarkdown = dynamic(
  () => import('@/components/wiki-v2/OpenMarkdown').then(mod => mod.OpenMarkdown),
  { ssr: false }
);


// ──────────────────────────────────────────────────────────────────
// Constants & Types
// ──────────────────────────────────────────────────────────────────

type Page = {
  id: number;
  slug: string;
  title: string;
  updated_at: string;
  is_favorite?: boolean;
};

type EditorPage = {
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

type EditorBlock = {
  id: number;
  block_type: string;
  content_json: { text?: string; level?: number };
  order_index: number;
};

type EditorPayload = {
  page: EditorPage;
  blocks: EditorBlock[];
};

type ViewType = 'dashboard' | 'editor' | 'new' | 'open';

// ──────────────────────────────────────────────────────────────────
// Components
// ──────────────────────────────────────────────────────────────────

function LoadingView({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full w-full text-[var(--text-muted)] text-sm">
      {message}
    </div>
  );
}

interface EditorWrapperProps {
  pageId: number;
  onBack: () => void;
}

function EditorWrapper({ pageId, onBack }: EditorWrapperProps) {
  const [fullPage, setFullPage] = useState<EditorPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${API}/wiki/page/${pageId}`);
        const page = data.page as EditorPage & { blocks?: EditorBlock[] };
        setFullPage({
          page,
          blocks: Array.isArray(page.blocks) ? page.blocks : []
        });
      } catch (error) {
        console.error('Failed to fetch page:', error);
        setFullPage(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [pageId]);

  if (loading) {
    return <LoadingView message="Loading page..." />;
  }

  if (!fullPage) {
    return <NotFoundView onBack={onBack} />;
  }

  return (
    <PageEditor
      page={fullPage.page}
      blocks={fullPage.blocks}
      onBack={onBack}
      onPageUpdate={() => { }}
    />
  );
}

function NotFoundView({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-center p-8">
      <p className="text-xl font-medium mb-4 text-[var(--text-primary)]">Page not found</p>
      <button
        className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors"
        onClick={onBack}
      >
        Go Back
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Main Page Component
// ──────────────────────────────────────────────────────────────────

function MarkdownPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { wikiSidebarOpen, setWikiSidebarOpen } = useWiki();

  const [pages, setPages] = useState<Page[]>([]);
  const [recentPages, setRecentPages] = useState<Page[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [view, setView] = useState<ViewType>('dashboard');

  const action = searchParams.get('action');
  const pageSlug = searchParams.get('page');

  // Load pages and recent pages
  useEffect(() => {
    const loadData = async () => {
      try {
        const [pagesRes, recentRes] = await Promise.all([
          axios.get(`${API}/wiki/markdown-files`),
          axios.get(`${API}/wiki/recent`)
        ]);
        setPages(pagesRes.data?.pages || []);
        setRecentPages(recentRes.data?.pages || []);
      } catch (error) {
        console.error('Failed to load pages:', error);
      }
    };

    loadData();
  }, []);

  // Sync view with URL parameters
  useEffect(() => {
    if (action === 'new') {
      setView('new');
    } else if (action === 'open') {
      // Instead of internal 'open' view, use the global sidebar
      setWikiSidebarOpen(true);
      setView('dashboard');
      clearUrlParams();
    } else if (pageSlug) {
      const found = pages.find(p => p.slug === pageSlug) || pages.find(p => p.title === pageSlug);
      if (found) {
        setSelectedPageId(found.id);
        setView('editor');
      }
    } else {
      setView('dashboard');
      setSelectedPageId(null);
    }
  }, [action, pageSlug, pages]);

  // Helper functions
  const clearUrlParams = () => {
    router.replace('/dashboard/markdown');
  };

  const reloadPages = async () => {
    try {
      const [pagesRes, recentRes] = await Promise.all([
        axios.get(`${API}/wiki/markdown-files`),
        axios.get(`${API}/wiki/recent`)
      ]);
      setPages(pagesRes.data?.pages || []);
      setRecentPages(recentRes.data?.pages || []);
    } catch (error) {
      console.error('Failed to reload pages:', error);
    }
  };

  const handlePageCreated = (pageId: number) => {
    if (pageId === -1) {
      setView('dashboard');
      clearUrlParams();
    } else {
      setSelectedPageId(pageId);
      setView('editor');
      const page = pages.find(p => p.id === pageId);
      if (page) {
        router.replace(`/dashboard/markdown?page=${page.slug}`);
      } else {
        clearUrlParams();
      }
    }
    reloadPages();
  };

  const handleOpenPage = (pageId: number) => {
    setSelectedPageId(pageId);
    setView('editor');
    const page = pages.find(p => p.id === pageId);
    if (page) {
      router.replace(`/dashboard/markdown?page=${page.slug}`);
    }
  };

  const handleBackToDashboard = () => {
    setSelectedPageId(null);
    setView('new'); // 👈 change this
    router.replace('/dashboard/markdown?action=new'); // optional but recommended
  };

  // Render views
  let content;
  if (view === 'new') {
    content = (
      <KnowledgeStudio
        onCreated={handlePageCreated}
        onCancel={handleBackToDashboard}
        onOpenMarkdown={() => {
          setWikiSidebarOpen(true);
        }}
        onSelectPage={handleOpenPage}
      />
    );
  } else if (view === 'editor' && selectedPageId) {
    content = (
      <EditorWrapper
        pageId={selectedPageId}
        onBack={handleBackToDashboard}
      />
    );
  } 

  return (
    <div className="h-full w-full overflow-hidden relative">
      {content}
      {wikiSidebarOpen && (
        <OpenMarkdown
          onOpen={(id) => {
            handleOpenPage(id);
            setWikiSidebarOpen(false);
          }}
          onClose={() => setWikiSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default function MarkdownPage() {
  return (
    <Suspense fallback={<LoadingView message="Loading..." />}>
      <MarkdownPageInner />
    </Suspense>
  );
}
