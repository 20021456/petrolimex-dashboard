/**
 * Petrolimex Dashboard - Desktop shell
 *
 * Ứng dụng chỉ là "vỏ" trình duyệt: nó mở đúng dashboard Next.js đang chạy
 * trên server (Dokploy/VPS). Giao diện y hệt bản web, cần có mạng mới dùng được.
 *
 * Địa chỉ server được nhập ở màn hình cài đặt lần đầu và lưu trong
 * %APPDATA%/Petrolimex Dashboard/config.json
 */

const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const CONFIG_FILE = () => path.join(app.getPath('userData'), 'config.json');
const SETUP_PAGE = path.join(__dirname, 'renderer', 'setup.html');
const ERROR_PAGE = path.join(__dirname, 'renderer', 'error.html');
const DEFAULT_SERVER_FILE = path.join(__dirname, 'default-server.txt');

const DEFAULT_CONFIG = {
  serverUrl: '',
  bounds: { width: 1400, height: 900 },
  maximized: false,
  zoomFactor: 1,
};

let mainWindow = null;

/* ---------------------------------------------------------------- config */

function readConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE(), 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function writeConfig(patch) {
  const next = { ...readConfig(), ...patch };
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE()), { recursive: true });
    fs.writeFileSync(CONFIG_FILE(), JSON.stringify(next, null, 2), 'utf8');
  } catch (err) {
    console.error('Không ghi được config:', err);
  }
  return next;
}

/**
 * Chuẩn hoá địa chỉ người dùng nhập: "fuel.abc.com" -> "https://fuel.abc.com".
 * Trả về null nếu không phải http/https hợp lệ.
 */
function normalizeUrl(input) {
  const value = String(input || '').trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname) return null;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

/**
 * Địa chỉ nhúng sẵn lúc build (desktop/default-server.txt). Có giá trị thì app
 * cài xong mở thẳng dashboard, không cần qua màn hình cấu hình.
 */
function builtInUrl() {
  try {
    const raw = fs.readFileSync(DEFAULT_SERVER_FILE, 'utf8');
    const line = raw
      .split('\n')
      .map((item) => item.trim())
      .find((item) => item && !item.startsWith('#'));
    return normalizeUrl(line);
  } catch {
    return null;
  }
}

/**
 * Thứ tự ưu tiên: biến môi trường (triển khai hàng loạt) > địa chỉ người dùng
 * tự nhập > địa chỉ nhúng sẵn lúc build.
 */
function configuredUrl() {
  return (
    normalizeUrl(process.env.PETROLIMEX_DASHBOARD_URL) ||
    readConfig().serverUrl ||
    builtInUrl() ||
    ''
  );
}

/* --------------------------------------------------------------- loading */

function loadDashboard() {
  if (!mainWindow) return;
  const url = configuredUrl();
  if (!url) {
    mainWindow.loadFile(SETUP_PAGE);
    return;
  }
  mainWindow.loadURL(url);
}

function showErrorPage(query) {
  if (!mainWindow) return;
  mainWindow.loadFile(ERROR_PAGE, { query });
}

/* ---------------------------------------------------------------- window */

function createWindow() {
  const config = readConfig();

  mainWindow = new BrowserWindow({
    width: config.bounds.width,
    height: config.bounds.height,
    x: config.bounds.x,
    y: config.bounds.y,
    minWidth: 380,
    minHeight: 520,
    show: false,
    backgroundColor: '#0a0a0a',
    icon: path.join(__dirname, 'resources', 'icon.png'),
    title: 'Petrolimex Dashboard',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  if (config.maximized) mainWindow.maximize();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (config.zoomFactor && config.zoomFactor !== 1) {
      mainWindow.webContents.setZoomFactor(config.zoomFactor);
    }
  });

  // Link mở tab mới (target=_blank) -> mở bằng trình duyệt mặc định
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Không cho điều hướng ra ngoài server đã cấu hình (trừ trang cục bộ)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const base = configuredUrl();
    if (!base || url.startsWith('file://')) return;
    try {
      if (new URL(url).origin !== new URL(base).origin) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {
      /* để Electron tự xử lý */
    }
  });

  // Mất mạng / server chết -> trang lỗi có nút thử lại
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    if (errorCode === -3) return; // ERR_ABORTED: điều hướng bị huỷ, không phải lỗi
    if (validatedURL && validatedURL.startsWith('file://')) return;
    showErrorPage({
      url: validatedURL || configuredUrl() || '',
      code: String(errorCode),
      message: errorDescription || 'Không kết nối được máy chủ',
    });
  });

  const persistBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const maximized = mainWindow.isMaximized();
    writeConfig({
      maximized,
      bounds: maximized ? readConfig().bounds : mainWindow.getBounds(),
    });
  };
  mainWindow.on('resize', persistBounds);
  mainWindow.on('move', persistBounds);
  mainWindow.on('close', persistBounds);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  buildMenu();
  loadDashboard();
}

