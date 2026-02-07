const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script to expose safe APIs to the renderer process
 * This maintains security while allowing necessary communication
 */
contextBridge.exposeInMainWorld('electron', {
  /**
   * Get application paths (userData, database, logs)
   */
  getAppPath: () => ipcRenderer.invoke('get-app-path'),

  /**
   * Get the backend API URL
   */
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),

  /**
   * Get application version
   */
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  /**
   * Check if running in Electron
   */
  isElectron: true,

  /**
   * Platform information
   */
  platform: process.platform,
});
