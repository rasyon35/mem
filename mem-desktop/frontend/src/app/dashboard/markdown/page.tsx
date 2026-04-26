'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import dynamic from 'next/dynamic';

const PageEditor = dynamic(() => import('@/components/wiki-v2/PageEditor').then(mod => mod.PageEditor), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" /></div>
});
const KnowledgeStudio = dynamic(() => import('@/components/wiki-v2/KnowledgeStudio').then(mod => mod.KnowledgeStudio), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" /></div>
});
const OpenMarkdown = dynamic(() => import('@/components/wiki-v2/OpenMarkdown').then(mod => mod.OpenMarkdown), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" /></div>
});

const API = 'http://localhost:8000/api';

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

function EditorWrapper({ pageId, onBack }: { pageId: number, onBack: () => void }) {
  const [fullPage, setFullPage] = useState<EditorPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/wiki/page/${pageId}`);
        const page = res.data.page as EditorPage & { blocks?: EditorBlock[] };
        setFullPage({ page, blocks: Array.isArray(page.blocks) ? page.blocks : [] });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [pageId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  if (!fullPage) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-center p-8">
        <p className="text-xl font-bold mb-4">Page not found</p>
        <button className="btn-primary" onClick={onBack}>Go Back</button>
      </div>
    );
  }

  return (
    <PageEditor
      page={fullPage.page}
      blocks={fullPage.blocks}
      onBack={onBack}
      onPageUpdate={() => {}}
    />
  );
}

function MarkdownPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [pages, setPages] = useState<Page[]>([]);
  const [recentPages, setRecentPages] = useState<Page[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [view, setView] = useState<'dashboard' | 'editor' | 'new' | 'open'>('dashboard');

  const action = searchParams.get('action');
  const pageSlug = searchParams.get('page');

  const loadPages = async () => {
    try {
      const res = await axios.get(`${API}/wiki/markdown-files`);
      setPages(res.data?.pages || []);
    } catch (e) {
      console.error('Failed to load pages', e);
    }
  };

  const loadRecent = async () => {
    try {
      const res = await axios.get(`${API}/wiki/recent-markdown`);
      setRecentPages(res.data?.pages || []);
    } catch (e) {
      console.error('Failed to load recent pages', e);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    loadPages();
    loadRecent();
  }, []);

  // Sync state with URL
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (action === 'new') {
      setView('new');
    } else if (action === 'open') {
      setView('open');
    } else if (pageSlug) {
      const found =
        pages.find(p => p.slug === pageSlug) ||
        pages.find(p => p.title === pageSlug);
      if (found) {
        setSelectedPageId(found.id);
        setView('editor');
      }
    } else {
      setView('dashboard');
      setSelectedPageId(null);
    }
  }, [action, pageSlug, pages]);

  const clearUrlParams = () => {
    router.replace('/dashboard/markdown');
  };

  const handlePageCreated = (pageId: number) => {
    if (pageId === -1) {
      // Refresh and go to dashboard
      setView('dashboard');
      clearUrlParams();
      loadPages();
      loadRecent();
      return;
    }
    setSelectedPageId(pageId);
    setView('editor');
    clearUrlParams();
    loadPages();
    loadRecent();
  };

  const selectedPage = pages.find((p) => p.id === selectedPageId);

  // Synchronize URL with active page
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selectedPage?.slug) return;
    if (searchParams.get('page') === selectedPage.slug) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', selectedPage.slug);
    router.replace(`/dashboard/markdown?${params.toString()}`);
  }, [selectedPage?.slug]);

  if (view === 'new') {
    return (
      <KnowledgeStudio
        onCreated={handlePageCreated}
        onCancel={() => {
          setView('dashboard');
          clearUrlParams();
        }}
        onOpenMarkdown={() => {
          setView('open');
          router.replace('/dashboard/markdown?action=open');
        }}
      />
    );
  }

  if (view === 'open') {
    return (
      <OpenMarkdown
        onOpen={(id) => {
          setSelectedPageId(id);
          setView('editor');
          const p = pages.find(x => x.id === id);
          if (p) router.replace(`/dashboard/markdown?page=${p.slug}`);
          else clearUrlParams();
        }}
        onClose={() => {
          setView('dashboard');
          clearUrlParams();
        }}
        onNewMarkdown={() => {
          setView('new');
          router.replace('/dashboard/markdown?action=new');
        }}
      />
    );
  }

  if (view === 'editor' && selectedPageId) {
    return (
      <EditorWrapper
        pageId={selectedPageId}
        onBack={() => {
          setSelectedPageId(null);
          setView('dashboard');
          clearUrlParams();
        }}
      />
    );
  }

  return (
    <div className="panel animate-in">
      <header className="panel-header">
        <h1 className="panel-title">Markdown</h1>
        <p className="panel-sub">Create, edit, and organize your knowledge base.</p>
        <div className="flex items-center gap-4 mt-6">
          <button className="btn-primary" onClick={() => { setView('new'); router.replace('/dashboard/markdown?action=new'); }}>
            New Markdown
          </button>
          <button className="btn-secondary" onClick={() => { setView('open'); router.replace('/dashboard/markdown?action=open'); }}>
            Open Markdown
          </button>
        </div>
      </header>
      
      <div className="panel-body">
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest opacity-50 mb-4">Recent Pages</h2>
          {recentPages.length === 0 ? (
            <p className="text-sm opacity-50 italic">No recent pages.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentPages.map(page => (
                <div key={page.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-all" onClick={() => { setSelectedPageId(page.id); setView('editor'); router.replace(`/dashboard/markdown?page=${page.slug}`); }}>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">{page.title}</h3>
                  <p className="text-[10px] opacity-40 mt-1">{new Date(page.updated_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest opacity-50 mb-4">All Pages</h2>
          {pages.length === 0 ? (
            <p className="text-sm opacity-50 italic">No pages found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages.map(page => (
                <div key={page.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-all" onClick={() => { setSelectedPageId(page.id); setView('editor'); router.replace(`/dashboard/markdown?page=${page.slug}`); }}>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">{page.title}</h3>
                  <p className="text-[10px] opacity-40 mt-1">{new Date(page.updated_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MarkdownPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    }>
      <MarkdownPageInner />
    </Suspense>
  );
}
