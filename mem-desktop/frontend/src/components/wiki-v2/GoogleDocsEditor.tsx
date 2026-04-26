'use client';

import { useEffect, useMemo, useState } from 'react';
import { BlockNoteEditor } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Undo,
  Redo,
  Palette,
  Highlighter,
  Table,
  Image as ImageIcon,
  Minus,
  Type,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { ToolbarButton } from './ToolbarButton';
import { useTheme } from '@/context/ThemeContext';

type GoogleDocsEditorProps = {
  initialText?: string;
  onChange: (text: string) => void;
  onSave?: () => void;
};

export function GoogleDocsEditor({ initialText = '', onChange, onSave }: GoogleDocsEditorProps) {
  const editor = useMemo(() => BlockNoteEditor.create(), []);
  const { theme } = useTheme();
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>('serif');
  const [activeStyles, setActiveStyles] = useState<Record<string, any>>({});
  const [activeBlockType, setActiveBlockType] = useState<string>('paragraph');
  const [activeBlockProps, setActiveBlockProps] = useState<Record<string, any>>({});

  useEffect(() => {
    const text = (initialText || '').trim();
    if (!text) {
      editor.replaceBlocks(editor.topLevelBlocks, [{ type: 'paragraph', content: '' } as any]);
      return;
    }
    try {
      const parsed = JSON.parse(initialText);
      if (Array.isArray(parsed)) {
        editor.replaceBlocks(editor.topLevelBlocks, parsed as any);
        return;
      }
    } catch {
      // Treat as plain text if not serialized blocks.
    }
    editor.replaceBlocks(editor.topLevelBlocks, [{ type: 'paragraph', content: text } as any]);
  }, [editor, initialText]);

  useEffect(() => {
    // Listen for selection/cursor changes to update toolbar active states
    return editor.onSelectionChange(() => {
      setActiveStyles(editor.getActiveStyles());
      
      const pos = editor.getTextCursorPosition();
      if (pos && pos.block) {
        setActiveBlockType(pos.block.type || 'paragraph');
        setActiveBlockProps(pos.block.props || {});
      }
    });
  }, [editor]);

  const emitChange = () => {
    const plainText = editor.topLevelBlocks
      .map((b: any) => {
        const c = b?.content;
        if (!Array.isArray(c)) return '';
        return c.map((x: any) => x?.text || '').join('');
      })
      .join('\n')
      .trim();
    onChange(plainText);
  };

  const updateCurrentBlock = (payload: any) => {
    const current = editor.getTextCursorPosition().block;
    if (!current) return;
    editor.updateBlock(current, payload);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  const isDark = theme === 'dark';
  const toolbarBg = 'var(--bg-800)';
  const separatorColor = 'var(--border)';

  return (
    <div className="flex flex-col h-full overflow-hidden border-none relative">
      {/* Refined Formatting Toolbar - Glassmorphic and Sticky */}
      <div className="flex flex-wrap items-center gap-2 px-10 py-3 border-b z-30 sticky top-0 backdrop-blur-2xl shadow-sm transition-all" style={{ borderColor: 'var(--border)', background: 'var(--glass-bg)' }}>
        {/* Font Selection */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg border mr-3" style={{ borderColor: separatorColor, background: 'var(--bg-800)' }}>
          <Type className="w-3.5 h-3.5 opacity-50" />
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value as any)}
            className="text-[11px] bg-transparent border-none outline-none cursor-pointer font-bold appearance-none hover:text-[var(--accent)] transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            <option value="sans">Sans-Serif</option>
            <option value="serif">Serif (Classic)</option>
            <option value="mono">Monospace</option>
          </select>
          <ChevronDown className="w-2.5 h-2.5 opacity-40" />
          <div className="w-px h-4 mx-2" style={{ background: separatorColor }} />
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <button onClick={() => setFontSize((s) => Math.max(12, s - 1))} className="p-1 hover:bg-white/5 rounded text-[var(--text-muted)] hover:text-[var(--accent)]"><Minus className="w-3 h-3" /></button>
            <span className="w-5 text-center font-bold" style={{ color: 'var(--text-primary)' }}>{fontSize}</span>
            <button onClick={() => setFontSize((s) => Math.min(32, s + 1))} className="p-1 hover:bg-white/5 rounded text-[var(--text-muted)] hover:text-[var(--accent)]"><Plus className="w-3 h-3" /></button>
          </div>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={Undo} onClick={() => editor.undo()} tooltip="Undo" />
          <ToolbarButton icon={Redo} onClick={() => editor.redo()} tooltip="Redo" />
        </div>
        <div className="w-px h-5 mx-2" style={{ background: separatorColor }} />

        {/* Text Styles */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={Bold} onClick={() => editor.toggleStyles({ bold: true })} tooltip="Bold" active={activeStyles.bold} />
          <ToolbarButton icon={Italic} onClick={() => editor.toggleStyles({ italic: true })} tooltip="Italic" active={activeStyles.italic} />
          <ToolbarButton icon={Underline} onClick={() => editor.toggleStyles({ underline: true })} tooltip="Underline" active={activeStyles.underline} />
          <ToolbarButton icon={Strikethrough} onClick={() => editor.toggleStyles({ strike: true })} tooltip="Strikethrough" active={activeStyles.strike} />
        </div>
        <div className="w-px h-5 mx-2" style={{ background: separatorColor }} />

        {/* Headings */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={Heading1} onClick={() => updateCurrentBlock({ type: 'heading', props: { level: 1 } })} tooltip="Heading 1" active={activeBlockType === 'heading' && activeBlockProps.level === 1} />
          <ToolbarButton icon={Heading2} onClick={() => updateCurrentBlock({ type: 'heading', props: { level: 2 } })} tooltip="Heading 2" active={activeBlockType === 'heading' && activeBlockProps.level === 2} />
          <ToolbarButton icon={Heading3} onClick={() => updateCurrentBlock({ type: 'heading', props: { level: 3 } })} tooltip="Heading 3" active={activeBlockType === 'heading' && activeBlockProps.level === 3} />
        </div>
        <div className="w-px h-5 mx-2" style={{ background: separatorColor }} />

        {/* Lists */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={List} onClick={() => updateCurrentBlock({ type: 'bulletListItem' })} tooltip="Bullet List" active={activeBlockType === 'bulletListItem'} />
          <ToolbarButton icon={ListOrdered} onClick={() => updateCurrentBlock({ type: 'numberedListItem' })} tooltip="Numbered List" active={activeBlockType === 'numberedListItem'} />
          <ToolbarButton icon={CheckSquare} onClick={() => updateCurrentBlock({ type: 'checkListItem' })} tooltip="Checklist" active={activeBlockType === 'checkListItem'} />
        </div>
        <div className="w-px h-5 mx-2" style={{ background: separatorColor }} />

        {/* Alignment */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={AlignLeft} onClick={() => updateCurrentBlock({ props: { textAlignment: 'left' } })} tooltip="Align Left" active={activeBlockProps.textAlignment === 'left' || !activeBlockProps.textAlignment} />
          <ToolbarButton icon={AlignCenter} onClick={() => updateCurrentBlock({ props: { textAlignment: 'center' } })} tooltip="Align Center" active={activeBlockProps.textAlignment === 'center'} />
          <ToolbarButton icon={AlignRight} onClick={() => updateCurrentBlock({ props: { textAlignment: 'right' } })} tooltip="Align Right" active={activeBlockProps.textAlignment === 'right'} />
        </div>
        <div className="w-px h-5 mx-2" style={{ background: separatorColor }} />

        {/* Colors */}
        <div className="flex items-center gap-1">
          <div className="relative group/colors">
            <ToolbarButton icon={Palette} onClick={() => {}} tooltip="Text Colors" active={!!activeStyles.textColor && activeStyles.textColor !== 'default'} />
            <div className="absolute top-full left-0 mt-2 p-2 border rounded-2xl shadow-2xl hidden group-hover/colors:grid grid-cols-4 gap-1.5 z-50" style={{ borderColor: 'var(--border)', background: 'var(--bg-800)' }}>
              {[
                { name: 'default', color: 'inherit' },
                { name: 'red', color: '#ef4444' },
                { name: 'orange', color: '#f97316' },
                { name: 'yellow', color: '#eab308' },
                { name: 'green', color: '#22c55e' },
                { name: 'blue', color: '#3b82f6' },
                { name: 'purple', color: '#a855f7' },
                { name: 'gray', color: '#6b7280' },
              ].map((c) => (
                <button 
                  key={c.name} 
                  onClick={() => editor.toggleStyles({ textColor: c.name as any })} 
                  className={`w-6 h-6 rounded-full border flex items-center justify-center hover:scale-110 transition-transform ${activeStyles.textColor === c.name ? 'ring-2 ring-white scale-110' : 'border-white/10'}`}
                  style={{ background: c.color }}
                  title={c.name}
                >
                  {c.name === 'default' && <span className="text-[10px] text-white/50">/</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Highlights */}
          <div className="relative group/highlights">
            <ToolbarButton icon={Highlighter} onClick={() => {}} tooltip="Highlights" active={!!activeStyles.backgroundColor && activeStyles.backgroundColor !== 'default'} />
            <div className="absolute top-full left-0 mt-2 p-2 border rounded-2xl shadow-2xl hidden group-hover/highlights:grid grid-cols-4 gap-1.5 z-50" style={{ borderColor: 'var(--border)', background: 'var(--bg-800)' }}>
              {[
                { name: 'default', color: 'transparent' },
                { name: 'red', color: 'rgba(239, 68, 68, 0.2)' },
                { name: 'orange', color: 'rgba(249, 115, 22, 0.2)' },
                { name: 'yellow', color: 'rgba(234, 179, 8, 0.2)' },
                { name: 'green', color: 'rgba(34, 197, 94, 0.2)' },
                { name: 'blue', color: 'rgba(59, 130, 246, 0.2)' },
                { name: 'purple', color: 'rgba(168, 85, 247, 0.2)' },
                { name: 'gray', color: 'rgba(107, 114, 128, 0.2)' },
              ].map((c) => (
                <button 
                  key={c.name} 
                  onClick={() => editor.toggleStyles({ backgroundColor: c.name as any })} 
                  className={`w-6 h-6 rounded border flex items-center justify-center hover:scale-110 transition-transform ${activeStyles.backgroundColor === c.name ? 'ring-2 ring-white scale-110' : 'border-white/10'}`}
                  style={{ background: c.color }}
                  title={c.name}
                >
                  {c.name === 'default' && <span className="text-[10px] text-white/50">/</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="w-px h-5 mx-2" style={{ background: separatorColor }} />

        {/* Insert */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton 
            icon={Table} 
            onClick={() => {
              const currentBlock = editor.getTextCursorPosition().block;
              editor.insertBlocks(
                [
                  {
                    type: "table",
                    content: [
                      {
                        type: "tableRow",
                        content: [
                          { type: "tableCell", content: [] },
                          { type: "tableCell", content: [] }
                        ]
                      },
                      {
                        type: "tableRow",
                        content: [
                          { type: "tableCell", content: [] },
                          { type: "tableCell", content: [] }
                        ]
                      }
                    ]
                  } as any
                ],
                currentBlock,
                'after'
              );
            }} 
            tooltip="Table" 
          />
          <ToolbarButton 
            icon={ImageIcon} 
            onClick={() => { 
              const url = prompt('Enter image URL:'); 
              if (url) { 
                editor.insertBlocks([{ type: 'image', props: { url } as any }], editor.getTextCursorPosition().block, 'after'); 
              } 
            }} 
            tooltip="Image" 
          />
          <ToolbarButton 
            icon={Minus} 
            onClick={() => {
              editor.insertBlocks([{ type: 'paragraph', content: [{ type: 'text', text: '---', styles: {} }] as any }], editor.getTextCursorPosition().block, 'after');
            }} 
            tooltip="Horizontal Rule" 
          />
        </div>
      </div>

      {/* Editor Area with Paper Texture */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar paper-texture ${isDark ? 'dark' : ''}`}>
        <div 
          className={`w-full min-h-full px-12 md:px-32 py-16 obsidian-theme ${fontFamily === 'serif' ? 'font-serif' : fontFamily === 'mono' ? 'font-mono' : 'font-sans'}`} 
          style={{ fontSize: `${fontSize}px` }}
        >
          <BlockNoteView editor={editor} onChange={emitChange} theme={isDark ? 'dark' : 'light'} />
        </div>
      </div>
    </div>
  );
}

