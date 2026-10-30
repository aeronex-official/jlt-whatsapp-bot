
const express = require('express');
const cors = require('cors');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

let sock = null;
let qrCodeData = null;
let connectionStatus = 'disconnected'; // disconnected, qr, connecting, connected
let lastQR = null;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: ['JLT Magic Bot', 'Chrome', '1.0.0']
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      qrCodeData = qr;
      connectionStatus = 'qr';
      lastQR = await QRCode.toDataURL(qr);
      console.log('New QR generated');
    }
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed, reconnecting:', shouldReconnect);
      connectionStatus = 'disconnected';
      if (shouldReconnect) {
        setTimeout(startBot, 3000);
      }
    } else if (connection === 'open') {
      connectionStatus = 'connected';
      qrCodeData = null;
      lastQR = null;
      console.log('WhatsApp Connected! Number:', sock.user.id);
    } else if (connection === 'connecting') {
      connectionStatus = 'connecting';
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Auto-mediator logic
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const from = msg.key.remoteJid;
      console.log(`Message from ${from}: ${text}`);
      
      // Auto-translate & nudge logic here
      // Example: if contains price, pin it
      if (text.toLowerCase().includes('aed') && text.match(/\d{3}/)) {
        // You can auto-react or log
      }
    }
  });
}

startBot();

// API: Get QR as image
app.get('/qr', async (req, res) => {
  if (lastQR) {
    const base64 = lastQR.replace(/^data:image\/png;base64,/, '');
    const img = Buffer.from(base64, 'base64');
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' });
    res.end(img);
  } else if (connectionStatus === 'connected') {
    res.json({ status: 'connected', message: 'Already connected as ' + (sock?.user?.id || '') });
  } else {
    res.json({ status: connectionStatus, message: 'Waiting for QR...' });
  }
});

// API: Get status
app.get('/status', (req, res) => {
  res.json({
    status: connectionStatus,
    connectedNumber: sock?.user?.id || null,
    hasQR: !!lastQR,
    timestamp: new Date().toISOString()
  });
});

// API: Send private message (for your dashboard)
app.post('/send-message', async (req, res) => {
  const { number, message } = req.body;
  if (!sock || connectionStatus !== 'connected') return res.status(400).json({ error: 'Not connected' });
  try {
    const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Create group + auto-intro (Owner <-> Tenant)
app.post('/create-group', async (req, res) => {
  const { groupName, participants, introMessage } = req.body;
  // participants: ['9715xxxx@s.whatsapp.net', '9715yyyy@s.whatsapp.net']
  if (!sock || connectionStatus !== 'connected') return res.status(400).json({ error: 'Not connected' });
  try {
    const group = await sock.groupCreate(groupName, participants);
    const groupId = group.id;
    if (introMessage) {
      await sock.sendMessage(groupId, { text: introMessage });
    }
    res.json({ success: true, groupId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h2>JLT Magic Bot Backend is Running</h2>
    <p>Status: ${connectionStatus}</p>
    <p><a href="/qr" target="_blank">View QR Code</a> | <a href="/status">Status JSON</a></p>
    <p>Use this URL in your Netlify dashboard settings: ${req.protocol}://${req.get('host')}/qr</p>
    <script>setTimeout(()=>location.reload(), 10000)</script>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
