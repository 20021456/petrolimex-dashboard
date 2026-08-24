/**
 * Preload: chỉ mở một API rất nhỏ cho các trang cục bộ (setup.html, error.html).
 * Phía main process còn kiểm tra lại người gọi phải là file:// nên nội dung web
 * tải từ server không thể dùng được các hàm này.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  getConfig: () => ipcRenderer.invoke('app:get-config'),
  saveUrl: (url) => ipcRenderer.invoke('app:save-url', url),
  retry: () => ipcRenderer.invoke('app:retry'),
  openSetup: () => ipcRenderer.invoke('app:open-setup'),
});
