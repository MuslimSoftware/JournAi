# CLAUDE.md

## Overview

JournAi is a Tauri v2 journaling app with React 19 + TypeScript frontend and Rust backend. Uses Bun as package manager.

## Commands

```bash
bun run tauri dev    # Full app dev mode
bun run tauri build  # Production build
```

## Architecture

### Frontend (`/src`)

| Directory | Responsibility |
|-----------|----------------|
| `pages/` | Route-level components (Entries, Calendar, Chat, Projections) |
| `components/` | Reusable UI components |
| `components/themed/` | Design system primitives (Button, Card, Text, Container) |
| `components/mobile/` | Mobile-specific components |
| `contexts/` | React contexts (Theme, FocusMode, Sidebar) |
| `hooks/` | Custom hooks (useEntries, useMediaQuery, useKeyboard) |
| `services/` | Business logic and data operations |
| `lib/` | Infrastructure (db.ts, store.ts) |
| `styles/` | CSS files per feature |
| `theme/` | Design tokens |
| `types/` | TypeScript interfaces |

### Backend (`/src-tauri`)

| File | Responsibility |
|------|----------------|
| `src/lib.rs` | Tauri app builder and command handlers |
| `src/main.rs` | Application launcher |
| `tauri.conf.json` | App configuration |

SQLite database via `tauri-plugin-sql`. Settings persisted via `tauri-plugin-store`.

## Mobile Implementation

### Layout Switching

`App.tsx` switches between `Layout` (desktop) and `MobileLayout` (mobile) based on `useIsMobile()` hook. Page components like `Entries.tsx` also render different component trees per platform.

### MobileLayout (`components/mobile/MobileLayout.tsx`)

Handles all mobile container concerns:
- Uses `100dvh` for dynamic viewport height (handles address bar)
- Applies safe area insets via CSS custom properties
- Adjusts padding when keyboard opens
- Hides bottom nav during keyboard input

### Mobile Hooks

| Hook | Purpose |
|------|---------|
| `useKeyboard()` | Returns `{ isOpen, height }` for soft keyboard state |
| `useMediaQuery()` | Breakpoint detection (mobile < 768px) |
| `useSwipeAction()` | Horizontal swipe gesture handling with threshold detection |

### Mobile Components

| Component | Purpose |
|-----------|---------|
| `BottomNav` | Fixed bottom navigation bar |
| `BottomSheet` | Draggable modal from bottom, swipe-to-dismiss |
| `SwipeableListItem` | List item with swipe actions (delete/edit) |
| `MobileEntries` | Mobile entries list with FAB and search |
| `MobileEntryEditor` | Keyboard-aware entry editor |

### CSS Variables (`styles/mobile.css`)

```css
--mobile-nav-height: 56px;
--mobile-safe-area-top: env(safe-area-inset-top, 0px);
--mobile-safe-area-bottom: env(safe-area-inset-bottom, 0px);
--mobile-touch-target-min: 48px;
--keyboard-height: 0px;
```

### Mobile Practices

1. **Safe areas**: MobileLayout handles all safe area padding. Components should not add their own.

2. **Keyboard handling**: Use `useKeyboard()` hook. Adjust bottom padding when keyboard opens:
   ```typescript
   paddingBottom: isKeyboardOpen ? '20px' : 'calc(20px + var(--mobile-nav-height) + var(--mobile-safe-area-bottom))'
   ```

3. **Touch targets**: Minimum 48px for tappable elements (`--mobile-touch-target-min`).

4. **Input font size**: Always 16px+ on inputs to prevent iOS auto-zoom.

5. **Scroll behavior**: Use `overscroll-behavior: none` to prevent bounce. Momentum scrolling enabled via `-webkit-overflow-scrolling: touch`.

6. **Transitions**: Use 0.25s ease-out for layout changes (keyboard, nav visibility).

7. **Bottom nav visibility**: Hide during keyboard input, show otherwise.

8. **FAB positioning**: Positioned above bottom nav, moves down when keyboard opens.

### Viewport Configuration (`index.html`)

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

`viewport-fit=cover` allows content to extend into safe areas (notches).
