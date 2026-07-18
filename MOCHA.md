# Mocha UI System

A terminal-themed UI system built with React 19, TypeScript, Vite 6, and Bun. Uses the Catppuccin Mocha color palette with a monospace-only, sharp-cornered, scanline-overlaid aesthetic. Zero dependencies beyond React — no UI library, no Tailwind.

---

## 1. Stack Requirements

| Layer | Version |
|-------|---------|
| React | ^19.0.0 |
| TypeScript | ^5.7.0 |
| Vite | ^6.0.0 with `@vitejs/plugin-react` ^4.4.0 |
| Runtime | Bun (with `@types/bun`) |
| CSS | Plain CSS with custom properties |
| Concurrency | `concurrently` ^9.1.0 for dev script |

No additional UI libraries, icon packs, or CSS frameworks are used. Everything is custom.

---

## 2. Project Structure

```
project/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── index.tsx              # Entry: imports global.css, terminal.css, renders <App />
│   ├── App.tsx                # Root component
│   ├── types.ts               # All TypeScript interfaces
│   ├── styles/
│   │   ├── global.css         # CSS variables, reset, base styles
│   │   └── terminal.css       # All component classes, animations, responsive
│   ├── components/
│   │   ├── TerminalWindow.tsx  # Shell: titlebar + content + statusbar
│   │   ├── TabBar.tsx         # Primary tab navigation
│   │   ├── EmptyState.tsx     # Empty list placeholder
│   │   ├── StarRating.tsx     # Interactive star rating
│   │   ├── AddMovieForm.tsx   # Search input with autocomplete dropdown
│   │   ├── MoveToWatchedModal.tsx  # Modal dialog
│   │   ├── LoginScreen.tsx    # Auth screen
│   │   ├── MovieList.tsx      # List items with actions
│   │   ├── PersonalView.tsx   # Personal tab content
│   │   ├── RoomView.tsx       # Room tab content
│   │   └── RoomChat.tsx       # IRC-style chat
│   └── hooks/
│       ├── FilterContext.tsx   # Shared filter/sort state
│       ├── useSSE.ts          # Server-sent events hook
│       ├── useUser.ts         # Username localStorage
│       └── useMovies.ts       # Data fetching
└── server/                    # Backend (Bun)
```

---

## 3. Color System — Catppuccin Mocha

**Rosewater (`--rosewater: #f5e0dc`) is the primary accent color for this entire UI system.** It is the color of focus rings, active tabs, primary buttons, terminal prompts, cursors, selected items, and all primary interactive states. Every other accent color is secondary.

Define these **exact** CSS custom properties in `global.css` under `:root`. Do not change values — they are the Catppuccin Mocha palette.

```css
:root {
  /* Accent colors */
  --rosewater: #f5e0dc;
  --flamingo: #f2cdcd;
  --pink: #f5c2e7;
  --mauve: #cba6f7;
  --red: #f38ba8;
  --maroon: #eba0ac;
  --peach: #fab387;
  --yellow: #f9e2af;
  --green: #a6e3a1;
  --teal: #94e2d5;
  --sky: #89dceb;
  --sapphire: #74c7ec;
  --blue: #89b4fa;
  --lavender: #b4befe;

  /* Text hierarchy */
  --text: #cdd6f4;        /* Primary text */
  --subtext-1: #bac2de;   /* Secondary text */
  --subtext-0: #a6adc8;   /* Tertiary / labels */

  /* Overlay (muted text) */
  --overlay-2: #9399b2;
  --overlay-1: #7f849c;
  --overlay-0: #6c7086;   /* Most muted */

  /* Surface (interactive backgrounds) */
  --surface-2: #585b70;
  --surface-1: #45475a;   /* Borders */
  --surface-0: #313244;   /* Hover backgrounds */

  /* Base backgrounds */
  --base: #1e1e2e;        /* Main content bg */
  --mantle: #181825;      /* Titlebar, statusbar, inputs */
  --crust: #11111b;       /* Page background */
}
```

### Color Usage Rules

