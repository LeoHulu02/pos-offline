use sqlx::{SqlitePool, Row};
use serde::Deserialize;
use bcrypt::{hash, DEFAULT_COST};
use uuid::Uuid;

#[tauri::command]
pub async fn check_initial_setup(pool: tauri::State<'_, SqlitePool>) -> Result<bool, String> {
    let result = sqlx::query("SELECT COUNT(*) as count FROM business_settings")
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        
    let count: i64 = result.get("count");
    Ok(count > 0)
}

#[derive(Deserialize)]
pub struct InitialSetupPayload {
    pub business_name: String,
    pub address: String,
    pub phone: String,
    pub business_type: String,
    pub currency: String,
    pub default_tax_rate_bp: i64,
    pub default_service_charge_rate_bp: i64,
    pub admin_fullname: String,
    pub admin_username: String,
    pub admin_password: String,
    pub admin_pin: String,
}

#[tauri::command]
pub async fn create_initial_setup(
    payload: InitialSetupPayload,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let check = check_initial_setup(pool.clone()).await?;
    if check {
        return Err("Initial setup already completed".to_string());
    }

    let password_hash = hash(&payload.admin_password, DEFAULT_COST).map_err(|e| e.to_string())?;
    let pin_hash = hash(&payload.admin_pin, DEFAULT_COST).map_err(|e| e.to_string())?;
    
    let business_id = Uuid::new_v4().to_string();
    let admin_id = Uuid::new_v4().to_string();

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT INTO business_settings (id, business_name, address, phone, business_type, currency, default_tax_rate_bp, default_service_charge_rate_bp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&business_id)
    .bind(&payload.business_name)
    .bind(&payload.address)
    .bind(&payload.phone)
    .bind(&payload.business_type)
    .bind(&payload.currency)
    .bind(payload.default_tax_rate_bp)
    .bind(payload.default_service_charge_rate_bp)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT INTO users (id, full_name, username, password_hash, pin_hash, role_id) VALUES (?, ?, ?, ?, ?, 'role-admin')"
    )
    .bind(&admin_id)
    .bind(&payload.admin_fullname)
    .bind(&payload.admin_username)
    .bind(&password_hash)
    .bind(&pin_hash)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn seed_dummy_data(pool: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    
    // Check if kasir exists
    let count: i64 = sqlx::query("SELECT COUNT(*) as count FROM users WHERE username = 'kasir1'")
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .get("count");
        
    if count > 0 {
        return Err("Dummy data sudah pernah di-seed".to_string());
    }
    
    // Hash passwords
    let pw_hash = hash("kasir123", DEFAULT_COST).unwrap();
    let pin_hash = hash("123456", DEFAULT_COST).unwrap();
    
    // 1. Seed Kasir User
    let kasir1_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO users (id, full_name, username, password_hash, pin_hash, role_id) VALUES (?, 'Kasir Dummy', 'kasir1', ?, ?, 'role-cashier')")
        .bind(&kasir1_id)
        .bind(&pw_hash)
        .bind(&pin_hash)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        
    // 2. Seed Categories
    let cat_makanan = Uuid::new_v4().to_string();
    let cat_minuman = Uuid::new_v4().to_string();
    
    sqlx::query("INSERT INTO categories (id, name, sort_order) VALUES (?, 'Makanan', 1), (?, 'Minuman', 2)")
        .bind(&cat_makanan)
        .bind(&cat_minuman)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        
    // 3. Seed Products
    let prod_ng = Uuid::new_v4().to_string();
    let prod_esteh = Uuid::new_v4().to_string();
    
    sqlx::query("INSERT INTO products (id, category_id, name, base_price, description) VALUES (?, ?, 'Nasi Goreng Spesial', 25000, 'Nasi goreng dengan telur, ayam, dan sosis')")
        .bind(&prod_ng)
        .bind(&cat_makanan)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        
    sqlx::query("INSERT INTO products (id, category_id, name, base_price, description) VALUES (?, ?, 'Es Teh Manis', 5000, 'Es teh manis segar')")
        .bind(&prod_esteh)
        .bind(&cat_minuman)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        
    // 4. Seed Modifiers for Nasi Goreng
    let mod_grp = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO modifier_groups (id, product_id, name, min_select, max_select, is_required) VALUES (?, ?, 'Level Pedas', 1, 1, 1)")
        .bind(&mod_grp)
        .bind(&prod_ng)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        
    let mod1 = Uuid::new_v4().to_string();
    let mod2 = Uuid::new_v4().to_string();
    let mod3 = Uuid::new_v4().to_string();
    
    sqlx::query("INSERT INTO modifiers (id, modifier_group_id, name, price_delta) VALUES (?, ?, 'Tidak Pedas', 0), (?, ?, 'Sedang', 0), (?, ?, 'Sangat Pedas', 2000)")
        .bind(&mod1).bind(&mod_grp)
        .bind(&mod2).bind(&mod_grp)
        .bind(&mod3).bind(&mod_grp)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        
    tx.commit().await.map_err(|e| e.to_string())?;
    
    Ok(())
}
