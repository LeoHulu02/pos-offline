use std::sync::Mutex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub user_id: String,
    pub username: String,
    pub full_name: String,
    pub role: String,
}

pub struct AppState {
    pub session: Mutex<Option<Session>>,
}

impl AppState {
    /// Safe lock — returns Err(String) instead of panicking
    pub fn get_session(&self) -> Result<Option<Session>, String> {
        self.session
            .lock()
            .map(|guard| guard.clone())
            .map_err(|_| "Session lock poisoned".to_string())
    }

    /// Set session safely
    pub fn set_session(&self, session: Option<Session>) -> Result<(), String> {
        let mut guard = self.session
            .lock()
            .map_err(|_| "Session lock poisoned".to_string())?;
        *guard = session;
        Ok(())
    }

    /// Require active session — returns Err if not logged in
    pub fn require_session(&self) -> Result<Session, String> {
        self.get_session()?
            .ok_or_else(|| "Sesi tidak aktif. Silakan login kembali.".to_string())
    }

    /// Require admin role — returns Err if not admin
    pub fn require_admin(&self) -> Result<Session, String> {
        let session = self.require_session()?;
        if session.role != "role-admin" {
            return Err("Akses ditolak. Hanya admin yang diizinkan.".to_string());
        }
        Ok(session)
    }
}
