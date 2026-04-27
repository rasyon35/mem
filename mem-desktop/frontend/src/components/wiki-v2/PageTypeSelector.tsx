'use client';

import { ChevronDown } from 'lucide-react';

export type PageType = 'note' | 'research' | 'concept' | 'entity' | 'project' | 'timeline' | 'documentation';

const PAGE_TYPES: { type: PageType; label: string; desc: string }[] = [
  { type: 'note', label: 'Note', desc: 'Simple text-based thought' },
  { type: 'research', label: 'Research', desc: 'Deep dive investigation' },
  { type: 'concept', label: 'Concept', desc: 'Abstract idea or theory' },
  { type: 'entity', label: 'Entity', desc: 'Person, place or thing' },
  { type: 'project', label: 'Project', desc: 'Actionable goal with tasks' },
  { type: 'timeline', label: 'Timeline', desc: 'Chronological events' },
  { type: 'documentation', label: 'Documentation', desc: 'Structured reference' },
];

interface PageTypeSelectorProps {
  value: PageType;
  onChange: (type: PageType) => void;
}

export function PageTypeSelector({ value, onChange }: PageTypeSelectorProps) {
  const current = PAGE_TYPES.find((pt) => pt.type === value) || PAGE_TYPES[0];

  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PageType)}
        className="appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-1 pr-7 text-xs font-medium cursor-pointer outline-none transition-colors text-[var(--text-primary)] hover:bg-[var(--surface-3)]"
      >
        {PAGE_TYPES.map((pt) => (
          <option key={pt.type} value={pt.type}>
            {pt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-[var(--text-muted)]" />
    </div>
  );
}
