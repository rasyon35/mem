# CSS Quick Reference Guide

## File Structure

```
src/app/
├── globals.css                 (imports all CSS files)
└── css/
    ├── tokens.css             (design tokens & variables)
    ├── animations.css         (animation library)
    ├── layout.css             (sidebar & layout)
    ├── ui-components.css      (buttons, cards, forms, modals)
    ├── editor.css             (editor & markdown)
    ├── markdown-modal.css      (popup markdown viewer)
    ├── chat-enhanced.css      (chat interface)
    ├── graph-enhanced.css     (graph visualization)
    ├── features.css           (feature-specific styles)
    └── collision.css          (conflict/contradiction styles)
```

## Most Common Classes

### Layout
```
.sidebar              Sidebar container
.sidebar.collapsed    Collapsed sidebar
.main                 Main content area
.panel                Page content wrapper
.panel-title          Page title (H1)
.panel-header         Header section
.panel-body           Body section
```

### Components
```
.card                 Card container
.card:hover           Card hover state
.btn-primary          Primary button
.btn-secondary        Secondary button
.btn-ghost            Ghost button
.text-input           Text input/textarea
.modal-overlay        Modal backdrop
.modal-content        Modal container
.badge                Badge/tag
.divider              Section divider
```

### Editor
```
.editor-container     Editor wrapper
.editor-toolbar       Formatting toolbar
.editor-textarea      Main input
.editor-btn           Toolbar button
.prose-editor         Markdown preview
.editor-state         Status indicator
```

### Chat
```
.chat-container-enhanced   Main chat
.chat-message              Message wrapper
.chat-message.user         User message
.chat-message.ai           AI message
.chat-bubble               Message content
.chat-citations            Reference links
.chat-input-section        Input area
.chat-send-btn             Send button
.chat-typing-bubble        Typing indicator
```

### Graph
```
.graph-container       Graph wrapper
.graph-controls        Control buttons
.graph-search-box      Search input
.graph-legend          Legend display
.graph-detail-panel    Info sidebar
.graph-canvas          Canvas element
.graph-node            Node element
.graph-edge            Edge element
```

### Markdown Modal
```
.markdown-modal-overlay   Backdrop
.markdown-modal          Modal container
.markdown-modal-header   Title area
.markdown-modal-body     Content area
.markdown-modal-preview  Rendered markdown
.markdown-modal-editor   Edit mode
.markdown-modal-footer   Actions area
```

## Design Tokens (CSS Variables)

### Colors
```
--text-primary        Main text color
--text-secondary      Secondary text
--text-muted          Muted/secondary text
--text-dim            Dimmed text
--accent              Primary accent (blue)
--accent-light        Lighter accent
--accent-dark         Darker accent
--success             Success green
--warning             Warning yellow
--danger              Danger red
```

### Surfaces
```
--bg-900              Dark background
--bg-800, --bg-700    Darker variants
--surface-1, -2, -3   Surface layers
--border              Border color
--border-subtle       Subtle border
--border-strong       Strong border
```

### Spacing
```
--space-1  4px
--space-2  8px
--space-3  12px
--space-4  16px
--space-5  20px
--space-6  24px
--space-7  32px
--space-8  40px
--space-9  48px
--space-10 64px
```

### Sizing
```
--radius-sm    8px
--radius-md    14px
--radius-lg    24px
--radius-xl    32px
--radius-2xl   40px
```

### Shadows
```
--shadow-1     Subtle
--shadow-2     Medium
--shadow-3     Strong
--shadow-lg    Maximum
```

### Timing
```
--t-fast       150ms
--t-normal     250ms
--t-slow       400ms
--ease         Standard easing
--spring       Bouncy easing
```

## Common Patterns

### Gradient Button
```css
.btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-dark));
  transition: all var(--t-normal);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px color-mix(in hsl, var(--accent) 50%, transparent);
}
```

### Glassmorphism
```css
.glass-panel {
  background: var(--glass-heavy-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
}
```

### Focus Ring
```css
input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--ring);
  outline: none;
}
```

### Hover Lift
```css
.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-2);
}
```

### Smooth Transition
```css
.element {
  transition: all var(--t-normal);
}

.element:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
}
```

