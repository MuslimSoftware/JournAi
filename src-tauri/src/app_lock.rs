use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::{Algorithm, Argon2, Params, Version};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use rand::rngs::OsRng;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use tauri::{Manager, State};

use crate::secure_storage;

const APP_LOCK_KEYSET_STORAGE_KEY: &str = "journai.app_lock.keyset";
const APP_LOCK_OPEN_DEK_STORAGE_KEY: &str = "journai.app_lock.open_dek";
const APP_LOCK_PASSPHRASE_MIN_LENGTH: usize = 8;
const SQLCIPHER_KEY_ENV_VAR: &str = "JOURNAI_SQLCIPHER_KEY_HEX";
const SECURE_DB_FILE_NAME: &str = "journai_secure.db";
const KEY_LENGTH: usize = 32;
const SALT_LENGTH: usize = 16;
const NONCE_LENGTH: usize = 12;

pub struct AppLockRuntimeState {
    unlocked: Mutex<bool>,
    configured_cache: Mutex<Option<bool>>,
}

impl Default for AppLockRuntimeState {
    fn default() -> Self {
        Self {
            unlocked: Mutex::new(false),
            configured_cache: Mutex::new(None),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppLockStatus {
    pub configured: bool,
    pub unlocked: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Keyset {
    version: u8,
    password_hash: String,
    salt_b64: String,
    memory_kib: u32,
    iterations: u32,
    parallelism: u32,
    wrapped_dek_b64: String,
    nonce_b64: String,
}

fn platform_kdf_memory_kib() -> u32 {
    #[cfg(any(target_os = "ios", target_os = "android"))]
    {
        32 * 1024
    }

    #[cfg(not(any(target_os = "ios", target_os = "android")))]
    {
        64 * 1024
    }
}

fn kdf_parameters() -> Result<(u32, u32, u32, Params), String> {
    let memory_kib = platform_kdf_memory_kib();
    let iterations = 3;
    let parallelism = 1;
    let params = Params::new(memory_kib, iterations, parallelism, Some(KEY_LENGTH))
        .map_err(|e| format!("Failed to build Argon2 parameters: {e}"))?;

    Ok((memory_kib, iterations, parallelism, params))
}

fn decode_base64<const N: usize>(value: &str, label: &str) -> Result<[u8; N], String> {
    let bytes = BASE64
        .decode(value)
        .map_err(|e| format!("Invalid base64 for {label}: {e}"))?;
    if bytes.len() != N {
        return Err(format!(
            "Invalid decoded length for {label}: expected {N}, got {}",
            bytes.len()
        ));
    }
    let mut output = [0u8; N];
    output.copy_from_slice(&bytes);
    Ok(output)
}

fn derive_kek(passphrase: &str, salt: &[u8], params: &Params) -> Result<[u8; KEY_LENGTH], String> {
    let mut key = [0u8; KEY_LENGTH];
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params.clone());
    argon2
        .hash_password_into(passphrase.as_bytes(), salt, &mut key)
        .map_err(|e| format!("Failed to derive key with Argon2id: {e}"))?;
    Ok(key)
}

fn keyset_fallback_path() -> Result<PathBuf, String> {
    let mut base = dirs::data_local_dir()
        .or_else(dirs::data_dir)
        .ok_or_else(|| "Unable to resolve app data directory for app lock keyset".to_string())?;
    base.push("journai");

    fs::create_dir_all(&base)
        .map_err(|e| format!("Failed to create keyset directory {}: {e}", base.display()))?;

    base.push("app_lock_keyset.json");
    Ok(base)
}

fn parse_keyset(raw: &str) -> Result<Keyset, String> {
    serde_json::from_str(raw).map_err(|e| format!("Invalid stored app lock keyset: {e}"))
}

fn write_keyset_fallback_file(raw: &str) -> Result<(), String> {
    let path = keyset_fallback_path()?;
    fs::write(&path, raw).map_err(|e| format!("Failed to write fallback keyset {}: {e}", path.display()))
}

fn read_keyset_fallback_file() -> Result<Option<Keyset>, String> {
    let path = keyset_fallback_path()?;
    if !path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read fallback keyset {}: {e}", path.display()))?;
    let keyset = parse_keyset(&raw)?;
    Ok(Some(keyset))
}

fn read_keyset() -> Result<Option<Keyset>, String> {
    match secure_storage::secure_storage_get(APP_LOCK_KEYSET_STORAGE_KEY.to_string()) {
        Ok(Some(raw)) => {
            let keyset = parse_keyset(&raw)?;
            let _ = write_keyset_fallback_file(&raw);
            Ok(Some(keyset))
        }
        Ok(None) => read_keyset_fallback_file(),
        Err(_) => read_keyset_fallback_file(),
    }
}

fn write_keyset(keyset: &Keyset) -> Result<(), String> {
    let raw = serde_json::to_string(keyset).map_err(|e| format!("Failed to serialize keyset: {e}"))?;
    write_keyset_fallback_file(&raw)?;
    let _ = secure_storage::secure_storage_set(APP_LOCK_KEYSET_STORAGE_KEY.to_string(), raw);
    Ok(())
}

fn verify_passphrase(keyset: &Keyset, passphrase: &str) -> Result<(), String> {
    let parsed_hash = PasswordHash::new(&keyset.password_hash)
        .map_err(|e| format!("Invalid stored password hash: {e}"))?;
    let params = Params::new(
        keyset.memory_kib,
        keyset.iterations,
        keyset.parallelism,
        Some(KEY_LENGTH),
    )
    .map_err(|e| format!("Invalid stored Argon2 params: {e}"))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    argon2
        .verify_password(passphrase.as_bytes(), &parsed_hash)
        .map_err(|_| "Invalid passphrase".to_string())
}

fn build_keyset_from_passphrase(passphrase: &str, existing_dek: Option<[u8; KEY_LENGTH]>) -> Result<Keyset, String> {
    if passphrase.chars().count() < APP_LOCK_PASSPHRASE_MIN_LENGTH {
        return Err(format!(
            "Passphrase must be at least {APP_LOCK_PASSPHRASE_MIN_LENGTH} characters"
        ));
    }

    let (memory_kib, iterations, parallelism, params) = kdf_parameters()?;

    let mut salt = [0u8; SALT_LENGTH];
    OsRng.fill_bytes(&mut salt);
    let salt_string = SaltString::encode_b64(&salt)
        .map_err(|e| format!("Failed to encode Argon2 salt: {e}"))?;

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params.clone());
    let password_hash = argon2
        .hash_password(passphrase.as_bytes(), &salt_string)
        .map_err(|e| format!("Failed to hash passphrase: {e}"))?
        .to_string();

    let kek = derive_kek(passphrase, &salt, &params)?;

    let mut dek = existing_dek.unwrap_or([0u8; KEY_LENGTH]);
    if existing_dek.is_none() {
        OsRng.fill_bytes(&mut dek);
    }

    let mut nonce = [0u8; NONCE_LENGTH];
    OsRng.fill_bytes(&mut nonce);

    let cipher = Aes256Gcm::new_from_slice(&kek)
        .map_err(|e| format!("Failed to initialize cipher: {e}"))?;
    let wrapped_dek = cipher
        .encrypt(Nonce::from_slice(&nonce), dek.as_ref())
        .map_err(|e| format!("Failed to wrap DEK: {e}"))?;

    Ok(Keyset {
        version: 1,
        password_hash,
        salt_b64: BASE64.encode(salt),
        memory_kib,
        iterations,
        parallelism,
        wrapped_dek_b64: BASE64.encode(wrapped_dek),
        nonce_b64: BASE64.encode(nonce),
    })
}

fn unwrap_dek(keyset: &Keyset, passphrase: &str) -> Result<[u8; KEY_LENGTH], String> {
    verify_passphrase(keyset, passphrase)?;

    let params = Params::new(
        keyset.memory_kib,
        keyset.iterations,
        keyset.parallelism,
        Some(KEY_LENGTH),
    )
    .map_err(|e| format!("Invalid stored Argon2 params: {e}"))?;
    let salt = decode_base64::<SALT_LENGTH>(&keyset.salt_b64, "salt")?;
    let kek = derive_kek(passphrase, &salt, &params)?;

    let wrapped_dek = BASE64
        .decode(&keyset.wrapped_dek_b64)
        .map_err(|e| format!("Invalid wrapped DEK encoding: {e}"))?;
    let nonce = decode_base64::<NONCE_LENGTH>(&keyset.nonce_b64, "nonce")?;

    let cipher = Aes256Gcm::new_from_slice(&kek)
        .map_err(|e| format!("Failed to initialize cipher: {e}"))?;
    let unwrapped = cipher
        .decrypt(Nonce::from_slice(&nonce), wrapped_dek.as_ref())
        .map_err(|_| "Invalid passphrase".to_string())?;

    if unwrapped.len() != KEY_LENGTH {
        return Err("Invalid unwrapped DEK length".to_string());
    }

    let mut dek = [0u8; KEY_LENGTH];
    dek.copy_from_slice(&unwrapped);
    Ok(dek)
}

fn encode_hex(bytes: &[u8]) -> String {
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        output.push_str(&format!("{byte:02x}"));
    }
    output
}

fn set_sqlcipher_session_key(dek: &[u8; KEY_LENGTH]) {
    std::env::set_var(SQLCIPHER_KEY_ENV_VAR, encode_hex(dek));
}

fn clear_sqlcipher_session_key() {
    std::env::remove_var(SQLCIPHER_KEY_ENV_VAR);
}

fn is_sqlcipher_key_set() -> bool {
    std::env::var(SQLCIPHER_KEY_ENV_VAR)
        .map(|v| !v.trim().is_empty())
        .unwrap_or(false)
}

fn ensure_sqlcipher_key_set() -> Result<(), String> {
    if is_sqlcipher_key_set() {
        return Ok(());
    }

    let dek = match read_open_dek()? {
        Some(dek) => dek,
        None => {
            let mut dek = [0u8; KEY_LENGTH];
            OsRng.fill_bytes(&mut dek);
            write_open_dek(&dek)?;
            dek
        }
    };
    set_sqlcipher_session_key(&dek);
    Ok(())
}

fn secure_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut app_config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to resolve app config directory: {e}"))?;
    fs::create_dir_all(&app_config_dir).map_err(|e| {
        format!(
            "Failed to create app config directory {}: {e}",
            app_config_dir.display()
        )
    })?;
    app_config_dir.push(SECURE_DB_FILE_NAME);
    Ok(app_config_dir)
}

