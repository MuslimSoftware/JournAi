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

| Directory            | Responsibility                                                |
| -------------------- | ------------------------------------------------------------- |
| `pages/`             | Route-level components (Entries, Calendar, Chat, Insights)    |
| `components/`        | Reusable UI components                                        |
| `components/themed/` | Design system primitives (Button, Card, Text, Container)      |
| `components/mobile/` | Mobile-specific components                                    |
| `contexts/`          | React contexts (8 total - see Contexts section)               |
| `hooks/`             | Custom hooks (15 total - see Hooks section)                   |
| `services/`          | Business logic and data operations                            |
| `ai/`                | AI agent runtime, modules, providers, and evaluation          |
| `lib/`               | Infrastructure (db.ts, store.ts, secureStorage.ts)            |
| `styles/`            | CSS files per feature                                         |
| `theme/`             | Design tokens                                                 |
| `types/`             | TypeScript interfaces                                         |

### Project Root Directories

| Directory  | Responsibility                                      |
| ---------- | --------------------------------------------------- |
| `/evals`   | Evaluation datasets and optimization scripts        |
| `/plans`   | Planning documents                                  |
| `/scripts` | Utility scripts                                     |

### Backend (`/src-tauri`)

| File              | Responsibility                         |
| ----------------- | -------------------------------------- |
| `src/lib.rs`      | Tauri app builder and command handlers |
| `src/main.rs`     | Application launcher                   |
| `tauri.conf.json` | App configuration                      |

SQLite database via `tauri-plugin-sql`. Settings persisted via `tauri-plugin-store`.

## Contexts

| Context                  | Responsibility                                         |
| ------------------------ | ------------------------------------------------------ |
| `ThemeContext`           | Theme state (light/dark mode)                          |
| `FocusModeContext`       | Focus mode toggle and keyboard shortcuts               |
| `SidebarContext`         | Sidebar visibility state                               |
| `CalendarContext`        | Calendar view state and navigation                     |
| `EntriesStateContext`    | Paginated entries state, CRUD operations, navigation   |
| `EntryNavigationContext` | Cross-page entry navigation tracking                   |
| `InsightsContext`        | Analytics state, time/sentiment filters, insights data |
| `MemoryContext`          | AI memory and context management                       |

## Hooks

| Hook               | Purpose                                                    |
| ------------------ | ---------------------------------------------------------- |
| `useEntries`       | Entry CRUD operations and state management                 |
| `useMediaQuery`    | Breakpoint detection (mobile < 768px)                      |
| `useIsMobile`      | Mobile platform detection                                  |
| `useKeyboard`      | Soft keyboard state (`{ isOpen, height }`)                 |
| `useKeyPress`      | Centralized keyboard shortcut handler                      |
| `useEscapeKey`     | Escape key shortcut (wrapper around useKeyPress)           |
| `useSwipeAction`   | Horizontal swipe gesture handling with threshold detection |
| `useAutoScroll`    | Automatic scrolling for chat messages                      |
| `useChat`          | Chat state management and AI agent integration             |
| `useDebounce`      | Debounced value updates                                    |

## AI Agent System

### Architecture (`/src/ai`)

The AI agent system uses a modular architecture with providers, modules, and evaluation tools.

**Directory Structure:**

| Directory       | Purpose                                               |
| --------------- | ----------------------------------------------------- |
| `modules/`      | Agent modules (chat, tool routing)                    |
| `providers/`    | LLM providers (OpenAI)                                |
| `evaluation/`   | Evaluation interfaces (exact match, tool match)       |
| `optimization/` | Prompt optimization engine using DSPy                 |
| `runtime.ts`    | `JournalAIRuntime` - orchestrates AI operations       |

### Agent Tools (`services/agentTools.ts`)

Two main tools available to the AI agent:

