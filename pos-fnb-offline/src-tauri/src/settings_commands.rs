use sqlx::{SqlitePool, Row};
use serde::{Deserialize, Serialize};
use tauri::State;
use std::collections::HashMap;
use crate::session::AppState;

#[derive(Serialize, Deserialize)]
pub struct AppSetting {
    pub key: String,
    pub value: String,
}

#[derive(Deserialize)]
pub struct UpdateSettingPayload {
    pub key: String,
    pub value: String,
}

#[tauri::command]
pub async fn get_setting(key: String, pool: State<'_, SqlitePool>) -> Result<Option<String>, String> {
    let row = sqlx::query("SELECT value FROM app_settings WHERE key = ?")
        .bind(&key)
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    match row {
        Some(r) => Ok(Some(r.get("value"))),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn get_all_settings(pool: State<'_, SqlitePool>) -> Result<HashMap<String, String>, String> {
    let rows = sqlx::query("SELECT key, value FROM app_settings")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut settings = HashMap::new();
    for row in rows {
        settings.insert(row.get("key"), row.get("value"));
    }
    
    Ok(settings)
}

#[tauri::command]
pub async fn update_setting(payload: UpdateSettingPayload, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    sqlx::query("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP")
        .bind(&payload.key)
        .bind(&payload.value)
        .bind(&payload.value)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(())
}

#[tauri::command]
pub async fn update_multiple_settings(settings: HashMap<String, String>, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    
    for (key, value) in settings {
        sqlx::query("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP")
            .bind(&key)
            .bind(&value)
            .bind(&value)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }
    
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
pub struct BusinessSettings {
    pub id: String,
    pub business_name: String,
    pub address: String,
    pub phone: String,
    pub business_type: String,
    pub currency: String,
    pub default_tax_rate_bp: i64,
    pub default_service_charge_rate_bp: i64,
}

#[tauri::command]
pub async fn get_business_settings(pool: State<'_, SqlitePool>) -> Result<Option<BusinessSettings>, String> {
    let row = sqlx::query("SELECT id, business_name, address, phone, business_type, currency, default_tax_rate_bp, default_service_charge_rate_bp FROM business_settings LIMIT 1")
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    match row {
        Some(r) => Ok(Some(BusinessSettings {
            id: r.get("id"),
            business_name: r.get("business_name"),
            address: r.get("address"),
            phone: r.get("phone"),
            business_type: r.get("business_type"),
            currency: r.get("currency"),
            default_tax_rate_bp: r.get("default_tax_rate_bp"),
            default_service_charge_rate_bp: r.get("default_service_charge_rate_bp"),
        })),
        None => Ok(None),
    }
}
