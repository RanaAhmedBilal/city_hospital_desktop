import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc/router';
import { disconnectPrisma } from './database/prisma';

let mainWindow: BrowserWindow | null = null;

/**
 * Validate URL protocol and hostname against trusted hospital domain whitelist
 */
function isAllowedExternalUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);

    // Strictly require http or https scheme
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Allowed local and trusted hospital domains
    const allowedDomains = [
      'localhost',
      '127.0.0.1',
      'cityhospital.org',
      'cityhospital.com',
    ];

    return allowedDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'City Hospital Management System',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Register all typed IPC routes
  registerIpcHandlers();

  // Handle external links safely in system browser with strict scheme & domain validation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      shell.openExternal(url);
    } else {
      console.warn(`[Security Warning] Blocked external link navigation attempt to untrusted URL: ${url}`);
    }
    return { action: 'deny' };
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev && process.env.WAIT_ON) {
    await mainWindow.loadURL(process.env.WAIT_ON);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist-renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', async () => {
  await disconnectPrisma();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
