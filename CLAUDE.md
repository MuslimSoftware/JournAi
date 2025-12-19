# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JournAi is a Tauri v2 application with a React + TypeScript frontend built with Vite. The project uses Bun as its package manager.

## Architecture

### Frontend (React + TypeScript)
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Entry Point**: `src/main.tsx`
- **Main Component**: `src/App.tsx`
- **Tauri API**: Uses `@tauri-apps/api` for frontend-backend communication via `invoke()`

### Backend (Rust)
- **Framework**: Tauri v2
- **Entry Point**: `src-tauri/src/main.rs`
- **Library**: `src-tauri/src/lib.rs` (exports as `journai_lib`)
- **Commands**: Rust functions exposed to frontend via `#[tauri::command]` macro
- **Plugins**: `tauri-plugin-opener`, `tauri-plugin-store`

### Communication Pattern
Frontend calls Rust backend using:
```typescript
import { invoke } from "@tauri-apps/api/core";
const result = await invoke("command_name", { param: value });
```

Backend exposes commands via:
```rust
#[tauri::command]
fn command_name(param: Type) -> ReturnType { }
```

Register commands in `src-tauri/src/lib.rs` using `tauri::generate_handler![]`

## Development Commands

```bash
bun install          # Install dependencies
bun run dev          # Start Vite dev server (frontend only)
bun run tauri dev    # Start full Tauri app in dev mode (recommended)
bun run build        # Build frontend
bun run tauri build  # Build complete Tauri application
```

## TypeScript Configuration

- **Strict Mode**: Enabled with `noUnusedLocals` and `noUnusedParameters`
- **Module Resolution**: Uses "bundler" mode
- **Target**: ES2020

## Tauri Configuration

- **Dev Server**: Runs on port 1420 (strict port)
- **HMR**: Port 1421
- **Before Dev**: Runs `bun run dev`
- **Before Build**: Runs `bun run build`
- **Frontend Dist**: `../dist` (relative to `src-tauri/`)
- **App Identifier**: `com.younesbenketira.journai`

## Adding New Tauri Commands

1. Define command in `src-tauri/src/lib.rs`:
```rust
#[tauri::command]
fn my_command(param: &str) -> String {
    // implementation
}
```

2. Register in `invoke_handler`:
```rust
.invoke_handler(tauri::generate_handler![greet, my_command])
```

3. Call from frontend:
```typescript
const result = await invoke("my_command", { param: "value" });
```

## Rust Dependencies

Core dependencies (in `src-tauri/Cargo.toml`):
- `tauri` v2
- `tauri-plugin-opener` v2
- `tauri-plugin-store` v2
- `serde` with derive features
- `serde_json`

## Theme System

The application uses a custom theme system with light/dark mode support, persistent storage via Tauri's store plugin, and system preference detection.

### Key Files

**Core Infrastructure:**
- `src/lib/store.ts` - Type-safe abstraction over Tauri's LazyStore plugin
- `src/theme/tokens.ts` - Theme token definitions (colors, spacing, typography)
- `src/contexts/ThemeContext.tsx` - ThemeProvider and useTheme() hook

**Components:**
- `src/components/themed/` - Themed wrapper components (Container, Text, Card)
- `src/components/ThemeToggle.tsx` - Theme toggle button in Layout

**Styling:**
- `src/App.css` and `src/styles/layout.css` use CSS custom properties (e.g., `var(--bg-primary)`, `var(--text-primary)`)
- Theme values are applied to `document.documentElement` by ThemeProvider

### Usage

```typescript
import { useTheme } from './contexts/ThemeContext';
import { Container, Text, Card } from './components/themed';

function MyComponent() {
  const { theme, mode, toggleTheme } = useTheme();
  return <Container variant="primary"><Text variant="accent">Hello</Text></Container>;
}
```

## Entries Feature (Journal Entries)

The Entries page displays a list of journal entries with virtual scrolling for performance at scale. Currently uses dummy data; will be replaced with Tauri backend integration.

### Key Files

**Components:**
- `src/pages/Entries.tsx` - Main entries page with two-column layout (sidebar + detail view)
- `src/components/entries/EntriesSidebar.tsx` - Virtualized list of entries with smart date grouping
- `src/components/entries/EntryDetail.tsx` - Displays full content of selected entry

**Data & Utilities:**
- `src/data/dummyEntries.ts` - **TEMPORARY** dummy data (60 sample entries). Replace with real backend integration
- `src/types/entry.ts` - TypeScript interface for `JournalEntry` type
- `src/utils/dateGrouping.ts` - Smart date grouping logic (Today, Yesterday, This Week, etc. for recent entries; Month/Year for older entries)

**Styling:**
- `src/styles/entries.css` - Layout and styling for entries list and detail view

### Virtual Scrolling Implementation

Uses **TanStack React Virtual** (`@tanstack/react-virtual`) for high-performance rendering of large lists:
- Only renders visible items in DOM (~10-15 at a time)
- Maintains 60 FPS smooth scrolling even with thousands of entries
- Dynamic height estimation (headers: 45px, entries: 46px)
- 5-item overscan buffer for seamless scrolling

**Why Virtual Scrolling:**
- Handles 10,000+ entries without performance degradation
- Constant memory usage regardless of entry count
- Industry standard for scalable list UIs (messaging apps, notes apps, email clients)

**Implementation Pattern:**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: (index) => itemHeights[index],
  overscan: 5,
});
```

### Date Grouping Logic

Entries are automatically grouped by date for easy scanning:
- **Recent entries** (last 5 weeks): "Today", "Yesterday", "This Week", "Last Week", "This Month"
- **Older entries**: Grouped by "Month YYYY" (e.g., "November 2025", "October 2025")
- Groups sorted chronologically (newest first)
- Implemented in `src/utils/dateGrouping.ts`

### Data Model

```typescript
interface JournalEntry {
  id: string;
  date: string;        // ISO date format: YYYY-MM-DD
  preview: string;     // First ~50 chars for list view
  content: string;     // Full entry content
}
```

### Integration Notes

**Current State:**
- Uses static dummy data from `src/data/dummyEntries.ts`
- No backend persistence yet

**Next Steps for Backend Integration:**
1. Create Tauri commands in `src-tauri/src/lib.rs` for CRUD operations:
   - `get_entries() -> Vec<JournalEntry>`
   - `get_entry(id: String) -> JournalEntry`
   - `create_entry(entry: JournalEntry) -> JournalEntry`
   - `update_entry(id: String, entry: JournalEntry) -> JournalEntry`
   - `delete_entry(id: String) -> bool`
2. Implement SQLite/database storage in Rust backend
3. Replace `dummyEntries` import with `invoke("get_entries")`
4. Add state management (React Query or similar) for caching and optimistic updates
5. Implement cursor-based pagination for backend queries (better performance than offset-based)
