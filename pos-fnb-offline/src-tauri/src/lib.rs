mod database;
mod setup_commands;
mod session;
mod auth_commands;
mod menu_commands;
mod shift_commands;
mod order_commands;
mod settings_commands;
mod printer_commands;
mod report_commands;
mod backup_commands;

use tauri::Manager;
use session::AppState;

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            tauri::async_runtime::block_on(async {
                let pool = database::init_db(app.handle()).await.expect("Failed to init db");
                app.manage(pool);
            });
            app.manage(AppState {
                session: std::sync::Mutex::new(None),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            write_text_file,
            setup_commands::check_initial_setup,
            setup_commands::create_initial_setup,
            setup_commands::seed_dummy_data,
            auth_commands::login,
            auth_commands::logout,
            auth_commands::get_current_user,
            auth_commands::get_all_users,
            auth_commands::admin_create_user,
            auth_commands::admin_update_user,
            auth_commands::admin_toggle_user_status,
            menu_commands::create_category,
            menu_commands::update_category,
            menu_commands::delete_category,
            menu_commands::get_categories_for_admin,
            menu_commands::get_categories_for_cashier,
            menu_commands::create_product,
            menu_commands::update_product,
            menu_commands::delete_product,
            menu_commands::get_products_for_admin,
            menu_commands::get_products_for_cashier,
            menu_commands::create_variant,
            menu_commands::update_variant,
            menu_commands::delete_variant,
            menu_commands::get_variants_by_product,
            menu_commands::create_modifier_group,
            menu_commands::update_modifier_group,
            menu_commands::delete_modifier_group,
            menu_commands::get_modifier_groups_by_product,
            menu_commands::create_modifier,
            menu_commands::update_modifier,
            menu_commands::delete_modifier,
            menu_commands::get_modifiers_by_group,
            shift_commands::open_shift,
            shift_commands::get_active_shift,
            shift_commands::record_cash_movement,
            shift_commands::close_shift,
            shift_commands::get_shift_history,
            order_commands::create_order,
            order_commands::process_payment,
            order_commands::get_orders_by_shift,
            order_commands::void_order,
            settings_commands::get_setting,
            settings_commands::get_all_settings,
            settings_commands::get_business_settings,
            settings_commands::update_setting,
            settings_commands::update_multiple_settings,
            printer_commands::test_print,
            printer_commands::print_receipt,
            printer_commands::print_kitchen_ticket,
            report_commands::get_daily_sales,
            report_commands::get_best_sellers,
            report_commands::get_payment_breakdown,
            report_commands::get_void_refund_report,
            report_commands::get_shift_report,
            report_commands::get_dashboard_stats,
            report_commands::get_recent_orders,
            backup_commands::create_backup,
            backup_commands::restore_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
