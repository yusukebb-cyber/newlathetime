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

// 画像の前処理を適用してからBase64にエンコード
function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            // 元のBase64データ
            const originalBase64 = e.target.result;
            
            // 画像前処理のフラグ（設定で無効化できるようにする）
            const enablePreprocessing = localStorage.getItem('enableImagePreprocessing') !== 'false';
            
            if (enablePreprocessing) {
                // 画像をロードして前処理を適用
                preprocessImage(originalBase64)
                    .then(processedBase64 => {
                        // 前処理後のBase64文字列からヘッダを除去
                        const base64 = processedBase64.split(',')[1];
                        resolve(base64);
                    })
                    .catch(error => {
                        console.error('画像前処理エラー:', error);
                        // 前処理に失敗した場合は元の画像を使用
                        const base64 = originalBase64.split(',')[1];
                        resolve(base64);
                    });
            } else {
                // 前処理を適用せず、そのまま返す
                const base64 = originalBase64.split(',')[1];
                resolve(base64);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

// 画像の前処理を適用
function preprocessImage(base64Image) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                // キャンバスを作成
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 画像の最大サイズを設定（Vision APIの推奨サイズ）
                const maxSize = 1600;
                let width = img.width;
                let height = img.height;
                
                // 画像のサイズを調整（大きすぎる場合）
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = Math.floor(height * (maxSize / width));
                        width = maxSize;
                    } else {
                        width = Math.floor(width * (maxSize / height));
                        height = maxSize;
                    }
                }
                
                // キャンバスのサイズを設定
                canvas.width = width;
                canvas.height = height;
                
                // 画像処理の設定を取得（ローカルストレージに保存）
                const settings = getImageProcessingSettings();
                
                // 元の画像を描画
                ctx.drawImage(img, 0, 0, width, height);
                
                // 画像処理を適用
                applyImageProcessing(ctx, width, height, settings);
                
                // 処理済み画像をBase64に変換
                const processedBase64 = canvas.toDataURL('image/jpeg', 0.9);
                resolve(processedBase64);
            } catch (error) {
                console.error('画像処理エラー:', error);
                reject(error);
            }
        };
        img.onerror = reject;
        img.src = base64Image;
    });
}

// 画像処理設定を取得
function getImageProcessingSettings() {
    const defaultSettings = {
        contrast: 1.3,        // コントラスト（1.0が通常）
        brightness: 1.1,      // 明るさ（1.0が通常）
        grayscale: false,     // グレースケール変換
        threshold: false,     // 二値化処理
        thresholdValue: 128,  // 二値化の閾値（0-255）
        sharpening: true,     // シャープネス強調
        sharpeningLevel: 0.5, // シャープネスレベル（0-1）
        denoise: true,        // ノイズ除去
        denoiseLevel: 0.3     // ノイズ除去レベル（0-1）
    };
    
    try {
        // ローカルストレージから設定を取得
        const savedSettings = localStorage.getItem('imageProcessingSettings');
        if (savedSettings) {
            return { ...defaultSettings, ...JSON.parse(savedSettings) };
        }
    } catch (error) {
        console.error('設定の読み込みエラー:', error);
    }
    
    return defaultSettings;
}

