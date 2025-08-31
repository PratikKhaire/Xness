const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:4001');

ws.on('open', () => {
  console.log('WebSocket connected successfully');
  ws.send('test');
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err.message);
});

ws.on('close', () => {
  console.log('WebSocket closed');
});

setTimeout(() => {
  ws.close();
  console.log('Test completed');
}, 10000);
  