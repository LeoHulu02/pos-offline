import React from 'react';
import { Trash2, Plus, Minus, Search, X } from 'lucide-react';
import { formatIDR } from '../../utils/helpers';
import { usePosStore } from '../../stores/posStore';

interface CartPanelProps {
  onPayClick: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function CartPanel({ onPayClick, searchQuery, setSearchQuery }: CartPanelProps) {
  const pos = usePosStore();

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full shadow-xl z-10 relative">
      {/* Header & Search */}
      <div className="p-4 border-b border-gray-100 bg-white z-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex justify-between items-center">
          <span>Pesanan Saat Ini</span>
          <span className="bg-indigo-100 text-indigo-800 text-sm py-1 px-3 rounded-full">
            {pos.cart.reduce((sum, item) => sum + item.qty, 0)} item
          </span>
        </h2>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cari produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {pos.cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-2">
              <span className="text-4xl">🛒</span>
            </div>
            <p className="text-center text-gray-500 font-medium">Belum ada pesanan<br/><span className="text-sm font-normal">Pilih menu untuk menambahkan</span></p>
          </div>
        ) : (
          pos.cart.map((item) => (
            <div key={item.cart_id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3 group hover:border-indigo-100 transition-colors">
              <div className="flex justify-between items-start">
                <div className="pr-2">
                  <h4 className="font-semibold text-gray-900 leading-tight">{item.product_name}</h4>
                  {item.variant_name && (
                    <p className="text-sm text-gray-500 mt-0.5">{item.variant_name}</p>
                  )}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="mt-1">
                      {item.modifiers.map(m => (
                        <p key={m.modifier_id} className="text-xs text-gray-500 flex justify-between">
                          <span>+ {m.name}</span>
                          <span>{m.price_delta > 0 ? formatIDR(m.price_delta) : ''}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  {item.notes && (
                    <p className="text-xs text-amber-600 mt-1 italic">"{item.notes}"</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-600">{formatIDR(item.subtotal)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatIDR(item.base_price)} / item</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-100">
                  <button
                    onClick={() => pos.updateQty(item.cart_id, item.qty - 1)}
                    className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-6 text-center font-bold text-gray-900">{item.qty}</span>
                  <button
                    onClick={() => pos.updateQty(item.cart_id, item.qty + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <button
                  onClick={() => pos.removeItem(item.cart_id)}
                  className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Actions */}
      <div className="bg-white border-t border-gray-200 p-5 z-20">
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{formatIDR(pos.getSubtotal())}</span>
          </div>
          {pos.getTaxAmount() > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Pajak ({(pos.taxRate / 100).toFixed(0)}%)</span>
              <span>{formatIDR(pos.getTaxAmount())}</span>
            </div>
          )}
          {pos.getServiceAmount() > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Layanan ({(pos.serviceRate / 100).toFixed(0)}%)</span>
              <span>{formatIDR(pos.getServiceAmount())}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-xl pt-2 border-t border-gray-100 text-gray-900 mt-2">
            <span>Total</span>
            <span className="text-indigo-600">{formatIDR(pos.getTotalAmount())}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => pos.clearCart()}
            disabled={pos.cart.length === 0}
            className="px-4 py-4 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 size={24} />
          </button>
          <button
            onClick={onPayClick}
            disabled={pos.cart.length === 0}
            className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2"
          >
            <span>Bayar (F10)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
