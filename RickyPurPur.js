const {
    BufferJSON,
    WA_DEFAULT_EPHEMERAL,
    generateWAMessageFromContent,
    proto,
    generateWAMessageContent,
    generateWAMessage,
    prepareWAMessageMedia,
    areJidsSameUser,
    getContentType
} = require("@whiskeysockets/baileys");
const fs = require("fs");
const util = require("util");
const chalk = require("chalk");
const axios = require("axios");
const toUrl = require("./func/tools-toUrl.js");
const ai = require("./func/ai.js");

const botOwner = "6283894391287";
const noBot = "6283873321433";
const botGroup = "https://chat.whatsapp.com/DVSbBEUOE3PEctcarjkeQC";
let gambar = {};
let mkey = {};

const arrMenuDownloader = ["tiktok", "ig", "play"];
const arrMenuAI = ["bawaan", "reset", "set"];
const arrMenuAnime = [];
const arrMenuTools = ["tourl"];
const arrMenuFun = [];
const arrMenuMaker = [];
const arrMenuOther = ["owner","sewa"];

const generateMenuOptions = (options) =>
    options.map((option) => `║│─≽ .${option}\n`).join("");

const generateMenuCategory = (category) =>
    `╔════「 ${category.title} MENU 」═════\n` +
    `║╭───────────────────────\n` +
    generateMenuOptions(category.options) +
    `║╰───────────────────────\n` +
    `╚════════════════════════\n\n`;

const menuCategories = [
    { title: "AI", options: arrMenuAI },
    { title: "Anime", options: arrMenuAnime },
    { title: "Downloader", options: arrMenuDownloader },
    { title: "Tools", options: arrMenuTools },
    { title: "Fun", options: arrMenuFun },
    { title: "Maker", options: arrMenuMaker },
    { title: "Other", options: arrMenuOther }
];

menuCategories.sort((a, b) => a.title.localeCompare(b.title));
menuCategories.forEach((category) => {
    category.options.sort((a, b) => a.localeCompare(b));
});

const menu = menuCategories
    .filter((category) => category.options.length > 0)
    .map(generateMenuCategory)
    .join("");

console.log(menu);

