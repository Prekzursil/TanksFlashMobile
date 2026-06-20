const path = require('node:path');

const { app, BrowserWindow } = require('electron');

function getWebRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'web');
  }
  return path.join(__dirname, 'web');
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#0b0f14',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const startUrl = process.env.ELECTRON_START_URL;
  if (typeof startUrl === 'string' && startUrl.length > 0) {
    win.loadURL(startUrl);
    return;
  }

  const indexPath = path.join(getWebRoot(), 'index.html');
  win.loadFile(indexPath);
}

app.whenReady().then(() => {
  // Improves notifications/taskbar grouping on Windows.
  app.setAppUserModelId('com.prekzursil.tanks');

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
