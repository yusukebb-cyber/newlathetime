// Google Cloud Vision API 関連の機能

// APIキーを保存・取得・削除
function saveApiKey(key) {
    localStorage.setItem('visionApiKey', key);
    updateApiKeyDisplay(); // 表示を更新
}

function getApiKey() {
    return localStorage.getItem('visionApiKey') || '';
}

function clearApiKey() {
    localStorage.removeItem('visionApiKey');
    updateApiKeyDisplay(); // 表示を更新
    return true;
}

// APIキー設定用モーダルを表示
function showApiKeyModal() {
    const apiKeyModal = document.getElementById('api-key-modal');
    const apiKeyInput = document.getElementById('api-key-input');
    
    // 保存されたAPIキーがあれば表示
    apiKeyInput.value = getApiKey();
    
    // モーダルを表示
    apiKeyModal.style.display = 'flex';
}

// APIキーを保存してモーダルを閉じる
function saveAndCloseApiKeyModal() {
    const apiKeyInput = document.getElementById('api-key-input');
    const apiKeyModal = document.getElementById('api-key-modal');
    
    // APIキーを保存
    saveApiKey(apiKeyInput.value.trim());
    
    // モーダルを閉じる
    apiKeyModal.style.display = 'none';
}

// モーダルを閉じる
function closeApiKeyModal() {
    const apiKeyModal = document.getElementById('api-key-modal');
    apiKeyModal.style.display = 'none';
}

// 設定画面のAPIキー表示を更新
function updateApiKeyDisplay() {
    const apiKeyDisplay = document.getElementById('api-key-display');
    const apiKey = getApiKey();
    
    if (apiKeyDisplay) {
        if (apiKey) {
            // 最初の4文字と最後の4文字を表示し、間は*で隠す
            const masked = maskApiKey(apiKey);
            apiKeyDisplay.value = masked;
            apiKeyDisplay.placeholder = '';
        } else {
            apiKeyDisplay.value = '';
            apiKeyDisplay.placeholder = 'APIキーが設定されていません';
        }
    }
}

// APIキーをマスクする（セキュリティのため）
function maskApiKey(key) {
    if (!key || key.length < 8) return '********';
    const firstFour = key.substring(0, 4);
    const lastFour = key.substring(key.length - 4);
    const middleMask = '*'.repeat(Math.min(8, key.length - 8));
    return `${firstFour}${middleMask}${lastFour}`;
}

// APIキーの表示/非表示を切り替える
function toggleApiKeyVisibility() {
    const apiKeyDisplay = document.getElementById('api-key-display');
    const showKeyBtn = document.getElementById('btn-show-key');
    
    if (apiKeyDisplay.type === 'password') {
        apiKeyDisplay.type = 'text';
        showKeyBtn.textContent = '隠す';
    } else {
        apiKeyDisplay.type = 'password';
        showKeyBtn.textContent = '表示';
    }
}

// 画像をBase64にエンコード
function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

// Vision APIを呼び出してテキスト検出
async function callVisionAPI(base64Image, apiKey) {
    const requestData = {
        requests: [
            {
                image: { content: base64Image },
                features: [{ type: 'TEXT_DETECTION', maxResults: 50 }]
            }
        ]
    };

    try {
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        return await response.json();
    } catch (error) {
        console.error('Vision API エラー:', error);
        throw new Error('Vision APIへのリクエスト中にエラーが発生しました');
    }
}

// 画像から図面番号を抽出する
async function extractDrawingNumberFromImage(imageFile) {
    // APIキーを取得
    const apiKey = getApiKey();
    
    // APIキーがない場合
    if (!apiKey) {
        showApiKeyModal();
        throw new Error('Google Cloud Vision APIキーが設定されていません');
    }
    
    try {
        // 画像をBase64にエンコード
        const base64Image = await imageToBase64(imageFile);
        
        // Vision APIを呼び出し
        const result = await callVisionAPI(base64Image, apiKey);
        
        // エラーチェック
        if (result.error) {
            throw new Error(`APIエラー: ${result.error.message}`);
        }
        
        // テキストが見つからない場合
        if (!result.responses || !result.responses[0] || !result.responses[0].textAnnotations) {
            throw new Error('画像からテキストを検出できませんでした');
        }
        
        // 検出されたテキストを取得
        const detectedText = result.responses[0].textAnnotations[0].description;
        
        // テキストを行に分割
        const textLines = detectedText.split('\n');
        
        // 検出結果を表示するモーダルを作成
        showTextSelectionModal(textLines);
        
        // Promise返しておく（選択結果はモーダルのコールバックで処理）
        return new Promise((resolve) => {
            window.resolveDrawingNumber = resolve;
        });
        
    } catch (error) {
        console.error('図面番号抽出エラー:', error);
        throw error;
    }
}

