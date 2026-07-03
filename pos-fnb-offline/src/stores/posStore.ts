import { create } from 'zustand';
import { CartModifier, CartItem } from '../types/models';

interface PosState {
  cart: CartItem[];
  customerName: string;
  queueNumber: string;
  taxRate: number; // in basis points, e.g. 1100 = 11%
  serviceRate: number; // in basis points
  
  addItem: (item: Omit<CartItem, 'cart_id' | 'subtotal'>) => void;
  removeItem: (cart_id: string) => void;
  updateQty: (cart_id: string, qty: number) => void;
  setCustomerName: (name: string) => void;
  setQueueNumber: (q: string) => void;
  setRates: (taxRate: number, serviceRate: number) => void;
  clearCart: () => void;
  
  // Selectors
  getSubtotal: () => number;
  getTaxAmount: () => number;
  getServiceAmount: () => number;
  getTotalAmount: () => number;
}

const generateCartId = () => Math.random().toString(36).substr(2, 9);

export const usePosStore = create<PosState>((set, get) => ({
  cart: [],
  customerName: "",
  queueNumber: "",
  taxRate: 1100, // Default 11% tax
  serviceRate: 0,
  
  addItem: (item) => {
    const subtotal = (item.base_price + item.modifiers.reduce((sum, m) => sum + m.price_delta, 0)) * item.qty;
    const cartItem: CartItem = {
      ...item,
      cart_id: generateCartId(),
      subtotal
    };
    
    // Simple logic: if exact same product, variant, modifiers, and notes exist, we could merge. 
    // For MVP, we just add as new line item.
    set((state) => ({ cart: [...state.cart, cartItem] }));
  },
  
  removeItem: (cart_id) => {
    set((state) => ({ cart: state.cart.filter(item => item.cart_id !== cart_id) }));
  },
  
  updateQty: (cart_id, qty) => {
    set((state) => ({
      cart: state.cart.map(item => {
        if (item.cart_id === cart_id) {
          const unitPrice = item.base_price + item.modifiers.reduce((sum, m) => sum + m.price_delta, 0);
          return { ...item, qty, subtotal: unitPrice * qty };
        }
        return item;
      })
    }));
  },
  
  setCustomerName: (name) => set({ customerName: name }),
  setQueueNumber: (q) => set({ queueNumber: q }),
  setRates: (taxRate, serviceRate) => set({ taxRate, serviceRate }),
  
  clearCart: () => set({ cart: [], customerName: "", queueNumber: "" }),
  
  getSubtotal: () => {
    return get().cart.reduce((sum, item) => sum + item.subtotal, 0);
  },
  
  getTaxAmount: () => {
    const sub = get().getSubtotal();
    return Math.floor((sub * get().taxRate) / 10000);
  },
  
  getServiceAmount: () => {
    const sub = get().getSubtotal();
    return Math.floor((sub * get().serviceRate) / 10000);
  },
  
  getTotalAmount: () => {
    return get().getSubtotal() + get().getTaxAmount() + get().getServiceAmount();
  }
}));
