'use client';

import { useState } from 'react';
import { Hash, X } from 'lucide-react';

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
          className="rounded-full px-1.5 py-0.5 border text-[9px] flex items-center gap-0.5 group/tag"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <Hash className="w-2.5 h-2.5" />
          {tag}
          <button
            onClick={() => onTagsChange(tags.filter((t) => t !== tag))}
            className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:opacity-80"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        className="bg-transparent border-none outline-none text-[11px] w-24"
        style={{ color: 'var(--text-primary)' }}
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
