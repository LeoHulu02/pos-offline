use sqlx::{SqlitePool, Row};
use tauri::State;
use std::io::Write;
use std::net::TcpStream;
use std::time::Duration;

const ESC: u8 = 0x1B;
const GS: u8 = 0x1D;

pub struct PrinterConfig {
    pub printer_type: String,
    pub printer_ip: String,
    pub printer_port: String,
    pub shop_name: String,
    pub shop_address: String,
    pub receipt_footer: String,
}

pub async fn get_printer_settings(pool: &SqlitePool) -> Result<PrinterConfig, String> {
    let mut settings = std::collections::HashMap::new();
    let rows = sqlx::query("SELECT key, value FROM app_settings").fetch_all(pool).await.map_err(|e| e.to_string())?;
    for row in rows {
        settings.insert(row.get::<String, _>("key"), row.get::<String, _>("value"));
    }

    Ok(PrinterConfig {
        printer_type: settings.get("printer_type").cloned().unwrap_or_else(|| "dummy".to_string()),
        printer_ip: settings.get("printer_ip").cloned().unwrap_or_default(),
        printer_port: settings.get("printer_port").cloned().unwrap_or_else(|| "9100".to_string()),
        shop_name: settings.get("shop_name").cloned().unwrap_or_else(|| "Toko F&B".to_string()),
        shop_address: settings.get("shop_address").cloned().unwrap_or_default(),
        receipt_footer: settings.get("receipt_footer").cloned().unwrap_or_else(|| "Terima kasih atas kunjungannya!".to_string()),
    })
}

// Helper to send data to printer
fn send_to_printer(printer_type: &str, printer_ip: &str, printer_port: &str, data: &[u8]) -> Result<(), String> {
    if printer_type == "dummy" || printer_ip.is_empty() {
        // Just log the text representation (stripping ESC codes for simplicity)
        let text = String::from_utf8_lossy(data);
        println!("--- DUMMY PRINT JOB ---");
        println!("{}", text);
        println!("-----------------------");
        return Ok(());
    }

    if printer_type == "network" {
        let address = format!("{}:{}", printer_ip, printer_port);
        let mut stream = TcpStream::connect_timeout(
            &address.parse().map_err(|_| "Invalid IP address format".to_string())?,
            Duration::from_secs(5)
        ).map_err(|e| format!("Failed to connect to printer: {}", e))?;
        
        stream.write_all(data).map_err(|e| format!("Failed to write to printer: {}", e))?;
        stream.flush().map_err(|e| format!("Failed to flush printer stream: {}", e))?;
        
        return Ok(());
    }

    Err("Unknown printer type or not supported".to_string())
}

#[tauri::command]
pub async fn test_print(pool: State<'_, SqlitePool>) -> Result<(), String> {
    let settings = get_printer_settings(&*pool).await?;

    let mut data = Vec::new();
    
    // Init printer
    data.push(ESC); data.push(b'@');
    
    // Align center
    data.push(ESC); data.push(b'a'); data.push(1);
    
    // Text
    data.extend_from_slice(b"--- TEST PRINT ---\n");
    data.extend_from_slice(b"Koneksi Printer Berhasil!\n");
    data.extend_from_slice(b"------------------\n\n\n\n");
    
    // Cut paper
    data.push(GS); data.push(b'V'); data.push(66); data.push(0);

    send_to_printer(&settings.printer_type, &settings.printer_ip, &settings.printer_port, &data)?;
    
    Ok(())
}

#[tauri::command]
pub async fn print_receipt(order_id: String, pool: State<'_, SqlitePool>) -> Result<(), String> {
    // 1. Get settings
    let settings = get_printer_settings(&*pool).await?;

    // 2. Get order details
    let order_row = sqlx::query("SELECT order_number, customer_note, table_note, total_amount, tax_amount, service_charge_amount, created_at, status FROM orders WHERE id = ?")
        .bind(&order_id)
        .fetch_optional(&*pool).await.map_err(|e| e.to_string())?;
        
    let order = match order_row {
        Some(r) => r,
        None => return Err("Order not found".to_string()),
    };

    let receipt_number: String = order.get("order_number");
    let customer_name: Option<String> = order.get("customer_note");
    let total_amount: i64 = order.get("total_amount");
    let tax_amount: i64 = order.get("tax_amount");
    let service_amount: i64 = order.get("service_charge_amount");
    let created_at: chrono::NaiveDateTime = order.get("created_at");

    // Get order items
    let items_rows = sqlx::query("SELECT product_name_snapshot, variant_name_snapshot, qty, line_total FROM order_items WHERE order_id = ?")
        .bind(&order_id)
        .fetch_all(&*pool).await.map_err(|e| e.to_string())?;

    // 3. Build ESC/POS payload
    let mut data = Vec::new();
    
    // Init printer
    data.push(ESC); data.push(b'@');
    
    // Align center, Bold
    data.push(ESC); data.push(b'a'); data.push(1);
    data.push(ESC); data.push(b'E'); data.push(1);
    data.extend_from_slice(settings.shop_name.as_bytes());
    data.push(b'\n');
    
    // Normal text, Center
    data.push(ESC); data.push(b'E'); data.push(0);
    if !settings.shop_address.is_empty() {
        data.extend_from_slice(settings.shop_address.as_bytes());
        data.push(b'\n');
    }
    
    data.extend_from_slice(b"--------------------------------\n");
    
    // Align left
    data.push(ESC); data.push(b'a'); data.push(0);
    data.extend_from_slice(format!("No : {}\n", receipt_number).as_bytes());
    data.extend_from_slice(format!("Tgl: {}\n", created_at.format("%d-%m-%Y %H:%M")).as_bytes());
    if let Some(c) = customer_name {
        data.extend_from_slice(format!("Plg: {}\n", c).as_bytes());
    }
    data.extend_from_slice(b"--------------------------------\n");
    
    // Items
    for row in items_rows {
        let name: String = row.get("product_name_snapshot");
        let variant: Option<String> = row.get("variant_name_snapshot");
        let qty: i64 = row.get("qty");
        let line_total: i64 = row.get("line_total");
        
        let full_name = match variant {
            Some(v) => format!("{} ({})", name, v),
            None => name,
        };
        
        let item_line = format!("{} x{} = {}\n", full_name, qty, line_total);
        data.extend_from_slice(item_line.as_bytes());
    }
    
    data.extend_from_slice(b"--------------------------------\n");
    
    // Align right (for totals, simplistic approach using spaces, but we can just right align)
    data.push(ESC); data.push(b'a'); data.push(2);
    
    if service_amount > 0 {
        data.extend_from_slice(format!("Service: {}\n", service_amount).as_bytes());
    }
    if tax_amount > 0 {
        data.extend_from_slice(format!("Pajak  : {}\n", tax_amount).as_bytes());
    }
    
    data.push(ESC); data.push(b'E'); data.push(1); // Bold
    data.extend_from_slice(format!("TOTAL  : {}\n", total_amount).as_bytes());
    data.push(ESC); data.push(b'E'); data.push(0); // Unbold
    
    // Align center for footer
    data.push(ESC); data.push(b'a'); data.push(1);
    data.extend_from_slice(b"--------------------------------\n");
    data.extend_from_slice(settings.receipt_footer.as_bytes());
    data.push(b'\n');
    
    // Feed paper
    data.extend_from_slice(b"\n\n\n\n");
    
    // Cut paper
    data.push(GS); data.push(b'V'); data.push(66); data.push(0);

    send_to_printer(&settings.printer_type, &settings.printer_ip, &settings.printer_port, &data)?;
    
    Ok(())
}

