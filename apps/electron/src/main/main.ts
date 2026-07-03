import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

// IPC Handlers
import { registerBuildHandlers } from './ipc/build.handler.js';
import { registerFileHandlers } from './ipc/file.handler.js';
import { registerAssetHandlers } from './ipc/asset.handler.js';
import { registerAppHandlers } from './ipc/app.handler.js';

// Protocols & Services
import { registerLocalAssetProtocol } from './protocol/local-asset.protocol.js';
import { DatabaseService } from './services/database.service.js';

// ESM dirname resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let databaseService: DatabaseService | null = null;

// Error logging setup
const logFilePath = path.join(app.getPath('userData'), 'logs', 'main.log');
fs.ensureDirSync(path.dirname(logFilePath));

function logError(message: string, stack?: string) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message,
    stack,
  };
  try {
    fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + '\n', 'utf8');
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

// Global Exception Handlers (Task 11.2)
process.on('uncaughtException', (error) => {
  logError('Uncaught Exception: ' + error.message, error.stack);
  app.quit();
});

process.on('unhandledRejection', (reason: any) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  logError('Unhandled Rejection: ' + msg, stack);
});

// Single-Instance Lock (Task 11.1)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      // Initialize Local Database Service
      databaseService = new DatabaseService();

      // Register Custom Asset Protocol
      registerLocalAssetProtocol(databaseService);

      // Create window
      createWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      });
    } catch (err: any) {
      logError('Error during app initialization: ' + err.message, err.stack);
      app.quit();
    }
  });
}

function createWindow() {
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    frame: true,
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,   // Security boundary
      nodeIntegration: false,    // Security boundary
      sandbox: false,            // Allow preload access to IPC
      webSecurity: true,
    },
  });

  // Register all IPC command handlers
  registerBuildHandlers(ipcMain, mainWindow);
  registerFileHandlers(ipcMain, mainWindow);
  registerAssetHandlers(ipcMain, mainWindow);
  registerAppHandlers(ipcMain, mainWindow);

  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`file://${path.join(__dirname, '../../web/index.html')}`);
  }

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
