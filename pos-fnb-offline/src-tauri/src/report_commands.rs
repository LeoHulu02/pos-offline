use sqlx::{SqlitePool, Row};
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub struct DailySales {
    pub date: String,
    pub total_revenue: i64,
    pub total_tax: i64,
    pub total_transactions: i64,
}

#[derive(Serialize)]
pub struct BestSeller {
    pub product_name: String,
    pub total_qty: i64,
    pub total_revenue: i64,
}

#[tauri::command]
pub async fn get_daily_sales(start_date: String, end_date: String, pool: State<'_, SqlitePool>) -> Result<Vec<DailySales>, String> {
    let q = "
        SELECT DATE(created_at) as date, 
               COALESCE(SUM(total_amount), 0) as total_revenue, 
               COALESCE(SUM(tax_amount), 0) as total_tax, 
               COUNT(id) as total_transactions 
        FROM orders 
        WHERE status = 'paid' 
          AND DATE(created_at) >= ? 
          AND DATE(created_at) <= ? 
        GROUP BY DATE(created_at) 
        ORDER BY date DESC
    ";
             
    let rows = sqlx::query(q)
        .bind(&start_date)
        .bind(&end_date)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(rows.into_iter().map(|r| DailySales {
        date: r.get::<Option<String>, _>("date").unwrap_or_default(),
        total_revenue: r.get("total_revenue"),
        total_tax: r.get("total_tax"),
        total_transactions: r.get("total_transactions"),
    }).collect())
}

#[tauri::command]
pub async fn get_best_sellers(start_date: String, end_date: String, pool: State<'_, SqlitePool>) -> Result<Vec<BestSeller>, String> {
    let q = "
        SELECT oi.product_name_snapshot as name, 
               COALESCE(SUM(oi.qty), 0) as total_qty, 
               COALESCE(SUM(oi.line_total), 0) as total_revenue 
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status = 'paid'
          AND DATE(o.created_at) >= ? 
          AND DATE(o.created_at) <= ?
        GROUP BY oi.product_id
        ORDER BY total_qty DESC
        LIMIT 10
    ";
             
    let rows = sqlx::query(q)
        .bind(&start_date)
        .bind(&end_date)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(rows.into_iter().map(|r| BestSeller {
        product_name: r.get("name"),
        total_qty: r.get("total_qty"),
        total_revenue: r.get("total_revenue"),
    }).collect())
}

#[derive(Serialize)]
pub struct PaymentBreakdown {
    pub method: String,
    pub total_amount: i64,
    pub transaction_count: i64,
}

#[tauri::command]
pub async fn get_payment_breakdown(start_date: String, end_date: String, pool: State<'_, SqlitePool>) -> Result<Vec<PaymentBreakdown>, String> {
    let q = "
        SELECT p.method,
               COALESCE(SUM(p.amount), 0) as total_amount,
               COUNT(p.id) as transaction_count
        FROM payments p
        JOIN orders o ON p.order_id = o.id
        WHERE o.status = 'paid'
          AND DATE(o.created_at) >= ?
          AND DATE(o.created_at) <= ?
        GROUP BY p.method
        ORDER BY total_amount DESC
    ";
    
    let rows = sqlx::query(q)
        .bind(&start_date)
        .bind(&end_date)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(rows.into_iter().map(|r| PaymentBreakdown {
        method: r.get("method"),
        total_amount: r.get("total_amount"),
        transaction_count: r.get("transaction_count"),
    }).collect())
}

#[derive(Serialize)]
pub struct VoidReport {
    pub order_number: String,
    pub total_amount: i64,
    pub void_reason: Option<String>,
    pub voided_by_name: Option<String>,
    pub created_at: String,
}

#[tauri::command]
pub async fn get_void_refund_report(start_date: String, end_date: String, pool: State<'_, SqlitePool>) -> Result<Vec<VoidReport>, String> {
    let q = "
        SELECT o.order_number, o.total_amount, o.void_reason, u.full_name as voided_by_name, o.created_at
        FROM orders o
        LEFT JOIN users u ON o.voided_by = u.id
        WHERE o.status = 'void'
          AND DATE(o.created_at) >= ?
          AND DATE(o.created_at) <= ?
        ORDER BY o.created_at DESC
    ";
    
    let rows = sqlx::query(q)
        .bind(&start_date)
        .bind(&end_date)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(rows.into_iter().map(|r| VoidReport {
        order_number: r.get("order_number"),
        total_amount: r.get("total_amount"),
        void_reason: r.get("void_reason"),
        voided_by_name: r.get("voided_by_name"),
        created_at: r.get::<chrono::NaiveDateTime, _>("created_at").to_string(),
    }).collect())
}

#[derive(Serialize)]
pub struct ShiftReport {
    pub shift_id: String,
    pub cashier_name: String,
    pub opened_at: String,
    pub closed_at: Option<String>,
    pub starting_cash: i64,
    pub actual_cash: Option<i64>,
    pub variance_amount: Option<i64>,
    pub cash_in: i64,
    pub cash_out: i64,
    pub cash_sales: i64,
    pub other_sales: i64,
}

