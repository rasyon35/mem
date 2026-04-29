# MEM Frontend - Comprehensive Styling Guide

## Overview

The frontend features a cohesive design system with **deep visual enhancements** across all interfaces. The styling architecture is modular, semantic, and responsive.

## CSS File Structure

### Core System Files

- **`tokens.css`** - Design tokens, color palette, typography scale, spacing, animations, gradients
- **`layout.css`** - Sidebar, main content area, responsive grid system
- **`ui-components.css`** - Buttons, cards, forms, modals, badges, inputs, toggles

### Feature-Specific Files (NEW)

- **`editor.css`** - Rich text editor, markdown support, syntax highlighting
- **`markdown-modal.css`** - Popup viewer for markdown content with preview/edit modes
- **`chat-enhanced.css`** - Advanced chat interface with typing indicators, citations, streaming
- **`graph-enhanced.css`** - Knowledge graph visualization, node/edge styling, detail panels

### Imported by globals.css

```css
@import "./css/tokens.css";
@import "./css/layout.css";
@import "./css/ui-components.css";
@import "./css/editor.css";
@import "./css/markdown-modal.css";
@import "./css/chat-enhanced.css";
@import "./css/graph-enhanced.css";
@import "./css/features.css";
@import "./css/collision.css";
```

---

## Design System

### Color Palette

**Primary Colors:**
- Brand Blue: `hsl(243, 100%, 69%)` - Main accent for CTAs, links, highlights
- Surface Colors: Grayscale with subtle blue tint for depth
- Semantic: Green (success), Yellow (warning), Red (danger)

**Light Mode:**
- Inverted palette with light backgrounds and dark text
- Soft shadows and reduced saturation for accessibility

**Dark Mode (Default):**
- Rich dark backgrounds with accent highlights
- Strong shadows for depth perception
- High contrast for readability

### Typography

**Fonts:**
- **Display/Headings**: "Outfit" (400, 600, 800) - Bold, modern look
- **Body/Content**: "Inter" (300-700) - Clear, highly readable
- **Code**: JetBrains Mono or Fira Code - Monospace for code blocks

**Scale:**
- H1: 2rem (32px) - Page titles
- H2: 1.35rem (22px) - Section headers
- H3: 1.2rem (19px) - Subsections
- Body: 0.95rem (15px) - Default paragraph text
- Small: 0.85rem (13px) - Labels, captions

### Spacing Scale

```
--space-1: 4px     (minimal gaps)
--space-2: 8px     (tight spacing)
--space-3: 12px    (comfortable gaps)
--space-4: 16px    (standard padding)
--space-5: 20px    (generous padding)
--space-6: 24px    (section padding)
--space-7: 32px    (large sections)
--space-8: 40px    (major sections)
--space-9: 48px    (hero sections)
--space-10: 64px   (max spacing)
```

### Border Radius

```
--radius-sm: 8px     (small elements, buttons)
--radius-md: 14px    (cards, containers)
--radius-lg: 24px    (major containers)
--radius-xl: 32px    (modals, large elements)
--radius-2xl: 40px   (hero sections)
```

### Shadow System

```
--shadow-1: 0 1px 2px rgba(0,0,0,0.25)      (subtle)
--shadow-2: 0 10px 30px rgba(0,0,0,0.35)    (medium)
--shadow-3: 0 20px 50px rgba(0,0,0,0.4)     (elevated)
--shadow-lg: 0 30px 60px rgba(0,0,0,0.45)   (prominent)
--shadow-inset: inset 0 1px 2px rgba(0,0,0,0.25) (depth)
```

### Animation Curves

```
--ease: cubic-bezier(0.4, 0, 0.2, 1)           (standard)
--ease-in: cubic-bezier(0.42, 0, 1, 1)         (entrance)
--ease-out: cubic-bezier(0, 0, 0.58, 1)        (exit)
--ease-in-out: cubic-bezier(0.42, 0, 0.58, 1)  (smooth)
--spring: cubic-bezier(0.175, 0.885, 0.32, 1.275) (bouncy)
```

