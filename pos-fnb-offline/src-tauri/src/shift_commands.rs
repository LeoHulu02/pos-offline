use sqlx::{SqlitePool, Row};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use tauri::{State, AppHandle, Manager};
use bcrypt::verify;

#[derive(Serialize, Deserialize)]
pub struct Shift {
    pub id: String,
    pub cashier_id: String,
    pub starting_cash: i64,
    pub expected_cash: Option<i64>,
    pub actual_cash: Option<i64>,
    pub variance_amount: Option<i64>,
    pub status: String,
    pub opened_at: String,
    pub closed_at: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct CashMovement {
    pub id: String,
    pub shift_id: String,
    pub movement_type: String, // 'cash_in' / 'cash_out'
    pub amount: i64,
    pub note: String,
    pub created_by: String,
    pub created_at: String,
}

#[derive(Deserialize)]
pub struct OpenShiftPayload {
    pub cashier_id: String,
    pub starting_cash: i64,
}

#[derive(Deserialize)]
pub struct RecordCashMovementPayload {
    pub shift_id: String,
    pub movement_type: String,
    pub amount: i64,
    pub note: String,
    pub created_by: String,
}

#[derive(Deserialize)]
pub struct CloseShiftPayload {
    pub shift_id: String,
    pub actual_cash: i64,
    pub admin_pin_override: Option<String>,
    pub override_reason: Option<String>,
    pub admin_username: Option<String>,
}

#[tauri::command]
pub async fn open_shift(payload: OpenShiftPayload, pool: State<'_, SqlitePool>) -> Result<String, String> {
    // Check if user already has an open shift
    let count: i64 = sqlx::query("SELECT COUNT(*) as count FROM shifts WHERE cashier_id = ? AND status = 'open'")
        .bind(&payload.cashier_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?
        .get("count");
        
    if count > 0 {
        return Err("Cashier already has an open shift".to_string());
    }

    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO shifts (id, cashier_id, starting_cash, status) VALUES (?, ?, ?, 'open')")
        .bind(&id)
        .bind(&payload.cashier_id)
        .bind(payload.starting_cash)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(id)
}

#[tauri::command]
pub async fn get_active_shift(cashier_id: String, pool: State<'_, SqlitePool>) -> Result<Option<Shift>, String> {
    let row = sqlx::query("SELECT id, cashier_id, starting_cash, expected_cash, actual_cash, variance_amount, status, opened_at, closed_at FROM shifts WHERE cashier_id = ? AND status = 'open' LIMIT 1")
        .bind(&cashier_id)
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    match row {
        Some(r) => Ok(Some(Shift {
            id: r.get("id"),
            cashier_id: r.get("cashier_id"),
            starting_cash: r.get("starting_cash"),
            expected_cash: r.get("expected_cash"),
            actual_cash: r.get("actual_cash"),
            variance_amount: r.get("variance_amount"),
            status: r.get("status"),
            opened_at: r.get::<chrono::NaiveDateTime, _>("opened_at").to_string(),
            closed_at: r.get::<Option<chrono::NaiveDateTime>, _>("closed_at").map(|d| d.to_string()),
        })),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn record_cash_movement(payload: RecordCashMovementPayload, pool: State<'_, SqlitePool>) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO cash_movements (id, shift_id, type, amount, note, created_by) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(&id)
        .bind(&payload.shift_id)
        .bind(&payload.movement_type)
        .bind(payload.amount)
        .bind(&payload.note)
        .bind(&payload.created_by)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(id)
}

#[tauri::command]
pub async fn close_shift(payload: CloseShiftPayload, pool: State<'_, SqlitePool>, app_handle: AppHandle) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Check unpaid orders
    let unpaid_count: i64 = sqlx::query("SELECT COUNT(*) as count FROM orders WHERE shift_id = ? AND status = 'unpaid'")
        .bind(&payload.shift_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .get("count");

    if unpaid_count > 0 {
        if payload.admin_pin_override.is_none() || payload.override_reason.is_none() || payload.admin_username.is_none() {
            return Err("Unpaid orders exist. Admin PIN and reason required to override.".to_string());
        }
        
        let admin_username = payload.admin_username.as_ref().unwrap();
        let pin = payload.admin_pin_override.as_ref().unwrap();
        
        // Verify admin
        let admin_row = sqlx::query("SELECT u.id, u.pin_hash FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username = ? AND r.name = 'admin' AND u.is_active = 1")
            .bind(admin_username)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
            
        let admin_record = match admin_row {
            Some(r) => r,
            None => return Err("Admin not found".to_string()),
        };
        
        let pin_hash: Option<String> = admin_record.get("pin_hash");
        if pin_hash.is_none() || !verify(pin, pin_hash.as_ref().unwrap()).unwrap_or(false) {
            return Err("Invalid Admin PIN".to_string());
        }
        
        // Audit log
        let audit_id = Uuid::new_v4().to_string();
        let admin_id: String = admin_record.get("id");
        sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, description) VALUES (?, ?, 'OVERRIDE_CLOSE_SHIFT', 'shift', ?, ?)")
            .bind(&audit_id)
            .bind(&admin_id)
            .bind(&payload.shift_id)
            .bind(payload.override_reason.as_ref().unwrap())
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    // Get shift starting cash
    let starting_cash: i64 = sqlx::query("SELECT starting_cash FROM shifts WHERE id = ?")
        .bind(&payload.shift_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .get("starting_cash");

    // Calculate cash in and out
    let cash_in: i64 = sqlx::query("SELECT COALESCE(SUM(amount), 0) as total FROM cash_movements WHERE shift_id = ? AND type = 'cash_in'")
        .bind(&payload.shift_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .get("total");
        
    let cash_out: i64 = sqlx::query("SELECT COALESCE(SUM(amount), 0) as total FROM cash_movements WHERE shift_id = ? AND type = 'cash_out'")
        .bind(&payload.shift_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .get("total");
        
    // Calculate cash payments
    let cash_payments: i64 = sqlx::query("SELECT COALESCE(SUM(amount), 0) as total FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.shift_id = ? AND o.status = 'paid' AND p.method = 'cash'")
        .bind(&payload.shift_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .get("total");

    let expected_cash = starting_cash + cash_payments + cash_in - cash_out;
    let variance = payload.actual_cash - expected_cash;

    sqlx::query("UPDATE shifts SET expected_cash = ?, actual_cash = ?, variance_amount = ?, status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(expected_cash)
        .bind(payload.actual_cash)
        .bind(variance)
        .bind(&payload.shift_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    
    // Auto-backup DB upon shift close
    if let Ok(app_dir) = app_handle.path().app_data_dir() {
        let backup_dir = app_dir.join("backups");
        let _ = std::fs::create_dir_all(&backup_dir);
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
        let backup_path = backup_dir.join(format!("auto_backup_{}.sqlite", timestamp));
        let q = format!("VACUUM INTO '{}'", backup_path.to_string_lossy().replace("'", "''"));
        let _ = sqlx::query(&q).execute(&*pool).await;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn get_shift_history(pool: State<'_, SqlitePool>) -> Result<Vec<Shift>, String> {
    let rows = sqlx::query("SELECT id, cashier_id, starting_cash, expected_cash, actual_cash, variance_amount, status, opened_at, closed_at FROM shifts ORDER BY opened_at DESC")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(rows.into_iter().map(|r| Shift {
        id: r.get("id"),
        cashier_id: r.get("cashier_id"),
        starting_cash: r.get("starting_cash"),
        expected_cash: r.get("expected_cash"),
        actual_cash: r.get("actual_cash"),
        variance_amount: r.get("variance_amount"),
        status: r.get("status"),
        opened_at: r.get::<chrono::NaiveDateTime, _>("opened_at").to_string(),
        closed_at: r.get::<Option<chrono::NaiveDateTime>, _>("closed_at").map(|d| d.to_string()),
    }).collect())
}

