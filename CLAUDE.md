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
