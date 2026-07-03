use sqlx::{SqlitePool, Row};
use serde::{Deserialize, Serialize};
use bcrypt::{verify, hash, DEFAULT_COST};
use tauri::State;
use uuid::Uuid;
use crate::session::{AppState, Session};

#[derive(Deserialize)]
pub struct LoginPayloadInput {
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct UserInfo {
    pub id: String,
    pub full_name: String,
    pub username: String,
    pub role: String,
}

#[tauri::command]
pub async fn login(
    payload: LoginPayloadInput,
    pool: State<'_, SqlitePool>,
    app_state: State<'_, AppState>,
) -> Result<UserInfo, String> {
    let result = sqlx::query(
        r#"
        SELECT u.id, u.full_name, u.username, u.password_hash, u.role_id as role_name 
        FROM users u
        WHERE u.username = ? AND u.is_active = 1
        "#
    )
    .bind(&payload.username)
    .fetch_optional(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let record = match result {
        Some(r) => r,
        None => return Err("Invalid username or password".to_string()),
    };

    let password_hash: String = record.get("password_hash");
    let valid = verify(&payload.password, &password_hash).unwrap_or(false);
    if !valid {
        return Err("Invalid username or password".to_string());
    }

    let session = Session {
        user_id: record.get("id"),
        username: record.get("username"),
        full_name: record.get("full_name"),
        role: record.get("role_name"),
    };

    app_state.set_session(Some(session.clone()))?;

    Ok(UserInfo {
        id: session.user_id.clone(),
        full_name: session.full_name.clone(),
        username: session.username.clone(),
        role: session.role.clone(),
    })
}

#[tauri::command]
pub fn logout(app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.set_session(None)?;
    Ok(())
}

#[tauri::command]
pub fn get_current_user(app_state: State<'_, AppState>) -> Result<Option<UserInfo>, String> {
    let session = app_state.get_session()?;
    match session {
        Some(s) => Ok(Some(UserInfo {
            id: s.user_id,
            full_name: s.full_name,
            username: s.username,
            role: s.role,
        })),
        None => Ok(None),
    }
}

#[derive(Serialize)]
pub struct UserSummary {
    pub id: String,
    pub full_name: String,
    pub username: String,
    pub role_id: String,
    pub is_active: bool,
}

#[tauri::command]
pub async fn get_all_users(pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<Vec<UserSummary>, String> {
    app_state.require_admin()?;
    let rows = sqlx::query("SELECT id, full_name, username, role_id, is_active FROM users ORDER BY full_name")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(rows.into_iter().map(|r| UserSummary {
        id: r.get("id"),
        full_name: r.get("full_name"),
        username: r.get("username"),
        role_id: r.get("role_id"),
        is_active: r.get("is_active"),
    }).collect())
}

#[derive(Deserialize)]
pub struct CreateUserPayload {
    pub full_name: String,
    pub username: String,
    pub password: Option<String>,
    pub pin: Option<String>,
    pub role_id: String,
}

#[tauri::command]
pub async fn admin_create_user(payload: CreateUserPayload, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    let password = payload.password.ok_or_else(|| "Password is required".to_string())?;
    let pin = payload.pin.ok_or_else(|| "PIN is required".to_string())?;
    
    if password.is_empty() || pin.is_empty() {
        return Err("Password dan PIN tidak boleh kosong".to_string());
    }

    let password_hash = hash(&password, DEFAULT_COST).map_err(|e| e.to_string())?;
    let pin_hash = hash(&pin, DEFAULT_COST).map_err(|e| e.to_string())?;
    let user_id = Uuid::new_v4().to_string();

    sqlx::query("INSERT INTO users (id, full_name, username, password_hash, pin_hash, role_id, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)")
        .bind(&user_id)
        .bind(&payload.full_name)
        .bind(&payload.username)
        .bind(&password_hash)
        .bind(&pin_hash)
        .bind(&payload.role_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Deserialize)]
pub struct UpdateUserPayload {
    pub id: String,
    pub full_name: String,
    pub username: String,
    pub password: Option<String>,
    pub pin: Option<String>,
    pub role_id: String,
}

#[tauri::command]
pub async fn admin_update_user(payload: UpdateUserPayload, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("UPDATE users SET full_name = ?, username = ?, role_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&payload.full_name)
        .bind(&payload.username)
        .bind(&payload.role_id)
        .bind(&payload.id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(password) = payload.password {
        if !password.is_empty() {
            let password_hash = hash(&password, DEFAULT_COST).map_err(|e| e.to_string())?;
            sqlx::query("UPDATE users SET password_hash = ? WHERE id = ?")
                .bind(&password_hash)
                .bind(&payload.id)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    if let Some(pin) = payload.pin {
        if !pin.is_empty() {
            let pin_hash = hash(&pin, DEFAULT_COST).map_err(|e| e.to_string())?;
            sqlx::query("UPDATE users SET pin_hash = ? WHERE id = ?")
                .bind(&pin_hash)
                .bind(&payload.id)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn admin_toggle_user_status(user_id: String, is_active: bool, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    sqlx::query("UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(is_active)
        .bind(&user_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

