// DOM要素
const timeDisplay = document.querySelector('.time');
const statusDisplay = document.querySelector('.status');
const startBtn = document.querySelector('.btn-start');
const pauseBtn = document.querySelector('.btn-pause');
const stopBtn = document.querySelector('.btn-stop');
const newBtn = document.querySelector('.btn-new');
const exportBtn = document.querySelector('.btn-export');
const exportAllBtn = document.querySelector('.btn-export-all');
const workNameInput = document.getElementById('work-name');
const workPartInput = document.getElementById('work-part');
const workQuantityInput = document.getElementById('work-quantity');
const workNotesInput = document.getElementById('work-notes');
const recentWorksTable = document.querySelector('.recent-works tbody');
const reportTable = document.getElementById('report-table').querySelector('tbody');
const dateFromInput = document.getElementById('date-from');
const dateToInput = document.getElementById('date-to');
const filterNameInput = document.getElementById('filter-name');
const applyFilterBtn = document.querySelector('.btn-apply-filter');
const totalTimeDisplay = document.getElementById('total-time');
const totalWorksDisplay = document.getElementById('total-works');
const uniqueDrawingsDisplay = document.getElementById('unique-drawings');
const avgTimeDisplay = document.getElementById('avg-time');
const themeSelect = document.getElementById('theme-select');
const backupBtn = document.querySelector('.btn-backup');
const restoreBtn = document.querySelector('.btn-restore');
const restoreFileInput = document.getElementById('restore-file');
const clearDataBtn = document.querySelector('.btn-clear-data');
const saveSettingsBtn = document.querySelector('.btn-save-settings');

// 図面番号入力関連の要素
const imageBtn = document.getElementById('btn-image');
const imageUpload = document.getElementById('image-upload');
const imageCanvas = document.getElementById('image-canvas');

// ナビゲーション
const menuItems = document.querySelectorAll('.menu li');
const navItems = document.querySelectorAll('.mobile-nav .nav-item');
const viewContents = document.querySelectorAll('.view-content');

// タイマー変数
let startTime = 0;
let elapsedTime = 0;
let timerInterval;
let timerRunning = false;
let timerPaused = false;

// 保存データ配列
let workHistory = [];

// 設定
let appSettings = {
    theme: 'light'
};

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('アプリ初期化開始');
    loadFromLocalStorage();
    console.log('設定読み込み:', appSettings);
    loadSettings();
    console.log('設定読み込み完了:', appSettings);
    setInitialDates();
    
    // ダークモード設定の確認（デバッグ用）
    console.log('ダークモード設定:', appSettings.theme);
    console.log('システムダークモード:', window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // テーマを適用
    applyTheme();
    
    // テーマセレクトが変更されたらすぐに適用（設定保存ボタンを押さなくても）
    themeSelect.addEventListener('change', () => {
        appSettings.theme = themeSelect.value;
        saveSettings();
        applyTheme();
    });
    
    // APIキー管理ボタンのイベントリスナー
    initApiKeyManagement();
    
    // サービスワーカーの登録
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    }
});

// APIキー管理機能の初期化
function initApiKeyManagement() {
    // APIキーの表示を初期化
    if (typeof updateApiKeyDisplay === 'function') {
        updateApiKeyDisplay();
    }
    
    // APIキーの表示/非表示切り替えボタン
    const showKeyBtn = document.getElementById('btn-show-key');
    if (showKeyBtn) {
        showKeyBtn.addEventListener('click', () => {
            if (typeof toggleApiKeyVisibility === 'function') {
                toggleApiKeyVisibility();
            }
        });
    }
    
    // APIキー編集ボタン
    const editApiKeyBtn = document.getElementById('btn-edit-api-key');
    if (editApiKeyBtn) {
        editApiKeyBtn.addEventListener('click', () => {
            if (typeof showApiKeyModal === 'function') {
                showApiKeyModal();
            }
        });
    }
    
    // APIキークリアボタン
    const clearApiKeyBtn = document.getElementById('btn-clear-api-key');
    if (clearApiKeyBtn) {
        clearApiKeyBtn.addEventListener('click', () => {
            if (confirm('本当にAPIキーを削除しますか？\n図面番号の読み取り機能が使用できなくなります。')) {
                if (typeof clearApiKey === 'function') {
                    clearApiKey();
                    alert('APIキーを削除しました。');
                }
            }
        });
    }
}

