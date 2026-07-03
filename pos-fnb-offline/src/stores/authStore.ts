import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { User } from '../types/models';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  initAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  initAuth: async () => {
    try {
      const user = await invoke<User | null>('get_current_user');
      set({
        user,
        isAuthenticated: !!user,
        isInitialized: true,
      });
    } catch (error) {
      console.error('Failed to init auth:', error);
      set({
        user: null,
        isAuthenticated: false,
        isInitialized: true,
      });
    }
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  logout: async () => {
    try {
      await invoke('logout');
      set({
        user: null,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  },
}));
