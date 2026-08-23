import { create } from 'zustand';
import { AuthUser } from '../../shared/types';
import { RoleType } from '../../shared/constants/roles';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null, token?: string | null) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: RoleType) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Initialize from secure preload in-memory state if available
  // @ts-ignore
  const activeUser = window.api?.getCurrentUser ? window.api.getCurrentUser() : null;
  // @ts-ignore
  const activeToken = window.api?.getToken ? window.api.getToken() : null;

  return {
    user: activeUser,
    token: activeToken,
    isAuthenticated: !!(activeUser && activeToken),

    setUser: (user, token) => {
      if (user && token) {
        set({ user, token, isAuthenticated: true });
      } else {
        set({ user: null, token: null, isAuthenticated: false });
      }
    },

    logout: () => {
      // @ts-ignore
      if (window.api?.logout) {
        // @ts-ignore
        window.api.logout();
      }
      set({ user: null, token: null, isAuthenticated: false });
    },

    hasPermission: (perm) => {
      const { user } = get();
      if (!user) return false;
      if (user.roles.includes(RoleType.ADMINISTRATOR)) return true;
      return user.permissions.includes(perm);
    },

    hasRole: (role) => {
      const { user } = get();
      if (!user) return false;
      return user.roles.includes(role) || user.roles.includes(RoleType.ADMINISTRATOR);
    },
  };
});
