// TODO: Verify keychain works in production build
// In development (unsigned app), macOS keychain silently fails to persist credentials.
// Once the app is code-signed for production, the keychain should work properly.
// Test by: 1) Build signed app, 2) Save API key, 3) Restart app, 4) Verify key persists

const SERVICE_NAME: &str = "com.journai.app";

#[cfg(not(any(target_os = "ios", target_os = "android")))]
mod desktop {
    use super::SERVICE_NAME;
    use keyring::Entry;

    pub fn set_secret(key: &str, value: &str) -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, key).map_err(|e| e.to_string())?;
        entry.set_password(value).map_err(|e| e.to_string())?;

        // Verify the write actually persisted (macOS unsigned apps silently fail)
        match entry.get_password() {
            Ok(stored) if stored == value => Ok(()),
            _ => Err("Keychain write verification failed - app may need code signing".to_string()),
        }
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

#[cfg(any(target_os = "ios", target_os = "android"))]
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

#[cfg(not(any(target_os = "ios", target_os = "android")))]
use desktop::{delete_secret, get_secret, set_secret};

#[cfg(any(target_os = "ios", target_os = "android"))]
use mobile::{delete_secret, get_secret, set_secret};

#[tauri::command]
pub fn secure_storage_set(key: String, value: String) -> Result<(), String> {
    set_secret(&key, &value)
}

#[tauri::command]
pub fn secure_storage_get(key: String) -> Result<Option<String>, String> {
    get_secret(&key)
}

#[tauri::command]
pub fn secure_storage_delete(key: String) -> Result<(), String> {
    delete_secret(&key)
}

#[tauri::command]
pub fn secure_storage_is_available() -> bool {
    #[cfg(not(any(target_os = "ios", target_os = "android")))]
    {
        use keyring::Entry;
        match Entry::new("com.journai.app.test", "availability_check") {
            Ok(entry) => {
                let _ = entry.set_password("test");
                let _ = entry.delete_credential();
                true
            }
            Err(_) => false,
        }
    }
    #[cfg(any(target_os = "ios", target_os = "android"))]
    {
        false
    }
}
