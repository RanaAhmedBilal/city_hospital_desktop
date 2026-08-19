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
  // Initialize from localStorage
  const storedUser = localStorage.getItem('city_hospital_user');
  const storedToken = localStorage.getItem('city_hospital_auth_token');
  let parsedUser: AuthUser | null = null;
  try {
    if (storedUser) parsedUser = JSON.parse(storedUser);
  } catch (e) {}

  return {
    user: parsedUser,
    token: storedToken,
    isAuthenticated: !!(parsedUser && storedToken),

    setUser: (user, token) => {
      if (user && token) {
        localStorage.setItem('city_hospital_user', JSON.stringify(user));
        localStorage.setItem('city_hospital_auth_token', token);
        set({ user, token, isAuthenticated: true });
      } else {
        localStorage.removeItem('city_hospital_user');
        localStorage.removeItem('city_hospital_auth_token');
        set({ user: null, token: null, isAuthenticated: false });
      }
    },

    logout: () => {
      localStorage.removeItem('city_hospital_user');
      localStorage.removeItem('city_hospital_auth_token');
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
