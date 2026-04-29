# Visual Reference Guide - MEM Frontend Styling

## Component Library

### Buttons

#### Primary Button
```html
<button class="btn-primary px-6 py-3 rounded-xl">Send</button>
```
**Features**: Gradient background, shine animation on hover, scale transform on click

#### Ghost Button
```html
<button class="btn-ghost px-3 py-1.5 rounded-md">Learn more</button>
```
**Features**: Transparent background, hover highlight, minimal styling

#### Disabled State
```html
<button class="btn-primary" disabled>Processing...</button>
```
**Features**: Reduced opacity, cursor not-allowed

---

### Cards

#### Standard Card
```html
<div class="card rounded-xl p-8 mb-4">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</div>
```
**Features**: Gradient background, top border highlight, hover lift effect

#### Citation Card
```html
<div class="citation-card rounded-xl p-4">
  <span class="tag tag-primary">Source</span>
  <p>Citation content</p>
</div>
```
**Features**: Gradient border on hover, colored tags, truncated text

---

### Chat Bubbles

#### AI Message
```html
<div class="chat-bubble ai-message">
  <span class="ai-label">Mem</span>
  <p class="bubble-text bg-surface-3">Response text</p>
</div>
```
**Features**: Labeled sender, dark background, border styling

#### User Message
```html
<div class="chat-bubble user-message">
  <p class="bubble-text bg-gradient-to-r from-accent to-accent-dark">Question text</p>
</div>
```
**Features**: Gradient background, white text, right-aligned

---

### Inputs

#### Text Input
```html
<input class="text-input px-4 py-3 rounded-xl" placeholder="Enter text...">
```
**Features**: Focus ring with accent color, smooth transitions, placeholder styling

#### Search Input
```html
<input class="markdown-search-input" placeholder="Search...">
```
**Features**: Large text, centered, backdrop blur effect

---

### Modals

#### Modal Overlay
```html
<div class="modal-overlay">
  <div class="modal-content animate-modal-in">
    <!-- Modal content -->
  </div>
</div>
```
**Features**: Backdrop blur, dark overlay, scale + fade animation

---

### Sidebar

#### Sidebar Item (Active)
```html
<a class="nav-item active bg-accent/10 border-l-2 border-accent">
  <span class="icon">Icon</span>
  <span class="label">Label</span>
</a>
```
**Features**: Highlighted background, left border accent, icon styling

#### Sidebar Section Header
```html
<button class="nav-section-header text-xs font-black uppercase">
  Section Name
</button>
```
**Features**: Uppercase text, hover highlight, collapsible

---

## Color Palette

### Primary Colors
```css
--accent: hsl(var(--accent-h), 100%, 65%)
--accent-light: hsl(var(--accent-h), 100%, 75%)
--accent-dark: hsl(var(--accent-h), 100%, 55%)
```

### Surface Colors
```css
--surface-2: hsl(220, 15%, 22%)
--surface-3: hsl(220, 15%, 20%)
--bg-900: hsl(220, 20%, 15%)
--bg-950: hsl(220, 20%, 10%)
```

### Text Colors
```css
--text-primary: #e2e8f0
--text-secondary: #94a3b8
--text-tertiary: #64748b
```

### Semantic Colors
```css
--success: hsl(142, 70%, 55%)
--error: hsl(0, 84%, 60%)
--warning: hsl(38, 92%, 50%)
--info: hsl(207, 89%, 54%)
```

---

## Gradients

### Linear Gradients
```css
/* Primary Gradient */
background: linear-gradient(135deg, var(--accent), var(--accent-dark));

/* Surface Gradient */
background: linear-gradient(135deg, var(--surface-2) 0%, color-mix(in hsl, var(--surface-2) 98%, var(--accent) 1%) 100%);

/* Overlay Gradient */
background: linear-gradient(to right, var(--accent)/10, transparent);
```

### Radial Gradients
```css
/* Glow Effect */
background: radial-gradient(circle, var(--accent-glow), transparent);

/* Vignette */
background: radial-gradient(ellipse at center, transparent, var(--bg-950));
```

---

## Shadows

### Shadow Scale
```css
--shadow-1: 0 1px 2px rgba(0,0,0,0.12);
--shadow-2: 0 4px 12px rgba(0,0,0,0.18);
--shadow-3: 0 20px 50px rgba(0,0,0,0.4);

/* Glow Shadows */
box-shadow: 0 0 20px rgba(var(--accent-h), 1, 0.65, 0.3);
```

---

## Typography

