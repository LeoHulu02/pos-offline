import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { Shift } from '../types/models';

interface ShiftState {
  activeShift: Shift | null;
  isShiftLoaded: boolean;
  loadActiveShift: (cashier_id: string) => Promise<void>;
  clearActiveShift: () => void;
}

export const useShiftStore = create<ShiftState>((set) => ({
  activeShift: null,
  isShiftLoaded: false,

  loadActiveShift: async (cashier_id: string) => {
    try {
      const shift = await invoke<Shift | null>('get_active_shift', { cashierId: cashier_id });
      set({ activeShift: shift, isShiftLoaded: true });
    } catch (error) {
      console.error('Failed to load active shift:', error);
      set({ activeShift: null, isShiftLoaded: true });
    }
  },

  clearActiveShift: () => {
    set({ activeShift: null, isShiftLoaded: false });
  },
}));
