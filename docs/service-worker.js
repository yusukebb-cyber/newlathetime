const CACHE_NAME = 'lathe-time-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'css/styles.css',
  'js/app.js',
  'images/lathe-icon.svg',
  'manifest.json'
];

// Service Workerのインストール
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('キャッシュを開きました');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// 古いキャッシュの削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ネットワークリクエストの処理
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュにあればそれを返す
        if (response) {
          return response;
        }
        
        // キャッシュになければネットワークから取得
        return fetch(event.request).then(
          response => {
            // 無効なレスポンスの場合はそのまま返す
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // レスポンスを複製（ストリームは一度しか読めないため）
            const responseToCache = response.clone();
            
            // レスポンスをキャッシュに追加
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          }
        );
      })
      .catch(error => {
        // オフライン時の処理
        console.log('Fetch failed:', error);
        
        // APIリクエストの場合はオフラインエラーを返す
        if (event.request.url.includes('/api/')) {
          return new Response(JSON.stringify({ error: 'オフラインです' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })
  );
});

// プッシュ通知の受信処理
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: 'images/lathe-icon.svg',
      badge: 'images/lathe-icon.svg',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 通知クリック時の処理
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const data = event.notification.data;
  if (data && data.url) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        // 既に開いているウィンドウがあればそれをフォーカス
        for (let client of windowClients) {
          if (client.url === data.url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // 新しいウィンドウを開く
        if (clients.openWindow) {
          return clients.openWindow(data.url);
        }
      })
    );
  }
});