| Purpose | Variable | Where |
|---------|----------|-------|
| **Primary accent** | **`--rosewater`** | **`.btn-primary`, active tabs, focused inputs, terminal prompt, `.cursor`, `.modal-title`, `.suggestion-item--selected`, loading spinner** |
| Page background | `--crust` | `body` |
| Content area background | `--base` | `.terminal-window`, `.modal` |
| Titlebar/statusbar bg | `--mantle` | `.terminal-titlebar`, `.terminal-statusbar` |
| Input backgrounds | `--mantle` | `.add-movie-input`, `.list-search-input` |
| Borders | `--surface-1` | All `border` declarations |
| Hover backgrounds | `--surface-0` | `.movie-item:hover`, `.tab-item:hover`, `.suggestion-item:hover` |
| Primary text | `--text` | Body, `.movie-item .name` |
| Secondary text | `--subtext-0` | `.terminal-title`, `.movie-item .meta` |
| Muted metadata | `--overlay-0` | `.movie-year`, `.index`, `.chat-time` |
| Positive actions | `--green` | `.btn-success`, online status |
| Negative actions | `--red` | `.btn-danger`, error banners |
| Warnings | `--yellow` | `.critic-rating`, `.btn-warning` |
| Links / info | `--blue` | `a`, chat user names |
| User highlight | `--mauve` | `.username-label` |

---

## 4. Typography

### Font Stack

```css
:root {
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', monospace;
}
```

**All text is monospace.** No sans-serif fonts anywhere. Load JetBrains Mono from Google Fonts in `index.html` if desired, but the fallback chain ensures consistency without it.

### Base Settings

```css
body {
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.5;
}
```

### Type Scale

| Element | Size | Weight | Transform | Spacing |
|---------|------|--------|-----------|---------|
| Body text | `14px` | 400 | none | — |
| Section titles | `12px` | 700 | `uppercase` | `letter-spacing: 1px` |
| Tab items | `13px` | 400 (700 active) | none | — |
| Sub-tabs | `11px` | 400 (700 active) | `uppercase` | `letter-spacing: 0.5px` |
| List item text | `13px` | 400 | none | — |
| Buttons | `12px` | 400 | none | — |
| Small metadata | `11px` | 400 | none | — |
| Tiny metadata | `10px` | 400 | none | — |
| Media type tags | `9px` | 800 | `uppercase` | `letter-spacing: 0.5px` |
| Status bar | `12px` | 400 | none | — |
| Terminal title | `12px` | 400 | `lowercase` | `letter-spacing: 0.5px` |
| Modal title | `14px` | 400 | none | — |

---

## 5. Reset & Base Styles

Apply this exact reset in `global.css`:

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  height: 100%;
  width: 100%;
}

input, button, textarea, select {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
  background: none;
  border: none;
  outline: none;
}

button {
  cursor: pointer;
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  color: var(--sapphire);
}

ul, ol {
  list-style: none;
}
```

### Scrollbar

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--mantle);
}

::-webkit-scrollbar-thumb {
  background: var(--surface-1);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--surface-2);
}
```

---

## 6. Borders & Radii

**All corners are sharp.** No border-radius anywhere except for:
- Terminal dots: `border-radius: 50%` (circles)
- Media type tags: `border-radius: 2px` (barely rounded)
- Loading spinner: `border-radius: 50%` (circle)

The universal border definition:

```css
:root {
  --radius: 0;
  --border: 0px solid var(--surface-1);
}
```

Use `border: var(--border)` for all borders. This ensures consistency and makes it easy to adjust globally.

---

## 7. Animations

Define these in `terminal.css`:

```css
@keyframes blink {
  50% { opacity: 0; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes modalIn {
  from { opacity: 0; scale: 0.95; }
  to { opacity: 1; scale: 1; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Animation Usage

| Animation | Duration | Where |
|-----------|----------|-------|
| `fadeIn 0.3s ease both` | 0.3s | `.movie-item` (with staggered `animation-delay`) |
| `fadeIn 0.2s ease both` | 0.2s | `.tab-pane` |
| `fadeIn 0.4s ease` | 0.4s | `.empty-state` |
| `fadeIn 0.3s ease` | 0.3s | `.error-banner` |
| `fadeIn 0.2s ease` | 0.2s | `.modal-overlay` |
| `modalIn 0.2s ease` | 0.2s | `.modal` |
| `spin 0.6s linear infinite` | 0.6s | `.loading-spinner` |
| `blink 1s step-end infinite` | 1s | `.terminal-prompt .cursor` |

### Staggered List Animation

Items in lists animate in sequentially:

```tsx
<div className="movie-item" style={{ animationDelay: `${i * 0.05}s` }}>
```

---

## 8. Component Architecture

### 8.1 Terminal Window (Shell)

The entire app lives inside a terminal window with three sections:

```
┌─────────────────────────────────┐
│ ● ● ●   title — user      ✖   │  ← titlebar
├─────────────────────────────────┤
│                                 │
│         content area            │  ← scrollable
│                                 │
├─────────────────────────────────┤
│ user: name    [filter]  switch │  ← statusbar
└─────────────────────────────────┘
```

```css
.terminal-window {
  background: var(--base);
  border: var(--border);
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  overflow: hidden;
}
```

**Scanline overlay** — Apply via `::after` pseudo-element:

```css
.terminal-window::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
  pointer-events: none;
  z-index: 999;
}
```

### 8.2 Titlebar

```tsx
<div className="terminal-titlebar">
  <div className="terminal-dots">
    <div className="terminal-dot red" />
    <div className="terminal-dot yellow" />
    <div className="terminal-dot green" />
  </div>
  <div className="terminal-title">app-name — {username}</div>
  <div className="terminal-close">{'\u2716'}</div>