#[tauri::command]
pub async fn print_kitchen_ticket(order_id: String, pool: State<'_, SqlitePool>) -> Result<(), String> {
    let settings = get_printer_settings(&*pool).await?;

    let order_row = sqlx::query("SELECT order_number, customer_note, table_note, created_at FROM orders WHERE id = ?")
        .bind(&order_id)
        .fetch_optional(&*pool).await.map_err(|e| e.to_string())?;
        
    let order = order_row.ok_or_else(|| "Order not found".to_string())?;

    let receipt_number: String = order.get("order_number");
    let customer_name: Option<String> = order.get("customer_note");
    let table_note: Option<String> = order.get("table_note");
    let created_at: chrono::NaiveDateTime = order.get("created_at");

    let items_rows = sqlx::query("SELECT id, product_name_snapshot, variant_name_snapshot, qty, note FROM order_items WHERE order_id = ?")
        .bind(&order_id)
        .fetch_all(&*pool).await.map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    data.push(ESC); data.push(b'@');
    
    data.push(ESC); data.push(b'a'); data.push(1);
    data.push(ESC); data.push(b'E'); data.push(1);
    data.extend_from_slice(b"--- KITCHEN TICKET ---\n\n");
    
    data.push(ESC); data.push(b'a'); data.push(0);
    data.push(ESC); data.push(b'E'); data.push(0);
    
    data.extend_from_slice(format!("No Order: {}\n", receipt_number).as_bytes());
    data.extend_from_slice(format!("Waktu   : {}\n", created_at.format("%H:%M:%S")).as_bytes());
    if let Some(c) = customer_name {
        if !c.is_empty() { data.extend_from_slice(format!("Pelanggan: {}\n", c).as_bytes()); }
    }
    if let Some(t) = table_note {
        if !t.is_empty() { data.extend_from_slice(format!("Catatan Meja: {}\n", t).as_bytes()); }
    }
    data.extend_from_slice(b"--------------------------------\n");
    
    for row in items_rows {
        let item_id: String = row.get("id");
        let name: String = row.get("product_name_snapshot");
        let variant: Option<String> = row.get("variant_name_snapshot");
        let qty: i64 = row.get("qty");
        let note: Option<String> = row.get("note");
        
        data.push(ESC); data.push(b'E'); data.push(1); // Bold item
        let full_name = match variant {
            Some(v) => format!("{} ({})", name, v),
            None => name,
        };
        data.extend_from_slice(format!("{}x {}\n", qty, full_name).as_bytes());
        data.push(ESC); data.push(b'E'); data.push(0);
        
        let mods = sqlx::query("SELECT modifier_name_snapshot FROM order_item_modifiers WHERE order_item_id = ?")
            .bind(&item_id)
            .fetch_all(&*pool).await.map_err(|e| e.to_string())?;
            
        for m_row in mods {
            let m_name: String = m_row.get("modifier_name_snapshot");
            data.extend_from_slice(format!("  + {}\n", m_name).as_bytes());
        }
        
        if let Some(n) = note {
            if !n.is_empty() {
                data.extend_from_slice(format!("  ** NOTE: {} **\n", n).as_bytes());
            }
        }
        data.extend_from_slice(b"\n");
    }
    
    data.extend_from_slice(b"--------------------------------\n\n\n\n\n");
    data.push(GS); data.push(b'V'); data.push(66); data.push(0);

    send_to_printer(&settings.printer_type, &settings.printer_ip, &settings.printer_port, &data)?;
    
    Ok(())
}
