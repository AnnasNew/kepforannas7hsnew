const express = require('express');
const http = require('http');
const cors = require('cors');
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
const io = new Server(server, {
  cors: {
    origin: "https://repotwanew.netlify.app", // Ganti dengan domain Netlify Anda
    methods: ["GET", "POST"]
  }
});

const SESSIONS_DIR = './sessions';
const sessions = new Map();

app.use(express.json());
app.use(cors({
  origin: "https://repotwanew.netlify.app" // Ganti dengan domain Netlify Anda
}));

function log(socket, message) {
  socket.emit('log', message);
  console.log(message);
}

function createSessionDir(botNumber) {
  const dir = path.join(SESSIONS_DIR, `device${botNumber}`);
  fs.ensureDirSync(dir);
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
    const { connection, lastDisconnect, qr } = update;

    if (connection === 'connecting') {
      socket.emit('status', { status: 'Connecting...', connected: false });
      log(socket, `Bot ${botNumber} connecting...`);
      if (qr) {
        log(socket, `QR code received: ${qr}`);
      }
    } else if (connection === 'open') {
      sessions.set(botNumber, sock);
      socket.emit('status', { status: 'Connected', connected: true });
      log(socket, `Bot ${botNumber} is now connected.`);
    } else if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      log(socket, `Bot ${botNumber} disconnected with code: ${code}`);

      if (code !== DisconnectReason.loggedOut) {
        socket.emit('status', { status: 'Reconnecting...', connected: false });
        log(socket, `Attempting to reconnect bot ${botNumber}...`);
        setTimeout(() => connectBot(botNumber, socket), 5000);
      } else {
        socket.emit('status', { status: 'Logged out', connected: false });
        sessions.delete(botNumber);
        log(socket, `Bot ${botNumber} logged out. Deleting session.`);
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (e) {
          log(socket, `Failed to delete session dir: ${e.message}`);
        }
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const sender = msg.key.remoteJid;
      const isBusiness = msg.message?.extendedTextMessage?.contextInfo?.businessOwnerJid || false;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

      if (isBusiness) {
        try {
          await sock.updateBlockStatus(sender, 'block');
          log(socket, `Blocked business contact: ${sender}`);
        } catch (e) {
          log(socket, `Failed to block ${sender}: ${e.message}`);
        }
      }

      const lowerText = text.toLowerCase();
      if (lowerText.includes('spam') || lowerText.includes('tidak pantas')) {
        await sock.sendMessage(sender, { text: 'Pesan Anda telah dilaporkan karena tidak pantas.' });
        log(socket, `Flagged and replied to a message from ${sender}`);
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
  if (!botNumber || !targetNumber || !times) {
    return res.status(400).json({ error: 'All fields required' });
  }

  if (!sessions.has(botNumber)) {
    return res.status(400).json({ error: 'Bot not connected' });
  }

  const sock = sessions.get(botNumber);
  const targetJid = `${targetNumber}@s.whatsapp.net`;

  try {
    for (let i = 0; i < times; i++) {
      await sock.sendMessage(targetJid, { text: `Laporan otomatis ke #${targetNumber} (Percobaan #${i + 1})` });
      await new Promise(r => setTimeout(r, 1000));
    }
    res.json({ success: true, message: `Berhasil mengirim ${times} laporan ke ${targetNumber}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

io.on('connection', (socket) => {
  log(socket, 'Client connected to the server.');

  socket.on('connectBot', async ({ botNumber }) => {
    log(socket, `Received request to connect bot: ${botNumber}`);
    try {
      await connectBot(botNumber, socket);
    } catch (e) {
      log(socket, `Error connecting bot: ${e.message}`);
      socket.emit('status', { status: 'Error: ' + e.message, connected: false });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected.');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
