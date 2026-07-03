import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { useToastStore } from "../stores/toastStore";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    shop_name: "Toko F&B",
    shop_address: "",
    receipt_footer: "Terima kasih atas kunjungannya!",
    tax_rate: "1100", // 11%
    service_rate: "0",
    printer_type: "dummy",
    printer_ip: "",
    printer_port: "9100",
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await invoke<Record<string, string>>("get_all_settings");
        setSettings(prev => ({ ...prev, ...data }));
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await invoke("update_multiple_settings", { settings });
      useToastStore.getState().addToast("Pengaturan berhasil disimpan!", "success");
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast("Gagal menyimpan pengaturan: " + error, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrint = async () => {
    try {
      await invoke("test_print");
      useToastStore.getState().addToast("Test print berhasil dikirim! Cek console/printer.", "success");
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast("Test print gagal: " + error, "error");
    }
  };

  const handleBackup = async () => {
    try {
      const path = await save({
        filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
        defaultPath: 'pos_backup.sqlite',
      });
      if (path) {
        await invoke("create_backup", { destinationPath: path });
        useToastStore.getState().addToast("Backup berhasil disimpan ke: " + path, "success");
      }
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast("Gagal melakukan backup: " + error, "error");
    }
  };

  const handleRestore = async () => {
    try {
      const confirmed = window.confirm("PERINGATAN: Restore akan menimpa seluruh data saat ini! Aplikasi akan tertutup otomatis setelah sukses. Anda yakin?");
      if (!confirmed) return;

      const path = await open({
        multiple: false,
        filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
      });
      if (path) {
        await invoke("restore_backup", { sourcePath: path });
      }
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast("Gagal melakukan restore: " + error, "error");
    }
  };

  const handleSeedDummyData = async () => {
    try {
      const confirmed = window.confirm("PERINGATAN: Fitur ini akan membuat data dummy (kasir, kategori, produk) untuk keperluan testing. Hanya gunakan saat masa development. Lanjutkan?");
      if (!confirmed) return;
      
      await invoke("seed_dummy_data");
      useToastStore.getState().addToast("Dummy data berhasil dibuat! Kamu bisa login menggunakan user 'kasir1' dan password 'kasir123'. PIN kasir adalah '123456'.", "success");
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast("Gagal membuat dummy data: " + error, "error");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Memuat pengaturan...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pengaturan Toko & Printer</h1>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* General Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Informasi Toko (Struk)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama Toko</label>
              <input type="text" name="shop_name" value={settings.shop_name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Alamat Toko</label>
              <textarea name="shop_address" value={settings.shop_address} onChange={handleChange} rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Catatan Bawah Struk (Footer)</label>
              <input type="text" name="receipt_footer" value={settings.receipt_footer} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>
        </div>

        {/* Tax & Service */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Pajak & Layanan (Basis Points)</h2>
          <p className="text-xs text-gray-500 mb-4">Catatan: 10000 = 100%. Jadi 11% = 1100, 5% = 500.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tax Rate (Pajak)</label>
              <input type="number" name="tax_rate" value={settings.tax_rate} onChange={handleChange} min="0" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Service Rate</label>
              <input type="number" name="service_rate" value={settings.service_rate} onChange={handleChange} min="0" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>
        </div>

        {/* Printer Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Konfigurasi Printer ESC/POS</h2>
            <button type="button" onClick={handleTestPrint} className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-medium hover:bg-gray-200">
              Test Print
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipe Printer</label>
              <select name="printer_type" value={settings.printer_type} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                <option value="dummy">Dummy (Console Log)</option>
                <option value="network">Network (IP/TCP)</option>
              </select>
            </div>
            {settings.printer_type === "network" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">IP Address</label>
                  <input type="text" name="printer_ip" value={settings.printer_ip} onChange={handleChange} placeholder="192.168.1.100" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Port</label>
                  <input type="text" name="printer_port" value={settings.printer_port} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-b border-gray-200 pb-8 mb-8">
          <button type="submit" disabled={saving} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-50">
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </div>
      </form>

      {/* Backup & Restore Data */}
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <h2 className="text-lg font-bold text-red-700 mb-2">Manajemen Data (Advanced)</h2>
        <p className="text-sm text-gray-600 mb-6">Cadangkan database Anda secara rutin. Restore data akan menimpa seluruh transaksi yang ada.</p>
        
        <div className="flex gap-4">
          <button 
            type="button" 
            onClick={handleBackup} 
            className="flex-1 px-4 py-3 bg-blue-50 text-blue-700 font-semibold border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Backup Data ke File
          </button>
          
          <button 
            type="button" 
            onClick={handleRestore} 
            className="flex-1 px-4 py-3 bg-red-50 text-red-700 font-semibold border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            Restore Data dari File
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-4">Fitur Development / Testing:</p>
          <button 
            type="button" 
            onClick={handleSeedDummyData} 
            className="w-full px-4 py-3 bg-green-50 text-green-700 font-semibold border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            Generate Dummy Data (Testing)
          </button>
        </div>
      </div>
    </div>
  );
}
