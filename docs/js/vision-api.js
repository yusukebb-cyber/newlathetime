// Google Cloud Vision API 関連の機能

// APIキーを保存・取得
function saveApiKey(key) {
    localStorage.setItem('visionApiKey', key);
}

function getApiKey() {
    return localStorage.getItem('visionApiKey') || '';
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
    // モーダル要素を取得
    const textModal = document.getElementById('text-selection-modal');
    const textList = document.getElementById('detected-text-list');
    
    // リストをクリア
    textList.innerHTML = '';
    
    // 検出されたテキスト行をリストに追加
    textLines.forEach((line, index) => {
        if (line.trim() === '') return;
        
        const listItem = document.createElement('li');
        listItem.textContent = line;
        listItem.addEventListener('click', () => {
            // 選択された行を図面番号として設定
            if (window.resolveDrawingNumber) {
                window.resolveDrawingNumber(line);
            }
            
            // モーダルを閉じる
            textModal.style.display = 'none';
        });
        
        textList.appendChild(listItem);
    });
    
    // モーダルを表示
    textModal.style.display = 'flex';
}

// テキスト選択モーダルを閉じる
function closeTextModal() {
    const textModal = document.getElementById('text-selection-modal');
    textModal.style.display = 'none';
    
    // 選択がキャンセルされた場合
    if (window.resolveDrawingNumber) {
        window.resolveDrawingNumber(null);
    }
}

// カメラで撮影した画像から図面番号を抽出
async function processImageFromCamera(imageDataUrl) {
    try {
        // Data URLをBlobに変換
        const res = await fetch(imageDataUrl);
        const blob = await res.blob();
        
        // File オブジェクトに変換
        const file = new File([blob], "camera-image.jpg", { type: "image/jpeg" });
        
        // 図面番号を抽出
        return await extractDrawingNumberFromImage(file);
    } catch (error) {
        console.error('カメラ画像処理エラー:', error);
        throw error;
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