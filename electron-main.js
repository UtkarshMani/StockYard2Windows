const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const http = require('http');

// ─── Chromium sandbox & GPU fixes ───────────────────────────────────────────
// These MUST be set before app.whenReady() fires. The appendSwitch('no-sandbox')
// alone is unreliable because Chromium's child-process launcher reads the real
// argv before Electron's JS shim can inject flags. Adding the switches below
// prevents the /dev/shm FATAL crash that kills the renderer/GPU processes.
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-setuid-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-dev-shm-usage');  // Use /tmp instead of /dev/shm
app.commandLine.appendSwitch('no-zygote');               // Skip zygote (avoids shm crashes)
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
app.disableHardwareAcceleration();  // Avoid GPU process entirely

const isDev = !app.isPackaged; // Detect if running in development or packaged

// ─── Single Instance Lock (production only) ─────────────────────────────────
// Prevents the infinite-window-loop bug on Windows where spawning the backend
// with process.execPath re-launches Electron instead of Node.js.
// Only enforce in production — dev mode must allow running alongside installed app.
if (!isDev) {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    console.log('Another instance is already running. Exiting.');
    app.exit(0);  // Hard exit — app.quit() is async and won't stop execution
  }
}

let mainWindow;
let backendProcess;
let frontendProcess;
const BACKEND_PORT = 5000;
const FRONTEND_PORT = 3000;
const USE_EXISTING_SERVERS = isDev; // Dev: use existing servers, Production: start embedded

// User data paths - Electron manages this location safely across updates
const userDataPath = app.getPath('userData');
const dataDir = path.join(userDataPath, 'data');
const dbPath = path.join(dataDir, 'inventory.db');
const logsPath = path.join(userDataPath, 'logs');

// Ensure directories exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(logsPath)) {
  fs.mkdirSync(logsPath, { recursive: true });
}

console.log('==========================================');
console.log('StockYard - Starting');
console.log('==========================================');
console.log('User Data Path:', userDataPath);
console.log('Data Directory:', dataDir);
console.log('Database Path:', dbPath);
console.log('Logs Path:', logsPath);
console.log('==========================================');

/**
 * Start the Next.js frontend server
 */
function startFrontend() {
  return new Promise((resolve, reject) => {
    const frontendDir = isDev
      ? path.join(__dirname, 'frontend')
      : path.join(process.resourcesPath, 'frontend');

    console.log('🎨 Starting Next.js frontend server...');
    console.log('Frontend directory:', frontendDir);

    // Set environment variables for Node.js
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: FRONTEND_PORT.toString(),
      NEXT_PUBLIC_API_URL: `http://localhost:${BACKEND_PORT}/api/v1`,
    };

    const nodeExecutable = findNodeExecutable();

    // If the found node is actually Electron, tell it to behave as Node
    if (nodeExecutable === process.execPath) {
      env.ELECTRON_RUN_AS_NODE = '1';
    }
    
    // Start Next.js production server
    frontendProcess = spawn(
      nodeExecutable,
      [path.join(frontendDir, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', FRONTEND_PORT.toString()],
      {
        cwd: frontendDir,
        env,
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    let startupTimeout;
    let serverReady = false;

    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[Frontend]:', output);
      
      const outputLower = output.toLowerCase();
      if (outputLower.includes('ready') || outputLower.includes('started') || outputLower.includes('listening')) {
        serverReady = true;
        clearTimeout(startupTimeout);
        resolve(frontendProcess);
      }
    });

    frontendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('[Frontend Error]:', error);
    });

    frontendProcess.on('error', (error) => {
      console.error('❌ Frontend startup error:', error);
      reject(error);
    });

    frontendProcess.on('exit', (code) => {
      if (code !== 0 && !serverReady) {
        console.error(`Frontend process exited with code ${code}`);
        reject(new Error(`Frontend failed to start (exit code: ${code})`));
      }
    });

    // Timeout after 90 seconds (increased for slower systems)
    startupTimeout = setTimeout(() => {
      if (!serverReady) {
        console.log('Frontend startup timeout, assuming it started...');
        resolve(frontendProcess);
      }
    }, 90000);
  });
}

/**
 * Find Node.js executable in common locations
 */
