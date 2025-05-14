const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

// 開発モードかどうか
const isDev = process.env.NODE_ENV === 'development';

// メインウィンドウ
let mainWindow;

function createWindow() {
  // ウィンドウの作成
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#f5f5f7',
    titleBarStyle: 'hiddenInset',
    show: false
  });

  // メインのHTMLファイルを読み込み
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 開発モードの場合は開発者ツールを開く
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // 画面が準備できたら表示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // ウィンドウが閉じられたときの処理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // マックスタイルのメニューを作成
  createApplicationMenu();
}

// アプリケーションメニューの作成
function createApplicationMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: '旋盤タイムについて' },
        { type: 'separator' },
        { role: 'services', label: 'サービス' },
        { type: 'separator' },
        { role: 'hide', label: '旋盤タイムを隠す' },
        { role: 'hideOthers', label: 'ほかを隠す' },
        { role: 'unhide', label: 'すべてを表示' },
        { type: 'separator' },
        { role: 'quit', label: '旋盤タイムを終了' }
      ]
    },
    {
      label: 'ファイル',
      submenu: [
        {
          label: '新規作業',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-new-work');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'データをエクスポート',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-export-data');
            }
          }
        }
      ]
    },
    {
      label: '編集',
      submenu: [
        { role: 'undo', label: '元に戻す' },
        { role: 'redo', label: 'やり直す' },
        { type: 'separator' },
        { role: 'cut', label: '切り取り' },
        { role: 'copy', label: 'コピー' },
        { role: 'paste', label: '貼り付け' },
        { role: 'selectAll', label: 'すべてを選択' }
      ]
    },
    {
      label: '表示',
      submenu: [
        { role: 'reload', label: '再読み込み' },
        { role: 'forceReload', label: '強制再読み込み' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: '開発者ツール' },
        { type: 'separator' },
        { role: 'resetZoom', label: '実際のサイズ' },
        { role: 'zoomIn', label: '拡大' },
        { role: 'zoomOut', label: '縮小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'フルスクリーン' }
      ]
    },
    {
      label: 'ウィンドウ',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: 'ズーム' },
        { type: 'separator' },
        { role: 'front', label: 'すべてを手前に移動' }
      ]
    },
    {
      role: 'help',
      label: 'ヘルプ',
      submenu: [
        {
          label: '旋盤タイムについて',
          click: async () => {
            // ヘルプ表示などの実装
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Electronの準備ができたらウィンドウを作成
app.whenReady().then(() => {
  createWindow();

  // macOSの場合、dock アイコンがクリックされたとき、
  // 他のウィンドウが開いていない場合は新しいウィンドウを作成
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// すべてのウィンドウが閉じられたときにアプリを終了
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC通信の設定
ipcMain.on('app-quit', () => {
  app.quit();
});