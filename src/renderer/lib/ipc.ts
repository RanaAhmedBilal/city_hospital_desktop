import { useAuthStore } from '../stores/authStore';

/**
 * Safe IPC Caller that communicates with Electron Preload Bridge
 */
export async function invokeIpc<T = any>(
  channel: string,
  payload?: any
): Promise<{ success: boolean; data?: T; error?: string }> {
  // @ts-ignore
  if (typeof window !== 'undefined' && window.api?.invoke) {
    // @ts-ignore
    const res = await window.api.invoke<T>(channel, payload);
    if (!res.success && res.error && (res.error.includes('Authentication required') || res.error.includes('Please log in'))) {
      useAuthStore.getState().logout();
    }
    return res;
  }

  console.warn(`[IPC Fallback] window.api is not available for channel "${channel}".`);
  return {
    success: false,
    error: 'Desktop IPC bridge is unavailable.',
  };
}

