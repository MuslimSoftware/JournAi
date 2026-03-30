# 📓 JournAi

A private, AI-powered journaling app built with Tauri v2, React 19, and Rust. All your data stays on your device — encrypted at rest with military-grade cryptography.

![Platform](https://img.shields.io/badge/platforms-macOS%20%7C%20Windows%20%7C%20Linux%20%7C%20iOS%20%7C%20Android-blue)
![Built With](https://img.shields.io/badge/built%20with-Tauri%20v2%20%2B%20React%2019%20%2B%20Rust-orange)

### Download

| Platform | Link |
| -------- | ---- |
| macOS (Universal) | [JournAi-macOS.dmg](https://github.com/MuslimSoftware/JournAi/releases/latest/download/JournAi-macOS.dmg) |
| Windows | [JournAi-Windows-setup.exe](https://github.com/MuslimSoftware/JournAi/releases/latest/download/JournAi-Windows-setup.exe) |
| Linux (Deb) | [JournAi-Linux.deb](https://github.com/MuslimSoftware/JournAi/releases/latest/download/JournAi-Linux.deb) |
| Linux (AppImage) | [JournAi-Linux.AppImage](https://github.com/MuslimSoftware/JournAi/releases/latest/download/JournAi-Linux.AppImage) |

---

## ✨ Features

### 📝 Journaling

- Rich text editor with cursor tracking and content change detection
- Full-text search powered by SQLite FTS5 with BM25 ranking
- Cursor-based pagination for smooth infinite scrolling
- Focus mode for distraction-free writing

### ✅ Todos & Sticky Notes

- Task management with date scheduling, completion tracking, and ordering
- Quick sticky notes organized by date
- Calendar integration showing entries, todos, and sticky notes per day

### 📅 Calendar

- Visual month/year navigation with per-day content indicators
- Quick date jumping and mobile-optimized week strip view

### 🤖 AI Assistant

- **Conversational chat** with multi-turn context and streaming responses
- **Two specialized tools** the AI can invoke:
  - `query_insights` — aggregated emotions, people, and sentiment analytics
  - `query_entries` — full-text and semantic search over your journal
- **Automatic entry analysis** extracts emotions (with intensity & triggers), people (with relationships & sentiment), and source citations
- **Hybrid RAG search** combining BM25 keyword search (40%) + vector similarity (60%) via Reciprocal Rank Fusion
- **Embeddings** via `text-embedding-3-small` with sentence-aware chunking (400 tokens, 80-token overlap)
- **Context compaction** when conversation approaches 75% of model limits
- **4 model options**: GPT-5.2, GPT-5.1, GPT-4.1 Mini, GPT-4.1 Nano

### 📊 Insights & Analytics

- Emotion frequency, intensity trends, and trigger analysis
- People analytics with relationship and sentiment tracking
- Flexible filtering: last 7/30/90 days, week, month, year, or all time
- Group by entity, category, sentiment, or date

### 📱 Mobile

- Auto-switching layout: sidebar on desktop, bottom nav on mobile
- Safe area handling for notches and home indicators
- Swipe gestures, haptic feedback, and 48px touch targets
- Soft keyboard detection with auto-adjusting UI
- Bottom sheet modals, swipeable list items, and stack navigation
- Virtual scrolling via TanStack React Virtual

### 🎨 Theming

- Dark, light, and system-follow modes
- Full design token system with themed primitives (Button, Card, Text, Container)
- Smooth transitions with Framer Motion

### 📦 Import & Export

- **Export**: JSON bundle (versioned schema) or CSV folder (entries, todos, sticky notes)
- **Import**: Smart parser auto-detects format, normalizes dates, previews before committing

### 🔄 Auto-Updates

- GitHub Releases integration with cryptographic signature verification
- Download progress tracking, auto-install, and app relaunch
- Checks on startup and every 4 hours

### ⌨️ Keyboard Shortcuts

- Centralized `useKeyPress` hook with modifier key support
- `Esc` to exit focus mode / close modals
- `Ctrl+Shift+F` / `Cmd+Shift+F` to toggle focus mode
- Input-field aware — won't trigger while you're typing

---

## 🔒 Security

JournAi is built with a **local-first, zero-trust architecture**. Your journal never leaves your device unless you explicitly export it.

### 🗄️ Encrypted Database

- SQLite encrypted with **SQLCipher** — your entire database is encrypted at rest
- Database file (`journai.db`) is unreadable without the correct key
- Automatic corruption detection with backup and recovery workflow

### 🔑 App Lock

- **Password-protected lock screen** gates access to all journal data
- Key derivation uses **Argon2id** — the gold standard memory-hard KDF resistant to GPU/ASIC attacks
  - Desktop: 64 MiB memory cost · 3 iterations
  - Mobile: 32 MiB memory cost · 3 iterations (tuned for device constraints)
- **AES-256-GCM** key wrapping: a Key Encryption Key (KEK) derived from your passphrase wraps a random Data Encryption Key (DEK)
- Configurable auto-lock timeout (immediate, 5 minutes, or manual)
- Locks on app background/minimize and closes the database connection

### 🔐 Secure Storage

- API keys and secrets stored in your **OS-native credential manager**:
  - 🍎 macOS → Apple Keychain
  - 🪟 Windows → Windows Credential Manager
  - 🐧 Linux → Secret Service (encrypted persistent storage)
  - 📱 Mobile → iOS Keychain / Android Keystore
- Runtime availability probing — gracefully disables AI features if credential storage is unavailable
- API keys are **never stored in plain-text config files**

### 🛡️ API Key Protection

- Password-masked input with toggle visibility
- Format validation (`sk-` prefix pattern matching)
- Only the last 4 characters shown in the UI
- Event-driven change notifications for downstream consumers

### 🏠 Local-First Privacy

- **All data stored locally** — no cloud sync, no telemetry, no accounts
- The only external connection is to OpenAI (for chat, embeddings, and analysis) using your own API key
- API keys never appear in logs or get transmitted to anyone other than OpenAI
- You own your data — export it anytime as JSON or CSV

### 🔧 Database Resilience

- Serialized operations prevent race conditions
- Exponential backoff retry logic (up to 10 retries) for lock contention
- Automatic backup on corruption detection before recovery
- Secure random generation via Rust's `OsRng`

---

## 🛠️ Tech Stack

| Layer           | Technology                              |
| --------------- | --------------------------------------- |
| Framework       | Tauri v2 (Rust backend)                 |
| Frontend        | React 19 + TypeScript + Vite            |
| Database        | SQLite + SQLCipher + FTS5               |
| Crypto          | Argon2id + AES-256-GCM                  |
| AI              | OpenAI API (GPT-5.x / GPT-4.1)          |
| Package Manager | Bun                                     |
| Platforms       | macOS · Windows · Linux · iOS · Android |

---

## 🚀 Getting Started

```bash
# Install dependencies
bun install

# Run in development
bun run tauri dev

# Build for production
bun run tauri build
```

---

## 📂 Project Structure

```
src/
├── pages/          # Route-level components
├── components/     # Reusable UI + themed primitives + mobile
├── contexts/       # React contexts (theme, entries, calendar, etc.)
├── hooks/          # Custom hooks (keyboard, gestures, chat, etc.)
├── services/       # Business logic and data operations
├── ai/             # AI agent runtime, prompts, providers
├── lib/            # DB, store, secure storage infrastructure
├── styles/         # CSS per feature
├── theme/          # Design tokens
└── types/          # TypeScript interfaces
src-tauri/
├── src/lib.rs      # Tauri commands (app lock, secure storage)
└── src/main.rs     # App launcher
evals/              # AI agent evaluation framework
```
