#[cfg(target_os = "ios")]
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg(target_os = "ios")]
mod ios_webview;

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
        }
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:journai.db", migrations)
                .build(),
        )
        .setup(|_app| {
            #[cfg(target_os = "ios")]
            {
                if let Some(webview_window) = _app.get_webview_window("main") {
                    ios_webview::configure_webview_for_fullscreen(&webview_window);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
