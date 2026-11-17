const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('branch', {
  hasAIKey: () => ipcRenderer.invoke('has-ai-key'),
  saveAIKey: (key) => ipcRenderer.invoke('save-ai-key', key),
  generateTree: (topic, available) => ipcRenderer.invoke('generate-tree', topic, available),
  loadAppearance: () => ipcRenderer.invoke('load-appearance-preferences'),
  saveAppearance: (preferences) => ipcRenderer.invoke('save-appearance-preferences', preferences),
  loadKeyboard: () => ipcRenderer.invoke('load-keyboard-preferences'),
  saveKeyboard: (preferences) => ipcRenderer.invoke('save-keyboard-preferences', preferences),
  restore: () => ipcRenderer.invoke('restore-map'),
  rememberOpened: (file) => ipcRenderer.invoke('remember-opened-map', file),
  open: () => ipcRenderer.invoke('open-map'),
  save: (content, file, saveAs) => ipcRenderer.invoke('save-map', content, file, saveAs),
  pdf: (title) => ipcRenderer.invoke('export-pdf', title)
});