1. **`query_insights`**: Query aggregated analytics (emotions, people, sentiment)
   - Filters: category, sentiment, date range, semantic search, specific names
   - Grouping: entity, category, sentiment, date
   - Returns: aggregated insights with optional entry IDs

2. **`query_entries`**: Query journal entries
   - Filters: semantic search, date range, tags
   - Returns: entry metadata with optional full text

### RAG & Context Assembly (`services/ai.ts`)

- System prompt with journal context and current date
- Tool calling support with OpenAI function format
- Streaming responses with tool call visualization
- Message history management
- Citation extraction from responses

## Evaluation & Optimization (`/evals`)

### Datasets

| Dataset               | Purpose                                  |
| --------------------- | ---------------------------------------- |
| `chat-golden.json`    | Golden examples for chat responses       |
| `tool-routing.json`   | Golden examples for tool selection       |

### Optimization Scripts

| Script         | Purpose                                      |
| -------------- | -------------------------------------------- |
| `evaluate.ts`  | Run evaluations against golden datasets     |
| `optimize.ts`  | Optimize prompts using DSPy (SIMBA/MIPROv2)  |

**Optimization Process:**
1. Curate golden examples with input/expectedOutput pairs
2. Choose optimizer (SIMBA for speed, MIPROv2 for quality)
3. Run optimization to refine prompts
4. Evaluate improved prompts against test set

**Cost estimates:** $2.50-$14 depending on dataset size and optimizer choice.

## Mobile Implementation

### Layout Switching

`App.tsx` switches between `Layout` (desktop) and `MobileLayout` (mobile) based on `useIsMobile()` hook. Page components like `Entries.tsx` also render different component trees per platform.

### MobileLayout (`components/mobile/MobileLayout.tsx`)

Handles all mobile container concerns:

- Uses `100dvh` for dynamic viewport height (handles address bar)
- Applies safe area insets via CSS custom properties
- Adjusts padding when keyboard opens
- Hides bottom nav during keyboard input

### Key Hooks (See Hooks section for complete list)

All hooks are documented in the Hooks section above. Mobile-specific hooks:
- `useKeyboard()` - Soft keyboard state detection
- `useSwipeAction()` - Swipe gesture handling
- `useIsMobile()` - Mobile platform detection

### Mobile Components

| Component              | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `BottomNav`            | Fixed bottom navigation bar                   |
| `BottomSheet`          | Draggable modal from bottom, swipe-to-dismiss |
| `SwipeableListItem`    | List item with swipe actions (delete/edit)    |
| `MobileEntries`        | Mobile entries list with FAB and search       |
| `MobileEntryEditor`    | Keyboard-aware entry editor                   |

### Key Components

| Component                 | Purpose                                       |
| ------------------------- | --------------------------------------------- |
| `ContentEditableEditor`   | Rich text editing with cursor position tracking |
| `ToolCallDisplay`         | AI agent tool call visualization with status  |
| `MessageBubble`           | Chat message with tool calls and citations    |
| `ChatContainer`           | Chat interface with agent orchestration       |

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

## Keyboard Shortcuts

### Implementation Pattern

All keyboard shortcuts use the centralized `useKeyPress` and `useEscapeKey` hooks (`hooks/useKeyPress.ts`).

**Benefits:**
- Single event listener per shortcut (not dozens)
- Automatic cleanup on unmount
- Prevents conflicts between handlers
- Configurable behavior (preventDefault, ignoreInputFields, modifier keys)

### Available Hooks

```typescript
// Generic key handler
useKeyPress(
  'f',                    // Key to listen for
  () => console.log('F'), // Callback
  {
    ctrlKey: true,        // Require Ctrl
    metaKey: false,       // Don't require Cmd
    shiftKey: true,       // Require Shift
    altKey: false,        // Don't require Alt
    ignoreInputFields: true,    // Skip if user is typing
    preventDefault: true,       // Prevent default browser behavior
    stopPropagation: true,      // Stop event propagation
  }
);

// Escape key shortcut
useEscapeKey(() => closeModal(), {
  ignoreInputFields: false,  // Also trigger in input fields
});
```