</div>
```

```css
.terminal-titlebar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--mantle);
  border-bottom: var(--border);
  user-select: none;
  flex-shrink: 0;
}

.terminal-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.terminal-dot.red   { background: var(--red); }
.terminal-dot.yellow { background: var(--peach); }
.terminal-dot.green  { background: var(--green); }

.terminal-title {
  flex: 1;
  text-align: center;
  color: var(--subtext-0);
  font-size: 12px;
  text-transform: lowercase;
  letter-spacing: 0.5px;
}
```

### 8.3 Statusbar

```tsx
<div className="terminal-statusbar">
  <span>user: <span style={{ color: 'var(--green)' }}>{username}</span></span>
  <div className="statusbar-filter">
    <input className="statusbar-filter-input" placeholder="Filter list..." />
  </div>
  <span className="switch-user-btn">switch user</span>
</div>
```

```css
.terminal-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--mantle);
  border-top: var(--border);
  font-size: 12px;
  color: var(--subtext-0);
  flex-shrink: 0;
}
```

### 8.4 Content Area

```css
.terminal-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

### 8.5 Tab Navigation

Tabs use bracket-wrapped labels and highlight with `--rosewater`:

```tsx
<div className="tab-bar">
  <div className={`tab-item${current === 'a' ? ' active' : ''}`}>[Tab A]</div>
  <div className={`tab-item${current === 'b' ? ' active' : ''}`}>[Tab B]</div>
</div>
```

```css
.tab-bar {
  display: flex;
  border-bottom: var(--border);
  flex-shrink: 0;
}

.tab-item {
  padding: 8px 20px;
  font-size: 13px;
  color: var(--subtext-0);
  border-right: var(--border);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.tab-item:hover {
  background: var(--surface-0);
  color: var(--text);
}

.tab-item.active {
  background: var(--surface-0);
  color: var(--rosewater);
  font-weight: 700;
}
```

Sub-tabs use smaller, uppercase text:

```css
.sub-tab-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
  border-bottom: var(--border);
  padding-bottom: 4px;
}

.sub-tab-item {
  padding: 4px 8px;
  font-size: 11px;
  color: var(--overlay-1);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: color 0.15s;
}

.sub-tab-item.active {
  color: var(--rosewater);
  font-weight: 700;
}
```

---

## 9. Reusable Patterns

### 9.1 Buttons

All buttons use border + text color, inverting on hover:

```css
.btn {
  padding: 3px 8px;
  font-size: 12px;
  border: var(--border);
  color: var(--subtext-0);
  transition: background 0.15s, color 0.15s;
}

.btn:hover {
  background: var(--surface-0);
  color: var(--text);
}
```

**Color variants** — each follows the same pattern: text + border in the accent color, hover inverts to filled background with `--base` text:

```css
.btn-primary  { color: var(--rosewater); border-color: var(--rosewater); }
.btn-primary:hover { background: var(--rosewater); color: var(--base); }

.btn-danger   { color: var(--red); border-color: var(--red); }
.btn-danger:hover  { background: var(--red); color: var(--base); }

.btn-success  { color: var(--green); border-color: var(--green); }
.btn-success:hover { background: var(--green); color: var(--base); }

.btn-warning  { color: var(--yellow); border-color: var(--yellow); }
.btn-warning:hover { background: var(--yellow); color: var(--base); }

.btn-teal     { color: var(--teal); border-color: var(--teal); }
.btn-teal:hover    { background: var(--teal); color: var(--base); }
```

### 9.2 Inputs

All inputs share the same style — transparent bg, `--mantle` on specific input types:

