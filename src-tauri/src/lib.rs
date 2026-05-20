use serde::Serialize;
#[cfg(target_os = "linux")]
use std::{
    fs::OpenOptions,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};
use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    time::{Duration, Instant},
};
#[cfg(all(desktop, not(target_os = "linux")))]
use tauri::Emitter;
#[cfg(any(target_os = "ios", target_os = "linux"))]
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg(target_os = "ios")]
mod ios_webview;

mod app_lock;
mod secure_storage;

const SECURE_DB_URL: &str = "sqlite:journai.db";
const SYNC_OAUTH_LOOPBACK_PORT: u16 = 53683;
const SYNC_OAUTH_CALLBACK_PATH: &str = "/sync/oauth/callback";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateInstallationInfo {
    platform: &'static str,
    bundle_type: &'static str,
    updater_target: Option<String>,
    app_image_can_self_update: bool,
    app_image_path: Option<String>,
    app_image_update_issue: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncOAuthCallback {
    state: String,
    code: Option<String>,
    error: Option<String>,
}

fn updater_arch() -> Option<&'static str> {
    if cfg!(target_arch = "x86") {
        Some("i686")
    } else if cfg!(target_arch = "x86_64") {
        Some("x86_64")
    } else if cfg!(target_arch = "arm") {
        Some("armv7")
    } else if cfg!(target_arch = "aarch64") {
        Some("aarch64")
    } else if cfg!(target_arch = "riscv64") {
        Some("riscv64")
    } else {
        None
    }
}

fn updater_target(platform: &str, bundle_type: &str) -> Option<String> {
    let arch = updater_arch()?;
    if platform == "linux" && matches!(bundle_type, "appimage" | "deb" | "rpm") {
        Some(format!("linux-{arch}-{bundle_type}"))
    } else {
        None
    }
}

fn patched_bundle_type() -> &'static str {
    match tauri::utils::platform::bundle_type() {
        Some(tauri::utils::config::BundleType::AppImage) => "appimage",
        Some(tauri::utils::config::BundleType::Deb) => "deb",
        Some(tauri::utils::config::BundleType::Rpm) => "rpm",
        Some(tauri::utils::config::BundleType::App) => "app",
        Some(tauri::utils::config::BundleType::Msi) => "msi",
        Some(tauri::utils::config::BundleType::Nsis) => "nsis",
        Some(_) => "other",
        None => "unknown",
    }
}

#[cfg(target_os = "linux")]
fn detected_bundle_type() -> &'static str {
    let patched_type = patched_bundle_type();
    if patched_type != "unknown" {
        return patched_type;
    }

    if std::env::var_os("APPIMAGE").is_some() {
        return "appimage";
    }

    if let Ok(exe) = tauri::utils::platform::current_exe() {
        if exe == Path::new("/usr/bin/journai") && Path::new("/etc/debian_version").exists() {
            return "deb";
        }
    }

    "unknown"
}

#[cfg(not(target_os = "linux"))]
fn detected_bundle_type() -> &'static str {
    patched_bundle_type()
}

#[cfg(target_os = "linux")]
fn app_image_can_self_update(path: &Path) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Unable to determine the AppImage directory.".to_string())?;
    let parent_metadata = std::fs::metadata(parent)
        .map_err(|err| format!("Unable to inspect the AppImage directory: {err}"))?;

    if !parent_metadata.is_dir() {
        return Err("The AppImage parent path is not a directory.".to_string());
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    let probe_path = parent.join(format!(
        ".journai-update-probe-{}-{timestamp}",
        std::process::id()
    ));

    match OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&probe_path)
    {
        Ok(file) => {
            drop(file);
            let _ = std::fs::remove_file(probe_path);
            Ok(())
        }
        Err(err) => Err(format!("The AppImage directory is not writable: {err}")),
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn app_platform() -> &'static str {
    if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "ios") {
        "ios"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else if cfg!(target_os = "android") {
        "android"
    } else {
        "unknown"
    }
}

