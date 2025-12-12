import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, User, TokenResponse } from '@/lib/api/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User) => void;
  clearError: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const tokens = await authApi.login({ email, password });
          const user = await authApi.getMe(tokens.access_token);
          
          set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            user,
            isLoading: false,
          });
          
          return true;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Erro ao fazer login',
          });
          return false;
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          error: null,
        });
      },

      setUser: (user: User) => {
        set({ user });
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuth: async () => {
        const { accessToken, refreshToken } = get();
        
        if (!accessToken) {
          return false;
        }

        try {
          const user = await authApi.getMe(accessToken);
          set({ user });
          return true;
        } catch {
          // Try to refresh token
          if (refreshToken) {
            try {
              const tokens = await authApi.refresh(refreshToken);
              const user = await authApi.getMe(tokens.access_token);
              
              set({
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                user,
              });
              
              return true;
            } catch {
              get().logout();
              return false;
            }
          }
          
          get().logout();
          return false;
        }
      },
    }),
    {
      name: 'sig-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

