const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const {
  default: makeWaSocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const SESSIONS_DIR = './sessions';
const sessions = new Map();

app.use(express.json());

function createSessionDir(botNumber) {
  const dir = path.join(SESSIONS_DIR, `device${botNumber}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function connectBot(botNumber, socket) {
  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWaSocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: 'silent' }),
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'connecting') {
      socket.emit('status', { status: 'Connecting...', connected: false });
    } else if (connection === 'open') {
      sessions.set(botNumber, sock);
      socket.emit('status', { status: 'Connected', connected: true });
      socket.emit('log', `Bot ${botNumber} connected.`);
    } else if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        socket.emit('status', { status: 'Reconnecting...', connected: false });
        setTimeout(() => connectBot(botNumber, socket), 5000);
      } else {
        socket.emit('status', { status: 'Logged out', connected: false });
        sessions.delete(botNumber);
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch {}
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message) continue;
      const sender = msg.key.remoteJid;
      const isBusiness = msg.message?.extendedTextMessage?.contextInfo?.businessOwnerJid || false;

      if (isBusiness) {
        try {
          await sock.updateBlockStatus(sender, 'block');
          socket.emit('log', `Blocked business contact: ${sender}`);
        } catch (e) {
          socket.emit('log', `Failed to block ${sender}: ${e.message}`);
        }
      }

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      if (text.toLowerCase().includes('spam') || text.toLowerCase().includes('tidak pantas')) {
        await sock.sendMessage(sender, { text: 'Pesan Anda telah dilaporkan karena tidak pantas.' });
        socket.emit('log', `Flagged message from ${sender}`);
      }
    }
  });

  return sock;
}

app.post('/pair', async (req, res) => {
  const { botNumber } = req.body;
  if (!botNumber) return res.status(400).json({ error: 'botNumber required' });

  try {
    const sessionDir = createSessionDir(botNumber);
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWaSocket({
      auth: state,
      printQRInTerminal: false,
      logger: P({ level: 'silent' }),
    });

    sock.ev.on('connection.update', async (update) => {
      if (update.connection === 'connecting') {
        try {
          const code = await sock.requestPairingCode(botNumber);
          const formatted = code.match(/.{1,4}/g).join('-');
          res.json({ pairingCode: formatted });
          sock.ev.removeAllListeners();
          sock.ev.removeAllListeners('creds.update');
          sock.end();
        } catch (e) {
          res.status(500).json({ error: e.message });
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/report', async (req, res) => {
  const { botNumber, targetNumber, times } = req.body;
  if (!botNumber || !targetNumber || !times) return res.status(400).json({ error: 'All fields required' });

  if (!sessions.has(botNumber)) return res.status(400).json({ error: 'Bot not connected' });

  const sock = sessions.get(botNumber);
  try {
    for (let i = 0; i < times; i++) {
      await sock.sendMessage(targetNumber + '@s.whatsapp.net', { text: `Report otomatis #${i + 1}` });
      await new Promise(r => setTimeout(r, 1000)); // delay 1 detik tiap pesan
    }
    res.json({ success: true, message: `Berhasil report ${targetNumber} sebanyak ${times} kali` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

io.on('connection', (socket) => {
  socket.on('connectBot', async ({ botNumber }) => {
    try {
      await connectBot(botNumber, socket);
    } catch (e) {
      socket.emit('status', { status: 'Error: ' + e.message, connected: false });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));