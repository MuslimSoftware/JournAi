#[cfg(target_os = "ios")]
use tauri::Manager;
#[cfg(desktop)]
use tauri::Emitter;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg(target_os = "ios")]
mod ios_webview;

mod app_lock;
mod secure_storage;

const SECURE_DB_URL: &str = "sqlite:journai_secure.db";

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_entries_table",
            sql: "CREATE TABLE IF NOT EXISTS entries (
                id TEXT PRIMARY KEY NOT NULL,
                date TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date DESC);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_todos_table",
            sql: "CREATE TABLE IF NOT EXISTS todos (
                id TEXT PRIMARY KEY NOT NULL,
                date TEXT NOT NULL,
                content TEXT NOT NULL,
                scheduled_time TEXT,
                completed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_todos_date ON todos(date);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_sticky_notes_table",
            sql: "CREATE TABLE IF NOT EXISTS sticky_notes (
                id TEXT PRIMARY KEY NOT NULL,
                date TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_sticky_notes_date ON sticky_notes(date);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_position_to_todos",
            sql: "ALTER TABLE todos ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
            UPDATE todos SET position = (
                SELECT COUNT(*) FROM todos t2
                WHERE t2.date = todos.date AND t2.created_at <= todos.created_at
            ) - 1;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_chats_tables",
            sql: "CREATE TABLE IF NOT EXISTS chats (
                id TEXT PRIMARY KEY NOT NULL,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY NOT NULL,
                chat_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                status TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "create_entries_fts",
            sql: "CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
                content,
                content='entries',
                content_rowid='rowid'
            );

            CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
                INSERT INTO entries_fts(rowid, content) VALUES (NEW.rowid, NEW.content);
            END;

            CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
                INSERT INTO entries_fts(entries_fts, rowid, content) VALUES('delete', OLD.rowid, OLD.content);
            END;

            CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
                INSERT INTO entries_fts(entries_fts, rowid, content) VALUES('delete', OLD.rowid, OLD.content);
                INSERT INTO entries_fts(rowid, content) VALUES (NEW.rowid, NEW.content);
            END;

            INSERT INTO entries_fts(rowid, content) SELECT rowid, content FROM entries;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "create_embeddings_table",
            sql: "CREATE TABLE IF NOT EXISTS embedding_chunks (
                id TEXT PRIMARY KEY NOT NULL,
                entry_id TEXT NOT NULL,
                entry_date TEXT NOT NULL,
                content TEXT NOT NULL,
                embedding BLOB NOT NULL,
                chunk_index INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_embedding_chunks_entry ON embedding_chunks(entry_id);
            CREATE INDEX IF NOT EXISTS idx_embedding_chunks_date ON embedding_chunks(entry_date);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "create_entities_tables",
            sql: "CREATE TABLE IF NOT EXISTS entities (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                first_mentioned TEXT NOT NULL,
                last_mentioned TEXT NOT NULL,
                mention_count INTEGER NOT NULL DEFAULT 1,
                aliases TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
            CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);

            CREATE TABLE IF NOT EXISTS entity_mentions (
                id TEXT PRIMARY KEY NOT NULL,
                entity_id TEXT NOT NULL,
                entry_id TEXT NOT NULL,
                entry_date TEXT NOT NULL,
                context TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
                FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity ON entity_mentions(entity_id);
            CREATE INDEX IF NOT EXISTS idx_entity_mentions_entry ON entity_mentions(entry_id);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "add_citations_to_chat_messages",
            sql: "ALTER TABLE chat_messages ADD COLUMN citations TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "add_rag_context_to_chat_messages",
            sql: "ALTER TABLE chat_messages ADD COLUMN rag_context TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "create_analytics_tables",
            sql: "CREATE TABLE IF NOT EXISTS journal_insights (
                id TEXT PRIMARY KEY,
                entry_id TEXT NOT NULL,
                entry_date TEXT NOT NULL,
                insight_type TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_insights_entry ON journal_insights(entry_id);
            CREATE INDEX IF NOT EXISTS idx_insights_type ON journal_insights(insight_type);
            CREATE INDEX IF NOT EXISTS idx_insights_date ON journal_insights(entry_date);

            CREATE TABLE IF NOT EXISTS analytics_queue (
                id TEXT PRIMARY KEY,
                entry_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                retry_count INTEGER NOT NULL DEFAULT 0,
                error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_queue_status ON analytics_queue(status);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "create_deep_insights_table",
            sql: "CREATE TABLE IF NOT EXISTS deep_insights (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "add_tool_calls_to_chat_messages",
            sql: "ALTER TABLE chat_messages ADD COLUMN tool_calls TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "add_last_content_update_to_entries",
            sql: "ALTER TABLE entries ADD COLUMN last_content_update TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 15,
            description: "add_analytics_indices",
            sql: "CREATE INDEX IF NOT EXISTS idx_analytics_queue_entry_id ON analytics_queue(entry_id);
            CREATE INDEX IF NOT EXISTS idx_analytics_queue_status ON analytics_queue(status);
            CREATE INDEX IF NOT EXISTS idx_journal_insights_entry_id ON journal_insights(entry_id);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "add_processing_status_to_entries",
            sql: "ALTER TABLE entries ADD COLUMN processed_at TEXT;
            ALTER TABLE entries ADD COLUMN content_hash TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 17,
            description: "add_source_location_to_insights",
            sql: "ALTER TABLE journal_insights ADD COLUMN source_text TEXT;
            ALTER TABLE journal_insights ADD COLUMN source_start INTEGER;
            ALTER TABLE journal_insights ADD COLUMN source_end INTEGER;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 18,
            description: "enforce_non_empty_sticky_notes",
            sql: "DELETE FROM sticky_notes WHERE TRIM(content) = '';

            CREATE TRIGGER IF NOT EXISTS sticky_notes_validate_content_insert
            BEFORE INSERT ON sticky_notes
            FOR EACH ROW
            WHEN TRIM(COALESCE(NEW.content, '')) = ''
            BEGIN
                SELECT RAISE(ABORT, 'sticky_notes.content cannot be empty');
            END;

            CREATE TRIGGER IF NOT EXISTS sticky_notes_validate_content_update
            BEFORE UPDATE OF content ON sticky_notes
            FOR EACH ROW
            WHEN TRIM(COALESCE(NEW.content, '')) = ''
            BEGIN
                SELECT RAISE(ABORT, 'sticky_notes.content cannot be empty');
            END;",
            kind: MigrationKind::Up,
        }
    ];

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(SECURE_DB_URL, migrations)
                .build(),
        );

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_mcp_bridge::init());
    }

    builder
        .manage(app_lock::AppLockRuntimeState::default())
        .setup(|app| {
            #[cfg(target_os = "ios")]
            {
                if let Some(webview_window) = app.get_webview_window("main") {
                    ios_webview::configure_webview_for_fullscreen(&webview_window);
                }
            }

            #[cfg(desktop)]
            {
                use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};

                let settings = MenuItem::with_id(app, "settings", "Settings...", true, Some("CmdOrCtrl+,"))?;

                let app_menu = Submenu::with_items(
                    app,
                    "journai",
                    true,
                    &[
                        &PredefinedMenuItem::about(app, Some("About journai"), None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &settings,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::quit(app, Some("Quit journai"))?,
                    ],
                )?;

                let edit_menu = Submenu::with_items(
                    app,
                    "Edit",
                    true,
                    &[
                        &PredefinedMenuItem::undo(app, None)?,
                        &PredefinedMenuItem::redo(app, None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::cut(app, None)?,
                        &PredefinedMenuItem::copy(app, None)?,
                        &PredefinedMenuItem::paste(app, None)?,
                        &PredefinedMenuItem::select_all(app, None)?,
                    ],
                )?;

                let window_menu = Submenu::with_items(
                    app,
                    "Window",
                    true,
                    &[
                        &PredefinedMenuItem::minimize(app, None)?,
                        &PredefinedMenuItem::close_window(app, None)?,
                    ],
                )?;

                let menu = Menu::with_items(app, &[&app_menu, &edit_menu, &window_menu])?;
                app.set_menu(menu)?;

                app.on_menu_event(|app, event| {
                    if event.id() == "settings" {
                        let _ = app.emit("open-settings", ());
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            app_lock::app_lock_status,
            app_lock::app_lock_configure,
            app_lock::app_lock_unlock,
            app_lock::app_lock_lock,
            app_lock::app_lock_disable,
            app_lock::app_lock_change_passphrase,
            app_lock::app_lock_backup_and_reset_secure_db,
            secure_storage::secure_storage_set,
            secure_storage::secure_storage_get,
            secure_storage::secure_storage_delete,
            secure_storage::secure_storage_is_available
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
