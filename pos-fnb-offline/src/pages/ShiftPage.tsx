import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useShiftStore } from "../stores/shiftStore";
import { useToastStore } from "../stores/toastStore";
import { Clock, ArrowDownLeft, ArrowUpRight, Ban, User } from "lucide-react";

interface ShiftRecord {
  id: string;
  cashier_id: string;
  starting_cash: number;
  expected_cash: number | null;
  actual_cash: number | null;
  variance_amount: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
}

export default function ShiftPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<ShiftRecord[]>([]);
  
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashType, setCashType] = useState<"cash_in" | "cash_out">("cash_in");
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cashNote, setCashNote] = useState("");

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actualCash, setActualCash] = useState<number>(0);
  
  // Admin Override States
  const [needsOverride, setNeedsOverride] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeShift, loadActiveShift } = useShiftStore();

  const loadHistory = async () => {
    try {
      const data = await invoke<ShiftRecord[]>("get_shift_history");
      setHistory(data);
    } catch (err) {
      console.error("Gagal memuat riwayat shift:", err);
    }
  };

  useEffect(() => {
    if (user) {
      loadActiveShift(user.id);
    }
    loadHistory();
  }, [user, loadActiveShift]);

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  const handleCashMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift || !user) return;
    
    setLoading(true);
    try {
      await invoke("record_cash_movement", {
        payload: {
          shift_id: activeShift.id,
          movement_type: cashType,
          amount: cashAmount,
          note: cashNote,
          created_by: user.id
        }
      });
      setShowCashModal(false);
      setCashAmount(0);
      setCashNote("");
      useToastStore.getState().addToast(`Berhasil mencatat ${cashType === 'cash_in' ? 'Kas Masuk' : 'Kas Keluar'}`, "success");
    } catch (err: any) {
      console.error(err);
      useToastStore.getState().addToast(String(err), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift || !user) return;
    
    setLoading(true);
    setError("");

    try {
      const payload: any = {
        shift_id: activeShift.id,
        actual_cash: actualCash,
      };

      if (needsOverride) {
        payload.admin_username = adminUsername;
        payload.admin_pin_override = adminPin;
        payload.override_reason = overrideReason;
      }

      await invoke("close_shift", { payload });
      useToastStore.getState().addToast("Shift berhasil ditutup dan database telah di-backup!", "success");
      await loadActiveShift(user.id);
      setShowCloseModal(false);
      loadHistory();
      navigate("/");
    } catch (err: any) {
      console.error(err);
      const errMsg = String(err);
      setError(errMsg);
      if (errMsg.includes("Unpaid orders exist")) {
        setNeedsOverride(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 overflow-y-auto h-screen pb-24">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Manajemen Shift Kerja</h1>
        <p className="text-gray-500 mt-1">Pantau modal awal kasir, kelola kas masuk/keluar, dan lakukan rekap tutup shift harian.</p>
      </div>

      {/* Panel Atas - Status Shift Aktif */}
      {!activeShift ? (
        <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <Clock size={40} className="text-orange-500 mb-3 animate-pulse" />
          <h2 className="text-xl font-bold text-gray-800">Anda belum membuka shift kasir saat ini.</h2>
          <p className="text-gray-500 text-sm mt-1 max-w-md">Buka shift kasir baru dan masukkan jumlah saldo laci kas awal Anda sebelum memulai penjualan.</p>
          <button
            onClick={() => navigate("/open-shift")}
            className="mt-5 bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-lg shadow transition-colors cursor-pointer text-sm"
          >
            Buka Shift Baru Sekarang
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-250 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-orange-50/40 flex justify-between items-center">
              <h3 className="text-lg font-bold text-orange-950 flex items-center gap-2">
                <Clock size={18} className="text-orange-600" />
                Shift Aktif Saat Ini
              </h3>
              <span className="px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full bg-green-50 text-green-700 border border-green-200">
                {activeShift.status.toUpperCase()}
              </span>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <dt className="text-xs font-bold text-gray-400 uppercase">Waktu Buka</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">{new Date(activeShift.opened_at).toLocaleString('id-ID')}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-xs font-bold text-gray-400 uppercase">Saldo Awal</dt>
                  <dd className="mt-1 text-xl font-extrabold text-orange-600">{formatIDR(activeShift.starting_cash)}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-xs font-bold text-gray-400 uppercase">Operator</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900 flex items-center gap-1">
                    <User size={16} className="text-gray-400" />
                    {user?.full_name}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => { setCashType("cash_in"); setShowCashModal(true); }}
              className="bg-green-600 hover:bg-green-700 text-white p-5 rounded-xl flex flex-col items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
            >
              <ArrowDownLeft size={24} />
              <span className="font-bold text-lg">Cash In</span>
              <span className="text-xs opacity-80">Tambah Modal / Uang Kembalian</span>
            </button>
            <button
              onClick={() => { setCashType("cash_out"); setShowCashModal(true); }}
              className="bg-orange-500 hover:bg-orange-600 text-white p-5 rounded-xl flex flex-col items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
            >
              <ArrowUpRight size={24} />
              <span className="font-bold text-lg">Cash Out</span>
              <span className="text-xs opacity-80">Catat Kas Keluar / Pengeluaran Toko</span>
            </button>
            <button
              onClick={() => { setNeedsOverride(false); setError(""); setShowCloseModal(true); }}
              className="bg-red-600 hover:bg-red-700 text-white p-5 rounded-xl flex flex-col items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
            >
              <Ban size={24} />
              <span className="font-bold text-lg">Tutup Shift</span>
              <span className="text-xs opacity-80">Selesai Berjualan & Rekap Kas Laci</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabel Riwayat Shift Sebelumnya */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-150 bg-gray-50 flex items-center justify-between">
          <h3 className="text-md font-bold text-gray-800">Riwayat Shift Sebelumnya</h3>
          <span className="text-xs text-gray-500 font-medium">Menampilkan {history.length} shift terakhir</span>
        </div>
        <div className="overflow-x-auto">
          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Belum ada riwayat shift tersimpan.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-150 text-sm">
              <thead className="bg-gray-50/50">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Waktu Buka</th>
                  <th className="px-6 py-3.5">Waktu Tutup</th>
                  <th className="px-6 py-3.5 text-right">Kas Awal</th>
                  <th className="px-6 py-3.5 text-right">Ekspektasi Kas</th>
                  <th className="px-6 py-3.5 text-right">Kas Aktual</th>
                  <th className="px-6 py-3.5 text-right">Selisih</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {history.map((h) => {
                  const variance = h.variance_amount ?? 0;
                  return (
                    <tr key={h.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-3.5 text-gray-900">{new Date(h.opened_at).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-3.5 text-gray-500">
                        {h.closed_at ? new Date(h.closed_at).toLocaleString('id-ID') : "-"}
                      </td>
                      <td className="px-6 py-3.5 text-right text-gray-900">{formatIDR(h.starting_cash)}</td>
                      <td className="px-6 py-3.5 text-right text-gray-600">
                        {h.expected_cash !== null ? formatIDR(h.expected_cash) : "-"}
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-gray-950">
                        {h.actual_cash !== null ? formatIDR(h.actual_cash) : "-"}
                      </td>
                      <td className={`px-6 py-3.5 text-right font-bold ${
                        variance === 0 ? "text-green-600" : variance > 0 ? "text-blue-600" : "text-red-600"
                      }`}>
                        {h.variance_amount !== null ? (variance > 0 ? `+${formatIDR(variance)}` : formatIDR(variance)) : "-"}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                          h.status === 'open' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                          {h.status === 'open' ? 'Buka' : 'Tutup'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Cash In / Out Modal */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              {cashType === 'cash_in' ? 'Cash In (Kas Masuk)' : 'Cash Out (Kas Keluar)'}
            </h2>
            <form onSubmit={handleCashMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Jumlah (Rp)</label>
                <input
                  type="number" min="1" required
                  value={cashAmount}
                  onChange={(e) => setCashAmount(parseInt(e.target.value) || 0)}
                  className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Keterangan</label>
                <textarea
                  required rows={2}
                  value={cashNote}
                  onChange={(e) => setCashNote(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Keterangan transaksi..."
                />
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t w-full">
                <button type="button" onClick={() => setShowCashModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer">Batal</button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors cursor-pointer">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Konfirmasi Tutup Shift</h2>
            <form onSubmit={handleCloseShift} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Uang Tunai di Laci Saat Ini (Rp)</label>
                <input
                  type="number" min="0" required
                  value={actualCash}
                  onChange={(e) => setActualCash(parseInt(e.target.value) || 0)}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-extrabold text-2xl text-right font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Sistem akan otomatis menghitung selisih dengan ekspektasi kas.</p>
              </div>

              {needsOverride && (
                <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-lg space-y-4">
                  <h4 className="font-bold text-red-800 text-sm">Otorisasi Admin Diperlukan</h4>
                  <p className="text-xs text-red-600 leading-normal">Ada pesanan yang belum dibayar dalam shift ini. Admin harus melakukan otorisasi untuk menutup shift paksa.</p>
                  <div>
                    <label className="block text-xs font-bold text-red-800 uppercase">Admin Username</label>
                    <input type="text" required value={adminUsername} onChange={e => setAdminUsername(e.target.value)} className="mt-1 block w-full px-3 py-2 text-sm border border-red-300 rounded bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-red-800 uppercase">PIN Admin (6 digit)</label>
                    <input type="password" required maxLength={6} value={adminPin} onChange={e => setAdminPin(e.target.value)} className="mt-1 block w-full px-3 py-2 text-sm border border-red-300 rounded bg-white tracking-widest text-center text-lg font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-red-800 uppercase">Alasan Override</label>
                    <textarea required rows={2} value={overrideReason} onChange={e => setOverrideReason(e.target.value)} className="mt-1 block w-full px-3 py-2 text-sm border border-red-300 rounded bg-white" placeholder="Contoh: Pesanan void manual, customer pergi..." />
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6 pt-4 border-t w-full">
                <button type="button" onClick={() => { setShowCloseModal(false); setNeedsOverride(false); setError(""); }} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer">Batal</button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors cursor-pointer">Tutup Shift & Backup</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
