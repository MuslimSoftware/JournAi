const SERVICE_NAME: &str = "com.journai.app";
const AVAILABILITY_PROBE_KEY: &str = "__journai.secure_storage.availability_probe__";
const AVAILABILITY_PROBE_VALUE: &str = "probe";

#[cfg(not(target_os = "android"))]
mod desktop {
    use super::SERVICE_NAME;
    use keyring::Entry;

    pub fn set_secret(key: &str, value: &str) -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, key).map_err(|e| e.to_string())?;
        entry.set_password(value).map_err(|e| e.to_string())
    }

    pub fn get_secret(key: &str) -> Result<Option<String>, String> {
        let entry = Entry::new(SERVICE_NAME, key).map_err(|e| e.to_string())?;
        match entry.get_password() {
            Ok(password) => Ok(Some(password)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn delete_secret(key: &str) -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, key).map_err(|e| e.to_string())?;
        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }
}

#[cfg(target_os = "android")]
mod mobile {
    pub fn set_secret(_key: &str, _value: &str) -> Result<(), String> {
        Ok(())
    }

    pub fn get_secret(_key: &str) -> Result<Option<String>, String> {
        Ok(None)
    }

    pub fn delete_secret(_key: &str) -> Result<(), String> {
        Ok(())
    }
}

#[cfg(not(target_os = "android"))]
pub use desktop::{delete_secret, get_secret, set_secret};

#[cfg(target_os = "android")]
pub use mobile::{delete_secret, get_secret, set_secret};

#[tauri::command]
pub async fn secure_storage_set(key: String, value: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || set_secret(&key, &value))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn secure_storage_get(key: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || get_secret(&key))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn secure_storage_delete(key: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || delete_secret(&key))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn secure_storage_is_available() -> bool {
    tauri::async_runtime::spawn_blocking(|| {
        #[cfg(not(target_os = "android"))]
        {
            use keyring::Entry;

            let entry = match Entry::new(SERVICE_NAME, AVAILABILITY_PROBE_KEY) {
                Ok(entry) => entry,
                Err(_) => return false,
            };

            match entry.get_password() {
                Ok(stored) if stored == AVAILABILITY_PROBE_VALUE => return true,
                Err(keyring::Error::NoEntry) => {}
                Ok(_) => {}
                Err(_) => return false,
            }

            if entry.set_password(AVAILABILITY_PROBE_VALUE).is_err() {
                return false;
            }

            let verify = match Entry::new(SERVICE_NAME, AVAILABILITY_PROBE_KEY) {
                Ok(e) => e,
                Err(_) => return false,
            };
            matches!(verify.get_password(), Ok(v) if v == AVAILABILITY_PROBE_VALUE)
        }
        #[cfg(target_os = "android")]
        {
            false
        }
    })
    .await
    .unwrap_or(false)
}
