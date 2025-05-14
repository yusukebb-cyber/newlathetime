// DOM要素
const timeDisplay = document.querySelector('.time');
const statusDisplay = document.querySelector('.status');
const startBtn = document.querySelector('.btn-start');
const pauseBtn = document.querySelector('.btn-pause');
const stopBtn = document.querySelector('.btn-stop');
const newBtn = document.querySelector('.btn-new');
const exportBtn = document.querySelector('.btn-export');
const workNameInput = document.getElementById('work-name');
const workPartInput = document.getElementById('work-part');
const workQuantityInput = document.getElementById('work-quantity');
const workNotesInput = document.getElementById('work-notes');
const recentWorksTable = document.querySelector('.recent-works tbody');

// タイマー変数
let startTime = 0;
let elapsedTime = 0;
let timerInterval;
let timerRunning = false;
let timerPaused = false;

// 保存データ配列
let workHistory = [];

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
        const workName = workNameInput.value || '名称なし';
        const workPart = workPartInput.value || '-';
        const workTime = formatTimeForSave(elapsedTime);
        const workDate = new Date().toLocaleDateString('ja-JP');
        
        const workData = {
            name: workName,
            part: workPart,
            quantity: workQuantityInput.value,
            time: workTime,
            timeRaw: elapsedTime,
            date: workDate,
            notes: workNotesInput.value
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
    const savedData = localStorage.getItem('latheTimeWorkHistory');
    if (savedData) {
        workHistory = JSON.parse(savedData);
        updateRecentWorksTable();
    }
}

// 最近の作業テーブル更新
function updateRecentWorksTable() {
    recentWorksTable.innerHTML = '';
    
    const displayLimit = Math.min(workHistory.length, 5);
    
    for (let i = 0; i < displayLimit; i++) {
        const work = workHistory[i];
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${work.name}</td>
            <td>${work.part}</td>
            <td>${work.time}</td>
            <td>${work.date}</td>
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
}

// データのエクスポート (CSV形式)
function exportData() {
    if (workHistory.length === 0) {
        alert('エクスポートするデータがありません。');
        return;
    }
    
    let csvContent = '作業名,部品番号,数量,時間,日付,メモ\n';
    
    workHistory.forEach(work => {
        csvContent += `"${work.name}","${work.part}","${work.quantity}","${work.time}","${work.date}","${work.notes.replace(/"/g, '""')}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `旋盤作業時間_${new Date().toLocaleDateString('ja-JP')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// イベントリスナー
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
stopBtn.addEventListener('click', stopTimer);
newBtn.addEventListener('click', startNewWork);
exportBtn.addEventListener('click', exportData);

// メニュー項目のイベント
document.querySelectorAll('.menu li').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.menu li').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        // ここに画面切り替えのロジックを追加予定
    });
});

// 初期化時にローカルストレージからデータを読み込み
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
});