'use client';

import Link from 'next/link';
import { ChatCitation } from '@/context/WikiContext';

type Props = {
  citation: ChatCitation;
  confidence?: string;
  onOpenPage?: (page: string) => void;
  onOpenSource?: (page: string, sourcePath?: string) => void;
};

export function ChatCitationCard({ citation, confidence, onOpenPage, onOpenSource }: Props) {
  const snippet = citation.evidence_snippet || citation.snippet || '';
  return (
    <div className="rounded-xl border p-2" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.02)' }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="tag text-[10px]">{citation.page_title}</span>
        {confidence && <span className="tag tag-updated text-[10px]">Confidence: {confidence}</span>}
        {citation.source_type && <span className="tag text-[10px]">{citation.source_type}</span>}
      </div>
      {snippet && (
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          {snippet.length > 180 ? `${snippet.slice(0, 180)}...` : snippet}
        </p>
      )}
      <div className="flex items-center gap-2 mt-2">
        <Link
          href={`/dashboard/markdown?page=${encodeURIComponent(citation.page_title)}`}
          className="btn-ghost text-[10px]"
          onClick={() => onOpenPage?.(citation.page_title)}
        >
          Open page
        </Link>
        {citation.source_path_or_url && (
          <button
            className="btn-ghost text-[10px]"
            onClick={() => onOpenSource?.(citation.page_title, citation.source_path_or_url)}
          >
            Open source
          </button>
        )}
      </div>
    </div>
  );
}