// 初期日付設定
function setInitialDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    dateToInput.valueAsDate = today;
    dateFromInput.valueAsDate = thirtyDaysAgo;
}

// テーマ適用
function applyTheme() {
    // 一度すべてのテーマ関連クラスを削除
    document.body.classList.remove('dark-theme', 'light-theme');
    
    if (appSettings.theme === 'dark') {
        document.body.classList.add('dark-theme');
        document.documentElement.setAttribute('data-theme', 'dark');
    } else if (appSettings.theme === 'light') {
        document.body.classList.add('light-theme');
        document.documentElement.setAttribute('data-theme', 'light');
    } else if (appSettings.theme === 'system') {
        // システム設定に合わせる
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-theme');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.body.classList.add('light-theme');
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }
    
    // セレクトボックスを現在の設定に合わせる
    themeSelect.value = appSettings.theme;
    
    // テーマが変更されたことをコンソールに出力（デバッグ用）
    console.log('テーマを適用しました:', appSettings.theme);
}

// ナビゲーションの切り替え
function navigateTo(viewId) {
    // すべてのビューを非表示に
    viewContents.forEach(view => {
        view.classList.remove('active');
    });
    
    // 選択されたビューを表示
    document.getElementById(viewId).classList.add('active');
    
    // メニュー項目のアクティブ状態を更新
    menuItems.forEach(item => {
        if (item.getAttribute('data-view') === viewId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // モバイルナビゲーションのアクティブ状態を更新
    navItems.forEach(item => {
        if (item.getAttribute('data-view') === viewId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // レポートビューが選択された場合はデータを更新
    if (viewId === 'report-view') {
        updateReportData();
    }
}

// メニュー項目のイベントリスナー
menuItems.forEach(item => {
    item.addEventListener('click', () => {
        const viewId = item.getAttribute('data-view');
        navigateTo(viewId);
    });
});

// モバイルナビゲーションのイベントリスナー
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const viewId = item.getAttribute('data-view');
        navigateTo(viewId);
    });
});

// タイマーを開始
function startTimer() {
    if (!timerRunning) {
        startTime = Date.now() - elapsedTime;
        timerInterval = setInterval(updateTimer, 1000);
        timerRunning = true;
        timerPaused = false;
        
        // ボタン状態更新
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        statusDisplay.textContent = '測定中';
        statusDisplay.style.color = '#2ecc71';
        
        // 画面をスリープさせない（可能な場合）
        keepScreenAwake(true);
    }
}

// タイマーを一時停止
function pauseTimer() {
    if (timerRunning && !timerPaused) {
        clearInterval(timerInterval);
        timerPaused = true;
        timerRunning = false;
        
        // ボタン状態更新
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        statusDisplay.textContent = '一時停止中';
        statusDisplay.style.color = '#f39c12';
        
        // 画面スリープを許可
        keepScreenAwake(false);
    }
}

// タイマーを停止
function stopTimer() {
    if (timerRunning || timerPaused) {
        clearInterval(timerInterval);
        
        // 作業データの保存
        saveWorkData();
        
        // タイマーリセット
        resetTimer();
        
        // ボタン状態更新
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        statusDisplay.textContent = '停止中';
        statusDisplay.style.color = '#7f8c8d';
        
        // 画面スリープを許可
        keepScreenAwake(false);
    }
}

// 画面をスリープさせない
function keepScreenAwake(enable) {
    if ('wakeLock' in navigator) {
        if (enable) {
            navigator.wakeLock.request('screen')
                .then(lock => {
                    wakeLock = lock;
                })
                .catch(err => {
                    console.error('Wake Lock error:', err);
                });
        } else if (wakeLock) {
            wakeLock.release()
                .then(() => {
                    wakeLock = null;
                });
        }
    }
}

// タイマーをリセット
function resetTimer() {
    clearInterval(timerInterval);
    elapsedTime = 0;
    timerRunning = false;
    timerPaused = false;
    timeDisplay.textContent = '00:00:00';
}

// タイマー表示を更新
function updateTimer() {
    elapsedTime = Date.now() - startTime;
    displayTime(elapsedTime);
}

// 時間の表示形式を整形
function displayTime(time) {
    const hours = Math.floor(time / (1000 * 60 * 60));
    const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((time % (1000 * 60)) / 1000);
    
    timeDisplay.textContent = 
        (hours < 10 ? '0' : '') + hours + ':' +
        (minutes < 10 ? '0' : '') + minutes + ':' +
        (seconds < 10 ? '0' : '') + seconds;
}

// 作業データを保存
function saveWorkData() {
    if (elapsedTime > 0) {
        const workName = workNameInput.value || '番号なし';
        const workPart = workPartInput.value || '-';
        const workTime = formatTimeForSave(elapsedTime);
        const workDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式
        
        const workData = {
            name: workName,
            part: workPart,
            quantity: parseInt(workQuantityInput.value, 10) || 1,
            time: workTime,
            timeRaw: elapsedTime,
            date: workDate,
            notes: workNotesInput.value,
            timestamp: Date.now()
        };
        
        // 履歴に追加
        workHistory.unshift(workData);
        
        // ローカルストレージに保存
        saveToLocalStorage();
        
        // テーブル更新
        updateRecentWorksTable();
    }
}

// 時間のフォーマット (保存用)
function formatTimeForSave(time) {
    const hours = Math.floor(time / (1000 * 60 * 60));
    const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((time % (1000 * 60)) / 1000);
    
    return (hours < 10 ? '0' : '') + hours + ':' +
           (minutes < 10 ? '0' : '') + minutes + ':' +
           (seconds < 10 ? '0' : '') + seconds;
}

// ローカルストレージに保存
function saveToLocalStorage() {
    localStorage.setItem('latheTimeWorkHistory', JSON.stringify(workHistory));
}

// ローカルストレージから読み込み
function loadFromLocalStorage() {
    // 作業履歴データの読み込み
    const savedData = localStorage.getItem('latheTimeWorkHistory');
    if (savedData) {
        try {
            workHistory = JSON.parse(savedData);
            updateRecentWorksTable();
            console.log('作業履歴を読み込みました:', workHistory.length + '件');
        } catch (error) {
            console.error('作業履歴の読み込みに失敗しました:', error);
        }
    }
    
    // 設定の読み込みはloadSettings関数で行うため、ここでは削除
}

// 設定をローカルストレージに保存
function saveSettings() {
    try {
        localStorage.setItem('latheTimeSettings', JSON.stringify(appSettings));
        console.log('設定を保存しました:', appSettings);
        return true;
    } catch (error) {
        console.error('設定の保存に失敗しました:', error);
        return false;
    }
}

// 設定を読み込み
function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('latheTimeSettings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            // 値をマージして既存のキーが欠けないようにする
            appSettings = { ...appSettings, ...parsed };
            console.log('設定を読み込みました:', appSettings);
            return true;
        }
    } catch (error) {
        console.error('設定の読み込みに失敗しました:', error);
    }
    return false;
}