```css
.add-movie-input {
  flex: 1;
  padding: 5px 8px;
  background: var(--mantle);
  border: var(--border);
  color: var(--text);
  font-size: 13px;
}

.add-movie-input:focus {
  border-color: var(--rosewater);
}
```

The focus ring is always `--rosewater` border color. Never use `outline`.

### 9.3 List Items

List items use `fadeIn` animation, hover highlights, and a consistent layout:

```css
.movie-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: var(--border);
  animation: fadeIn 0.3s ease both;
  font-size: 13px;
  cursor: pointer;
}

.movie-item:hover {
  background: var(--surface-0);
}
```

Index numbers are right-aligned and muted:

```css
.movie-item .index {
  color: var(--overlay-0);
  min-width: 28px;
  text-align: right;
  font-size: 12px;
}
```

### 9.4 Empty State

Uses ASCII corner brackets for a terminal feel:

```tsx
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <span className="line">{'\u2514'} {message} {'\u2518'}</span>
    </div>
  );
}
```

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: var(--overlay-0);
  font-size: 13px;
  gap: 4px;
  animation: fadeIn 0.4s ease;
}
```

### 9.5 Modal Dialogs

Modals use a dark overlay with scale-in animation:

```tsx
<div className="modal-overlay" onClick={onCancel}>
  <div className="modal" onClick={(e) => e.stopPropagation()}>
    <div className="modal-title">{'>'} Title</div>
    <div className="modal-body">Content</div>
    <div className="modal-actions">
      <button className="btn" onClick={onCancel}>Cancel</button>
      <button className="btn btn-success" onClick={onConfirm}>Confirm</button>
    </div>
  </div>
</div>
```

```css
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal {
  background: var(--base);
  border: 1px solid var(--surface-1);
  padding: 20px;
  min-width: 340px;
  max-width: 480px;
  animation: modalIn 0.2s ease;
}
```

### 9.6 Loading Spinner

Pure CSS spinner using border tricks:

```css
.loading-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--surface-1);
  border-top-color: var(--rosewater);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
```

### 9.7 Error Banner

```css
.error-banner {
  padding: 8px 12px;
  background: var(--mantle);
  border: 1px solid var(--red);
  color: var(--red);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: fadeIn 0.3s ease;
}
```

### 9.8 Section Headers

```css
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: var(--border);
  margin-bottom: 8px;
}

.section-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--subtext-0);
  font-weight: 700;
}
```

### 9.9 Terminal Prompt

Used in forms and the chat to give a CLI feel:

```css
.terminal-prompt {
  color: var(--rosewater);
  display: flex;
  align-items: center;
  gap: 6px;
}

.terminal-prompt .cursor {
  display: inline-block;
  width: 8px;
  height: 14px;
  background: var(--rosewater);
  animation: blink 1s step-end infinite;
}
```

Usage in JSX:

```tsx
<span className="terminal-prompt">{'>'} Enter username: <span className="cursor" /></span>
```

### 9.10 Chat Messages (IRC Style)

```css
.chat-message {
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 1px 0;
  font-size: 13px;
  line-height: 1.5;
}

.chat-time {
  color: var(--overlay-0);
  font-size: 11px;
  flex-shrink: 0;
  min-width: 42px;
}

.chat-user--self { color: var(--green); }
.chat-user--other { color: var(--blue); }
```

Chat input uses a prompt prefix:

```tsx
<span className="chat-prompt">[{username}@room]$</span>
```

### 9.11 Star Rating

Unicode stars (`★` / `☆`) with yellow fill:

```css
.star {
  font-size: 14px;
  color: var(--overlay-0);
  transition: color 0.15s, transform 0.15s;
  user-select: none;
}

.star.filled {
  color: var(--yellow);
}

.star:hover,
.star.hover {
  color: var(--yellow);
  transform: scale(1.2);
}
```

### 9.12 Autocomplete Suggestions

Dropdown below input with poster thumbnails:

```css
.suggestions {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 150px;
  overflow-y: auto;
  border: var(--border);
  background: var(--mantle);
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.1s;
}

.suggestion-item:hover {
  background: var(--surface-0);
}

