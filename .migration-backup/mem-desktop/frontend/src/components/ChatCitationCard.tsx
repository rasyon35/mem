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
    <div className="citation-card rounded-md border border-border-subtle bg-surface-2 p-3 hover:border-border-strong transition-colors group">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-surface-3 text-text-secondary border border-border-subtle">{citation.page_title}</span>
        {confidence && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-surface-3 text-text-secondary border border-border-subtle">Confidence: {confidence}</span>}
        {citation.source_type && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-surface-3 text-text-secondary border border-border-subtle">{citation.source_type}</span>}
      </div>
      {snippet && (
        <p className="text-xs leading-relaxed text-text-secondary line-clamp-3">
          {snippet.length > 180 ? `${snippet.slice(0, 180)}...` : snippet}
        </p>
      )}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border-subtle">
        <Link
          href={`/dashboard/markdown?page=${encodeURIComponent(citation.page_title)}`}
          className="text-[10px] font-mono text-text-muted hover:text-text-primary transition-colors"
          onClick={() => onOpenPage?.(citation.page_title)}
        >
          Open page
        </Link>
        {citation.source_path_or_url && (
          <button
            className="text-[10px] font-mono text-text-muted hover:text-text-primary transition-colors"
            onClick={() => onOpenSource?.(citation.page_title, citation.source_path_or_url)}
          >
            Open source
          </button>
        )}
      </div>
    </div>
  );
}