fn write_oauth_response(stream: &mut TcpStream, title: &str, message: &str) {
    let body = format!(
        "<!doctype html><html><head><meta charset=\"utf-8\"><title>{title}</title></head><body><h1>{title}</h1><p>{message}</p></body></html>"
    );
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = stream.write_all(response.as_bytes());
}

fn read_oauth_callback(
    stream: &mut TcpStream,
    expected_state: &str,
) -> Result<Option<SyncOAuthCallback>, String> {
    let mut buffer = [0_u8; 8192];
    let bytes_read = stream
        .read(&mut buffer)
        .map_err(|err| format!("Failed to read OAuth callback: {err}"))?;
    let request = String::from_utf8_lossy(&buffer[..bytes_read]);
    let request_line = request.lines().next().unwrap_or_default();
    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or_default();
    let target = parts.next().unwrap_or_default();

    if method != "GET" {
        write_oauth_response(
            stream,
            "OAuth callback failed",
            "Invalid OAuth callback method.",
        );
        return Ok(None);
    }

    let (path, query) = target.split_once('?').unwrap_or((target, ""));
    if path != SYNC_OAUTH_CALLBACK_PATH {
        write_oauth_response(
            stream,
            "OAuth callback ignored",
            "This OAuth callback path is not used by JournAi.",
        );
        return Ok(None);
    }

    let mut state = None;
    let mut code = None;
    let mut error = None;
    for (key, value) in url::form_urlencoded::parse(query.as_bytes()) {
        match key.as_ref() {
            "state" => state = Some(value.into_owned()),
            "code" => code = Some(value.into_owned()),
            "error" => error = Some(value.into_owned()),
            _ => {}
        }
    }

    let Some(state) = state else {
        write_oauth_response(
            stream,
            "OAuth callback failed",
            "The provider did not return OAuth state.",
        );
        return Err("OAuth callback did not include state.".to_string());
    };

    if state != expected_state {
        write_oauth_response(
            stream,
            "OAuth callback failed",
            "OAuth state did not match the active connection request.",
        );
        return Err("OAuth callback state mismatch.".to_string());
    }

    if error.is_some() {
        write_oauth_response(
            stream,
            "OAuth connection cancelled",
            "You can close this window and return to JournAi.",
        );
    } else {
        write_oauth_response(
            stream,
            "OAuth connected",
            "You can close this window and return to JournAi.",
        );
    }

    Ok(Some(SyncOAuthCallback { state, code, error }))
}

#[tauri::command]
async fn sync_oauth_wait_for_loopback_callback(
    expected_state: String,
    timeout_seconds: Option<u64>,
) -> Result<SyncOAuthCallback, String> {
    tauri::async_runtime::spawn_blocking(move || {
        wait_for_loopback_oauth_callback(expected_state, timeout_seconds)
    })
    .await
    .map_err(|err| format!("OAuth callback listener failed: {err}"))?
}

