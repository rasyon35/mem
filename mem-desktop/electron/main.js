const { app, BrowserWindow, Menu } = require('electron');
const isDev = !app.isPackaged;
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

// Fix for SUID sandbox issues on Linux AppImages
if (process.platform === 'linux') {
  process.env.ELECTRON_DISABLE_SANDBOX = '1';
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-setuid-sandbox');
}

let mainWindow;
let backendProcess = null;
let frontendProcess = null;

function waitForHttp(url, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        res.destroy();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error(`timeout waiting for ${url}`));
        } else {
          setTimeout(check, 400);
        }
      });
    };
    check();
  });
}

function startBackendIfNeeded() {
  // Prefer bundled backend executable
  const bundled = isDev 
    ? path.join(__dirname, '../backend/dist/backend')
    : path.join(process.resourcesPath, 'backend');
  
  const managePy = path.join(__dirname, '../backend/manage.py');

  if (fs.existsSync(bundled)) {
    backendProcess = spawn(bundled, [], { stdio: 'inherit' });
    return waitForHttp('http://127.0.0.1:8000', 15000).catch(() => {});
  }

  if (fs.existsSync(managePy)) {
    const python = process.platform === 'win32' ? 'python' : 'python3';
    backendProcess = spawn(python, ['manage.py', 'runserver', '127.0.0.1:8000'], {
      cwd: path.join(__dirname, '../backend'),
      env: process.env,
      shell: false,
      stdio: 'inherit',
    });
    return waitForHttp('http://127.0.0.1:8000', 30000);
  }

  // Nothing to start
  return Promise.resolve();
}

function startFrontendIfNeeded() {
  // If static export exists, load file directly
  const outHtml = isDev
    ? path.join(__dirname, '../frontend/out/index.html')
    : path.join(process.resourcesPath, 'frontend/index.html');
    
  if (fs.existsSync(outHtml)) {
    return Promise.resolve(`file://${outHtml}`);
  }

  // Otherwise try to start `npm run start` in frontend (expects build done)
  const frontendDir = path.join(__dirname, '../frontend');
  if (fs.existsSync(path.join(frontendDir, 'package.json'))) {
    frontendProcess = spawn('npm', ['run', 'start'], {
      cwd: frontendDir,
      env: process.env,
      shell: true,
      stdio: 'inherit',
    });
    return waitForHttp('http://127.0.0.1:3000', 30000).then(() => 'http://127.0.0.1:3000');
  }

  // Fallback: try built .next export location
  if (fs.existsSync(outHtml)) return Promise.resolve(`file://${outHtml}`);

  return Promise.reject(new Error('No frontend to start'));
}

function createWindow() {
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    const url = 'http://localhost:3000';
    mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools();
    return;
  }

  // Production: ensure backend + frontend are available, then load
  Promise.resolve()
    .then(() => startBackendIfNeeded())
    .then(() => startFrontendIfNeeded())
    .then((url) => {
      const loadUrl = url || `file://${path.join(__dirname, '../frontend/out/index.html')}`;
      mainWindow.loadURL(loadUrl);
    })
    .catch((err) => {
      console.error('Error starting services:', err);
      // Load a helpful fallback page if possible
      const fallback = `file://${path.join(__dirname, 'offline.html')}`;
      if (fs.existsSync(path.join(__dirname, 'offline.html'))) mainWindow.loadURL(fallback);
    });

  mainWindow.on('closed', () => (mainWindow = null));
}

function killChildren() {
  if (backendProcess && !backendProcess.killed) {
    try { backendProcess.kill(); } catch (e) {}
  }
  if (frontendProcess && !frontendProcess.killed) {
    try { frontendProcess.kill(); } catch (e) {}
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  killChildren();
});

app.on('window-all-closed', () => {
  killChildren();
  if (process.platform !== 'darwin') app.quit();
});