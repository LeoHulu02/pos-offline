import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";

export default function InitialSetupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    business_name: "",
    address: "",
    phone: "",
    business_type: "coffee_shop",
    currency: "IDR",
    default_tax_rate_bp: "0",
    default_service_charge_rate_bp: "0",
    admin_fullname: "",
    admin_username: "admin",
    admin_password: "",
    admin_pin: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Convert bp inputs to numbers
      const payload = {
        ...formData,
        default_tax_rate_bp: parseInt(formData.default_tax_rate_bp) || 0,
        default_service_charge_rate_bp: parseInt(formData.default_service_charge_rate_bp) || 0,
      };

      await invoke("create_initial_setup", { payload });
      navigate("/login");
    } catch (err: any) {
      console.error(err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Initial Setup
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Lengkapi profil usaha dan buat akun admin pertama.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">1. Profil Usaha</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Usaha</label>
                <div className="mt-1">
                  <input required name="business_name" value={formData.business_name} onChange={handleChange} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Alamat</label>
                <div className="mt-1">
                  <input required name="address" value={formData.address} onChange={handleChange} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telepon</label>
                  <div className="mt-1">
                    <input required name="phone" value={formData.phone} onChange={handleChange} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipe Usaha</label>
                  <div className="mt-1">
                    <select name="business_type" value={formData.business_type} onChange={handleChange} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                      <option value="coffee_shop">Coffee Shop</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="bakery">Bakery</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pajak Default (basis point)</label>
                  <p className="text-xs text-gray-500">Contoh: 1000 = 10%</p>
                  <div className="mt-1">
                    <input type="number" required name="default_tax_rate_bp" value={formData.default_tax_rate_bp} onChange={handleChange} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service Charge (basis point)</label>
                  <p className="text-xs text-gray-500">Contoh: 500 = 5%</p>
                  <div className="mt-1">
                    <input type="number" required name="default_service_charge_rate_bp" value={formData.default_service_charge_rate_bp} onChange={handleChange} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">2. Akun Admin Pertama</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                  <div className="mt-1">
                    <input required name="admin_fullname" value={formData.admin_fullname} onChange={handleChange} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <div className="mt-1">
                    <input required name="admin_username" value={formData.admin_username} onChange={handleChange} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <div className="mt-1">
                    <input type="password" required name="admin_password" value={formData.admin_password} onChange={handleChange} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">PIN (6 digit)</label>
                  <div className="mt-1">
                    <input type="password" maxLength={6} required name="admin_pin" value={formData.admin_pin} onChange={handleChange} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {loading ? "Menyimpan..." : "Selesai Setup"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