### Animation Durations

```
--t-fast: 150ms     (quick interactions)
--t-normal: 250ms   (standard transitions)
--t-slow: 400ms     (elaborate animations)
```

---

## Component Styling

### Editor (`editor.css`)

**Rich Text Editor with Markdown Support**

```html
<div class="editor-container">
  <div class="editor-toolbar">
    <button class="editor-btn">B</button>
    <!-- More format buttons -->
  </div>
  <textarea class="editor-textarea"></textarea>
  <div class="editor-state saving">Saving...</div>
</div>
```

**Features:**
- Toolbar with format buttons (bold, italic, headers, lists, code, blockquote)
- Real-time markdown preview
- Character count display
- Save state indicators (saving, saved, error)
- Focus ring with accent color
- Responsive layout for mobile

**Key Classes:**
- `.editor-toolbar` - Control panel for formatting
- `.editor-textarea` - Main input area
- `.prose-editor` - Rendered markdown preview
- `.editor-state` - Status indicator

### Markdown Modal (`markdown-modal.css`)

**Popup Viewer/Editor for Markdown Content**

```html
<div class="markdown-modal-overlay">
  <div class="markdown-modal">
    <div class="markdown-modal-header">
      <h2 class="markdown-modal-title">Document Title</h2>
      <div class="markdown-modal-controls">
        <div class="markdown-modal-mode-switch">
          <button class="markdown-modal-mode-btn active">Preview</button>
          <button class="markdown-modal-mode-btn">Edit</button>
        </div>
        <button class="markdown-modal-close-btn">&times;</button>
      </div>
    </div>
    <div class="markdown-modal-body">
      <div class="markdown-modal-preview"><!-- Preview content --></div>
    </div>
  </div>
</div>
```

**Features:**
- Glassmorphic overlay with blur effect
- Toggle between preview and edit modes
- Smooth slide-up animation
- Rich markdown formatting support
- Syntax highlighting for code blocks
- Table support with proper alignment
- Image display with borders
- Responsive for mobile

### Chat Interface (`chat-enhanced.css`)

**Advanced Conversational UI**

```html
<div class="chat-container-enhanced">
  <div class="chat-messages-container">
    <!-- User message -->
    <div class="chat-message user">
      <div class="chat-bubble-container">
        <div class="chat-bubble">Your question here</div>
      </div>
    </div>
    
    <!-- AI response with citations -->
    <div class="chat-message ai">
      <div class="chat-avatar">⚡</div>
      <div class="chat-bubble-container">
        <div class="chat-bubble">
          <div class="chat-bubble-content">
            <div class="chat-bubble-text">AI response with **bold** text</div>
            <div class="chat-citations">
              <a class="chat-citation" href="#">
                <svg><!-- icon --></svg>
                <span>Source Document</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="chat-input-section">
    <div class="chat-input-wrapper">
      <textarea class="chat-input-textarea"></textarea>
      <button class="chat-send-btn">→</button>
    </div>
  </div>
</div>
```

**Features:**
- User bubbles (blue gradient) vs AI bubbles (neutral gray)
- Typing indicator with animated dots
- Citation links with icons
- Message avatars with gradients
- Smooth scroll behavior
- Focus states with accent rings
- Mobile-optimized input with growing textarea
- Empty state with icon

**Key Classes:**
- `.chat-message` - Individual message wrapper
- `.chat-bubble` - Message content container
- `.chat-citations` - Source references
- `.chat-typing-bubble` - Loading indicator

### Graph Visualization (`graph-enhanced.css`)

**Knowledge Graph & Network Visualization**

