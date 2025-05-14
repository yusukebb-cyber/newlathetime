const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 静的ファイルの提供
app.use(express.static(path.join(__dirname)));

// すべてのルートでindex.htmlを返す（SPA対応）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// サーバー起動 - すべてのネットワークインターフェースでリッスン
app.listen(PORT, '0.0.0.0', () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
  console.log(`他のデバイスからは http://[あなたのIPアドレス]:${PORT} でアクセスできます`);
});