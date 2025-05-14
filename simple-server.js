const express = require('express');
const app = express();
const PORT = 3001;

app.get('/', (req, res) => {
  res.send('Hello World! サーバーが動作しています。');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`シンプルサーバーが起動しました: http://localhost:${PORT}`);
});