fn append_path_suffix(path: &Path, suffix: &str) -> PathBuf {
    let mut output = path.as_os_str().to_os_string();
    output.push(suffix);
    PathBuf::from(output)
}

fn move_to_backup(path: &Path, backup_suffix: &str) -> Result<Option<PathBuf>, String> {
    if !path.exists() {
        return Ok(None);
    }

    let Some(file_name) = path.file_name().and_then(|name| name.to_str()) else {
        return Err(format!(
            "Unable to determine backup file name for path {}",
            path.display()
        ));
    };

    let backup_path = path.with_file_name(format!("{file_name}.backup-{backup_suffix}"));
    fs::rename(path, &backup_path).map_err(|e| {
        format!(
            "Failed to move {} to backup {}: {e}",
            path.display(),
            backup_path.display()
        )
    })?;
    Ok(Some(backup_path))
}

fn backup_and_reset_secure_database(app: &tauri::AppHandle) -> Result<Option<PathBuf>, String> {
    let db_path = secure_db_path(app)?;
    let backup_suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .to_string();

    let db_backup_path = move_to_backup(&db_path, &backup_suffix)?;
    let wal_path = append_path_suffix(&db_path, "-wal");
    let shm_path = append_path_suffix(&db_path, "-shm");
    let _ = move_to_backup(&wal_path, &backup_suffix)?;
    let _ = move_to_backup(&shm_path, &backup_suffix)?;

    Ok(db_backup_path)
}