function findNodeExecutable() {
  const { execSync } = require('child_process');
  
  // Development: use 'node' from PATH
  if (isDev) return 'node';
  
  // ─── Windows: search real Node.js paths ─────────────────────────────────
  // NEVER return process.execPath on Windows — that's the Electron binary and
  // spawning it re-launches the whole app, causing an infinite-window loop.
  if (process.platform === 'win32') {
    const winHome = process.env.USERPROFILE || process.env.HOME || '';
    const winPaths = [
      // NVM for Windows
      path.join(process.env.NVM_SYMLINK || path.join(process.env.APPDATA || '', 'nvm', 'current'), 'node.exe'),
      // Default Node.js install
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Program Files (x86)\\nodejs\\node.exe',
      // nvm-windows default
      path.join(winHome, 'AppData', 'Roaming', 'nvm', 'current', 'node.exe'),
      // Scoop
      path.join(winHome, 'scoop', 'apps', 'nodejs', 'current', 'node.exe'),
      // Volta
      path.join(winHome, '.volta', 'bin', 'node.exe'),
    ];
    for (const p of winPaths) {
      if (fs.existsSync(p)) {
        console.log('Found node at:', p);
        return p;
      }
    }
    // Try 'where node'
    try {
      const whereNode = execSync('where node', { encoding: 'utf8', timeout: 5000 }).trim().split('\n')[0].trim();
      if (whereNode && !whereNode.includes('electron') && fs.existsSync(whereNode)) {
        console.log('Found node via where:', whereNode);
        return whereNode;
      }
    } catch (e) { /* where failed */ }
    
    // Last resort: use Electron as Node with ELECTRON_RUN_AS_NODE
    console.log('WARNING: No standalone Node.js found on Windows. Using Electron as Node.');
    return process.execPath;
  }
  
  const homeDir = process.env.HOME || require('os').homedir();
  
  // 1. Scan NVM directory for any installed node version (desktop launchers don't have NVM in PATH)
  const nvmDir = path.join(homeDir, '.nvm', 'versions', 'node');
  if (fs.existsSync(nvmDir)) {
    try {
      const versions = fs.readdirSync(nvmDir)
        .filter(v => v.startsWith('v'))
        .sort((a, b) => {
          // Sort by version number descending (latest first)
          const partsA = a.replace('v', '').split('.').map(Number);
          const partsB = b.replace('v', '').split('.').map(Number);
          for (let i = 0; i < 3; i++) {
            if ((partsA[i] || 0) !== (partsB[i] || 0)) return (partsB[i] || 0) - (partsA[i] || 0);
          }
          return 0;
        });
      for (const ver of versions) {
        const nodePath = path.join(nvmDir, ver, 'bin', 'node');
        if (fs.existsSync(nodePath)) {
          console.log('Found node via NVM:', nodePath);
          return nodePath;
        }
      }
    } catch (e) {
      console.log('NVM scan failed:', e.message);
    }
  }
  
  // 2. Check common system paths
  const commonPaths = [
    '/usr/bin/node',
    '/usr/local/bin/node',
    '/bin/node',
    path.join(homeDir, '.local', 'bin', 'node'),
    '/snap/node/current/bin/node',
  ];
  
  for (const nodePath of commonPaths) {
    if (fs.existsSync(nodePath)) {
      console.log('Found node at:', nodePath);
      return nodePath;
    }
  }
  
  // 3. Try 'which node' (works from terminal but may fail from desktop launcher)
  try {
    const whichNode = execSync('which node', { encoding: 'utf8', timeout: 5000 }).trim();
    if (whichNode && fs.existsSync(whichNode)) {
      console.log('Found node via which:', whichNode);
      return whichNode;
    }
  } catch (e) {
    console.log('which node failed:', e.message);
  }
  
  // 4. Fallback: try 'node' from PATH (might fail in desktop launcher)
  console.log('WARNING: Using fallback: node from PATH - may not work from desktop launcher');
  return 'node';
}

/**
 * Start the embedded Node.js backend server
 */
