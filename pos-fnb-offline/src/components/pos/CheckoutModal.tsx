import React from 'react';
import { X, Calculator, CreditCard, Banknote } from 'lucide-react';
import { formatIDR } from '../../utils/helpers';
import { usePosStore } from '../../stores/posStore';

interface CheckoutModalProps {
  onClose: () => void;
  onProcessPayment: () => void;
  isProcessing: boolean;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  paymentAmount: number;
  setPaymentAmount: (amount: number) => void;
  orderType: string;
  setOrderType: (type: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  tableNote: string;
  setTableNote: (note: string) => void;
}

export default function CheckoutModal({
  onClose,
  onProcessPayment,
  isProcessing,
  paymentMethod,
  setPaymentMethod,
  paymentAmount,
  setPaymentAmount,
  orderType,
  setOrderType,
  customerName,
  setCustomerName,
  tableNote,
  setTableNote
}: CheckoutModalProps) {
  const pos = usePosStore();
  const totalAmount = pos.getTotalAmount();
  const change = paymentAmount - totalAmount;

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">Pembayaran</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-100 p-2 rounded-full transition-colors shadow-sm">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Order Details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Pesanan</label>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${orderType === 'dine_in' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setOrderType('dine_in')}
                >
                  Dine In
                </button>
                <button
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${orderType === 'takeaway' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setOrderType('takeaway')}
                >
                  Takeaway
                </button>
              </div>
            </div>
            {orderType === 'dine_in' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Meja</label>
                <input
                  type="text"
                  value={tableNote}
                  onChange={(e) => setTableNote(e.target.value)}
                  placeholder="Contoh: Meja 12"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Pelanggan</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama pemesan..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl mb-6 border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-500">Total Tagihan</span>
            </div>
            <div className="text-4xl font-bold text-gray-900">{formatIDR(totalAmount)}</div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Metode Pembayaran</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                className={`py-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-all ${paymentMethod === 'cash' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                onClick={() => setPaymentMethod('cash')}
              >
                <Banknote size={24} />
                <span className="font-medium">Tunai</span>
              </button>
              <button
                className={`py-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-all ${paymentMethod === 'qris' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                onClick={() => {
                  setPaymentMethod('qris');
                  setPaymentAmount(totalAmount);
                }}
              >
                <Calculator size={24} />
                <span className="font-medium">QRIS</span>
              </button>
              <button
                className={`py-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-all ${paymentMethod === 'card' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                onClick={() => {
                  setPaymentMethod('card');
                  setPaymentAmount(totalAmount);
                }}
              >
                <CreditCard size={24} />
                <span className="font-medium">Kartu Debit/Kredit</span>
              </button>
            </div>
          </div>

          {paymentMethod === 'cash' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Uang Diterima</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                <input
                  type="number"
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
                  className="w-full pl-12 pr-4 py-4 text-xl border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-gray-50 focus:bg-white transition-colors font-medium"
                />
              </div>
              
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[50000, 100000, totalAmount].map((amt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPaymentAmount(amt)}
                    className="py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                  >
                    {amt === totalAmount ? 'Uang Pas' : formatIDR(amt)}
                  </button>
                ))}
              </div>

              {paymentAmount >= totalAmount && (
                <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100 flex justify-between items-center">
                  <span className="text-green-800 font-medium">Kembalian</span>
                  <span className="text-2xl font-bold text-green-700">{formatIDR(change)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onProcessPayment}
            disabled={isProcessing || (paymentMethod === 'cash' && paymentAmount < totalAmount)}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2"
          >
            {isProcessing ? 'Memproses...' : 'Proses Pembayaran'}
          </button>
        </div>
      </div>
    </div>
  );
}
