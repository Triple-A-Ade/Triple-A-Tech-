import { default as makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys';
import fs from 'fs';
import fetch from 'node-fetch';

async function connectToWhatsApp() {
    const { state, saveState } = await useMultiFileAuthState('./auth_info');
    const sock = makeWASocket({
        auth: state,
    });

    sock.ev.on('creds.update', saveState);

    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;

        if (connection === 'open') {
            console.log('Connected to WhatsApp!');

            const myNumber = '2349130433540@s.whatsapp.net';
            const welcomeText = `
👋 Triple A's WhatsApp Bot is now online!

🔧 **Bot by:** Triple A
📅 **Date:** ${new Date().toLocaleString()}
            `;

            await sock.sendMessage(myNumber, {
                image: { url: './profile.webp' },
                caption: welcomeText,
            });
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        const sender = msg.key.remoteJid;
        const body = msg.message.conversation || '';
        const isGroup = sender.endsWith('@g.us');
        const myNumber = '2349130433540@s.whatsapp.net';

        console.log(`Message from ${sender}: ${body}`);

        // Menu Command
        if (body === '.menu') {
            const menuText = `
👋 Welcome to Triple A's WhatsApp Bot!

✨ **Features** ✨
1️⃣ Auto-reply to messages
2️⃣ View-once media handling
3️⃣ AI responses
4️⃣ Group management:
   - Tag all members
   - Remove users
   - Leave group
5️⃣ Broadcasting messages
6️⃣ Internet image search
7️⃣ Play sounds 🎵
8️⃣ Read deleted messages
9️⃣ More exciting commands coming soon!

🔧 **Bot by:** Triple A
            `;

            await sock.sendMessage(sender, {
                image: { url: './profile.webp' },
                caption: menuText,
            });
        }

        // Play Sounds
        if (body.startsWith('!sound')) {
            const soundName = body.replace('!sound', '').trim();
            const soundPath = `./sounds/${soundName}.mp3`;

            if (fs.existsSync(soundPath)) {
                await sock.sendMessage(sender, {
                    audio: { url: soundPath },
                    mimetype: 'audio/mp4',
                });
            } else {
                await sock.sendMessage(sender, { text: `Sound "${soundName}" not found!` });
            }
        }

        // Group functionalities
        if (isGroup) {
            if (body.startsWith('!tagall')) {
                const groupMetadata = await sock.groupMetadata(sender);
                const participants = groupMetadata.participants;
                const mentions = participants.map((p) => `@${p.id.split('@')[0]}`).join(' ');
                await sock.sendMessage(sender, { text: mentions, mentions: participants.map((p) => p.id) });
            }

            if (body.startsWith('!remove')) {
                const parts = body.split(' ');
                const userToRemove = parts[1] + '@s.whatsapp.net';
                await sock.groupParticipantsUpdate(sender, [userToRemove], 'remove');
            }

            if (body.startsWith('!leave')) {
                await sock.groupLeave(sender);
            }

            if (body.startsWith('!viewonce')) {
                const mediaMessage = msg.message.imageMessage || msg.message.videoMessage;
                if (mediaMessage) {
                    const buffer = await sock.downloadMediaMessage(msg);
                    const path = './viewonce/' + Date.now() + (mediaMessage.mimetype.includes('image') ? '.jpg' : '.mp4');
                    fs.writeFileSync(path, buffer);
                    await sock.sendMessage(sender, { text: `Downloaded view-once media to ${path}` });
                }
            }
        }

        // Broadcast
        if (body.startsWith('!broadcast')) {
            const chats = await sock.chats.all();
            for (const chat of chats) {
                await sock.sendMessage(chat.id, { text: '📢 Broadcast message from Triple A!' });
            }
        }

        // Internet search
        if (body.startsWith('!search')) {
            const query = body.replace('!search', '').trim();
            if (!query) {
                await sock.sendMessage(sender, { text: 'Please provide a search query! Example: !search cats' });
            } else {
                const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
                const data = await response.json();
                const imageURL = data.Image;
                if (imageURL) {
                    await sock.sendMessage(sender, { image: { url: imageURL }, caption: `Search result for: ${query}` });
                } else {
                    await sock.sendMessage(sender, { text: `No images found for: ${query}` });
                }
            }
        }

        // AI Command
        if (body.startsWith('!ai')) {
            const prompt = body.replace('!ai', '').trim();
            const aiResponse = `🤖 AI is currently responding to "${prompt}" (demo).`;
            await sock.sendMessage(sender, { text: aiResponse });
        }
    });
}

connectToWhatsApp().catch((err) => {
    console.error('Failed to connect to WhatsApp:', err);
});