// 画像処理を適用
function applyImageProcessing(ctx, width, height, settings) {
    // 画像データを取得
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // 図面やテキスト認識に適した処理を適用
    
    // グレースケール変換（テキスト認識向け）
    if (settings.grayscale) {
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = avg;
        }
    }
    
    // コントラスト調整
    if (settings.contrast !== 1.0) {
        const factor = (259 * (settings.contrast * 100 + 255)) / (255 * (259 - settings.contrast * 100));
        for (let i = 0; i < data.length; i += 4) {
            data[i] = factor * (data[i] - 128) + 128;           // R
            data[i + 1] = factor * (data[i + 1] - 128) + 128;   // G
            data[i + 2] = factor * (data[i + 2] - 128) + 128;   // B
        }
    }
    
    // 明るさ調整
    if (settings.brightness !== 1.0) {
        for (let i = 0; i < data.length; i += 4) {
            data[i] *= settings.brightness;        // R
            data[i + 1] *= settings.brightness;    // G
            data[i + 2] *= settings.brightness;    // B
        }
    }
    
    // 閾値処理（二値化）- テキスト認識に特に有効
    if (settings.threshold) {
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const val = avg > settings.thresholdValue ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = val;
        }
    }
    
    // 変更を適用
    ctx.putImageData(imageData, 0, 0);
    
    // シャープネス（簡易版）- テキスト認識の精度向上に有効
    if (settings.sharpening) {
        // 別のキャンバスを使用してシャープネスを適用
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        // 元の画像をコピー
        tempCtx.drawImage(ctx.canvas, 0, 0);
        
        // アンシャープマスク（簡易版）
        ctx.filter = `blur(1px)`;
        ctx.drawImage(tempCanvas, 0, 0);
        
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'difference';
        ctx.drawImage(tempCanvas, 0, 0);
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = settings.sharpeningLevel;
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.globalAlpha = 1.0;
    }
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
    console.log('図面番号抽出処理開始:', new Date().toISOString());
    
    // APIキーを取得
    const apiKey = getApiKey();
    
    // APIキーがない場合
    if (!apiKey) {
        showApiKeyModal();
        throw new Error('Google Cloud Vision APIキーが設定されていません');
    }
    
    try {
        // 画像をBase64にエンコード
        console.log('画像のBase64エンコード開始');
        const base64Image = await imageToBase64(imageFile);
        console.log('画像のBase64エンコード完了');
        
        // Vision APIを呼び出し
        console.log('Vision API呼び出し開始');
        const result = await callVisionAPI(base64Image, apiKey);
        console.log('Vision API呼び出し完了');
        
        // エラーチェック
        if (result.error) {
            console.error('Vision APIエラー:', result.error);
            throw new Error(`APIエラー: ${result.error.message}`);
        }
        
        // テキストが見つからない場合
        if (!result.responses || !result.responses[0] || !result.responses[0].textAnnotations) {
            console.error('テキスト検出なし');
            throw new Error('画像からテキストを検出できませんでした');
        }
        
        // 検出されたテキストを取得
        const detectedText = result.responses[0].textAnnotations[0].description;
        console.log('検出されたテキスト:', detectedText.substring(0, 100) + (detectedText.length > 100 ? '...' : ''));
        
        // テキストを行に分割
        const textLines = detectedText.split('\n');
        console.log('テキスト行数:', textLines.length);
        
        // カメラ撮影後の場合、iOSで特に問題があるため、少し遅延を入れる
        const isCameraCapture = imageFile.name.startsWith('image') || 
                               imageFile.name.includes('IMG_') || 
                               (imageFile.lastModified && new Date().getTime() - imageFile.lastModified < 60000);
        
        if (isCameraCapture && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
            console.log('iOSデバイスでのカメラ撮影と判断: 遅延を追加します');
            // iPhone/iPadでのカメラ撮影後は、少し遅延させてからモーダルを表示
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // モーダル表示前にフラグを設定
        window._isProcessingCameraImage = true;
        
        // 検出結果を表示するモーダルを作成
        console.log('テキスト選択モーダル表示開始');
        showTextSelectionModal(textLines);
        
        // Promise返しておく（選択結果はモーダルのコールバックで処理）
        return new Promise((resolve) => {
            // コールバック関数を設定
            window.resolveDrawingNumber = (selectedText) => {
                // 処理が完了したことを記録
                window._isProcessingCameraImage = false;
                // 結果を返す
                resolve(selectedText);
            };
            
            // iOS Safariでカメラ撮影時の特別対応
            // モーダルが表示されない場合のバックアップとして、数秒後に自動的に「検出できず」と表示
            if (isCameraCapture && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
                setTimeout(() => {
                    if (window._isProcessingCameraImage) {
                        console.log('バックアップタイマーによる強制モーダル表示');
                        // モーダル表示を強制
                        const textModal = document.getElementById('text-selection-modal');
                        if (textModal && textModal.style.display !== 'flex') {
                            textModal.style.display = 'flex';
                            textModal.style.opacity = '1';
                            document.body.style.overflow = 'hidden';
                            
                            // 視覚的なフィードバックを追加
                            alert('画像からテキストを検出しました。図面番号を選択してください。');
                        }
                    }
                }, 2000);
            }
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
            
            // カメラ撮影の場合は、5秒経ってもモーダルが認識されなかった場合のために、アラートも表示
            if (window._isProcessingCameraImage) {
                setTimeout(() => {
                    // まだカメラ画像処理中のフラグが立っているか確認
                    if (window._isProcessingCameraImage && textModal.style.display === 'flex') {
                        // モーダルはあるがユーザーが認識していない可能性があるため、アラートを表示
                        alert('図面番号を選択するには、検出されたテキスト一覧から選択して「選択を確定」ボタンをタップしてください');
                    }
                }, 5000);
            }
            
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