// 最近の作業テーブル更新
function updateRecentWorksTable() {
    recentWorksTable.innerHTML = '';
    
    const displayLimit = Math.min(workHistory.length, 5);
    
    for (let i = 0; i < displayLimit; i++) {
        const work = workHistory[i];
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${escapeHtml(work.name)}</td>
            <td>${escapeHtml(work.part)}</td>
            <td>${work.time}</td>
            <td>${formatDisplayDate(work.date)}</td>
            <td>
                <button class="btn-copy" data-index="${i}">コピー</button>
            </td>
        `;
        
        recentWorksTable.appendChild(row);
    }
    
    // コピーボタンイベント追加
    document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.target.getAttribute('data-index');
            copyWorkData(index);
        });
    });
}

// HTMLエスケープ (XSS対策)
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 日付の表示形式
function formatDisplayDate(dateStr) {
    // ISO形式の日付をローカルフォーマットに変換
    const date = new Date(dateStr);
    return date.toLocaleDateString();
}

// レポートデータ更新
function updateReportData() {
    const fromDate = dateFromInput.value;
    const toDate = dateToInput.value;
    const filterName = filterNameInput.value.toLowerCase();
    
    // フィルタリング
    const filteredData = workHistory.filter(work => {
        const matchesDate = (!fromDate || work.date >= fromDate) && 
                           (!toDate || work.date <= toDate);
        const matchesName = !filterName || 
                           work.name.toLowerCase().includes(filterName);
        
        return matchesDate && matchesName;
    });
    
    // テーブル更新
    reportTable.innerHTML = '';
    
    filteredData.forEach(work => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${escapeHtml(work.name)}</td>
            <td>${escapeHtml(work.part)}</td>
            <td>${work.quantity}</td>
            <td>${work.time}</td>
            <td>${formatDisplayDate(work.date)}</td>
            <td>${escapeHtml(work.notes)}</td>
        `;
        
        reportTable.appendChild(row);
    });
    
    // 集計データ
    updateSummaryData(filteredData);
}

