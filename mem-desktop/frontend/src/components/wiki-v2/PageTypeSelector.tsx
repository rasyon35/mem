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
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PageType)}
        className="w-full appearance-none rounded-lg border px-3 py-2 pr-8 text-xs font-semibold cursor-pointer outline-none transition-all"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
        }}
      >
        {PAGE_TYPES.map((pt) => (
          <option key={pt.type} value={pt.type}>
            {pt.label} — {pt.desc}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-40" />
    </div>
  );
}
