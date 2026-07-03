use sqlx::{SqlitePool, Row};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use tauri::State;
use chrono::Utc;
use crate::session::AppState;

#[derive(Serialize, Deserialize)]
pub struct OrderModifierPayload {
    pub modifier_id: String,
    pub price_delta: i64,
}

#[derive(Deserialize)]
pub struct OrderItemPayload {
    pub product_id: String,
    pub product_name: String,
    pub variant_id: Option<String>,
    pub variant_name: Option<String>,
    pub qty: i64,
    pub base_price: i64,
    pub modifiers: Vec<OrderModifierPayload>,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateOrderPayload {
    pub order_type: String,
    pub customer_name: Option<String>,
    pub queue_number: Option<String>,
    pub total_amount: i64,
    pub tax_amount: i64,
    pub service_amount: i64,
    pub discount_amount: i64,
    pub tax_rate_bp: i64,
    pub service_rate_bp: i64,
    pub shift_id: String,
    pub created_by: String,
    pub items: Vec<OrderItemPayload>,
}

#[derive(Deserialize)]
pub struct ProcessPaymentPayload {
    pub order_id: String,
    pub amount: i64,
    pub method: String,
}

#[derive(Deserialize)]
pub struct VoidOrderPayload {
    pub order_id: String,
    pub admin_pin: String,
    pub reason: String,
    pub user_id: String,
}

#[derive(Serialize)]
pub struct OrderSummary {
    pub id: String,
    pub receipt_number: String,
    pub customer_name: Option<String>,
    pub status: String,
    pub total_amount: i64,
    pub created_at: String,
}

#[tauri::command]
pub async fn create_order(payload: CreateOrderPayload, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<String, String> {
    app_state.require_session()?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    
    let order_id = Uuid::new_v4().to_string();
    
    // Generate a simple receipt number (e.g., REC-YYMMDD-XXXX)
    let date_str = Utc::now().format("%y%m%d").to_string();
    let short_uuid = &order_id[..4].to_uppercase();
    let order_number = format!("REC-{}-{}", date_str, short_uuid);
    
    // orders: id, order_number, shift_id, cashier_id, order_type, customer_note, table_note, subtotal, discount_amount, tax_rate_bp, tax_amount, service_charge_rate_bp, service_charge_amount, total_amount, status
    let subtotal = payload.total_amount - payload.tax_amount - payload.service_amount + payload.discount_amount; // derived subtotal before discount
    
    sqlx::query("INSERT INTO orders (id, order_number, shift_id, cashier_id, order_type, customer_note, table_note, subtotal, discount_amount, tax_rate_bp, tax_amount, service_charge_rate_bp, service_charge_amount, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid')")
        .bind(&order_id)
        .bind(&order_number)
        .bind(&payload.shift_id)
        .bind(&payload.created_by)
        .bind(&payload.order_type)
        .bind(&payload.customer_name)
        .bind(&payload.queue_number)
        .bind(subtotal)
        .bind(payload.discount_amount)
        .bind(payload.tax_rate_bp)
        .bind(payload.tax_amount)
        .bind(payload.service_rate_bp)
        .bind(payload.service_amount)
        .bind(payload.total_amount)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    for item in payload.items {
        let item_id = Uuid::new_v4().to_string();
        
        let modifier_total: i64 = item.modifiers.iter().map(|m| m.price_delta).sum();
        let unit_price = item.base_price;
        let line_total = (unit_price + modifier_total) * item.qty;
        
        sqlx::query("INSERT INTO order_items (id, order_id, product_id, product_variant_id, product_name_snapshot, variant_name_snapshot, qty, unit_price, modifier_total, note, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&item_id)
            .bind(&order_id)
            .bind(&item.product_id)
            .bind(&item.variant_id)
            .bind(&item.product_name)
            .bind(&item.variant_name)
            .bind(item.qty)
            .bind(unit_price)
            .bind(modifier_total)
            .bind(&item.notes)
            .bind(line_total)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        for modifier in item.modifiers {
            let mod_id = Uuid::new_v4().to_string();
            // get modifier name
            let mod_name_row = sqlx::query("SELECT name FROM modifiers WHERE id = ?")
                .bind(&modifier.modifier_id)
                .fetch_optional(&mut *tx).await.map_err(|e| e.to_string())?;
            let mod_name = mod_name_row.map(|r| r.get::<String, _>("name")).unwrap_or_else(|| "Unknown".to_string());
            
            sqlx::query("INSERT INTO order_item_modifiers (id, order_item_id, modifier_id, modifier_name_snapshot, price_delta_snapshot) VALUES (?, ?, ?, ?, ?)")
                .bind(&mod_id)
                .bind(&item_id)
                .bind(&modifier.modifier_id)
                .bind(mod_name)
                .bind(modifier.price_delta)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    
    Ok(order_id)
}

#[tauri::command]
pub async fn process_payment(payload: ProcessPaymentPayload, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_session()?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    
    let payment_id = Uuid::new_v4().to_string();
    
    sqlx::query("INSERT INTO payments (id, order_id, amount, method) VALUES (?, ?, ?, ?)")
        .bind(&payment_id)
        .bind(&payload.order_id)
        .bind(payload.amount)
        .bind(&payload.method)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        
    sqlx::query("UPDATE orders SET status = 'paid' WHERE id = ?")
        .bind(&payload.order_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_orders_by_shift(shift_id: String, pool: State<'_, SqlitePool>) -> Result<Vec<OrderSummary>, String> {
    let rows = sqlx::query("SELECT id, order_number, customer_note, status, total_amount, created_at FROM orders WHERE shift_id = ? ORDER BY created_at DESC")
        .bind(&shift_id)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(rows.into_iter().map(|r| OrderSummary {
        id: r.get("id"),
        receipt_number: r.get("order_number"),
        customer_name: r.get("customer_note"),
        status: r.get("status"),
        total_amount: r.get("total_amount"),
        created_at: r.get::<chrono::NaiveDateTime, _>("created_at").to_string(),
    }).collect())
}

#[tauri::command]
pub async fn void_order(payload: VoidOrderPayload, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    
    // Verify admin pin
    let admin_row = sqlx::query("SELECT pin_hash FROM users WHERE role_id = 'role-admin' AND pin_hash IS NOT NULL LIMIT 1")
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        
    let admin_row = admin_row.ok_or_else(|| "Admin tidak ditemukan atau PIN belum disetel".to_string())?;
    let pin_hash: String = admin_row.get("pin_hash");
    
    let valid = bcrypt::verify(&payload.admin_pin, &pin_hash).unwrap_or(false);
    if !valid {
        return Err("PIN Admin salah".to_string());
    }
    
    // Update order status
    let rows_affected = sqlx::query("UPDATE orders SET status = 'void', void_reason = ?, voided_by = ? WHERE id = ? AND status != 'void'")
        .bind(&payload.reason)
        .bind(&payload.user_id)
        .bind(&payload.order_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .rows_affected();
        
    if rows_affected == 0 {
        return Err("Order tidak ditemukan atau sudah dibatalkan".to_string());
    }
    
    // Log action
    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, description) VALUES (?, ?, 'void_order', 'order', ?, ?)")
        .bind(&log_id)
        .bind(&payload.user_id)
        .bind(&payload.order_id)
        .bind(format!("Order voided with reason: {}", payload.reason))
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        
    tx.commit().await.map_err(|e| e.to_string())?;
    
    Ok(())
}