// 集計データを更新
function updateSummaryData(data) {
    const totalWorks = data.length;
    let totalTimeMs = 0;
    
    // 図面枚数を計算（ユニークな図面番号の数）
    const uniqueDrawings = new Set();
    
    data.forEach(work => {
        totalTimeMs += work.timeRaw;
        
        // 空白や「番号なし」でない有効な図面番号のみを数える
        if (work.name && work.name.trim() !== '' && work.name !== '番号なし') {
            uniqueDrawings.add(work.name);
        }
    });
    
    const uniqueDrawingsCount = uniqueDrawings.size;
    const avgTimeMs = totalWorks > 0 ? Math.floor(totalTimeMs / totalWorks) : 0;
    
    // 表示を更新
    totalWorksDisplay.textContent = totalWorks;
    totalTimeDisplay.textContent = formatTimeForSave(totalTimeMs);
    uniqueDrawingsDisplay.textContent = uniqueDrawingsCount;
    avgTimeDisplay.textContent = formatTimeForSave(avgTimeMs);
}

// 作業データをコピー
function copyWorkData(index) {
    const work = workHistory[index];
    
    workNameInput.value = work.name;
    workPartInput.value = work.part;
    workQuantityInput.value = work.quantity;
    workNotesInput.value = work.notes;
}

// 新規作業開始
function startNewWork() {
    // 今の作業を保存
    if (timerRunning || timerPaused) {
        stopTimer();
    }
    
    // フォームをクリア
    workNameInput.value = '';
    workPartInput.value = '';
    workQuantityInput.value = '1';
    workNotesInput.value = '';
    
    // タイマーリセット
    resetTimer();
    
    // 図面番号入力フィールドにフォーカス
    workNameInput.focus();
}

// データのエクスポート (CSV形式)
function exportData(allData = false) {
    let dataToExport = allData ? workHistory : 
        workHistory.slice(0, Math.min(workHistory.length, 5));
    
    if (dataToExport.length === 0) {
        alert('エクスポートするデータがありません。');
        return;
    }
    
    let csvContent = '図面番号,作業内容,数量,時間,日付,詳細メモ\n';
    
    dataToExport.forEach(work => {
        csvContent += `"${csvEscape(work.name)}","${csvEscape(work.part)}","${work.quantity}","${work.time}","${formatDisplayDate(work.date)}","${csvEscape(work.notes)}"\n`;
    });
    
    downloadData(csvContent, `旋盤作業時間_${new Date().toLocaleDateString()}.csv`, 'text/csv;charset=utf-8;');
}

