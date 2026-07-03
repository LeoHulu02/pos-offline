use sqlx::{SqlitePool, Row};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use tauri::State;
use crate::session::AppState;

// ======================== CATEGORY ========================

#[derive(Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub sort_order: i64,
    pub is_active: bool,
}

#[derive(Deserialize)]
pub struct CreateCategoryPayload {
    pub name: String,
    pub sort_order: i64,
}

#[derive(Deserialize)]
pub struct UpdateCategoryPayload {
    pub id: String,
    pub name: String,
    pub sort_order: i64,
    pub is_active: bool,
}

#[tauri::command]
pub async fn create_category(payload: CreateCategoryPayload, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<String, String> {
    app_state.require_admin()?;
    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)")
        .bind(&id)
        .bind(&payload.name)
        .bind(payload.sort_order)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub async fn update_category(payload: UpdateCategoryPayload, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    sqlx::query("UPDATE categories SET name = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&payload.name)
        .bind(payload.sort_order)
        .bind(payload.is_active)
        .bind(&payload.id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_category(category_id: String, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    sqlx::query("UPDATE categories SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&category_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_categories_for_admin(pool: State<'_, SqlitePool>) -> Result<Vec<Category>, String> {
    let rows = sqlx::query("SELECT id, name, sort_order, is_active FROM categories ORDER BY sort_order")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(rows.into_iter().map(|r| Category {
        id: r.get("id"),
        name: r.get("name"),
        sort_order: r.get("sort_order"),
        is_active: r.get("is_active"),
    }).collect())
}

#[tauri::command]
pub async fn get_categories_for_cashier(pool: State<'_, SqlitePool>) -> Result<Vec<Category>, String> {
    let rows = sqlx::query("SELECT id, name, sort_order, is_active FROM categories WHERE is_active = 1 ORDER BY sort_order")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(rows.into_iter().map(|r| Category {
        id: r.get("id"),
        name: r.get("name"),
        sort_order: r.get("sort_order"),
        is_active: r.get("is_active"),
    }).collect())
}

// ======================== PRODUCT ========================

#[derive(Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub category_id: String,
    pub category_name: String,
    pub name: String,
    pub base_price: i64,
    pub description: Option<String>,
    pub image_path: Option<String>,
    pub is_active: bool,
}

#[derive(Deserialize)]
pub struct CreateProductPayload {
    pub category_id: String,
    pub name: String,
    pub base_price: i64,
    pub description: Option<String>,
    pub image_path: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateProductPayload {
    pub id: String,
    pub category_id: String,
    pub name: String,
    pub base_price: i64,
    pub description: Option<String>,
    pub image_path: Option<String>,
    pub is_active: bool,
}

#[tauri::command]
pub async fn create_product(payload: CreateProductPayload, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<String, String> {
    app_state.require_admin()?;
    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO products (id, category_id, name, base_price, description, image_path) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(&id)
        .bind(&payload.category_id)
        .bind(&payload.name)
        .bind(payload.base_price)
        .bind(&payload.description)
        .bind(&payload.image_path)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub async fn update_product(payload: UpdateProductPayload, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    sqlx::query("UPDATE products SET category_id = ?, name = ?, base_price = ?, description = ?, image_path = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&payload.category_id)
        .bind(&payload.name)
        .bind(payload.base_price)
        .bind(&payload.description)
        .bind(&payload.image_path)
        .bind(payload.is_active)
        .bind(&payload.id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_product(product_id: String, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    sqlx::query("UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&product_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_products_for_admin(pool: State<'_, SqlitePool>) -> Result<Vec<Product>, String> {
    let q = "SELECT p.id, p.category_id, c.name as category_name, p.name, p.base_price, p.description, p.image_path, p.is_active FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.name";
    let rows = sqlx::query(q).fetch_all(&*pool).await.map_err(|e| e.to_string())?;
    
    Ok(rows.into_iter().map(|r| Product {
        id: r.get("id"),
        category_id: r.get("category_id"),
        category_name: r.get("category_name"),
        name: r.get("name"),
        base_price: r.get("base_price"),
        description: r.get("description"),
        image_path: r.get("image_path"),
        is_active: r.get("is_active"),
    }).collect())
}

#[tauri::command]
pub async fn get_products_for_cashier(pool: State<'_, SqlitePool>) -> Result<Vec<Product>, String> {
    let q = "SELECT p.id, p.category_id, c.name as category_name, p.name, p.base_price, p.description, p.image_path, p.is_active FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1 ORDER BY p.name";
    let rows = sqlx::query(q).fetch_all(&*pool).await.map_err(|e| e.to_string())?;
    
    Ok(rows.into_iter().map(|r| Product {
        id: r.get("id"),
        category_id: r.get("category_id"),
        category_name: r.get("category_name"),
        name: r.get("name"),
        base_price: r.get("base_price"),
        description: r.get("description"),
        image_path: r.get("image_path"),
        is_active: r.get("is_active"),
    }).collect())
}

// ======================== VARIANT ========================

#[derive(Serialize, Deserialize)]
pub struct ProductVariant {
    pub id: String,
    pub product_id: String,
    pub name: String,
    pub price: i64,
    pub is_default: bool,
    pub is_active: bool,
}

#[derive(Deserialize)]
pub struct CreateVariantPayload {
    pub product_id: String,
    pub name: String,
    pub price: i64,
    pub is_default: bool,
}

#[derive(Deserialize)]
pub struct UpdateVariantPayload {
    pub id: String,
    pub name: String,
    pub price: i64,
    pub is_default: bool,
    pub is_active: bool,
}

#[tauri::command]
pub async fn create_variant(payload: CreateVariantPayload, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<String, String> {
    app_state.require_admin()?;
    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO product_variants (id, product_id, name, price, is_default) VALUES (?, ?, ?, ?, ?)")
        .bind(&id)
        .bind(&payload.product_id)
        .bind(&payload.name)
        .bind(payload.price)
        .bind(payload.is_default)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub async fn update_variant(payload: UpdateVariantPayload, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    sqlx::query("UPDATE product_variants SET name = ?, price = ?, is_default = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&payload.name)
        .bind(payload.price)
        .bind(payload.is_default)
        .bind(payload.is_active)
        .bind(&payload.id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_variant(variant_id: String, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    sqlx::query("UPDATE product_variants SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&variant_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_variants_by_product(product_id: String, pool: State<'_, SqlitePool>) -> Result<Vec<ProductVariant>, String> {
    let rows = sqlx::query("SELECT id, product_id, name, price, is_default, is_active FROM product_variants WHERE product_id = ? ORDER BY name")
        .bind(&product_id)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(rows.into_iter().map(|r| ProductVariant {
        id: r.get("id"),
        product_id: r.get("product_id"),
        name: r.get("name"),
        price: r.get("price"),
        is_default: r.get("is_default"),
        is_active: r.get("is_active"),
    }).collect())
}

// ======================== MODIFIER GROUP ========================

#[derive(Serialize, Deserialize)]
pub struct ModifierGroup {
    pub id: String,
    pub product_id: Option<String>,
    pub name: String,
    pub min_select: i64,
    pub max_select: Option<i64>,
    pub is_required: bool,
    pub is_active: bool,
}

#[derive(Deserialize)]
pub struct CreateModifierGroupPayload {
    pub product_id: Option<String>,
    pub name: String,
    pub min_select: i64,
    pub max_select: Option<i64>,
    pub is_required: bool,
}

#[derive(Deserialize)]
pub struct UpdateModifierGroupPayload {
    pub id: String,
    pub name: String,
    pub min_select: i64,
    pub max_select: Option<i64>,
    pub is_required: bool,
    pub is_active: bool,
}

#[tauri::command]
pub async fn create_modifier_group(payload: CreateModifierGroupPayload, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<String, String> {
    app_state.require_admin()?;
    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO modifier_groups (id, product_id, name, min_select, max_select, is_required) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(&id)
        .bind(&payload.product_id)
        .bind(&payload.name)
        .bind(payload.min_select)
        .bind(payload.max_select)
        .bind(payload.is_required)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub async fn update_modifier_group(payload: UpdateModifierGroupPayload, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    sqlx::query("UPDATE modifier_groups SET name = ?, min_select = ?, max_select = ?, is_required = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&payload.name)
        .bind(payload.min_select)
        .bind(payload.max_select)
        .bind(payload.is_required)
        .bind(payload.is_active)
        .bind(&payload.id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_modifier_group(group_id: String, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    sqlx::query("UPDATE modifier_groups SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&group_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_modifier_groups_by_product(product_id: String, pool: State<'_, SqlitePool>) -> Result<Vec<ModifierGroup>, String> {
    let rows = sqlx::query("SELECT id, product_id, name, min_select, max_select, is_required, is_active FROM modifier_groups WHERE product_id = ? ORDER BY name")
        .bind(&product_id)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(rows.into_iter().map(|r| ModifierGroup {
        id: r.get("id"),
        product_id: r.get("product_id"),
        name: r.get("name"),
        min_select: r.get("min_select"),
        max_select: r.get("max_select"),
        is_required: r.get("is_required"),
        is_active: r.get("is_active"),
    }).collect())
}

// ======================== MODIFIER ========================

#[derive(Serialize, Deserialize)]
pub struct Modifier {
    pub id: String,
    pub modifier_group_id: String,
    pub name: String,
    pub price_delta: i64,
    pub is_active: bool,
}

#[derive(Deserialize)]
pub struct CreateModifierPayload {
    pub modifier_group_id: String,
    pub name: String,
    pub price_delta: i64,
}

#[derive(Deserialize)]
pub struct UpdateModifierPayload {
    pub id: String,
    pub name: String,
    pub price_delta: i64,
    pub is_active: bool,
}

#[tauri::command]
pub async fn create_modifier(payload: CreateModifierPayload, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<String, String> {
    app_state.require_admin()?;
    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO modifiers (id, modifier_group_id, name, price_delta) VALUES (?, ?, ?, ?)")
        .bind(&id)
        .bind(&payload.modifier_group_id)
        .bind(&payload.name)
        .bind(payload.price_delta)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub async fn update_modifier(payload: UpdateModifierPayload, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    sqlx::query("UPDATE modifiers SET name = ?, price_delta = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&payload.name)
        .bind(payload.price_delta)
        .bind(payload.is_active)
        .bind(&payload.id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_modifier(modifier_id: String, pool: State<'_, SqlitePool>, app_state: State<'_, AppState>) -> Result<(), String> {
    app_state.require_admin()?;
    sqlx::query("UPDATE modifiers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&modifier_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_modifiers_by_group(group_id: String, pool: State<'_, SqlitePool>) -> Result<Vec<Modifier>, String> {
    let rows = sqlx::query("SELECT id, modifier_group_id, name, price_delta, is_active FROM modifiers WHERE modifier_group_id = ? ORDER BY name")
        .bind(&group_id)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(rows.into_iter().map(|r| Modifier {
        id: r.get("id"),
        modifier_group_id: r.get("modifier_group_id"),
        name: r.get("name"),
        price_delta: r.get("price_delta"),
        is_active: r.get("is_active"),
    }).collect())
}
