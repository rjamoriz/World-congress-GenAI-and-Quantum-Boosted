console.log('1. Starting...');

import express from 'express';
console.log('2. Express loaded');

import dotenv from 'dotenv';
console.log('3. Dotenv loaded');

dotenv.config();
console.log('4. Dotenv configured');

const app = express();
console.log('5. Express app created');

const PORT = 3001;

app.get('/test', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
});
