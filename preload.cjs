const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('branch', {
  restore: () => ipcRenderer.invoke('restore-map'),
  rememberOpened: (file) => ipcRenderer.invoke('remember-opened-map', file),
  open: () => ipcRenderer.invoke('open-map'),
  save: (content, file) => ipcRenderer.invoke('save-map', content, file),
  pdf: (title) => ipcRenderer.invoke('export-pdf', title)
});
