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
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
} from 'lucide-react';

import { ToolbarButton } from './ToolbarButton';
import { useTheme } from '@/context/ThemeContext';

type GoogleDocsEditorProps = {
  initialText?: string;
  onChange: (text: string) => void;
  onSave?: () => void;
};

export function GoogleDocsEditor({
  initialText = '',
  onChange,
  onSave,
}: GoogleDocsEditorProps) {
  const editor = useMemo(() => BlockNoteEditor.create(), []);
  const { theme } = useTheme();

  const [activeStyles, setActiveStyles] = useState<Record<string, any>>({});
  const [activeBlockType, setActiveBlockType] = useState<string>('paragraph');
  const [activeBlockProps, setActiveBlockProps] = useState<Record<string, any>>({});

  const isDark = theme === 'dark';

  /* ─────────────────────────────
     LOAD INITIAL CONTENT
  ───────────────────────────── */
  useEffect(() => {
    const text = (initialText || '').trim();

    if (!text) {
      editor.replaceBlocks(editor.topLevelBlocks, [
        { type: 'paragraph', content: '' } as any,
      ]);
      return;
    }

    try {
      const parsed = JSON.parse(initialText);
      if (Array.isArray(parsed)) {
        editor.replaceBlocks(editor.topLevelBlocks, parsed as any);
        return;
      }
    } catch {}

    editor.replaceBlocks(editor.topLevelBlocks, [
      { type: 'paragraph', content: text } as any,
    ]);
  }, [editor, initialText]);

  /* ─────────────────────────────
     TRACK SELECTION
  ───────────────────────────── */
  useEffect(() => {
    return editor.onSelectionChange(() => {
      setActiveStyles(editor.getActiveStyles());

      const pos = editor.getTextCursorPosition();
      if (pos?.block) {
        setActiveBlockType(pos.block.type || 'paragraph');
        setActiveBlockProps(pos.block.props || {});
      }
    });
  }, [editor]);

  /* ─────────────────────────────
     SAVE SHORTCUT
  ───────────────────────────── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onSave]);

  /* ─────────────────────────────
     EMIT CHANGE
  ───────────────────────────── */
  const emitChange = () => {
    const text = editor.topLevelBlocks
      .map((b: any) =>
        Array.isArray(b?.content)
          ? b.content.map((x: any) => x?.text || '').join('')
          : ''
      )
      .join('\n');

    onChange(text);
  };

  const updateBlock = (payload: any) => {
    const current = editor.getTextCursorPosition().block;
    if (!current) return;
    editor.updateBlock(current, payload);
  };

  return (
    <div className="docs-container">

      {/* ───────── TOOLBAR ───────── */}
      <div className="docs-toolbar">

        <div className="toolbar-group">
          <ToolbarButton icon={Bold} tooltip="Bold" onClick={() => editor.toggleStyles({ bold: true })} />
          <ToolbarButton icon={Italic} tooltip="Italic" onClick={() => editor.toggleStyles({ italic: true })} />
          <ToolbarButton icon={Underline} tooltip="Underline" onClick={() => editor.toggleStyles({ underline: true })} />
          <ToolbarButton icon={Strikethrough} tooltip="Strike" onClick={() => editor.toggleStyles({ strike: true })} />
        </div>

        <div className="toolbar-group">
          <ToolbarButton icon={Heading1} tooltip="H1" onClick={() => updateBlock({ type: 'heading', props: { level: 1 } })} />
          <ToolbarButton icon={Heading2} tooltip="H2" onClick={() => updateBlock({ type: 'heading', props: { level: 2 } })} />
          <ToolbarButton icon={Heading3} tooltip="H3" onClick={() => updateBlock({ type: 'heading', props: { level: 3 } })} />
        </div>

        <div className="toolbar-group">
          <ToolbarButton icon={List} tooltip="Bullet" onClick={() => updateBlock({ type: 'bulletListItem' })} />
          <ToolbarButton icon={ListOrdered} tooltip="Numbered" onClick={() => updateBlock({ type: 'numberedListItem' })} />
          <ToolbarButton icon={CheckSquare} tooltip="Checklist" onClick={() => updateBlock({ type: 'checkListItem' })} />
        </div>

      </div>

      {/* ───────── EDITOR ───────── */}
      <div className="docs-editor">
        <div className="docs-editor-inner">
          <BlockNoteView
            editor={editor}
            onChange={emitChange}
            theme={isDark ? 'dark' : 'light'}
          />
        </div>
      </div>
    </div>
  );
}