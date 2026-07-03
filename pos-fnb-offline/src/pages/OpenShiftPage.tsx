import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useShiftStore } from "../stores/shiftStore";

export default function OpenShiftPage() {
  const [startingCash, setStartingCash] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { loadActiveShift, activeShift } = useShiftStore();

  useEffect(() => {
    if (user) {
      loadActiveShift(user.id);
    }
  }, [user, loadActiveShift]);

  useEffect(() => {
    // If shift is already open, redirect to cashier
    if (activeShift) {
      navigate("/cashier");
    }
  }, [activeShift, navigate]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError("");

    try {
      await invoke("open_shift", {
        payload: {
          cashier_id: user.id,
          starting_cash: startingCash
        }
      });
      await loadActiveShift(user.id);
      navigate("/cashier");
    } catch (err: any) {
      console.error(err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-indigo-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white">Buka Shift</h2>
        <p className="text-indigo-100 text-sm mt-1">
          Kasir harus membuka shift sebelum mulai bertransaksi.
        </p>
      </div>
      
      <div className="p-6">
        <form onSubmit={handleOpenShift} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Modal Awal / Saldo Awal Laci (Rp)</label>
            <div className="mt-1">
              <input
                type="number"
                min="0"
                required
                value={startingCash}
                onChange={(e) => setStartingCash(parseInt(e.target.value) || 0)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-lg font-bold"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Uang tunai yang ada di dalam laci kasir pada saat mulai shift.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
          >
            {loading ? "Membuka Shift..." : "Mulai Shift"}
          </button>
        </form>
      </div>
    </div>
  );
}
