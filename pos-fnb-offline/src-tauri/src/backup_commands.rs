use sqlx::SqlitePool;
use tauri::{AppHandle, Manager, State};
use std::fs;
use crate::database::DB_FILENAME;
use crate::session::AppState;

#[tauri::command]
pub async fn create_backup(destination_path: String, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    // VACUUM INTO safely creates a consistent copy of the database
    let q = format!("VACUUM INTO '{}'", destination_path.replace("'", "''"));
    
    sqlx::query(&q)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(())
}

#[tauri::command]
pub async fn restore_backup(source_path: String, pool: State<'_, SqlitePool>, app_handle: AppHandle, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    // 1. Close the database pool so the file is unlocked
    pool.close().await;
    
    // 2. Get the current DB path
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join(DB_FILENAME);
    
    // 3. Delete WAL and SHM files to prevent corruption since we are replacing the main db file
    let wal_path = app_dir.join(format!("{}-wal", DB_FILENAME));
    let shm_path = app_dir.join(format!("{}-shm", DB_FILENAME));
    let _ = fs::remove_file(wal_path);
    let _ = fs::remove_file(shm_path);
    
    // 4. Overwrite the database file with the backup
    fs::copy(&source_path, &db_path).map_err(|e| format!("Failed to copy database: {}", e))?;
    
    // 5. Exit the application to force a fresh restart
    app_handle.restart();
}
