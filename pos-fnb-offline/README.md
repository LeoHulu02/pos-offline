# POS F&B Offline

Aplikasi Point of Sale (POS) kasir desktop untuk bisnis F&B (Coffee Shop, Restoran, Bakery, dll) yang berjalan 100% offline tanpa cloud. Dibangun menggunakan Tauri 2, React, TypeScript, Rust, dan SQLite.

## Fitur Utama

- **100% Offline**: Data disimpan secara lokal menggunakan SQLite, tidak butuh koneksi internet.
- **Manajemen Toko & Karyawan**: Setup profil usaha dan pengaturan role (Admin & Kasir).
- **Manajemen Produk**: Mendukung kategori, varian, dan modifier (misal: extra shot, less sugar).
- **Manajemen Shift Kasir**: Buka/tutup shift, perhitungan modal awal, kas keluar/masuk, dan kalkulasi selisih kas.
- **Transaksi Kasir**: Order (Dine in, Take away, Delivery) dengan perhitungan otomatis pajak & service charge.
- **Pembayaran**: Mendukung pencatatan tunai dan non-tunai (QRIS, Transfer, EDC).
- **Struk & Laporan**: Cetak struk (HTML/System Print) dan fitur pelaporan penjualan lengkap.
- **Aman**: Password & PIN di-hash menggunakan bcrypt. Semua logic bisnis berjalan aman di backend Rust.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Zustand, Vite
- **Backend / Desktop**: Tauri 2, Rust
- **Database**: SQLite (menggunakan SQLx)

## Development Setup

Pastikan Anda sudah menginstal:
- [Node.js](https://nodejs.org/) (disarankan versi LTS)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri CLI prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)

### Cara Menjalankan

1. Install dependencies frontend:
   ```bash
   cd pos-fnb-offline
   npm install
   ```
2. Jalankan environment development Tauri:
   ```bash
   npm run tauri dev
   ```