#[tauri::command]
pub async fn get_shift_report(shift_id: String, pool: State<'_, SqlitePool>) -> Result<ShiftReport, String> {
    // Basic shift data
    let shift_row = sqlx::query("SELECT s.*, u.full_name FROM shifts s JOIN users u ON s.cashier_id = u.id WHERE s.id = ?")
        .bind(&shift_id)
        .fetch_optional(&*pool).await.map_err(|e| e.to_string())?
        .ok_or_else(|| "Shift not found".to_string())?;
        
    // Cash movements
    let mut cash_in = 0;
    let mut cash_out = 0;
    let cm_rows = sqlx::query("SELECT type, amount FROM cash_movements WHERE shift_id = ?")
        .bind(&shift_id)
        .fetch_all(&*pool).await.map_err(|e| e.to_string())?;
        
    for r in cm_rows {
        let t: String = r.get("type");
        let a: i64 = r.get("amount");
        if t == "cash_in" { cash_in += a; }
        else if t == "cash_out" { cash_out += a; }
    }
    
    // Payments grouped by cash vs other
    let mut cash_sales = 0;
    let mut other_sales = 0;
    let p_rows = sqlx::query("SELECT p.method, p.amount FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.shift_id = ? AND o.status = 'paid'")
        .bind(&shift_id)
        .fetch_all(&*pool).await.map_err(|e| e.to_string())?;
        
    for r in p_rows {
        let m: String = r.get("method");
        let a: i64 = r.get("amount");
        if m == "cash" { cash_sales += a; }
        else { other_sales += a; }
    }
    
    let closed_at: Option<chrono::NaiveDateTime> = shift_row.get("closed_at");
    
    Ok(ShiftReport {
        shift_id: shift_row.get("id"),
        cashier_name: shift_row.get("full_name"),
        opened_at: shift_row.get::<chrono::NaiveDateTime, _>("opened_at").to_string(),
        closed_at: closed_at.map(|d| d.to_string()),
        starting_cash: shift_row.get("starting_cash"),
        actual_cash: shift_row.get("actual_cash"),
        variance_amount: shift_row.get("variance_amount"),
        cash_in,
        cash_out,
        cash_sales,
        other_sales,
    })
}

#[derive(Serialize)]
pub struct DashboardStats {
    pub total_revenue: i64,
    pub total_transactions: i64,
    pub total_voids: i64,
    pub total_cash: i64,
    pub total_non_cash: i64,
}

#[tauri::command]
pub async fn get_dashboard_stats(pool: State<'_, SqlitePool>) -> Result<DashboardStats, String> {
    // Get general stats
    let q_stats = "
        SELECT 
            COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as total_revenue,
            COUNT(CASE WHEN status = 'paid' THEN 1 END) as total_transactions,
            COUNT(CASE WHEN status = 'void' THEN 1 END) as total_voids
        FROM orders
        WHERE DATE(created_at) = DATE('now', 'localtime')
    ";
    let stats_row = sqlx::query(q_stats)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    // Get cash vs non-cash sales
    let q_payments = "
        SELECT 
            COALESCE(SUM(CASE WHEN p.method = 'cash' THEN p.amount ELSE 0 END), 0) as total_cash,
            COALESCE(SUM(CASE WHEN p.method != 'cash' THEN p.amount ELSE 0 END), 0) as total_non_cash
        FROM payments p
        JOIN orders o ON p.order_id = o.id
        WHERE o.status = 'paid' AND DATE(o.created_at) = DATE('now', 'localtime')
    ";
    let payments_row = sqlx::query(q_payments)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(DashboardStats {
        total_revenue: stats_row.get("total_revenue"),
        total_transactions: stats_row.get("total_transactions"),
        total_voids: stats_row.get("total_voids"),
        total_cash: payments_row.get("total_cash"),
        total_non_cash: payments_row.get("total_non_cash"),
    })
}

#[derive(Serialize)]
pub struct RecentOrder {
    pub id: String,
    pub order_number: String,
    pub customer_name: Option<String>,
    pub total_amount: i64,
    pub status: String,
    pub created_at: String,
}

#[tauri::command]
pub async fn get_recent_orders(pool: State<'_, SqlitePool>) -> Result<Vec<RecentOrder>, String> {
    let q = "
        SELECT id, order_number, customer_name, total_amount, status, created_at
        FROM orders
        WHERE DATE(created_at) = DATE('now', 'localtime')
        ORDER BY created_at DESC
        LIMIT 5
    ";
    let rows = sqlx::query(q)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(rows.into_iter().map(|r| RecentOrder {
        id: r.get("id"),
        order_number: r.get("order_number"),
        customer_name: r.get("customer_name"),
        total_amount: r.get("total_amount"),
        status: r.get("status"),
        created_at: r.get::<chrono::NaiveDateTime, _>("created_at").to_string(),
    }).collect())
}

