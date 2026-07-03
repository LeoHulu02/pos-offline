import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { BarChart, Calendar, Download } from "lucide-react";
import { useToastStore } from "../stores/toastStore";

interface DailySales {
  date: string;
  total_revenue: number;
  total_tax: number;
  total_transactions: number;
}

interface BestSeller {
  product_name: string;
  total_qty: number;
  total_revenue: number;
}

interface PaymentBreakdown {
  method: string;
  total_amount: number;
  transaction_count: number;
}

interface VoidReport {
  order_number: string;
  total_amount: number;
  void_reason: string | null;
  voided_by_name: string | null;
  created_at: string;
}

export default function ReportPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>([]);
  const [voidReports, setVoidReports] = useState<VoidReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'sales' | 'payments' | 'voids'>('sales');

  const loadData = async () => {
    setLoading(true);
    try {
      const [sales, best, payments, voids] = await Promise.all([
        invoke<DailySales[]>("get_daily_sales", { startDate, endDate }),
        invoke<BestSeller[]>("get_best_sellers", { startDate, endDate }),
        invoke<PaymentBreakdown[]>("get_payment_breakdown", { startDate, endDate }),
        invoke<VoidReport[]>("get_void_refund_report", { startDate, endDate })
      ]);
      setDailySales(sales);
      setBestSellers(best);
      setPaymentBreakdown(payments);
      setVoidReports(voids);
    } catch (error) {
      console.error("Failed to load reports:", error);
      useToastStore.getState().addToast("Gagal memuat laporan: " + error, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  const handleExportCSV = async () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = "";

    if (activeTab === 'sales') {
      headers = ["Tanggal", "Total Transaksi", "Total Pendapatan", "Total Pajak"];
      rows = dailySales.map(d => [
        d.date, 
        d.total_transactions.toString(), 
        d.total_revenue.toString(), 
        d.total_tax.toString()
      ]);
      filename = `laporan_penjualan_${startDate}_to_${endDate}.csv`;
    } else if (activeTab === 'payments') {
      headers = ["Metode Pembayaran", "Total Nominal", "Jumlah Transaksi"];
      rows = paymentBreakdown.map(p => [
        p.method.toUpperCase(),
        p.total_amount.toString(),
        p.transaction_count.toString()
      ]);
      filename = `laporan_pembayaran_${startDate}_to_${endDate}.csv`;
    } else {
      headers = ["Waktu Pembatalan", "No. Struk", "Nominal Void", "Alasan Void", "Otorisator"];
      rows = voidReports.map(v => [
        new Date(v.created_at).toLocaleString('id-ID'),
        v.order_number,
        v.total_amount.toString(),
        v.void_reason || "",
        v.voided_by_name || ""
      ]);
      filename = `laporan_void_${startDate}_to_${endDate}.csv`;
    }

    const csvContent = headers.join(",") + "\n" + rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");

    try {
      const path = await save({
        defaultPath: filename,
        filters: [{ name: 'CSV File', extensions: ['csv'] }]
      });
      if (path) {
        await invoke("write_text_file", { path, content: csvContent });
        useToastStore.getState().addToast("Laporan berhasil diexport ke CSV!", "success");
      }
    } catch (err) {
      console.error(err);
      useToastStore.getState().addToast("Gagal mengekspor laporan: " + err, "error");
    }
  };

  const totalRevenue = dailySales.reduce((sum, item) => sum + item.total_revenue, 0);
  const totalTransactions = dailySales.reduce((sum, item) => sum + item.total_transactions, 0);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 overflow-y-auto h-screen pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <BarChart className="text-orange-600" size={28} />
          Laporan & Analitik Penjualan
        </h1>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-400" />
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="text-sm border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <span className="text-gray-400">-</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)}
            className="text-sm border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
          />
          <button 
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Memuat..." : "Terapkan"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Pendapatan Bersih</div>
          <div className="text-3xl font-extrabold text-orange-600">{formatIDR(totalRevenue)}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Transaksi Sukses</div>
          <div className="text-3xl font-extrabold text-gray-900">{totalTransactions}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Rata-rata Nilai Transaksi</div>
          <div className="text-3xl font-extrabold text-gray-900">
            {totalTransactions > 0 ? formatIDR(Math.floor(totalRevenue / totalTransactions)) : formatIDR(0)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-250 font-bold">
        <button
          onClick={() => setActiveTab('sales')}
          className={`py-2.5 px-6 text-sm border-b-2 transition-all cursor-pointer ${activeTab === 'sales' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Penjualan Harian
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`py-2.5 px-6 text-sm border-b-2 transition-all cursor-pointer ${activeTab === 'payments' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Metode Pembayaran
        </button>
        <button
          onClick={() => setActiveTab('voids')}
          className={`py-2.5 px-6 text-sm border-b-2 transition-all cursor-pointer ${activeTab === 'voids' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Void & Pembatalan
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Sales Table */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-bold text-gray-900">Penjualan Harian</h2>
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-bold border border-orange-200 px-2.5 py-1 rounded bg-white hover:bg-orange-50 cursor-pointer shadow-sm"
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-150 text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Tanggal</th>
                    <th className="px-6 py-3.5 text-right">Transaksi</th>
                    <th className="px-6 py-3.5 text-right">Pajak</th>
                    <th className="px-6 py-3.5 text-right">Pendapatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {dailySales.length > 0 ? dailySales.map((day, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3.5 text-gray-900">{day.date}</td>
                      <td className="px-6 py-3.5 text-gray-600 text-right">{day.total_transactions}</td>
                      <td className="px-6 py-3.5 text-gray-500 text-right">{formatIDR(day.total_tax)}</td>
                      <td className="px-6 py-3.5 font-bold text-green-600 text-right">{formatIDR(day.total_revenue)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Tidak ada data penjualan di rentang waktu ini.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Best Sellers */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50/50">
              <h2 className="font-bold text-gray-900">10 Produk Terlaris (Top Seller)</h2>
            </div>
            <ul className="divide-y divide-gray-100 text-sm">
              {bestSellers.length > 0 ? bestSellers.map((item, idx) => (
                <li key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50/50 font-medium">
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-gray-400 w-5">{idx + 1}.</div>
                    <div>
                      <div className="font-bold text-gray-900">{item.product_name}</div>
                      <div className="text-xs text-gray-500">{item.total_qty} porsi terjual</div>
                    </div>
                  </div>
                  <div className="font-bold text-gray-950">{formatIDR(item.total_revenue)}</div>
                </li>
              )) : (
                <li className="p-8 text-center text-gray-500">Belum ada data penjualan produk.</li>
              )}
            </ul>
          </div>
        </div>
      )}
      
      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-3xl">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
            <h2 className="font-bold text-gray-900">Breakdown Metode Pembayaran</h2>
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-bold border border-orange-200 px-2.5 py-1 rounded bg-white hover:bg-orange-50 cursor-pointer shadow-sm"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
          <table className="min-w-full divide-y divide-gray-150 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3.5">Metode Pembayaran</th>
                <th className="px-6 py-3.5 text-right">Jumlah Transaksi</th>
                <th className="px-6 py-3.5 text-right">Total Pendapatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {paymentBreakdown.length > 0 ? paymentBreakdown.map((pb, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3.5 text-gray-900 capitalize font-bold">{pb.method}</td>
                  <td className="px-6 py-3.5 text-gray-600 text-right">{pb.transaction_count}</td>
                  <td className="px-6 py-3.5 font-bold text-green-600 text-right">{formatIDR(pb.total_amount)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">Belum ada transaksi pembayaran.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'voids' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
            <h2 className="font-bold text-gray-900">Daftar Void & Pembatalan Transaksi</h2>
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-bold border border-orange-200 px-2.5 py-1 rounded bg-white hover:bg-orange-50 cursor-pointer shadow-sm"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
          <table className="min-w-full divide-y divide-gray-150 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3.5">Waktu Pembatalan</th>
                <th className="px-6 py-3.5">No. Struk</th>
                <th className="px-6 py-3.5">Total Nominal</th>
                <th className="px-6 py-3.5">Alasan Void</th>
                <th className="px-6 py-3.5">Dibatalkan Oleh (Admin)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {voidReports.length > 0 ? voidReports.map((vr, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3.5 text-gray-500">{new Date(vr.created_at).toLocaleString('id-ID')}</td>
                  <td className="px-6 py-3.5 font-bold text-red-650">{vr.order_number}</td>
                  <td className="px-6 py-3.5 font-bold text-gray-900">{formatIDR(vr.total_amount)}</td>
                  <td className="px-6 py-3.5 text-gray-600">{vr.void_reason || '-'}</td>
                  <td className="px-6 py-3.5 text-gray-900 font-bold">{vr.voided_by_name || '-'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Tidak ada transaksi void di rentang waktu ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
