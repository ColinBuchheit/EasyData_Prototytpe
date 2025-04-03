// test-server.ts
import express from 'express';
const app = express();
const PORT = 3005;

app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});