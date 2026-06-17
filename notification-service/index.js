const express = require('express');
const { WebSocketServer } = require('ws');
const amqp = require('amqplib');
const http = require('http');
require('dotenv').config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4006;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Map();

app.get('/health', (req, res) => res.json({ status: 'Notification Service OK', connected: clients.size }));

wss.on('connection', (ws, req) => {
  const userId = new URL(req.url, 'http://localhost').searchParams.get('userId');
  if (!userId) { ws.close(); return; }
  clients.set(userId, ws);
  ws.send(JSON.stringify({ type: 'connected', message: 'Real-time notifications active' }));
  ws.on('close', () => clients.delete(userId));
});

function notifyUser(userId, payload) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === 1) { ws.send(JSON.stringify(payload)); return true; }
  return false;
}

async function connectQueue() {
  const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  while (true) {
    try {
      const connection = await amqp.connect(RABBITMQ_URL);
      const channel = await connection.createChannel();
      await channel.assertQueue('notifications', { durable: true });
      channel.consume('notifications', (msg) => {
        if (!msg) return;
        const data = JSON.parse(msg.content.toString());
        notifyUser(data.user_id, data.payload);
        channel.ack(msg);
      });
      break;
    } catch (err) {
      console.error('[Notifications] Retrying in 5s...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

app.post('/notify', (req, res) => {
  const { user_id, payload } = req.body;
  const sent = notifyUser(user_id, payload);
  res.json({ sent, online: clients.has(user_id) });
});

server.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
  connectQueue().catch(console.error);
});
