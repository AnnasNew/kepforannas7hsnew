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
const os = require('os');
const readline = require('readline');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://repwawebsitebykepforannas.netlify.app", "https://repwawebsitebykepforannas.netlify.app", "http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

const SESSIONS_DIR = './sessions';
const sessions = new Map();
let botStartTime = Date.now();

app.use(express.json());
app.use(cors({ origin: ["https://repotwanew.netlify.app", "https://repwawebsitebykepforannas.netlify.app", "http://localhost:3000"] }));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function log(socket, message) {
  if (socket) {
    socket.emit('log', message);
  }
  console.log(message);
}

function createSessionDir(botNumber) {
  const dir = path.join(SESSIONS_DIR, `device${botNumber}`);
  fs.ensureDirSync(dir);
  return dir;
}

function getUptime() {
  const diff = Date.now() - botStartTime;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

function sendSystemStatus(socket) {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // Placeholder for disk usage. In a real app, you would use a library like 'disk-usage'
  const diskTotal = 1000;
  const diskUsed = 250;

  const statusData = {
    cpuLoad: (os.loadavg()[0] * 10).toFixed(1),
    uptime: getUptime(),
    memory: `${(usedMem / 1024 / 1024).toFixed(2)} / ${(totalMem / 1024 / 1024).toFixed(2)} MiB`,
    disk: `${diskUsed} / ${diskTotal} GiB`
  };
  socket.emit('system-status', statusData);
}

async function startBot(botNumber) {
  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWaSocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: 'silent' }),
  });

  const getSocket = () => {
    let connectedSocket = null;
    for (const [id, s] of Object.entries(io.sockets.sockets)) {
      connectedSocket = s;
      break;
    }
    return connectedSocket;
  };

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    const socket = getSocket();
    
    if (qr) {
      log(socket, `QR code received: ${qr}`);
      socket.emit('qr', qr);
    }
    
    if (connection === 'connecting') {
      if (socket) socket.emit('status', { status: 'Connecting...', connected: false });
      log(socket, `Bot ${botNumber} is connecting...`);
    } else if (connection === 'open') {
      sessions.set(botNumber, sock);
      botStartTime = Date.now();
      if (socket) socket.emit('status', { status: 'Connected', connected: true });
      log(socket, `Bot ${botNumber} is now connected.`);
      
      setInterval(() => {
        if (socket) sendSystemStatus(socket);
      }, 5000);
    } else if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      log(socket, `Bot ${botNumber} disconnected with code: ${code}`);

      if (code !== DisconnectReason.loggedOut) {
        if (socket) socket.emit('status', { status: 'Reconnecting...', connected: false });
        log(socket, `Attempting to reconnect bot ${botNumber}...`);
        setTimeout(() => startBot(botNumber), 5000);
      } else {
        if (socket) socket.emit('status', { status: 'Logged out', connected: false });
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
      
      const socket = getSocket();
      
      if (isBusiness) {
        try {
          await sock.updateBlockStatus(sender, 'block');
          log(socket, `Blocked business contact: ${sender}`);
        } catch (e) {
          log(socket, `Failed to block ${sender}: ${e.message}`);
        }
      }

      const lowerText = text.toLowerCase();
      const inappropriateKeywords = ['spam', 'penipuan', 'scam', 'tidak pantas', 'porno', 'kasar'];
      const hasInappropriateContent = inappropriateKeywords.some(keyword => lowerText.includes(keyword));

      if (hasInappropriateContent) {
        try {
          await sock.sendMessage(sender, { text: 'Pesan Anda telah dilaporkan karena mengandung konten tidak pantas.' });
          log(socket, `Blocked inappropriate message from ${sender}`);
          await sock.updateBlockStatus(sender, 'block');
        } catch (e) {
          log(socket, `Failed to block ${sender} due to inappropriate message: ${e.message}`);
        }
      }
    }
  });

  return sock;
}

app.post('/report-and-block', async (req, res) => {
  const { botNumber, targetNumber, times } = req.body;
  if (!botNumber || !targetNumber || !times) {
    return res.status(400).json({ error: 'All fields required' });
  }

  if (!sessions.has(botNumber)) {
    return res.status(400).json({ error: 'Bot not connected' });
  }

  const sock = sessions.get(botNumber);
  const targetJid = `${targetNumber}@s.whatsapp.net`;
  const socket = io.sockets.sockets.values().next().value;

  try {
    log(socket, `Sending ${times} reports and blocking ${targetNumber}`);
    for (let i = 0; i < times; i++) {
      await sock.sendMessage(targetJid, { text: `Laporan otomatis ke #${targetNumber} (Percobaan #${i + 1})` });
      await new Promise(r => setTimeout(r, 1000));
    }
    await sock.updateBlockStatus(targetJid, 'block');
    log(socket, `Successfully blocked ${targetNumber}`);
    res.json({ success: true, message: `Berhasil mengirim ${times} laporan dan memblokir ${targetNumber}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

io.on('connection', (socket) => {
  log(socket, 'Client connected to the server.');
  socket.on('disconnect', () => {
    console.log('Client disconnected.');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`\nSilakan Masukkan nomor bot Anda di konsol untuk memulai pairing:`);
  rl.question('Nomor Bot (contoh: 6281234567890): ', async (botNumber) => {
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
            console.log(`\nKode Pairing Anda: ${formatted}`);
            console.log(`Silakan masukkan kode ini di aplikasi WhatsApp Anda.`);
            sock.ev.removeAllListeners();
            sock.end();
            startBot(botNumber);
          } catch (e) {
            console.error(`Error requesting pairing code: ${e.message}`);
          }
        }
      });
      sock.ev.on('creds.update', saveCreds);
    } catch (e) {
      console.error(`Failed to start pairing process: ${e.message}`);
    }
  });
});