/* ------------------------------------------------------------------ menu */

function changeZoom(delta) {
  if (!mainWindow) return;
  const current = mainWindow.webContents.getZoomFactor();
  const next = Math.min(2.5, Math.max(0.5, Number((current + delta).toFixed(2))));
  mainWindow.webContents.setZoomFactor(next);
  writeConfig({ zoomFactor: next });
}

function openSetup() {
  if (mainWindow) mainWindow.loadFile(SETUP_PAGE);
}

function buildMenu() {
  const template = [
    {
      label: 'Tệp',
      submenu: [
        { label: 'Tải lại', accelerator: 'F5', click: () => mainWindow && mainWindow.webContents.reload() },
        {
          label: 'Tải lại (bỏ qua cache)',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow && mainWindow.webContents.reloadIgnoringCache(),
        },
        { label: 'Về trang chủ', accelerator: 'Alt+Home', click: loadDashboard },
        { type: 'separator' },
        { label: 'Đổi địa chỉ máy chủ…', click: openSetup },
        { type: 'separator' },
        { label: 'Thoát', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
      ],
    },
    {
      label: 'Chỉnh sửa',
      submenu: [
        { label: 'Hoàn tác', role: 'undo' },
        { label: 'Làm lại', role: 'redo' },
        { type: 'separator' },
        { label: 'Cắt', role: 'cut' },
        { label: 'Sao chép', role: 'copy' },
        { label: 'Dán', role: 'paste' },
        { label: 'Chọn tất cả', role: 'selectAll' },
      ],
    },
    {
      label: 'Xem',
      submenu: [
        { label: 'Quay lại', accelerator: 'Alt+Left', click: () => mainWindow && mainWindow.webContents.navigationHistory.canGoBack() && mainWindow.webContents.navigationHistory.goBack() },
        { label: 'Đi tới', accelerator: 'Alt+Right', click: () => mainWindow && mainWindow.webContents.navigationHistory.canGoForward() && mainWindow.webContents.navigationHistory.goForward() },
        { type: 'separator' },
        { label: 'Phóng to', accelerator: 'CmdOrCtrl+Plus', click: () => changeZoom(0.1) },
        { label: 'Thu nhỏ', accelerator: 'CmdOrCtrl+-', click: () => changeZoom(-0.1) },
        {
          label: 'Cỡ mặc định',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (!mainWindow) return;
            mainWindow.webContents.setZoomFactor(1);
            writeConfig({ zoomFactor: 1 });
          },
        },
        { type: 'separator' },
        { label: 'Toàn màn hình', accelerator: 'F11', role: 'togglefullscreen' },
        { label: 'Công cụ nhà phát triển', accelerator: 'CmdOrCtrl+Shift+I', role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Trợ giúp',
      submenu: [
        {
          label: 'Thông tin ứng dụng',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Petrolimex Dashboard',
              message: `Petrolimex Dashboard ${app.getVersion()}`,
              detail:
                `Máy chủ: ${configuredUrl() || '(chưa cấu hình)'}\n` +
                `Electron: ${process.versions.electron}\n` +
                `Chromium: ${process.versions.chrome}\n\n` +
                `Cấu hình: ${CONFIG_FILE()}`,
              buttons: ['Đóng'],
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ------------------------------------------------------------------- ipc */

/** Chỉ trang cục bộ (setup/error) mới được gọi IPC, không phải nội dung web từ server. */
function isLocalSender(event) {
  const url = event.senderFrame ? event.senderFrame.url : '';
  return typeof url === 'string' && url.startsWith('file://');
}

ipcMain.handle('app:get-config', (event) => {
  if (!isLocalSender(event)) return null;
  return { serverUrl: configuredUrl(), fromEnv: Boolean(normalizeUrl(process.env.PETROLIMEX_DASHBOARD_URL)) };
});

ipcMain.handle('app:save-url', (event, value) => {
  if (!isLocalSender(event)) return { ok: false, error: 'Không được phép' };
  const url = normalizeUrl(value);
  if (!url) return { ok: false, error: 'Địa chỉ không hợp lệ. Ví dụ: https://fuel.tencongty.com' };
  writeConfig({ serverUrl: url });
  loadDashboard();
  return { ok: true, url };
});

ipcMain.handle('app:retry', (event) => {
  if (!isLocalSender(event)) return false;
  loadDashboard();
  return true;
});

ipcMain.handle('app:open-setup', (event) => {
  if (!isLocalSender(event)) return false;
  openSetup();
  return true;
});

/* ----------------------------------------------------------- app startup */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(createWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
