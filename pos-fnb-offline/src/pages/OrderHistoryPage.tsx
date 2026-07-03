import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Printer, ChefHat, XCircle } from "lucide-react";
import { useShiftStore } from "../stores/shiftStore";
import { useAuthStore } from "../stores/authStore";
import { useToastStore } from "../stores/toastStore";

interface OrderSummary {
  id: string;
  receipt_number: string;
  customer_name: string | null;
  status: string;
  total_amount: number;
  created_at: string;
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { activeShift } = useShiftStore();
  const { user } = useAuthStore();
  
  // Void State
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [orderToVoid, setOrderToVoid] = useState<OrderSummary | null>(null);
  const [adminPin, setAdminPin] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  
  // Print Confirm State
  const [printConfirmData, setPrintConfirmData] = useState<{type: 'receipt' | 'kitchen', orderId: string, receiptNumber: string} | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      if (!activeShift) return;
      try {
        setLoading(true);
        const data = await invoke<OrderSummary[]>("get_orders_by_shift", { shiftId: activeShift.id });
        setOrders(data);
      } catch (error) {
        console.error("Failed to load orders:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (activeShift) {
      loadOrders();
    } else {
      setLoading(false);
    }
  }, [activeShift]);
  
  const loadOrders = async () => {
    if (!activeShift) return;
    try {
      setLoading(true);
      const data = await invoke<OrderSummary[]>("get_orders_by_shift", { shiftId: activeShift.id });
      setOrders(data);
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  const handleReprint = async () => {
    if (!printConfirmData) return;
    try {
      await invoke("print_receipt", { orderId: printConfirmData.orderId });
      useToastStore.getState().addToast("Permintaan cetak struk telah dikirim.", "success");
      setPrintConfirmData(null);
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast("Gagal mencetak: " + error, "error");
    }
  };

  const handlePrintKitchen = async () => {
    if (!printConfirmData) return;
    try {
      await invoke("print_kitchen_ticket", { orderId: printConfirmData.orderId });
      useToastStore.getState().addToast("Tiket dapur dikirim ke printer.", "success");
      setPrintConfirmData(null);
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast("Gagal mencetak tiket dapur: " + error, "error");
    }
  };

  const handleVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToVoid || !user) return;
    
    setIsVoiding(true);
    try {
      await invoke("void_order", {
        payload: {
          order_id: orderToVoid.id,
          admin_pin: adminPin,
          reason: voidReason,
          user_id: user.id
        }
      });
      useToastStore.getState().addToast("Order berhasil di-void.", "success");
      setShowVoidModal(false);
      setAdminPin("");
      setVoidReason("");
      loadOrders(); // Refresh table
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast("Gagal membatalkan order: " + error, "error");
    } finally {
      setIsVoiding(false);
    }
  };

  if (!activeShift) {
    return (
      <div className="p-8 text-center text-gray-500">
        Anda harus membuka shift terlebih dahulu untuk melihat riwayat order hari ini.
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Riwayat Transaksi (Shift Saat Ini)</h1>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Memuat transaksi...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Struk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pelanggan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-indigo-600">{order.receipt_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(order.created_at)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.customer_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatIDR(order.total_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'paid' ? 'bg-green-100 text-green-800' : order.status === 'void' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {order.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-3">
                    <button onClick={() => setPrintConfirmData({type: 'kitchen', orderId: order.id, receiptNumber: order.receipt_number})} className="text-orange-500 hover:text-orange-700 transition-colors" title="Cetak Tiket Dapur">
                      <ChefHat size={18} />
                    </button>
                    <button onClick={() => setPrintConfirmData({type: 'receipt', orderId: order.id, receiptNumber: order.receipt_number})} className="text-gray-500 hover:text-indigo-600 transition-colors" title="Cetak Struk">
                      <Printer size={18} />
                    </button>
                    {order.status !== 'void' && (
                      <button onClick={() => { setOrderToVoid(order); setShowVoidModal(true); }} className="text-red-400 hover:text-red-600 transition-colors" title="Void Order">
                        <XCircle size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 bg-gray-50">Belum ada transaksi di shift ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Void Modal */}
      {showVoidModal && orderToVoid && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-xl font-bold text-red-600 mb-2 flex items-center gap-2"><XCircle/> Void Order</h2>
            <p className="text-sm text-gray-600 mb-4">Membatalkan struk <strong>{orderToVoid.receipt_number}</strong></p>
            
            <form onSubmit={handleVoid} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Alasan Void</label>
                <input type="text" required value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="Contoh: Salah input pesanan" className="mt-1 block w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PIN Otorisasi (Admin)</label>
                <input type="password" required value={adminPin} onChange={e => setAdminPin(e.target.value)} maxLength={6} className="mt-1 block w-full px-3 py-2 border rounded-md tracking-widest text-center text-lg" />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => { setShowVoidModal(false); setAdminPin(""); setVoidReason(""); }} className="flex-1 px-4 py-2 border rounded-md">Batal</button>
                <button type="submit" disabled={isVoiding} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md font-bold disabled:opacity-50">
                  {isVoiding ? "Memproses..." : "Konfirmasi Void"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Confirm Modal */}
      {printConfirmData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
              {printConfirmData.type === 'kitchen' ? <ChefHat className="h-6 w-6 text-indigo-600" /> : <Printer className="h-6 w-6 text-indigo-600" />}
            </div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
              Konfirmasi Cetak {printConfirmData.type === 'kitchen' ? 'Dapur' : 'Struk'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Apakah Anda yakin ingin mencetak {printConfirmData.type === 'kitchen' ? 'tiket dapur' : 'struk kasir'} untuk transaksi <strong>{printConfirmData.receiptNumber}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setPrintConfirmData(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="flex-1 bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700"
                onClick={printConfirmData.type === 'kitchen' ? handlePrintKitchen : handleReprint}
              >
                Cetak Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
