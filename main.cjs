const { app, BrowserWindow, dialog, ipcMain, safeStorage } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

function createWindow() {
  const window = new BrowserWindow({
    width: 1280, height: 850, minWidth: 760, minHeight: 520,
    backgroundColor: '#f9f8f4', title: 'Branch3',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), sandbox: true }
  });
  window.webContents.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBoxSync(window, {
      type: 'warning', message: 'Close this map and discard unsaved changes?',
      buttons: ['Keep editing', 'Discard changes'], defaultId: 0, cancelId: 0
    });
    if (choice === 1) event.preventDefault();
  });
  window.loadFile(path.join(__dirname, 'index.html'));
}
const openedFiles = new WeakMap();
const recentFile = () => path.join(app.getPath('userData'), 'last-map.json');

async function readMap(file) {
  const info = await fs.stat(file);
  if (!info.isFile() || info.size > 40_000_000) throw new Error('Choose a map file under 40 MB.');
  return { file, content: await fs.readFile(file, 'utf8') };
}

async function writeAtomically(file, content) {
  const temporary = file + '.' + require('node:crypto').randomUUID() + '.tmp';
  try {
    await fs.writeFile(temporary, content, { flag: 'wx' });
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

async function rememberMap(file) {
  try {
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await writeAtomically(recentFile(), JSON.stringify(file));
  } catch (error) {
    console.warn('Could not remember the last map:', error.message);
  }
}

function registerPreferences(name) {
  const file = () => path.join(app.getPath('userData'), name + '-preferences.json');
  ipcMain.handle('load-' + name + '-preferences', async () => {
    try {
      return JSON.parse(await fs.readFile(file(), 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return {};
      throw error;
    }
  });
  ipcMain.handle('save-' + name + '-preferences', async (_event, preferences) => {
    const content = JSON.stringify(preferences, null, 2);
    if (!content || content.length > 4096) throw new Error('Invalid ' + name + ' preferences.');
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await writeAtomically(file(), content);
  });
}
registerPreferences('keyboard');
registerPreferences('appearance');

const { generateTree } = require('./ai.cjs');
const aiKeyFile = () => path.join(app.getPath('userData'), 'ai-key');
async function readAIKey() {
  try {
    if (!safeStorage.isEncryptionAvailable() || safeStorage.getSelectedStorageBackend?.() === 'basic_text') return '';
    return safeStorage.decryptString(await fs.readFile(aiKeyFile()));
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}
ipcMain.handle('has-ai-key', async () => Boolean(await readAIKey()));
ipcMain.handle('save-ai-key', async (_event, key) => {
  if (typeof key !== 'string' || key.length > 512) throw new Error('Invalid API key.');
  if (!key) {
    await fs.rm(aiKeyFile(), { force: true });
    return false;
  }
  if (!safeStorage.isEncryptionAvailable() || safeStorage.getSelectedStorageBackend?.() === 'basic_text') throw new Error('Secure credential storage is unavailable.');
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await writeAtomically(aiKeyFile(), safeStorage.encryptString(key));
  return true;
});
ipcMain.handle('generate-tree', async (_event, topic, available) => {
  const key = await readAIKey();
  if (!key) throw new Error('Set the AI key from the Settings panel first.');
  return generateTree(key, topic, available);
});

ipcMain.handle('restore-map', async () => {
  let file;
  try {
    file = JSON.parse(await fs.readFile(recentFile(), 'utf8'));
  } catch {
    return null;
  }
  if (typeof file !== 'string' || !path.isAbsolute(file)) return null;
  return readMap(file);
});

ipcMain.handle('remember-opened-map', async ({ sender }, file) => {
  if (openedFiles.get(sender) !== file) return;
  openedFiles.delete(sender);
  await rememberMap(file);
});

ipcMain.handle('open-map', async ({ sender }) => {
  const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(sender), {
    properties: ['openFile'], filters: [{ name: 'Branch maps', extensions: ['branch', 'json'] }]
  });
  if (result.canceled) return null;
  const file = result.filePaths[0];
  const opened = await readMap(file);
  openedFiles.set(sender, file);
  return opened;
});
ipcMain.handle('save-map', async ({ sender }, content, currentFile, saveAs) => {
  let file = currentFile;
  if (!file || saveAs) {
    const result = await dialog.showSaveDialog(BrowserWindow.fromWebContents(sender), {
      defaultPath: currentFile || 'Untitled.branch', filters: [{ name: 'Branch maps', extensions: ['branch'] }]
    });
    if (result.canceled) return null;
    file = result.filePath;
  }
  await writeAtomically(file, content);
  await rememberMap(file);
  return file;
});
ipcMain.handle('export-pdf', async ({ sender }, title) => {
  const result = await dialog.showSaveDialog(BrowserWindow.fromWebContents(sender), {
    defaultPath: (title.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 80) || 'Mind map') + '.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (result.canceled) return null;
  const pdf = await sender.printToPDF({ printBackground: true, landscape: true, preferCSSPageSize: true });
  await fs.writeFile(result.filePath, pdf);
  return result.filePath;
});
app.whenReady().then(createWindow);
app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