### Font Sizes
```css
h1: text-4xl font-black tracking-tight
h2: text-3xl font-bold tracking-tight
h3: text-2xl font-bold
h4: text-xl font-semibold
p: text-sm/base leading-relaxed
label: text-xs font-bold uppercase tracking-wider
```

### Font Families
```css
--font-sans: 'Inter', sans-serif      /* Body text */
--font-display: 'Outfit', sans-serif   /* Headings */
--font-mono: 'Fira Code', monospace    /* Code blocks */
```

---

## Spacing Scale

```css
var(--space-1): 0.25rem  /* 4px */
var(--space-2): 0.5rem   /* 8px */
var(--space-3): 0.75rem  /* 12px */
var(--space-4): 1rem     /* 16px */
var(--space-5): 1.25rem  /* 20px */
var(--space-6): 1.5rem   /* 24px */
var(--space-7): 2rem     /* 32px */
var(--space-8): 2.5rem   /* 40px */
```

---

## Border Radius

```css
--radius-sm: 0.375rem   /* 6px */
--radius-md: 0.5rem     /* 8px */
--radius-lg: 0.75rem    /* 12px */
--radius-xl: 1rem       /* 16px */
--radius-2xl: 1.5rem    /* 24px */
--radius-full: 9999px   /* Pill shaped */
```

---

## Animations

### Animation Library
```css
/* Entrance Animations */
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideInLeft { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

/* Interactive Animations */
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
```

### Animation Timings
```css
--t-fast: 150ms var(--ease)      /* Quick interactions */
--t-normal: 250ms var(--ease)    /* Standard transitions */
--t-slow: 400ms var(--ease)      /* Slow animations */
```

---

## Layout Utilities

### Flexbox
```html
<!-- Centered content -->
<div class="flex items-center justify-center">Content</div>

<!-- Space between -->
<div class="flex items-center justify-between">Left | Right</div>

<!-- Column layout -->
<div class="flex flex-col gap-4">Item 1 | Item 2</div>
```

### Grid
```html
<!-- 3-column grid -->
<div class="grid grid-cols-3 gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

---

## Responsive Breakpoints

```css
Mobile:    < 640px (default)
Tablet:    640px - 1024px (md:)
Desktop:   1024px - 1280px (lg:)
Large:     1280px+ (xl:)

Example: md:grid-cols-2 lg:grid-cols-3
```

---

## State Styling

### Hover State
```css
transition: all 250ms ease;
hover:bg-white/10
hover:shadow-lg
hover:scale-105
hover:text-accent
```

### Active/Pressed State
```css
active:scale-95
active:shadow-sm
active:opacity-90
```

### Focus State
```css
focus:outline-none
focus:ring-2
focus:ring-accent/20
focus:border-accent
```

### Disabled State
```css
disabled:opacity-50
disabled:cursor-not-allowed
disabled:hover:shadow-none
```

---

## Component Class Naming

### Prefix Convention
```
.btn-*      → Button components
.card       → Card containers
.tag-*      → Tag/Badge components
.chat-*     → Chat interface elements
.modal-*    → Modal/Dialog components
.nav-*      → Navigation elements
.sidebar-*  → Sidebar specific
.input-*    → Input field variants
.animate-*  → Animation classes
```

---

## Usage Examples

### Creating a Custom Component
```tsx
export function CustomCard({ title, children }) {
  return (
    <div className="card rounded-xl p-8 bg-gradient-to-br from-surface-2 to-surface-3 border border-border-subtle hover:border-accent/50 hover:shadow-lg transition-all">
      <h3 className="text-xl font-bold text-text-primary mb-4">{title}</h3>
      {children}
    </div>
  );
}
```

### Creating a Button Variant
```tsx
export function PrimaryButton({ children, ...props }) {
  return (
    <button 
      className="btn-primary px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-dark text-white font-bold hover:shadow-lg hover:shadow-accent/30 transition-all disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  );
}
```

---

## Accessibility Checklist

- Use semantic HTML elements
- Maintain color contrast (WCAG AA)
- Provide focus visible states
- Include aria labels where needed
- Use descriptive button text
- Avoid color-only information
- Support keyboard navigation
- Test with screen readers

---

## Performance Tips

1. Use `transform` and `opacity` for animations
2. Avoid animating `width`/`height` (use `scale` instead)
3. Use `will-change` sparingly for GPU acceleration
4. Batch DOM updates
5. Debounce scroll/resize handlers
6. Use CSS variables for theme switching

---

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (15+)
- Mobile browsers: ✅ Full support

---

## Additional Resources

- See `STYLING_GUIDE.md` for comprehensive guide
- See `CSS_QUICK_REFERENCE.md` for quick lookup
- See `CSS_ENHANCEMENTS.md` for detailed changelog