function startBackend() {
  return new Promise((resolve, reject) => {
    const backendPath = isDev
      ? path.join(__dirname, 'backend', 'src', 'server.js')
      : path.join(process.resourcesPath, 'backend', 'dist', 'server.js');

    console.log('Starting backend from:', backendPath);
    
    // Check if backend file exists
    if (!fs.existsSync(backendPath)) {
      const errorMsg = `Backend file not found: ${backendPath}`;
      console.error(errorMsg);
      fs.appendFileSync(
        path.join(logsPath, 'startup-error.log'),
        `${new Date().toISOString()} - ${errorMsg}\n`
      );
      reject(new Error(errorMsg));
      return;
    }
    
    console.log('Backend file exists, starting Node.js process...');

    // Get Node.js executable with fallback logic
    const nodeExecutable = findNodeExecutable();
    
    console.log('Using Node executable:', nodeExecutable);
    console.log('Platform:', process.platform);

    // Get backend directory for node_modules path
    const backendDir = isDev
      ? path.join(__dirname, 'backend')
      : path.join(process.resourcesPath, 'backend');
    
    const backendNodeModules = path.join(backendDir, 'node_modules');
    console.log('Backend node_modules:', backendNodeModules);

    // Set environment variables for embedded mode
    const env = {
      ...process.env,
      PORT: BACKEND_PORT.toString(),
      NODE_ENV: isDev ? 'development' : 'production',
      DATABASE_URL: `file:${dbPath}`,
      USER_DATA_DIR: dataDir,
      JWT_SECRET: process.env.JWT_SECRET || 'inventory-jwt-secret-key-change-in-production',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'inventory-refresh-secret-key-change-in-production',
      EMBEDDED_MODE: 'true',
      LOG_PATH: logsPath,
      NODE_PATH: backendNodeModules,
    };

    // If the found node is actually Electron, tell it to behave as Node
    if (nodeExecutable === process.execPath) {
      env.ELECTRON_RUN_AS_NODE = '1';
    }

    // Spawn backend process with correct working directory
    backendProcess = spawn(nodeExecutable, [backendPath], {
      env,
      cwd: backendDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let backendReady = false;
    let startupLogs = [];

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[Backend]:', output);
      startupLogs.push(output);
      
      // Log to file
      fs.appendFileSync(
        path.join(logsPath, 'backend-startup.log'),
        `${new Date().toISOString()} - ${output}`
      );

      // Check if backend is ready
      if (!backendReady && (output.includes('Server running') || output.includes('listening'))) {
        backendReady = true;
        console.log('✅ Backend started successfully');
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      console.error('[Backend Error]:', errorOutput);
      startupLogs.push(`ERROR: ${errorOutput}`);
      
      // Log errors to file
      fs.appendFileSync(
        path.join(logsPath, 'backend-error.log'),
        `${new Date().toISOString()} - ${errorOutput}`
      );
    });

    backendProcess.on('error', (error) => {
      console.error('[Backend Process Error]:', error);
      const errorMsg = `Failed to spawn backend process: ${error.message}`;
      fs.appendFileSync(
        path.join(logsPath, 'startup-error.log'),
        `${new Date().toISOString()} - ${errorMsg}\n${error.stack}\n`
      );
      if (!backendReady) {
        reject(new Error(errorMsg));
      }
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
      if (!backendReady) {
        const errorMsg = `Backend failed to start (exit code: ${code})\n\nLogs:\n${startupLogs.join('\n')}`;
        fs.appendFileSync(
          path.join(logsPath, 'startup-error.log'),
          `${new Date().toISOString()} - ${errorMsg}\n`
        );
        reject(new Error(errorMsg));
      }
    });

    // Extended timeout for backend startup (90 seconds for slower systems)
    setTimeout(() => {
      if (!backendReady) {
        const errorMsg = `Backend startup timeout after 90 seconds\n\nLogs:\n${startupLogs.join('\n')}`;
        console.error(errorMsg);
        fs.appendFileSync(
          path.join(logsPath, 'startup-error.log'),
          `${new Date().toISOString()} - ${errorMsg}\n`
        );
        reject(new Error(errorMsg));
      }
    }, 90000);
  });
}

/**
 * Create the main application window
 */
function createWindow() {
  // Create browser window
  const iconPath = isDev
    ? path.join(__dirname, 'frontend', 'public', 'icon.png')
    : path.join(process.resourcesPath, 'frontend', 'public', 'icon.png');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js'),
      webSecurity: true,
    },
    show: true,
    backgroundColor: '#1e293b',
  });

  // Remove default menu in production
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // Set frontend URL
  mainWindow.frontendUrl = `http://localhost:${FRONTEND_PORT}`;
  console.log('Frontend URL will be:', mainWindow.frontendUrl);

  // In production, don't load URL yet — wait for servers to start
  // In dev mode, servers are already running so load with retry
  if (isDev) {
    const loadWithRetry = async (attempts = 5) => {
      // Clear Electron's HTTP cache so it always loads the latest code from the dev server
      try {
        await mainWindow.webContents.session.clearCache();
        console.log('🧹 Cleared Electron session cache');
      } catch (e) {
        console.log('Cache clear failed (non-fatal):', e.message);
      }
      for (let i = 1; i <= attempts; i++) {
        try {
          console.log(`Loading frontend (attempt ${i}/${attempts})...`);
          await mainWindow.loadURL(mainWindow.frontendUrl);
          console.log('✅ Frontend loaded in dev mode');
          return;
        } catch (error) {
          console.error(`❌ loadURL attempt ${i} failed:`, error.message);
          if (i < attempts) {
            await new Promise(r => setTimeout(r, i * 1500));
          }
        }
      }
      console.error('❌ All loadURL attempts failed in dev mode');
    };
    loadWithRetry();
  }
  
  // Handle load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ Failed to load:', errorDescription, 'URL:', validatedURL);
    fs.appendFileSync(
      path.join(logsPath, 'window-load.log'),
      `${new Date().toISOString()} - Failed to load: ${errorDescription} (${errorCode}) URL: ${validatedURL}\n`
    );
  });
  
  // Log when page finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Frontend loaded successfully');
    fs.appendFileSync(
      path.join(logsPath, 'window-load.log'),
      `${new Date().toISOString()} - Frontend loaded successfully\n`
    );
  });

  // Handle renderer process crash — auto-reload the page
  let rendererCrashCount = 0;
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error(`💥 Renderer crashed: reason=${details.reason}, exitCode=${details.exitCode}`);
    fs.appendFileSync(
      path.join(logsPath, 'window-load.log'),
      `${new Date().toISOString()} - Renderer crashed: reason=${details.reason} exitCode=${details.exitCode}\n`
    );
    rendererCrashCount++;
    if (rendererCrashCount <= 3 && mainWindow && !mainWindow.isDestroyed()) {
      console.log(`🔄 Auto-reloading after renderer crash (attempt ${rendererCrashCount}/3)...`);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(mainWindow.frontendUrl).catch(err => {
            console.error('❌ Reload after crash failed:', err.message);
          });
        }
      }, 1000);
    }
  });

  // Don't load URL here - will load after servers are ready

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