module.exports = sansekai = async (client, m, chatUpdate) => {
    try {
        const body = m.mtype === "conversation" ? m.message.conversation :
            m.mtype === "imageMessage" ? m.message.imageMessage.caption :
            m.mtype === "videoMessage" ? m.message.videoMessage.caption :
            m.mtype === "extendedTextMessage" ? m.message.extendedTextMessage.text :
            m.mtype === "buttonsResponseMessage" ? m.message.buttonsResponseMessage.selectedButtonId :
            m.mtype === "listResponseMessage" ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
            m.mtype === "templateButtonReplyMessage" ? m.message.templateButtonReplyMessage.selectedId :
            m.mtype === "messageContextInfo" ? m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.body : "";

        if (m.mtype === "viewOnceMessageV2") return;

        const budy = typeof body === "string" ? body : "";
        const prefix = /^[\\/!#.]/gi.test(body) ? body.match(/^[\\/!#.]/gi) : "/";
        const isCmd2 = body.startsWith(prefix);
        const command = body.replace(prefix, "").trim().split(/ +/).shift().toLowerCase();
        const args = body.trim().split(/ +/).slice(1);
        const pushname = m.pushName || "No Name";
        const botNumber = await client.decodeJid(client.user.id);
        const itsMe = m.sender === botNumber;
        let text = (q = args.join(" "));
        const msg = text;
        const from = m.chat;
        const reply = m.reply;
        const sender = m.sender;
        const nomorUser = `@${m.sender.split("@")[0]}`;

        const color = (text, color) => (!color ? chalk.green(text) : chalk.keyword(color)(text));

        const cekCmd = (pesan) => pesan.toLowerCase().startsWith(prefix) && !pesan.toLowerCase().startsWith(prefix + " ");

        if (
            (m.mtype.includes("imageMessage") ||
                (m.mtype.includes("stickerMessage") && m.msg.mimetype.includes("image"))) && !m.isGroup && !cekCmd(m.body)
        ) {
            await client.sendMessage(m.chat, {
                react: { text: "🆙", key: m.key }
            });

            mkey[m.sender] = m.key;
            gambar[m.sender] = await toUrl.get(m, client);

            await client.sendMessage(m.chat, {
                react: { text: "☁️", key: mkey[m.sender] }
            });

            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

const autoAI = async () => {
    try {
        if (gambar[m.sender]) {
            await client.sendMessage(m.chat, {
                react: { text: "✅", key: mkey[m.sender] }
            });
            mkey[m.sender] = null;

            await new Promise((resolve) => setTimeout(resolve, 1000));

            await m.reply("*Memproses Gambar...*");
        }

        const hasil = gambar[m.sender]
            ? await ai.handleImageQuery(gambar[m.sender], m.body, m.chat)
            : await ai.handleTextQuery(m.body, m.chat);

        const lines = hasil.trim().split("\n").filter((line) => line.trim());

        if (lines.length > 3) {
            const firstReply = lines.slice(0, lines.length - 1).join("\n").trim();
            const lastReply = lines[lines.length - 1].trim();

            m.reply(firstReply);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            m.reply(lastReply);
        } else {
            const singleReply = lines.join(" ").trim();
            m.reply(singleReply);
        }
    } catch (error) {
        console.error(error);
        m.reply("Coba lagi dalam beberapa detik!");
    } finally {
        delete gambar[m.sender];
    }
};

        if (!m.isGroup && !cekCmd(m.body) && m.body) {
            return autoAI();
        }

        if (cekCmd(m.body)) {
            switch (command) {
                case "sewa": {
                    m.reply("Sewa Bot ke Group\n\n*1 Bulan:* Rp. 5.000\n\nNote: Jika Bot Mati/perbaikan, waktu expired akan berhenti secara otomatis")
                }break
case "ai":
    if (!m.isGroup) return m.reply("Fitur AI hanya untuk di group chat.");
    if (m.mtype.includes("imageMessage") || (m.mtype.includes("stickerMessage") && m.msg.mimetype.includes("image"))) {
        return m.reply("AI tidak bisa memproses gambar di dalam grup!");
    }
    if (!msg) return m.reply("Apa yang ingin kamu tanyakan?");

    try {
        const hasil = await ai.handleTextQuery(msg, m.chat);
        const lines = hasil.trim().split("\n").filter((line) => line.trim());

        if (lines.length > 3) {
            const firstReply = lines.slice(0, lines.length - 1).join("\n").trim();
            const lastReply = lines[lines.length - 1].trim();

            m.reply(firstReply);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            m.reply(lastReply);
        } else {
            const singleReply = lines.join(" ").trim();
            m.reply(singleReply);
        }
    } catch (error) {
        console.error(error);
        m.reply("Maaf, terjadi kesalahan saat memproses permintaan Anda.");
    }
    break;

                case "m":
                    m.reply(JSON.stringify(m, null, 2));
                    break;

                case "play":
                    if (!msg) return m.reply("*ex:* .play dj ya odna");
                    try {
                        m.reply("*Mengirim audio...*");
                        const response = await axios.get("https://rikiapi.vercel.app/play", { params: { query: msg } });
                        const audioUrl = response.data.audio;
                        client.sendMessage(m.chat, { audio: { url: audioUrl }, mimetype: "audio/mpeg" }, { quoted: m });
                    } catch (e) {
                        m.reply(e.message);
                    }
                    break;

                case "owner":
                    m.reply(`Pemilik AI ini adalah ${botOwner}`);
                    break;

                case "tourl":
                    if (m.mtype.includes("imageMessage") || m.mtype.includes("videoMessage")) {
                        const hasil = await toUrl.get(m, client, true);
                        m.reply(`${hasil}\n*note:* media is public with no expiration date, please be careful!.`);
                    } else {
                        m.reply("*Ex:* Upload gambar atau video dengan caption .tourl pastikan ukuran tidak melebihi 30 MB");
                    }
                    break;

                case "ig":
                    if (!msg) return m.reply("*ex:* .ig https://www.instagram.com/p/ByxKbUSnubS/?utm_source=ig_web_copy_link");
                    try {
                        m.reply("*Mengirim media..*");
                        const response = await axios.get("https://rikiapi.vercel.app/aio", { params: { url: msg } });
                        const video = response.data.data;
                        client.sendMessage(m.chat, { video: { url: video.high || video.low }, mimetype: "video/mp4" }, { quoted: m });
                    } catch (e) {
                        m.reply(e.message);
                    }
                    break;

                    case "tiktok":
                    if (!msg) return m.reply("*Ex:* .tiktok https://vm.tiktok.com/ZSjBQ6t9g/\n*Ex:* .tiktok JJ naruto");
                    try {
                        m.reply("*Mengirim media..*");
                        if (msg.startsWith("http")) {
                            const response = await axios.get("https://rikiapi.vercel.app/aio", { params: { url: msg } });
                            const video = response.data.data;
                            client.sendMessage(m.chat, { video: { url: video.high || video.low }, mimetype: "video/mp4" }, { quoted: m });
                        } else {
                            const searchResponse = await axios.get("https://itzpire.com/search/tiktok", { params: { query: msg } });
                            const result = searchResponse.data.data;
                            client.sendMessage(m.chat, { 
                                video: { url: result.no_watermark }, 
                                caption: `*Title:* ${result.title}\n*Author:* ${searchResponse.data.author}`, 
                                mimetype: "video/mp4" 
                            }, { quoted: m });
                        }
                    } catch (e) {
                        m.reply(e.message);
                    }
                    break;

                case "set":
                    if (!msg) return m.reply("*Contoh:* .set Kamu adalah Alicia gadis 17 tahun...");
                    const hasil = await ai.handleTextQuery("setPrompt:" + msg, m.chat);
                    m.reply(hasil.trim());
                    break;

                case "bawaan":
                    const hasilBawaan = await ai.handleTextQuery("resetprompt", m.chat);
                    m.reply(hasilBawaan.trim());
                    break;

                case "reset":
                    const hasilReset = await ai.handleTextQuery("reset", m.chat);
                    m.reply(hasilReset.trim());
                    break;

                case "menu":
                    m.reply(menu);
                    break;
            }
        }
    } catch (err) {
        m.reply(util.format(err));
    }
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});