.suggestion-item--selected {
  background: var(--surface-0);
  border-left: 2px solid var(--rosewater);
  padding-left: 6px;
}
```

Keyboard hint bar at the bottom of suggestions:

```
↑↓ navigate · space add · enter open tmdb · esc close
```

---

## 10. Responsive Breakpoints

Two breakpoints. No mobile-first approach — desktop is default, then scale down:

### `max-width: 700px`

```css
.terminal-content { padding: 10px; gap: 12px; }
.terminal-titlebar { padding: 6px 8px; }
.terminal-dot { width: 8px; height: 8px; }
.terminal-title { font-size: 10px; }
.terminal-statusbar { padding: 4px 8px; font-size: 10px; }
.tab-item { padding: 8px 12px; font-size: 12px; }
.movie-item { padding: 6px; gap: 4px; flex-wrap: wrap; font-size: 12px; }
.btn { padding: 4px 6px; font-size: 11px; }
.modal { min-width: 0; width: calc(100% - 24px); max-width: 100%; padding: 16px; }
```

### `max-width: 420px`

```css
.terminal-content { padding: 6px; gap: 8px; }
.tab-item { padding: 6px 8px; font-size: 11px; flex: 1; text-align: center; }
.movie-item { padding: 4px; gap: 3px; }
.btn { padding: 3px 5px; font-size: 10px; }
.star { font-size: 12px; }
.modal { padding: 12px; }
```

---

## 11. Vite Configuration

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3069',
    },
  },
  build: {
    outDir: 'dist',
  },
});
```

---

## 12. TypeScript Config

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src", "server"]
}
```

---

## 13. Entry Point

`src/index.tsx` — imports both CSS files in order:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
import './styles/terminal.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`index.html` — minimal:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>app-name</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

---

## 14. Package Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"bun run --hot server/index.ts\" \"bun run vite\"",
    "build": "bun run vite build",
    "start": "bun run server/index.ts",
    "typecheck": "bun run tsc --noEmit"
  }
}
```

---

## 15. Design Principles

1. **Rosewater is the primary accent** — `--rosewater` (`#f5e0dc`) is used for all primary interactive elements: focus rings, active tabs, primary buttons, terminal prompts, blinking cursors, selected items, and any "current" or "active" indicator. This is the signature color of the UI.
2. **Terminal aesthetic** — Everything looks like it runs in a terminal. No rounded corners, no shadows, no gradients (except scanlines).
2. **Monospace only** — Never use sans-serif fonts.
3. **Sharp corners** — `border-radius: 0` everywhere (except circles like dots and spinners).
4. **No shadows** — Depth comes from background color layering (`crust` → `mantle` → `base` → `surface-0`), not box-shadow.
5. **ASCII decorations** — Use Unicode symbols for icons: `✖` close, `▶` play, `▲` up, `▼` down, `✦` star, `➔` arrow, `↵` enter, `>` prompt.
6. **Muted interactions** — Hover states use `surface-0` background, not flashy effects.
7. **Fade-in animations** — List items and modals animate in, never snap.
8. **Scanline overlay** — The CRT scanline effect is applied to the terminal window only.
9. **Status bar** — Every screen has a status bar with context info and a filter input.
10. **Prompt prefix** — Forms and chat inputs use `>` or `[user@ctx]$` prefixes for the CLI feel.

---

## 16. Checklist for New Projects

To replicate this UI in a new project:

- [ ] Create `src/styles/global.css` with the exact CSS variables from Section 3
- [ ] Create `src/styles/terminal.css` with all component classes from Sections 6–9
- [ ] Import both CSS files in `src/index.tsx` (global first, terminal second)
- [ ] Build a `TerminalWindow` wrapper with titlebar (dots + title), content area, and statusbar
- [ ] Use `var(--border)` for all borders — never hardcode border colors
- [ ] Use `var(--font-mono)` for all text — never introduce sans-serif
- [ ] Set `--radius: 0` and avoid `border-radius` except for circles
- [ ] Apply the scanline `::after` pseudo-element on the terminal window
- [ ] Use `fadeIn` for list items with staggered `animationDelay`
- [ ] Use `modalIn` for modal dialogs
- [ ] Use `--rosewater` (`#f5e0dc`) for ALL primary interactive elements — this is the signature accent. It must appear on: focused inputs, active tabs, primary buttons, terminal prompts, cursors, selected suggestion items, and modal titles. Never substitute another color for these roles.
- [ ] Use `--surface-0` for hover backgrounds
- [ ] Use `--mantle` for input backgrounds and chrome areas (titlebar, statusbar)
- [ ] Use `--base` for main content areas
- [ ] Use `--crust` for the page body
- [ ] Add responsive breakpoints at 700px and 420px
- [ ] Include the keyboard hint footer in autocomplete dropdowns
- [ ] Use `>` prefix with blinking cursor for terminal prompts
