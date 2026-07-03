import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, 
  ShoppingBag, 
  XCircle, 
  DollarSign, 
  CreditCard,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { useShiftStore } from "../stores/shiftStore";

interface DashboardStats {
  total_revenue: number;
  total_transactions: number;
  total_voids: number;
  total_cash: number;
  total_non_cash: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_revenue: 0,
    total_transactions: 0,
    total_voids: 0,
    total_cash: 0,
    total_non_cash: 0
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pingResult, setPingResult] = useState("");
  const [showDebug, setShowDebug] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeShift, loadActiveShift } = useShiftStore();

  useEffect(() => {
    if (user) {
      loadActiveShift(user.id);
    }
  }, [user, loadActiveShift]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, ordersData] = await Promise.all([
        invoke<DashboardStats>("get_dashboard_stats"),
        invoke<RecentOrder[]>("get_recent_orders")
      ]);
      setStats(statsData);
      setRecentOrders(ordersData);
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handlePing = async () => {
    try {
      const result = await invoke("ping");
      setPingResult(result as string);
    } catch (error) {
      console.error(error);
      setPingResult("Error: " + String(error));
    }
  };

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1">Selamat datang kembali, <span className="font-semibold text-gray-800">{user?.full_name}</span>. Berikut rekap operasional hari ini.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
          <Clock size={16} className="text-indigo-500 animate-pulse" />
          <span>Hari ini: <span className="font-semibold text-gray-800">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></span>
        </div>
      </div>

      {/* Shift Banner */}
      <div className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm transition-all ${
        activeShift 
          ? "bg-indigo-50/50 border-indigo-100" 
          : "bg-amber-50 border-amber-200"
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-lg ${activeShift ? "bg-indigo-600 text-white" : "bg-amber-500 text-white"}`}>
            <Clock size={22} />
          </div>
          <div>
            <h3 className={`font-bold text-lg ${activeShift ? "text-indigo-900" : "text-amber-900"}`}>
              {activeShift ? "Shift Kasir Sedang Aktif" : "Shift Belum Dibuka"}
            </h3>
            <p className={`text-sm mt-0.5 ${activeShift ? "text-indigo-700/80" : "text-amber-800/80"}`}>
              {activeShift 
                ? `Dibuka sejak ${new Date(activeShift.opened_at).toLocaleTimeString('id-ID')} dengan modal awal ${formatIDR(activeShift.starting_cash)}` 
                : "Anda harus membuka shift baru terlebih dahulu untuk menerima pembayaran di kasir."
              }
            </p>
          </div>
        </div>
        <div>
          {activeShift ? (
            <button
              onClick={() => navigate("/cashier")}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition-colors cursor-pointer"
            >
              <span>Masuk Menu Kasir</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => navigate("/shift")}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow transition-colors cursor-pointer"
            >
              <span>Buka Shift Baru</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 bg-gray-200 rounded-xl border"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Revenue */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-semibold text-gray-500">Pendapatan Hari Ini</span>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{formatIDR(stats.total_revenue)}</h2>
              <div className="flex items-center gap-3 text-xs text-gray-500 pt-1">
                <span className="flex items-center gap-1"><DollarSign size={12} className="text-green-500" /> Cash: {formatIDR(stats.total_cash)}</span>
                <span className="flex items-center gap-1"><CreditCard size={12} className="text-blue-500" /> Non-Cash: {formatIDR(stats.total_non_cash)}</span>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-green-600">
              <TrendingUp size={24} />
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-semibold text-gray-500">Transaksi Sukses</span>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{stats.total_transactions}</h2>
              <p className="text-xs text-gray-500 pt-1">Jumlah struk penjualan yang telah dibayar.</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <ShoppingBag size={24} />
            </div>
          </div>

          {/* Voids */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-semibold text-gray-500">Transaksi Void (Batal)</span>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{stats.total_voids}</h2>
              <p className="text-xs text-gray-500 pt-1">Jumlah struk belanja dibatalkan hari ini.</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-red-600">
              <XCircle size={24} />
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="font-bold text-gray-900 text-lg">5 Transaksi Terakhir Hari Ini</h2>
          <button 
            onClick={() => navigate("/orders")}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
          >
            <span>Semua Transaksi</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Memuat transaksi terbaru...</div>
        ) : recentOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <ShoppingBag size={32} className="mx-auto text-gray-300" />
            <p className="font-medium text-gray-500">Belum ada transaksi hari ini.</p>
            <p className="text-xs text-gray-400">Mulailah shift kasir lalu buat order baru di menu Cashier.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50/20 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">No. Struk</th>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Nama Pelanggan</th>
                  <th className="px-6 py-4 text-right">Total Transaksi</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-indigo-600">{order.order_number}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{order.customer_name || "-"}</td>
                    <td className="px-6 py-4 text-right font-extrabold text-gray-900">{formatIDR(order.total_amount)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        order.status === "paid" 
                          ? "bg-green-50 text-green-700 border border-green-200" 
                          : order.status === "void"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                      }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expandable Debug Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors font-bold text-gray-700 text-sm select-none"
        >
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
            Tauri Communication Test (Debug)
          </span>
          {showDebug ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {showDebug && (
          <div className="p-5 border-t border-gray-100 bg-gray-50/20 space-y-4">
            <button 
              onClick={handlePing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors cursor-pointer text-sm font-semibold shadow-sm"
            >
              Send Ping to Rust
            </button>
            {pingResult && (
              <div className="p-3 bg-gray-900 text-green-400 rounded font-mono text-xs border shadow-inner">
                Result from Rust: <span className="font-bold">{pingResult}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