fn wait_for_loopback_oauth_callback(
    expected_state: String,
    timeout_seconds: Option<u64>,
) -> Result<SyncOAuthCallback, String> {
    let listener = TcpListener::bind(("127.0.0.1", SYNC_OAUTH_LOOPBACK_PORT))
        .map_err(|err| format!("Unable to start OAuth callback listener: {err}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|err| format!("Unable to configure OAuth callback listener: {err}"))?;

    let timeout = Duration::from_secs(timeout_seconds.unwrap_or(300).clamp(30, 600));
    let deadline = Instant::now() + timeout;

    loop {
        match listener.accept() {
            Ok((mut stream, _)) => {
                stream
                    .set_read_timeout(Some(Duration::from_secs(2)))
                    .map_err(|err| format!("Unable to configure OAuth callback stream: {err}"))?;
                if let Some(callback) = read_oauth_callback(&mut stream, &expected_state)? {
                    return Ok(callback);
                }
            }
            Err(err) if err.kind() == std::io::ErrorKind::WouldBlock => {
                if Instant::now() >= deadline {
                    return Err("Timed out waiting for OAuth callback.".to_string());
                }
                std::thread::sleep(Duration::from_millis(100));
            }
            Err(err) => return Err(format!("Failed to accept OAuth callback: {err}")),
        }
    }
}

#[tauri::command]
fn update_installation_info() -> UpdateInstallationInfo {
    let platform = if cfg!(target_os = "linux") {
        "linux"
    } else {
        "other"
    };
    let bundle_type = detected_bundle_type();
    let updater_target = updater_target(platform, bundle_type);

    #[cfg(target_os = "linux")]
    {
        let app_image_path = if bundle_type == "appimage" {
            std::env::var_os("APPIMAGE")
                .map(Into::into)
                .or_else(|| tauri::utils::platform::current_exe().ok())
        } else {
            None
        };

        let (app_image_can_self_update, app_image_update_issue) = if bundle_type == "appimage" {
            match app_image_path.as_deref() {
                Some(path) => match app_image_can_self_update(path) {
                    Ok(()) => (true, None),
                    Err(issue) => (false, Some(issue)),
                },
                None => (
                    false,
                    Some("Unable to locate the running AppImage.".to_string()),
                ),
            }
        } else {
            (true, None)
        };

        return UpdateInstallationInfo {
            platform,
            bundle_type,
            updater_target,
            app_image_can_self_update,
            app_image_path: app_image_path.map(|path| path.to_string_lossy().into_owned()),
            app_image_update_issue,
        };
    }

    #[cfg(not(target_os = "linux"))]
    {
        UpdateInstallationInfo {
            platform,
            bundle_type,
            updater_target,
            app_image_can_self_update: true,
            app_image_path: None,
            app_image_update_issue: None,
        }
    }
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
        },
        Migration {
            version: 19,
            description: "create_sync_metadata_tables",
            sql: "CREATE TABLE IF NOT EXISTS sync_state (
                collection TEXT NOT NULL,
                record_id TEXT NOT NULL,
                dirty INTEGER NOT NULL DEFAULT 0,
                deleted INTEGER NOT NULL DEFAULT 0,
                local_version INTEGER NOT NULL DEFAULT 0,
                remote_version INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL,
                synced_at TEXT,
                remote_updated_at TEXT,
                payload_hash TEXT,
                PRIMARY KEY (collection, record_id)
            );
            CREATE INDEX IF NOT EXISTS idx_sync_state_dirty ON sync_state(dirty, updated_at);

            CREATE TABLE IF NOT EXISTS sync_conflicts (
                id TEXT PRIMARY KEY NOT NULL,
                collection TEXT NOT NULL,
                record_id TEXT NOT NULL,
                local_payload TEXT,
                remote_payload TEXT,
                created_at TEXT NOT NULL,
                resolved INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_sync_conflicts_record ON sync_conflicts(collection, record_id, resolved);",
            kind: MigrationKind::Up,
        }
    ];

    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
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
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;

                #[cfg(target_os = "linux")]
                {
                    if let Some(webview_window) = app.get_webview_window("main") {
                        webview_window.set_decorations(false)?;
                    }
                }

                #[cfg(not(target_os = "linux"))]
                {
                    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};

                    let settings = MenuItem::with_id(
                        app,
                        "settings",
                        "Settings...",
                        true,
                        Some("CmdOrCtrl+,"),
                    )?;

                    let app_menu = Submenu::with_items(
                        app,
                        "JournAi",
                        true,
                        &[
                            &PredefinedMenuItem::about(app, Some("About JournAi"), None)?,
                            &PredefinedMenuItem::separator(app)?,
                            &settings,
                            &PredefinedMenuItem::separator(app)?,
                            &PredefinedMenuItem::quit(app, Some("Quit JournAi"))?,
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
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            app_platform,
            sync_oauth_wait_for_loopback_callback,
            update_installation_info,
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
