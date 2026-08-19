import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Generic invoker with session token propagation
  invoke: async <T = any>(channel: string, payload?: any): Promise<{ success: boolean; data?: T; error?: string }> => {
    const token = localStorage.getItem('city_hospital_auth_token');
    return await ipcRenderer.invoke(channel, { token, payload });
  },

  // Auth Helper
  login: async (credentials: any) => {
    const res = await ipcRenderer.invoke('auth:login', { payload: credentials });
    if (res.success && res.data?.token) {
      localStorage.setItem('city_hospital_auth_token', res.data.token);
      localStorage.setItem('city_hospital_user', JSON.stringify(res.data.user));
    }
    return res;
  },

  logout: async () => {
    const token = localStorage.getItem('city_hospital_auth_token');
    await ipcRenderer.invoke('auth:logout', { token });
    localStorage.removeItem('city_hospital_auth_token');
    localStorage.removeItem('city_hospital_user');
  },

  getCurrentUser: () => {
    const stored = localStorage.getItem('city_hospital_user');
    return stored ? JSON.parse(stored) : null;
  },
};

export type ElectronApi = typeof api;

contextBridge.exposeInMainWorld('api', api);