// テキスト選択用モーダルを表示
function showTextSelectionModal(textLines) {
    // iPhoneのSafari対策として、より長い遅延と複数段階の処理を行う
    console.log('テキスト選択モーダル表示開始: ' + new Date().toISOString());
    
    // モーダル要素を取得して準備する
    const textModal = document.getElementById('text-selection-modal');
    const textList = document.getElementById('detected-text-list');
    const selectedTextPreview = document.getElementById('selected-text-preview');
    const clearSelectionBtn = document.getElementById('clear-selection');
    const confirmSelectionBtn = document.getElementById('confirm-selection');
    
    // 一旦モーダルのコンテンツをクリアして準備
    textList.innerHTML = '';
    selectedTextPreview.textContent = '選択されたテキスト: ';
    
    // 選択されたテキストを保存する配列
    const selectedTexts = [];
    
    // 選択されたテキストのプレビューを更新
    const updatePreview = () => {
        if (selectedTexts.length === 0) {
            selectedTextPreview.textContent = '選択されたテキスト: ';
        } else {
            selectedTextPreview.textContent = '選択されたテキスト: ' + selectedTexts.join(' ');
        }
    };
    
    // 検出されたテキスト行をリストに追加
    textLines.forEach((line, index) => {
        if (line.trim() === '') return;
        
        const listItem = document.createElement('li');
        listItem.textContent = line;
        listItem.addEventListener('click', () => {
            // すでに選択済みの場合、選択解除
            if (listItem.classList.contains('selected')) {
                listItem.classList.remove('selected');
                const index = selectedTexts.indexOf(line);
                if (index > -1) {
                    selectedTexts.splice(index, 1);
                }
            } 
            // 選択されていない場合、選択（最大2つまで）
            else if (selectedTexts.length < 2) {
                listItem.classList.add('selected');
                selectedTexts.push(line);
            }
            
            // プレビューを更新
            updatePreview();
        });
        
        textList.appendChild(listItem);
    });
    
    // iOSのSafariでイベントリスナーが重複登録される問題を防ぐ
    // イベントリスナーを追加する前に一度削除
    if (clearSelectionBtn._hasClickListener) {
        clearSelectionBtn.removeEventListener('click', clearSelectionBtn._clickHandler);
    }
    if (confirmSelectionBtn._hasClickListener) {
        confirmSelectionBtn.removeEventListener('click', confirmSelectionBtn._clickHandler);
    }
    
    // 選択クリアボタンのイベント
    clearSelectionBtn._clickHandler = () => {
        selectedTexts.length = 0;
        updatePreview();
        
        // 選択状態をクリア
        document.querySelectorAll('.text-selection-list li.selected').forEach(item => {
            item.classList.remove('selected');
        });
    };
    clearSelectionBtn._hasClickListener = true;
    clearSelectionBtn.addEventListener('click', clearSelectionBtn._clickHandler);
    
    // 確定ボタンのイベント
    confirmSelectionBtn._clickHandler = () => {
        // 選択されたテキストを半角スペースで結合
        const combinedText = selectedTexts.join(' ');
        
        // コールバック関数を呼び出し
        if (window.resolveDrawingNumber) {
            window.resolveDrawingNumber(combinedText || null);
        }
        
        // モーダルを閉じる
        textModal.style.display = 'none';
        // bodyのスクロールを再度有効化
        document.body.style.overflow = '';
    };
    confirmSelectionBtn._hasClickListener = true;
    confirmSelectionBtn.addEventListener('click', confirmSelectionBtn._clickHandler);
    
    // iOS Safariのためのモーダル表示手順
    // 1. まず準備完了のフラグを設定
    window._modalReadyToShow = true;
    
    // 2. 段階的に処理を行う - まず即座にスタイル設定
    textModal.style.opacity = '0';
    textModal.style.display = 'flex';
    
    // 3. 短い遅延後にトランジションを開始
    setTimeout(() => {
        document.body.style.overflow = 'hidden'; // スクロール禁止
        textModal.style.opacity = '1';
        textModal.style.transition = 'opacity 0.3s ease-in-out';
        
        console.log('モーダル表示トランジション開始: ' + new Date().toISOString());
        
        // 4. さらに遅延を入れてモーダルが確実に表示されるようにする
        setTimeout(() => {
            // 最終チェック - モーダルが表示されていなければ強制的に表示
            if (textModal.style.display !== 'flex') {
                textModal.style.display = 'flex';
                textModal.style.opacity = '1';
            }
            
            // フォーカスを設定してユーザーの注意を引く
            if (confirmSelectionBtn) {
                confirmSelectionBtn.focus();
            }
            
            console.log('モーダル表示完了: ' + new Date().toISOString());
            
            // iOS Safariで注目を集めるため、わずかなアニメーションを加える
            textModal.classList.add('modal-attention');
            setTimeout(() => {
                textModal.classList.remove('modal-attention');
            }, 300);
            
        }, 300);
    }, 50);
    
    // ユーザーがページに触れた時のバックアッププラン
    function ensureModalVisible() {
        // 準備完了フラグがあり、まだモーダルが表示されていない場合
        if (window._modalReadyToShow && textModal.style.display !== 'flex') {
            console.log('ユーザーアクションによるモーダル表示: ' + new Date().toISOString());
            textModal.style.display = 'flex';
            textModal.style.opacity = '1';
            document.body.style.overflow = 'hidden';
            
            // フォーカスを設定
            if (confirmSelectionBtn) {
                confirmSelectionBtn.focus();
            }
        }
    }
    
    // タッチイベントでモーダル表示を確実にする（iOS Safari向け）
    if (!window._touchListenerAdded) {
        document.addEventListener('touchstart', ensureModalVisible, { once: true });
        window._touchListenerAdded = true;
        
        // 5秒後にリスナーを削除（不要になったため）
        setTimeout(() => {
            document.removeEventListener('touchstart', ensureModalVisible);
            window._touchListenerAdded = false;
            window._modalReadyToShow = false;
        }, 5000);
    }
}

// テキスト選択モーダルを閉じる
function closeTextModal() {
    const textModal = document.getElementById('text-selection-modal');
    textModal.style.display = 'none';
    
    // bodyのスクロールを再度有効化
    document.body.style.overflow = '';
    
    // 選択がキャンセルされた場合
    if (window.resolveDrawingNumber) {
        window.resolveDrawingNumber(null);
    }
}


// アップロードされた画像から図面番号を抽出
async function processUploadedImage(file) {
    try {
        return await extractDrawingNumberFromImage(file);
    } catch (error) {
        console.error('アップロード画像処理エラー:', error);
        throw error;
    }
}