### Registered Shortcuts

| Shortcut          | Action                   | Context              |
| ----------------- | ------------------------ | -------------------- |
| `Escape`          | Exit focus mode          | FocusModeContext     |
| `Escape`          | Close modal              | Modal component      |
| `Ctrl+Shift+F`    | Toggle focus mode        | FocusModeContext     |
| `Cmd+Shift+F`     | Toggle focus mode (Mac)  | FocusModeContext     |

### Adding New Shortcuts

1. **Component-level** (contextual actions):
   ```typescript
   import { useKeyPress } from '../hooks/useKeyPress';

   function MyComponent() {
     useKeyPress('s', () => save(), { ctrlKey: true });
     // ...
   }
   ```

2. **App-level** (global navigation):
   Add to `FocusModeContext.tsx` or create a dedicated keyboard context.

### Best Practices

- Use `ignoreInputFields: true` by default (prevents triggering while typing)
- Always set `preventDefault: true` for custom shortcuts to avoid browser conflicts
- Conditional shortcuts: Check state inside the callback rather than conditionally mounting the hook
- Document all shortcuts in the table above

## Tauri MCP Tools

The Tauri MCP server provides tools to interact with the running app for debugging and testing. Requires the app to be running with `bun run tauri dev`.

### Connection

```typescript
// Start a session (connects to localhost:9223 by default)
mcp__tauri__driver_session({ action: "start" })

// Check status
mcp__tauri__driver_session({ action: "status" })

// Stop session
mcp__tauri__driver_session({ action: "stop" })
```

### Available Tools

| Tool                        | Purpose                                              |
| --------------------------- | ---------------------------------------------------- |
| `webview_screenshot`        | Capture screenshot of the app                        |
| `webview_dom_snapshot`      | Get DOM structure (`type: "structure"` or `"accessibility"`) |
| `webview_find_element`      | Find elements by CSS selector, xpath, or text        |
| `webview_get_styles`        | Get computed CSS styles for elements                 |
| `webview_interact`          | Click, scroll, swipe, focus on elements              |
| `webview_keyboard`          | Type text or send key events                         |
| `webview_execute_js`        | Execute JavaScript in the webview context            |
| `webview_wait_for`          | Wait for elements, text, or IPC events               |
| `read_logs`                 | Read console, Android, iOS, or system logs           |
| `ipc_execute_command`       | Execute Tauri IPC commands (invoke Rust functions)   |
| `ipc_monitor`               | Start/stop monitoring IPC traffic                    |
| `ipc_get_captured`          | Get captured IPC traffic                             |
| `ipc_emit_event`            | Emit Tauri events                                    |
| `ipc_get_backend_state`     | Get app metadata and Tauri version                   |
| `manage_window`             | List, get info, or resize windows                    |

### Common Workflows

**Inspect DOM structure:**
```typescript
mcp__tauri__webview_dom_snapshot({ type: "structure", selector: ".my-component" })
```

**Check computed styles:**
```typescript
mcp__tauri__webview_get_styles({
  selector: ".my-element",
  properties: ["background", "opacity", "color"]
})
```

**Execute JavaScript to debug:**
```typescript
mcp__tauri__webview_execute_js({
  script: "(() => { return getComputedStyle(document.querySelector('.my-element')).backgroundColor; })()"
})
```

**Check CSS rules being applied:**
```typescript
mcp__tauri__webview_execute_js({
  script: `(() => {
    const rules = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText?.includes('my-selector')) {
            rules.push({ selector: rule.selectorText, cssText: rule.cssText });
          }
        }
      } catch (e) {}
    }
    return rules;
  })()`
})
```

**Force reload to clear CSS cache:**
```typescript
mcp__tauri__webview_execute_js({ script: "location.reload(true)" })
```
