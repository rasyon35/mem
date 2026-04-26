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
    <div className="citation-card rounded-xl border border-border-subtle bg-gradient-to-br from-surface-2 to-surface-3 p-4 hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/10 group">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="tag tag-primary text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-accent/10 text-accent border border-accent/20">{citation.page_title}</span>
        {confidence && <span className="tag tag-success text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-success/10 text-success border border-success/20">Confidence: {confidence}</span>}
        {citation.source_type && <span className="tag tag-info text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-info/10 text-info border border-info/20">{citation.source_type}</span>}
      </div>
      {snippet && (
        <p className="text-[12px] mt-3 leading-relaxed text-text-secondary line-clamp-3">
          {snippet.length > 180 ? `${snippet.slice(0, 180)}...` : snippet}
        </p>
      )}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border-subtle">
        <Link
          href={`/dashboard/markdown?page=${encodeURIComponent(citation.page_title)}`}
          className="btn-ghost text-[11px] font-semibold px-3 py-1.5 rounded-md hover:bg-accent/10 hover:text-accent transition-colors"
          onClick={() => onOpenPage?.(citation.page_title)}
        >
          Open page
        </Link>
        {citation.source_path_or_url && (
          <button
            className="btn-ghost text-[11px] font-semibold px-3 py-1.5 rounded-md hover:bg-accent/10 hover:text-accent transition-colors"
            onClick={() => onOpenSource?.(citation.page_title, citation.source_path_or_url)}
          >
            Open source
          </button>
        )}
      </div>
    </div>
  );
}