/**
 * Kill any process occupying a given port
 */
function killProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const result = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8', timeout: 5000 });
      const lines = result.trim().split('\n');
      for (const line of lines) {
        const pid = line.trim().split(/\s+/).pop();
        if (pid && pid !== '0') {
          try { execSync(`taskkill /PID ${pid} /F`, { timeout: 5000 }); } catch (e) { /* ignore */ }
        }
      }
    } else {
      // Try fuser first (most reliable, uses full path for desktop launcher compatibility)
      try {
        execSync(`/usr/bin/fuser -k ${port}/tcp`, { timeout: 5000, stdio: 'ignore' });
        console.log(`Killed process on port ${port} via fuser`);
        return;
      } catch (e) { /* fuser not available or no process */ }

      // Fallback to lsof with full path
      try {
        const result = execSync(`/usr/bin/lsof -ti:${port}`, { encoding: 'utf8', timeout: 5000 }).trim();
        if (result) {
          const pids = result.split('\n');
          for (const pid of pids) {
            if (pid) {
              try { process.kill(parseInt(pid), 'SIGKILL'); } catch (e) { /* ignore */ }
            }
          }
          console.log(`Killed process on port ${port} via lsof`);
          return;
        }
      } catch (e) { /* lsof not available or no process */ }

      // Last resort: scan /proc/net/tcp for the port
      try {
        const hexPort = port.toString(16).toUpperCase().padStart(4, '0');
        const tcp = fs.readFileSync('/proc/net/tcp', 'utf8');
        const tcp6 = fs.readFileSync('/proc/net/tcp6', 'utf8');
        const allLines = (tcp + '\n' + tcp6).split('\n');
        for (const line of allLines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length > 7 && parts[1] && parts[1].endsWith(':' + hexPort) && parts[3] === '0A') {
            const inode = parts[9];
            // Find PID by scanning /proc/*/fd/
            const procDirs = fs.readdirSync('/proc').filter(d => /^\d+$/.test(d));
            for (const pidDir of procDirs) {
              try {
                const fds = fs.readdirSync(`/proc/${pidDir}/fd`);
                for (const fd of fds) {
                  try {
                    const link = fs.readlinkSync(`/proc/${pidDir}/fd/${fd}`);
                    if (link.includes(`socket:[${inode}]`)) {
                      process.kill(parseInt(pidDir), 'SIGKILL');
                      console.log(`Killed PID ${pidDir} on port ${port} via /proc scan`);
                    }
                  } catch (e) { /* permission denied */ }
                }
              } catch (e) { /* permission denied */ }
            }
          }
        }
      } catch (e) { /* /proc scan failed */ }
    }
    console.log(`Port ${port} cleared`);
  } catch (e) {
    console.log(`Port ${port} check: no process found or already free`);
  }
}

