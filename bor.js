import { useMultiFileAuthState, makeWASocket, DisconnectReason, useSingleFileAuthState } from '@adiwajshing/baileys';
import fetch from 'node-fetch';
import fs from 'fs';

async function fetchBaileysVersion() {
    try {
        const { version, isLatest } = await fetch('https://api.github.com/repos/adiwajshing/Baileys/releases/latest')
            .then(res => res.json())
            .then(data => ({
                version: data.tag_name,
                isLatest: true
            }));

        console.log(`Using Baileys version: ${version}`);
        return { version, isLatest };
    } catch (error) {
        console.error('Error fetching Baileys version:', error);
        return null;
    }
}

async function connectToWhatsApp() {
    const { version, isLatest } = await fetchBaileysVersion();
    if (!version) return;

    const { state, saveState } = await useMultiFileAuthState('./auth_info');
    const sock = makeWASocket({
        auth: state,
    });

    sock.ev.on('creds.update', saveState);
    sock.ev.on('messages.upsert', async (m) => {
        try {
            if (m.type === 'notify') {
                const msg = m.messages[0];
                const sender = msg.key.remoteJid;
                const body = msg.message.conversation || '';
                const isGroup = sender.endsWith('@g.us');

                console.log(`Received message from ${sender}: ${body}`);

                // Handle group functionalities
                if (isGroup) {
                    if (body.includes('!tagall')) {
                        const groupMetadata = await sock.groupMetadata(sender);
                        const participants = groupMetadata.participants;
                        const mentioned = participants.map(p => `@${p.id.split('@')[0]}`).join(' ');
                        await sock.sendMessage(sender, { text: mentioned, mentions: participants.map(p => p.id) });
                    }

                    if (body.includes('!remove')) {
                        const parts = body.split(' ');
                        const userToRemove = parts[1] + '@s.whatsapp.net'; // Assuming format is !remove <phone number>
                        await sock.groupParticipantsUpdate(sender, [userToRemove], 'remove');
                    }

                    if (body.includes('!leave')) {
                        await sock.groupLeave(sender);
                    }

                    if (body.includes('!viewonce')) {
                        const mediaMessage = msg.message.imageMessage || msg.message.videoMessage;
                        if (mediaMessage) {
                            const url = await sock.downloadMediaMessage(msg);
                            const path = './viewonce/' + Date.now() + '.jpg';
                            fs.writeFileSync(path, url);
                            console.log(`Downloaded view once media to ${path}`);
                        }
                    }

                    if (body.includes('!deleteStatus')) {
                        await sock.sendMessage(sender, { delete: { key: msg.key } });
                        console.log(`Deleted bot's status message.`);
                    }
                }
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            if (lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
                connectToWhatsApp(); // Reconnect if not logged out
            }
        }
    });

    // Send a test message
    await sock.sendMessage('Your WhatsApp number or group ID here', { text: 'WhatsApp bot is now running!' });
}

connectToWhatsApp().catch(err => console.log('Error: ', err));