```html
<div class="graph-container">
  <div class="graph-canvas-wrapper">
    <canvas class="graph-canvas"></canvas>
  </div>
  
  <!-- Controls -->
  <div class="graph-controls">
    <div class="graph-control-group">
      <button class="graph-control-btn">🔍</button>
      <button class="graph-control-btn">➕</button>
    </div>
  </div>
  
  <!-- Search -->
  <div class="graph-search-box">
    <input class="graph-search-input" placeholder="Search nodes...">
  </div>
  
  <!-- Legend -->
  <div class="graph-legend">
    <div class="graph-legend-title">Legend</div>
    <div class="graph-legend-item">
      <div class="graph-legend-dot"></div>
      <span>Page</span>
    </div>
  </div>
  
  <!-- Detail Panel -->
  <div class="graph-detail-panel">
    <div class="graph-detail-header">
      <h3 class="graph-detail-title">
        <span>Document Title</span>
        <span class="graph-detail-badge">Main</span>
      </h3>
      <button class="graph-detail-close">&times;</button>
    </div>
    <div class="graph-detail-content">
      <!-- Node details -->
    </div>
  </div>
</div>
```

**Features:**
- Interactive canvas-based visualization
- Glassmorphic controls and panels
- Node hover effects with glow
- Selection highlighting
- Right-click context menu
- Minimap for navigation
- Search and filter capabilities
- Responsive detail panel
- Animation on node selection
- Legend for node types

---

## Enhanced Features

### Hover Effects

All interactive elements feature smooth hover transitions:

```css
.element {
  transition: all var(--t-normal);
}

.element:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-2);
  border-color: var(--border-hover);
}
```

### Focus States

Keyboard navigation with visible focus rings:

```css
input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--ring);
}
```

### Active States

Buttons and interactive elements show pressed state:

```css
button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px;
}
```

### Disabled States

Clear visual indication for disabled elements:

```css
button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### Glassmorphism

Modern frosted glass effect for overlays and panels:

```css
--glass-bg: hsla(var(--h), 20%, 12%, 0.45);
--glass-border: hsla(0, 0%, 100%, 0.08);
--glass-blur: blur(14px);
```

---

## Responsive Design

### Breakpoints

- **Mobile**: ≤ 480px (phones)
- **Tablet**: 480-768px (small tablets)
- **Desktop**: 768-1024px (tablets, small laptops)
- **Large**: ≥ 1024px (desktops, TVs)

### Responsive Classes

```css
/* Mobile-first approach */
@media (max-width: 768px) {
  .element { /* mobile styles */ }
}

@media (min-width: 769px) {
  .element { /* tablet+ styles */ }
}
```

---

## Implementation Examples

### Using the Editor

```tsx
import { useState } from 'react';

export function EditorExample() {
  const [content, setContent] = useState('');
  
  return (
    <div className="editor-container">
      <div className="editor-toolbar">
        <button className="editor-btn">B</button>
        <button className="editor-btn">I</button>
        {/* More buttons */}
      </div>
      <textarea 
        className="editor-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Start typing..."
      />
    </div>
  );
}
```

### Using the Chat Interface

```tsx
function ChatExample() {
  const messages = [
    { role: 'user', content: 'What is React?' },
    { role: 'ai', content: 'React is a library...', citations: [...] }
  ];
  
  return (
    <div className="chat-container-enhanced">
      <div className="chat-messages-container">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            <div className="chat-bubble-container">
              <div className="chat-bubble">
                {msg.content}
                {msg.citations && (
                  <div className="chat-citations">
                    {msg.citations.map(c => (
                      <a key={c.id} className="chat-citation">
                        {c.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Best Practices

1. **Use CSS Variables** - Always reference `--*` variables instead of hardcoding colors
2. **Respect Motion** - Support `prefers-reduced-motion` media query
3. **Accessibility** - Ensure sufficient color contrast and focus states
4. **Performance** - Use `transform` and `opacity` for animations, not `left/top`
5. **Responsive** - Mobile-first approach, test on multiple devices
6. **Consistency** - Use semantic color names, spacing values, border radius
7. **Documentation** - Add comments for complex selectors or animations

---

## Future Enhancements

- [ ] Add light mode CSS variables
- [ ] Implement animation library (Framer Motion)
- [ ] Create reusable CSS component library
- [ ] Add dark/light mode switcher
- [ ] Implement theme customization UI
- [ ] Add print-friendly styles
- [ ] Create Storybook for component documentation