fn set_runtime_configured(runtime: &State<'_, AppLockRuntimeState>, value: bool) -> Result<(), String> {
    let mut guard = runtime
        .configured_cache
        .lock()
        .map_err(|_| "Failed to acquire app lock state".to_string())?;
    *guard = Some(value);
    Ok(())
}

fn is_configured(runtime: &State<'_, AppLockRuntimeState>) -> Result<bool, String> {
    let guard = runtime
        .configured_cache
        .lock()
        .map_err(|_| "Failed to acquire app lock state".to_string())?;
    if let Some(cached) = *guard {
        return Ok(cached);
    }
    drop(guard);

    let result = read_keyset()?.is_some();

    let mut guard = runtime
        .configured_cache
        .lock()
        .map_err(|_| "Failed to acquire app lock state".to_string())?;
    *guard = Some(result);
    Ok(result)
}

fn set_runtime_unlocked(runtime: &State<'_, AppLockRuntimeState>, value: bool) -> Result<(), String> {
    let mut guard = runtime
        .unlocked
        .lock()
        .map_err(|_| "Failed to acquire app lock state".to_string())?;
    *guard = value;
    Ok(())
}

fn runtime_is_unlocked(runtime: &State<'_, AppLockRuntimeState>) -> Result<bool, String> {
    let guard = runtime
        .unlocked
        .lock()
        .map_err(|_| "Failed to acquire app lock state".to_string())?;
    Ok(*guard)
}

