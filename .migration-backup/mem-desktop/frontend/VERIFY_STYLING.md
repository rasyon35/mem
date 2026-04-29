# Visual Styling Verification Guide

## Quick Test Checklist

Follow these steps to verify that all CSS styling is working correctly:

### 1. Dashboard Chat Page (`/dashboard/chat`)
Look for:
- [ ] Gradient background from darker (top) to lighter (bottom)
- [ ] "Ask Your Wiki" header with accent glow background
- [ ] Chat bubbles with different colors (AI messages in gray, user messages in blue)
- [ ] "Mem" label with blue accent background
- [ ] Smooth animations when messages appear
- [ ] Input field with rounded corners and blue focus ring
- [ ] "Ask" button with gradient blue background
- [ ] Typing indicator with pulsing dots

**Expected Colors:**
- Background: Dark blue-gray gradient
- Text: Light gray/white
- Accent: Bright blue (#5B6BFF)
- Buttons: Gradient blue

### 2. Dashboard Graph Page (`/dashboard/graph`)
Look for:
- [ ] Dark background with subtle blue glow
- [ ] Smooth radial gradient overlay
- [ ] Graph visualization centered
- [ ] Network of nodes visible
- [ ] Subtle accent color highlights

**Expected Colors:**
- Background: Very dark (almost black with blue tint)
- Accent glow: Subtle blue radiance
- Graph nodes: Mix of colors with blue accents

### 3. Dashboard Ingest Page (`/dashboard/ingest`)
Look for:
- [ ] "Add Knowledge" header with blue accent overlay
- [ ] Large dropzone area with dashed border
- [ ] Upload icon that scales on hover
- [ ] Text saying "Click to upload or drag & drop"
- [ ] Divider line with "or" text
- [ ] URL input field
- [ ] "Ingest" button with gradient

**Expected Colors:**
- Header: Dark background with blue accent tint
- Dropzone: Dashed border that turns blue on hover
- Text: Light gray/white
- Button: Gradient blue

### 4. Sidebar Navigation
Look for:
- [ ] Left sidebar with gradient background
- [ ] "MemOS" logo with gradient styling
- [ ] "Knowledge Engine" subtitle with gradient text
- [ ] Collapse/expand button
- [ ] Navigation sections with proper spacing
- [ ] Menu items with hover highlighting
- [ ] Icon indicators for active sections

**Expected Colors:**
- Background: Dark blue-gray gradient
- Logo: Gradient blue box
- Text: Light gray/white
- Hover: Blue accent highlights

### 5. Modals & Popups
Look for (when opening markdown files):
- [ ] Dark overlay background with blur effect
- [ ] Glassmorphic modal container
- [ ] Search input at top of modal
- [ ] List of markdown files on left side
- [ ] Preview pane on right side
- [ ] Smooth entrance animation
- [ ] Selected item highlighted in blue

**Expected Colors:**
- Overlay: Transparent black with blur
- Modal: Dark background with subtle gradient
- Search bar: Glass effect with light border
- Hover items: Blue accent tint
- Selected: Blue background

### 6. Buttons Throughout
Look for:
- [ ] Primary buttons with blue gradient
- [ ] Hover state with enhanced shadow
- [ ] Active state with slight press effect
- [ ] Disabled state with reduced opacity
- [ ] Smooth transitions (150-250ms)

**Expected Behaviors:**
- Hover: Shadow grows, button slightly lifts
- Click: Button appears pressed
- Disabled: Faded appearance, no interaction

### 7. Input Fields
Look for:
- [ ] Text inputs with subtle borders
- [ ] Focus state with blue ring
- [ ] Placeholder text in muted gray
- [ ] Smooth focus transitions
- [ ] Proper padding and sizing

**Expected Colors:**
- Border: Subtle white (6% opacity)
- Focus ring: Blue with transparency
- Text: Light gray/white
- Placeholder: Very light gray

### 8. Cards & Containers
Look for:
- [ ] Rounded corners on containers
- [ ] Subtle top border gradient highlight
- [ ] Hover lift effect with shadow growth
- [ ] Smooth transitions
- [ ] Consistent spacing

**Expected Behaviors:**
- Hover: Card lifts slightly, shadow grows
- Normal: Clean, flat appearance

## Color Reference

| Element | Color Code | Visual |
|---------|-----------|--------|
| Primary Accent | #5B6BFF | Bright Blue |
| Dark Surface | #0F0F12 | Nearly Black |
| Light Text | #F3F4F6 | Off White |
| Secondary Text | #A0A0A8 | Light Gray |
| Subtle Border | RGBA(255,255,255,0.06) | Very Light |
| Success/Green | #10A366 | Teal Green |
| Warning/Yellow | #FFB81F | Golden Yellow |
| Error/Red | #FF5A6B | Coral Red |

## Animation Examples

### Fade In
Messages appear smoothly fading in (150ms)

### Slide In
Chat bubbles slide up slightly while fading in (300ms)

### Pulse
Typing indicator dots pulse smoothly (2s loop)

### Lift on Hover
Cards and buttons lift slightly on mouse over

### Glow Effect
Buttons show a shadow glow matching their color on hover

## Common Issues & Fixes

### CSS not showing?
1. Check that `globals.css` is imported in root `layout.tsx`
2. Verify Tailwind configuration is present (`tailwind.config.js`)
3. Check browser console for errors
4. Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Colors look wrong?
1. Verify CSS variables are defined in `tokens.css`
2. Check that color values match the reference table above
3. Ensure theme is not overridden by browser dark mode extension

### Animations not smooth?
1. Check GPU acceleration is enabled (should use `transform` and `opacity`)
2. Verify animation timing values in `animations.css`
3. Check browser performance (inspect with DevTools)

### Scrollbar looks bad?
1. Check custom scrollbar styles in `globals.css`
2. Try a different browser (Firefox handles scrollbars differently)
3. Verify webkit scrollbar styles are present

## Performance Checklist

- [ ] All animations use GPU-accelerated properties (transform, opacity)
- [ ] No layout shifts on hover/focus
- [ ] Smooth 60fps animation playback
- [ ] Fast CSS variable computation
- [ ] No console warnings about CSS

## Accessibility Checklist

- [ ] All buttons have visible focus ring when tabbing
- [ ] Color contrast meets WCAG AA standards
- [ ] Text is readable in both light and dark modes
- [ ] Animations respect `prefers-reduced-motion` (if configured)
- [ ] Focus order follows logical flow

---

**All styles are production-ready and fully integrated!** 🚀
