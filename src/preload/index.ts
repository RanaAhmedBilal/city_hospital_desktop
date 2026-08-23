import { contextBridge, ipcRenderer } from 'electron';

// In-memory secure closure state (never persisted to unencrypted localStorage on disk)
let activeSessionToken: string | null = null;
let activeSessionUser: any = null;

const api = {
  // Generic invoker with session token propagation from in-memory state
  invoke: async <T = any>(channel: string, payload?: any): Promise<{ success: boolean; data?: T; error?: string }> => {
    return await ipcRenderer.invoke(channel, { token: activeSessionToken, payload });
  },

  // Auth Helper
  login: async (credentials: any) => {
    const res = await ipcRenderer.invoke('auth:login', { payload: credentials });
    if (res.success && res.data?.token) {
      activeSessionToken = res.data.token;
      activeSessionUser = res.data.user;
    }
    return res;
  },

  logout: async () => {
    if (activeSessionToken) {
      await ipcRenderer.invoke('auth:logout', { token: activeSessionToken });
    }
    activeSessionToken = null;
    activeSessionUser = null;
  },

  getCurrentUser: () => {
    return activeSessionUser;
  },

  getToken: () => {
    return activeSessionToken;
  },
};

export type ElectronApi = typeof api;

contextBridge.exposeInMainWorld('api', api);
