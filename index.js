const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');
const fetch = require('node-fetch'); // pastikan node-fetch@2 terinstall

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://repwawebsitebykepforannas.netlify.app", "http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

const SESSIONS_DIR = './sessions';
const sessions = new Map();
let botStartTime = Date.now();

app.use(express.json());
app.use(cors({ origin: ["https://repwawebsitebykepforannas.netlify.app", "http://localhost:3000"] }));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function log(socket, message) {
  if (socket) socket.emit('log', message);
  console.log(message);
}

function createSessionDir(botNumber) {
  const dir = path.join(SESSIONS_DIR, `device${botNumber}`);
  fs.ensureDirSync(dir);
  return dir;
}

async function getBaileysVersion() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json');
    if (res.ok) {
      const json = await res.json();
      return json.version;
    }
  } catch {
    // fallback version
  }
  return [2, 2304, 5];
}

async function connectToWhatsApp(botNumber) {
  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const usePairingCode = true;
  const baileysVersion = await getBaileysVersion();

  const sock = makeWASocket({
    printQRInTerminal: !usePairingCode,
    syncFullHistory: true,
    markOnlineOnConnect: true,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 0,
    keepAliveIntervalMs: 10000,
    generateHighQualityLinkPreview: true,
    patchMessageBeforeSending: (message) => {
      if (message.buttonsMessage || message.templateMessage || message.listMessage) {
        return {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadataVersion: 2,
                deviceListMetadata: {},
              },
              ...message,
            },
          },
        };
      }
      return message;
    },
    version: baileysVersion,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    logger: P({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P().child({ level: 'silent', stream: 'store' })),
    }
  });

  const getSocket = () => {
    for (const s of io.sockets.sockets.values()) return s;
    return null;
  };

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    const socket = getSocket();

    if (connection === 'connecting') {
      if (socket) socket.emit('status', { status: 'Connecting...', connected: false });
      log(socket, `Bot ${botNumber} connecting...`);
    } else if (connection === 'open') {
      sessions.set(botNumber, sock);
      botStartTime = Date.now();
      if (socket) socket.emit('status', { status: 'Connected', connected: true });
      log(socket, `Bot ${botNumber} connected.`);
    } else if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      log(socket, `Bot ${botNumber} disconnected with code: ${code}`);

      if (code !== DisconnectReason.loggedOut) {
        if (socket) socket.emit('status', { status: 'Reconnecting...', connected: false });
        log(socket, `Reconnecting bot ${botNumber}...`);
        setTimeout(() => connectToWhatsApp(botNumber), 5000);
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

  if (!sock.authState.creds.registered) {
    log(null, chalk.blue(`Silakan input nomor bot Anda (contoh: 628xxxxxxxxxx):`));
    const phoneNumber = await new Promise(resolve => rl.question('Nomor Bot: ', resolve));
    try {
      const code = await sock.requestPairingCode(phoneNumber.trim());
      log(null, chalk.blue(`Kode pairing Anda: ${code}`));
    } catch (e) {
      log(null, chalk.red(`Error request pairing code: ${e.message}`));
    }
  }

  sock.ev.on('creds.update', saveCreds);
}

app.post('/report-and-block', async (req, res) => {
  const { botNumber, targetNumber, times } = req.body;
  if (!botNumber || !targetNumber || !times) return res.status(400).json({ error: 'Semua field wajib diisi' });
  if (!sessions.has(botNumber)) return res.status(400).json({ error: 'Bot tidak terhubung' });

  const sock = sessions.get(botNumber);
  const targetJid = `${targetNumber}@s.whatsapp.net`;
  const socket = io.sockets.sockets.values().next().value;

  try {
    log(socket, `Mengirim ${times} laporan dan memblokir ${targetNumber}`);
    for (let i = 0; i < times; i++) {
      await sock.sendMessage(targetJid, { text: `Laporan otomatis ke #${targetNumber} (Percobaan #${i + 1})` });
      await new Promise(r => setTimeout(r, 1000));
    }
    await sock.updateBlockStatus(targetJid, 'block');
    log(socket, `Berhasil memblokir ${targetNumber}`);
    res.json({ success: true, message: `Berhasil mengirim ${times} laporan dan memblokir ${targetNumber}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

io.on('connection', (socket) => {
  log(socket, 'Klien terhubung ke server.');
  socket.on('disconnect', () => {
    console.log('Klien terputus.');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  const botNumber = '62851639390215'; // Ganti sesuai nomor bot Anda
  connectToWhatsApp(botNumber);
});