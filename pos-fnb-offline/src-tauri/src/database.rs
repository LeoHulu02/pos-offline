use sqlx::{sqlite::{SqliteConnectOptions, SqliteJournalMode}, SqlitePool};
use std::str::FromStr;
use std::time::Duration;
use tauri::AppHandle;
use tauri::Manager;

pub const DB_FILENAME: &str = "pos.db";

pub async fn init_db(app: &AppHandle) -> Result<SqlitePool, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    
    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }
    
    let db_path = app_dir.join(DB_FILENAME);
    
    let options = SqliteConnectOptions::from_str(&format!("sqlite://{}", db_path.to_string_lossy()))
        .map_err(|e| e.to_string())?
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .busy_timeout(Duration::from_secs(5))
        .pragma("foreign_keys", "ON");

    let pool = SqlitePool::connect_with(options).await.map_err(|e| e.to_string())?;
    
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|e| format!("Migration failed: {}", e))?;
        
    Ok(pool)
}