// CSV用エスケープ処理
function csvEscape(text) {
    if (!text) return '';
    return text.replace(/"/g, '""');
}

// データのダウンロード
function downloadData(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    
    if (navigator.msSaveBlob) { // IE10+
        navigator.msSaveBlob(blob, fileName);
        return;
    }
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// データのバックアップ
function backupData() {
    if (workHistory.length === 0) {
        alert('バックアップするデータがありません。');
        return;
    }
    
    const backupData = {
        workHistory: workHistory,
        settings: appSettings,
        version: '1.0.0'
    };
    
    const jsonContent = JSON.stringify(backupData, null, 2);
    downloadData(jsonContent, `旋盤タイム_バックアップ_${new Date().toLocaleDateString()}.json`, 'application/json');
}

// データの復元
function setupRestoreData() {
    restoreFileInput.click();
}

// バックアップファイルからの復元
function restoreFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backupData = JSON.parse(e.target.result);
            
            if (backupData.workHistory && Array.isArray(backupData.workHistory)) {
                if (confirm('バックアップから' + backupData.workHistory.length + '件のデータを復元しますか？現在のデータは上書きされます。')) {
                    workHistory = backupData.workHistory;
                    if (backupData.settings) {
                        appSettings = backupData.settings;
                    }
                    
                    saveToLocalStorage();
                    saveSettings();
                    updateRecentWorksTable();
                    applyTheme();
                    
                    alert('データを復元しました。');
                }
            } else {
                alert('無効なバックアップファイルです。');
            }
        } catch (error) {
            alert('ファイルの読み込みに失敗しました: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// すべてのデータを削除
function clearAllData() {
    if (workHistory.length === 0) {
        alert('削除するデータがありません。');
        return;
    }
    
    if (confirm('すべての作業データを削除します。この操作は元に戻せません。\n\n本当に続行しますか？')) {
        workHistory = [];
        saveToLocalStorage();
        updateRecentWorksTable();
        alert('すべてのデータを削除しました。');
    }
}

// 設定を保存
function saveAppSettings() {
    // テーマ設定を保存
    appSettings.theme = themeSelect.value;
    
    // 設定を保存
    saveSettings();
    
    // テーマを適用
    applyTheme();
    
    alert('設定を保存しました。');
}

// イベントリスナー
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
stopBtn.addEventListener('click', stopTimer);
newBtn.addEventListener('click', startNewWork);
exportBtn.addEventListener('click', () => exportData(false));
exportAllBtn.addEventListener('click', () => exportData(true));
applyFilterBtn.addEventListener('click', updateReportData);
backupBtn.addEventListener('click', backupData);
restoreBtn.addEventListener('click', setupRestoreData);
restoreFileInput.addEventListener('change', restoreFromFile);
clearDataBtn.addEventListener('click', clearAllData);
saveSettingsBtn.addEventListener('click', saveAppSettings);

// システムのダークモード検出
if (window.matchMedia) {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addEventListener('change', () => {
        if (appSettings.theme === 'system') {
            applyTheme();
        }
    });
}

// 画面サイズ変更時のレイアウト調整
window.addEventListener('resize', () => {
    // 必要に応じてレイアウト調整ロジックを追加
});


// 画像アップロードボタンのイベントリスナー
if (imageBtn) {
    imageBtn.addEventListener('click', () => {
        imageUpload.click();
    });
    
    imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            // 図面番号を抽出
            const drawingNumber = await processUploadedImage(file);
            
            // nullの場合（キャンセルされた場合）は何もしない
            if (drawingNumber) {
                // 図面番号を入力欄に設定
                workNameInput.value = drawingNumber;
            }
        } catch (error) {
            alert(`画像処理エラー: ${error.message}`);
        }
        
        // ファイル選択をリセット（同じファイルを再選択できるように）
        imageUpload.value = '';
    });
}