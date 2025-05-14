const { ipcRenderer, contextBridge } = require('electron');

// レンダラープロセスで使用するAPIを公開
contextBridge.exposeInMainWorld('electronAPI', {
  // メニューイベントのリスナーを設定
  onNewWork: (callback) => ipcRenderer.on('menu-new-work', callback),
  onExportData: (callback) => ipcRenderer.on('menu-export-data', callback),
  
  // アプリ終了
  quitApp: () => ipcRenderer.send('app-quit')
});