/**
 * Check if server is already running
 */
function checkServerRunning(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, () => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.end();
  });
}

/**
 * Application ready event
 */
app.whenReady().then(async () => {
  console.log('Starting StockYard...');
  console.log('Mode:', isDev ? 'Development' : 'Production');

  // Focus existing window when a second instance tries to launch
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Create window FIRST so it's always visible
  createWindow();
  console.log('✅ Main window created');

  // Load a blank page so executeJavaScript works for error messages
  if (!isDev) {
    mainWindow.loadURL('data:text/html,<html><body style="background:#1e293b;"></body></html>');
  }

  try {
    // Check if servers are already running
    if (USE_EXISTING_SERVERS) {
      const backendRunning = await checkServerRunning(BACKEND_PORT);
      const frontendRunning = await checkServerRunning(FRONTEND_PORT);
      
      if (!backendRunning) {
        console.error('Backend server not running on port', BACKEND_PORT);
        console.log('Please start backend with: cd backend && npm run dev');
        if (mainWindow) {
          mainWindow.webContents.executeJavaScript(`
            document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; background: #1e293b; color: white; flex-direction: column; padding: 2rem; text-align: center;"><h1 style="color: #ef4444; margin-bottom: 1rem;">Backend Server Not Running</h1><p>Backend server not running on port ${BACKEND_PORT}.</p><p>Please start it with: <code style="background: #334155; padding: 0.5rem; border-radius: 4px; display: inline-block; margin-top: 0.5rem;">cd backend && npm run dev</code></p></div>';
          `);
        }
        return;
      }
      
      if (!frontendRunning) {
        console.error('Frontend server not running on port', FRONTEND_PORT);
        console.log('Please start frontend with: cd frontend && npm run dev');
        if (mainWindow) {
          mainWindow.webContents.executeJavaScript(`
            document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; background: #1e293b; color: white; flex-direction: column; padding: 2rem; text-align: center;"><h1 style="color: #ef4444; margin-bottom: 1rem;">Frontend Server Not Running</h1><p>Frontend server not running on port ${FRONTEND_PORT}.</p><p>Please start it with: <code style="background: #334155; padding: 0.5rem; border-radius: 4px; display: inline-block; margin-top: 0.5rem;">cd frontend && npm run dev</code></p></div>';
          `);
        }
        return;
      }
      
      console.log('✓ Backend and Frontend servers detected');
    } else {
      // Kill zombie processes on our ports before starting servers
      console.log('🧹 Clearing ports...');
      killProcessOnPort(BACKEND_PORT);
      killProcessOnPort(FRONTEND_PORT);
      // Give OS a moment to release the ports
      await new Promise(r => setTimeout(r, 1500));

      // Start embedded backend server
      console.log('🚀 Starting embedded backend server...');
      console.log('📂 Data directory:', dataDir);
      console.log('💾 Database path:', dbPath);
      console.log('📝 Logs path:', logsPath);
      
      try {
        await startBackend();
        console.log('✅ Backend started successfully');
        
        // Start embedded frontend server
        console.log('🎨 Starting embedded frontend server...');
        await startFrontend();
        console.log('✅ Frontend started successfully');
        
        // Servers are ready - NOW load the frontend URL with retry logic
        console.log('✅ All servers initialized, loading frontend...');
        if (mainWindow) {
          const maxRetries = 5;
          let attempt = 0;
          const tryLoadURL = async () => {
            attempt++;
            try {
              console.log(`Loading frontend URL (attempt ${attempt}/${maxRetries})...`);
              await mainWindow.loadURL(mainWindow.frontendUrl);
              console.log('✅ Frontend URL loaded successfully');
            } catch (err) {
              console.error(`❌ loadURL attempt ${attempt} failed:`, err.message);
              if (attempt < maxRetries) {
                const delay = attempt * 2000; // 2s, 4s, 6s, 8s
                console.log(`Retrying in ${delay / 1000}s...`);
                await new Promise(r => setTimeout(r, delay));
                await tryLoadURL();
              } else {
                console.error('❌ All loadURL attempts failed. Showing error page.');
                mainWindow.webContents.executeJavaScript(`
                  document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; background: #1e293b; color: white; flex-direction: column; padding: 2rem; text-align: center;"><h1 style="color: #ef4444; margin-bottom: 1rem;">Failed to Load Application</h1><p>Could not connect to the frontend server after ${maxRetries} attempts.</p><p style="color: #94a3b8; margin-top: 1rem;">Try restarting the application.</p><button onclick="require(\\'electron\\').ipcRenderer.send(\\'restart-app\\')" style="margin-top: 2rem; padding: 0.75rem 2rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;">Restart</button></div>';
                `);
              }
            }
          };
          await tryLoadURL();
        }
      } catch (error) {
        console.error('❌ Backend startup failed:', error.message);
        // Show error in window instead of dialog
        if (mainWindow) {
          mainWindow.webContents.executeJavaScript(`
            document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; background: #1e293b; color: white; flex-direction: column; padding: 2rem; text-align: center; max-width: 600px; margin: 0 auto;"><h1 style="color: #ef4444; margin-bottom: 1rem;">Backend Startup Failed</h1><p style="margin-bottom: 1rem;">${error.message.replace(/'/g, "\\'")}</p><p style="color: #94a3b8; font-size: 0.875rem;">Check logs at:<br><code style="background: #334155; padding: 0.5rem; border-radius: 4px; display: inline-block; margin-top: 0.5rem; word-break: break-all;">${logsPath.replace(/\\/g, '\\\\')}</code></p><button onclick="require('electron').ipcRenderer.send('restart-app')" style="margin-top: 2rem; padding: 0.75rem 2rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;">Retry</button></div>';
          `);
        }
        fs.appendFileSync(
          path.join(logsPath, 'startup-error.log'),
          `${new Date().toISOString()} - Startup Error: ${error.message}\n${error.stack}\n\n`
        );
        return;
      }
    }
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; background: #1e293b; color: white; flex-direction: column; padding: 2rem; text-align: center;"><h1 style="color: #ef4444; margin-bottom: 1rem;">Startup Failed</h1><p>${error.message.replace(/'/g, "\\'")}</p></div>';
      `);
    }
    fs.appendFileSync(
      path.join(logsPath, 'startup-error.log'),
      `${new Date().toISOString()} - Startup Error: ${error.message}\n${error.stack}\n\n`
    );
  }

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Quit when all windows are closed (except on macOS)
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Clean up before quitting
 */
app.on('before-quit', () => {
  console.log('Shutting down application...');
  
  // Kill backend process
  if (backendProcess) {
    console.log('Stopping backend process...');
    backendProcess.kill();
  }
  // Kill frontend process
  if (frontendProcess) {
    console.log('Stopping frontend process...');
    frontendProcess.kill();
  }
});

/**
 * IPC Handlers for frontend communication
 */
ipcMain.handle('get-app-path', () => {
  return {
    userData: userDataPath,
    database: dbPath,
    logs: logsPath,
  };
});

ipcMain.handle('get-backend-url', () => {
  return `http://localhost:${BACKEND_PORT}`;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.on('restart-app', () => {
  app.relaunch();
  app.quit();
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  fs.appendFileSync(
    path.join(logsPath, 'error.log'),
    `${new Date().toISOString()} - Uncaught Exception: ${error.message}\n${error.stack}\n\n`
  );
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  fs.appendFileSync(
    path.join(logsPath, 'error.log'),
    `${new Date().toISOString()} - Unhandled Rejection: ${reason}\n\n`
  );
});