#[tauri::command]
pub fn app_lock_status(runtime: State<'_, AppLockRuntimeState>) -> Result<AppLockStatus, String> {
    let configured = is_configured(&runtime)?;
    if !configured {
        ensure_sqlcipher_key_set()?;
        set_runtime_unlocked(&runtime, true)?;
        return Ok(AppLockStatus {
            configured: false,
            unlocked: true,
        });
    }

    let unlocked = runtime_is_unlocked(&runtime)?;
    if !unlocked {
        clear_sqlcipher_session_key();
    }
    Ok(AppLockStatus {
        configured: true,
        unlocked,
    })
}

#[tauri::command]
pub async fn app_lock_configure(
    passphrase: String,
    runtime: State<'_, AppLockRuntimeState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    if read_keyset()?.is_some() {
        return Err("App lock is already configured. Unlock with your existing passphrase.".to_string());
    }

    let existing_dek = read_open_dek()?;

    if existing_dek.is_none() {
        backup_and_reset_secure_database(&app)?;
    }

    let pp = passphrase.clone();
    let (keyset, dek) = tauri::async_runtime::spawn_blocking(move || {
        let ks = build_keyset_from_passphrase(&pp, existing_dek)?;
        let dk = unwrap_dek(&ks, &pp)?;
        Ok::<_, String>((ks, dk))
    })
    .await
    .map_err(|e| format!("Configure task failed: {e}"))??;

    write_keyset(&keyset)?;
    let _ = delete_open_dek();
    set_sqlcipher_session_key(&dek);
    set_runtime_configured(&runtime, true)?;
    set_runtime_unlocked(&runtime, true)
}

