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
const os = require('os');
const readline = require('readline');
const chalk = require('chalk');
const { question } = require('readline-sync');
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
app.use(cors({ origin: ["https://repwawebsitebykepforannas.netlify.app", "https://repwawebsitebykepforannas.netlify.app", "http://localhost:3000"] }));

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

async function connectToWhatsApp(botNumber) {
    const sessionDir = createSessionDir(botNumber);
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    // Perbaikan: usePairingCode harus didefinisikan
    const usePairingCode = true; 

    const anas = makeWASocket({
        printQRInTerminal: !usePairingCode,
        syncFullHistory: true,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        generateHighQualityLinkPreview: true,
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                message.templateMessage ||
                message.listMessage
            );
            if (requiresPatch) {
                message = {
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
        version: (await (await fetch('https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json')).json()).version,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        logger: P({
            level: 'silent'
        }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P().child({
                level: 'silent',
                stream: 'store'
            })),
        }
    });

    const getSocket = () => {
        let connectedSocket = null;
        for (const [id, s] of Object.entries(io.sockets.sockets)) {
          connectedSocket = s;
          break;
        }
        return connectedSocket;
    };
    
    anas.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        const socket = getSocket();

        if (connection === 'connecting') {
            if (socket) socket.emit('status', { status: 'Connecting...', connected: false });
            log(socket, `Bot ${botNumber} is connecting...`);
        } else if (connection === 'open') {
            sessions.set(botNumber, anas);
            botStartTime = Date.now();
            if (socket) socket.emit('status', { status: 'Connected', connected: true });
            log(socket, `Bot ${botNumber} is now connected.`);
            
            // Mengirim status sistem setiap 5 detik
            setInterval(() => {
              if (socket) sendSystemStatus(socket);
            }, 5000);
            
        } else if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            log(socket, `Bot ${botNumber} disconnected with code: ${code}`);

            if (code !== DisconnectReason.loggedOut) {
                if (socket) socket.emit('status', { status: 'Reconnecting...', connected: false });
                log(socket, `Attempting to reconnect bot ${botNumber}...`);
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

    if (!anas.authState.creds.registered) {
        log(null, chalk.blue(`
Please Input Your Number Bot.
Example : 62xxxxxxxxxx
        `));
        
        const phoneNumber = await new Promise((resolve) => {
            rl.question('Nomor Bot: ', (input) => {
                resolve(input);
            });
        });
        
        try {
            const code = await anas.requestPairingCode(phoneNumber.trim());
            log(null, chalk.blue(`
This Your Pairing Code: ${code}
            `));
        } catch (e) {
            log(null, chalk.red(`Error requesting pairing code: ${e.message}`));
        }
    }

    anas.ev.on('creds.update', saveCreds);

    anas.ev.on('messages.upsert', async ({ messages }) => {
        // Logika pesan bot Anda di sini
        // ... (Logika yang sama seperti sebelumnya)
    });
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
    // Panggil fungsi koneksi saat server dimulai
    // Anda harus menentukan nomor bot di sini atau membuatnya dinamis
    const botNumber = '62851639390215'; // Ganti dengan nomor bot default Anda
    connectToWhatsApp(botNumber);
});