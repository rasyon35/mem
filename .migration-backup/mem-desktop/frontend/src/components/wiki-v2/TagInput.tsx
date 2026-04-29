'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ tags, onTagsChange, placeholder = 'Add tag...' }: TagInputProps) {
  const [input, setInput] = useState('');

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded px-1.5 py-0.5 border border-[var(--border-subtle)] bg-[var(--surface-2)] text-xs text-[var(--text-secondary)] flex items-center gap-1 group/tag"
        >
          {tag}
          <button
            onClick={() => onTagsChange(tags.filter((t) => t !== tag))}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors opacity-0 group-hover/tag:opacity-100"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        className="bg-transparent border-none outline-none text-xs w-24 text-[var(--text-primary)] placeholder-[var(--text-muted)]"
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const next = input.trim();
            if (!next || tags.includes(next)) return;
            onTagsChange([...tags, next]);
            setInput('');
          }
        }}
      />
    </div>
  );
}