#[tauri::command]
pub fn app_lock_backup_and_reset_secure_db(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let backup_path = backup_and_reset_secure_database(&app)?;
    Ok(backup_path.map(|path| path.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn app_lock_unlock(passphrase: String, runtime: State<'_, AppLockRuntimeState>) -> Result<bool, String> {
    let Some(keyset) = read_keyset()? else {
        clear_sqlcipher_session_key();
        set_runtime_unlocked(&runtime, false)?;
        return Err("App lock is configured but key material is unavailable.".to_string());
    };

    let result = tauri::async_runtime::spawn_blocking(move || {
        unwrap_dek(&keyset, &passphrase)
    })
    .await
    .map_err(|e| format!("Unlock task failed: {e}"))?;

    match result {
        Ok(dek) => {
            set_sqlcipher_session_key(&dek);
            set_runtime_unlocked(&runtime, true)?;
            Ok(true)
        }
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub fn app_lock_lock(runtime: State<'_, AppLockRuntimeState>) -> Result<(), String> {
    clear_sqlcipher_session_key();
    set_runtime_unlocked(&runtime, false)
}

fn delete_keyset() -> Result<(), String> {
    let _ = secure_storage::secure_storage_delete(APP_LOCK_KEYSET_STORAGE_KEY.to_string());

    if let Ok(path) = keyset_fallback_path() {
        if path.exists() {
            fs::remove_file(&path)
                .map_err(|e| format!("Failed to remove fallback keyset {}: {e}", path.display()))?;
        }
    }

    Ok(())
}

fn open_dek_fallback_path() -> Result<PathBuf, String> {
    let mut base = dirs::data_local_dir()
        .or_else(dirs::data_dir)
        .ok_or_else(|| "Unable to resolve app data directory for open DEK".to_string())?;
    base.push("journai");

    fs::create_dir_all(&base)
        .map_err(|e| format!("Failed to create open DEK directory {}: {e}", base.display()))?;

    base.push("app_lock_open_dek.txt");
    Ok(base)
}

fn write_open_dek(dek: &[u8; KEY_LENGTH]) -> Result<(), String> {
    let hex = encode_hex(dek);
    let path = open_dek_fallback_path()?;
    fs::write(&path, &hex)
        .map_err(|e| format!("Failed to write open DEK {}: {e}", path.display()))?;
    let _ = secure_storage::secure_storage_set(APP_LOCK_OPEN_DEK_STORAGE_KEY.to_string(), hex);
    Ok(())
}

fn decode_hex_key(hex: &str) -> Option<[u8; KEY_LENGTH]> {
    let trimmed = hex.trim();
    if trimmed.len() != KEY_LENGTH * 2 || !trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }

    let mut key = [0u8; KEY_LENGTH];
    for i in 0..KEY_LENGTH {
        key[i] = u8::from_str_radix(&trimmed[i * 2..i * 2 + 2], 16).ok()?;
    }
    Some(key)
}

fn read_open_dek() -> Result<Option<[u8; KEY_LENGTH]>, String> {
    let hex = match secure_storage::secure_storage_get(APP_LOCK_OPEN_DEK_STORAGE_KEY.to_string()) {
        Ok(Some(val)) => Some(val),
        _ => {
            let path = open_dek_fallback_path()?;
            if path.exists() {
                Some(
                    fs::read_to_string(&path)
                        .map_err(|e| format!("Failed to read open DEK {}: {e}", path.display()))?,
                )
            } else {
                None
            }
        }
    };

    match hex {
        Some(val) => Ok(decode_hex_key(&val)),
        None => Ok(None),
    }
}

fn delete_open_dek() -> Result<(), String> {
    let _ = secure_storage::secure_storage_delete(APP_LOCK_OPEN_DEK_STORAGE_KEY.to_string());

    if let Ok(path) = open_dek_fallback_path() {
        if path.exists() {
            fs::remove_file(&path)
                .map_err(|e| format!("Failed to remove open DEK {}: {e}", path.display()))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn app_lock_disable(
    passphrase: String,
    runtime: State<'_, AppLockRuntimeState>,
) -> Result<(), String> {
    let Some(keyset) = read_keyset()? else {
        return Ok(());
    };

    let dek = tauri::async_runtime::spawn_blocking(move || unwrap_dek(&keyset, &passphrase))
        .await
        .map_err(|e| format!("Disable task failed: {e}"))??;

    write_open_dek(&dek)?;
    delete_keyset()?;
    set_sqlcipher_session_key(&dek);
    set_runtime_configured(&runtime, false)?;
    set_runtime_unlocked(&runtime, true)
}

#[tauri::command]
pub async fn app_lock_change_passphrase(
    current_passphrase: String,
    new_passphrase: String,
    runtime: State<'_, AppLockRuntimeState>,
) -> Result<(), String> {
    let Some(existing_keyset) = read_keyset()? else {
        return Err("App lock is not enabled".to_string());
    };

    let (new_keyset, dek) = tauri::async_runtime::spawn_blocking(move || {
        let dk = unwrap_dek(&existing_keyset, &current_passphrase)?;
        let nk = build_keyset_from_passphrase(&new_passphrase, Some(dk))?;
        Ok::<_, String>((nk, dk))
    })
    .await
    .map_err(|e| format!("Change passphrase task failed: {e}"))??;

    set_sqlcipher_session_key(&dek);
    write_keyset(&new_keyset)?;
    set_runtime_unlocked(&runtime, true)
}