## Animation Classes

### Entrance Animations
```
.animate-fade-in         Fade in
.animate-fade-in-up      Fade in from bottom
.animate-fade-in-down    Fade in from top
.animate-fade-in-left    Fade in from left
.animate-fade-in-right   Fade in from right
.animate-scale-in        Scale up
.animate-slide-in-up     Slide up
```

### Attention Animations
```
.animate-pulse           Pulse opacity
.animate-bounce          Bounce up/down
.animate-wiggle          Wiggle rotation
.animate-shake           Shake side to side
.animate-glow            Glow box-shadow
```

### Loading Animations
```
.animate-spin            Spin 360deg
.animate-spin-slow       Slow spin
.animate-spin-reverse    Reverse spin
```

### Hover Animations
```
.hover-lift              Lift on hover
.hover-glow              Glow on hover
.hover-scale             Scale up on hover
.hover-scale-down        Scale down on hover
.hover-invert            Invert colors on hover
```

### Stagger Animations
```
.stagger-item-1          0ms delay
.stagger-item-2          50ms delay
.stagger-item-3          100ms delay
/* ... up to item-8 */
```

## Responsive Breakpoints

```css
/* Mobile first */
@media (max-width: 480px) { /* phones */ }
@media (max-width: 768px) { /* tablets */ }
@media (max-width: 1024px) { /* laptops */ }
@media (min-width: 1024px) { /* desktops */ }
```

## Dark/Light Mode

### Dark Mode (Default)
```css
:root {
  --bg-900: hsl(228, 22%, 6%);
  --text-primary: hsl(228, 20%, 96%);
  /* ... */
}
```

### Light Mode
```css
[data-theme="light"] {
  --bg-900: hsl(228, 20%, 96%);
  --text-primary: hsl(228, 25%, 10%);
  /* ... */
}
```

## Accessibility

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Focus States
Always include visible focus states:
```css
:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### High Contrast
```css
@media (prefers-contrast: more) {
  /* Enhance contrasts */
}
```

## Common Customizations

### Change Primary Color
```css
:root {
  --accent: hsl(200, 100%, 50%); /* New blue */
  --accent-light: hsl(200, 100%, 60%);
  --accent-dark: hsl(200, 100%, 40%);
}
```

### Change Spacing
```css
:root {
  --space-4: 20px; /* Increase default padding */
}
```

### Change Border Radius
```css
:root {
  --radius-md: 16px; /* More rounded */
}
```

### Change Animation Speed
```css
:root {
  --t-normal: 200ms; /* Faster animations */
}
```

## Useful Tips

1. **Use CSS Variables** - Always use `--*` tokens instead of hardcoding values
2. **Mobile First** - Start with mobile styles, add media queries for larger screens
3. **Use GPU Acceleration** - Use `transform` for animations, not `left/top`
4. **Optimize Performance** - Use `will-change` for complex animations sparingly
5. **Check Accessibility** - Ensure focus states, color contrast, motion preferences
6. **Test Responsiveness** - Test on mobile, tablet, and desktop views
7. **Use Semantic HTML** - Proper HTML structure improves CSS maintainability

## Debugging

### Check CSS in DevTools
```
Right-click element → Inspect → Styles tab
```

### Check Applied Styles
```
Elements tab → Styles panel shows all CSS rules
Crossed out = overridden, striped = user agent
```

### Check Color Contrast
```
Elements tab → Accessibility tab
Shows color contrast ratio
```

### Check Performance
```
DevTools → Performance tab
Check for janky animations or repaints
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Animations not smooth | Use `transform` instead of position changes |
| Focus ring not visible | Check z-index and box-shadow values |
| Modal not centered | Use flexbox on overlay: `display: flex; align-items: center;` |
| Border radius not working | Check `overflow: hidden` parent |
| Gradient not showing | Check z-index and ::before pseudo-elements |
| Glassmorphism blurred | Check `backdrop-filter` support in browser |

## Resources

- **Tokens**: See `src/app/css/tokens.css`
- **Full Guide**: See `STYLING_GUIDE.md`
- **Enhancements**: See `CSS_ENHANCEMENTS.md`
- **Animations**: See `src/app/css/animations.css`
