const { global } = require('./config.js');
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
const path = require("path");
const axios = require("axios");
const toUrl = require("./func/tools-toUrl.js");
const ai = require("./func/ai.js");
const {alldown} = require("aio");
const play = require("./func/play.js");
const hd = require("./func/hd.js");
const {jadwalAnime, populerAnime, random} = require("./func/anime.js");

const botOwner = global.owner;
const noBot = global.nobot;
const botGroup = global.gcbot;
let gambar = {};
let mkey = {};

const arrMenuDownloader = global.downloader
const arrMenuAI = global.menuAI
const arrMenuAnime = global.anime
const arrMenuTools = global.tools
const arrMenuFun = global.fun
const arrMenuMaker = global.maker
const arrMenuOther = global.other

const generateMenuOptions = (options) => {
  const symbols = ["❖", "✦", "✧", "✩", "✪", "✫", "✯"];
  return options.map((option, i) => ` ${symbols[i % symbols.length]} .${option}  `).join("\n");
};

const generateMenuCategory = (category, i) => {
  const title = i % 2 === 0 
    ? `*${category.title.toUpperCase()}*` 
    : `*${category.title.split('').map((char, j) => j % 2 === 0 ? char.toUpperCase() : char.toLowerCase()).join('')}*`;

  const startSymbol = i % 2 === 0 ? "✦" : "✧";
  const endSymbol = i % 2 === 0 ? "✧" : "✦";

  return (
    `\n  ${startSymbol} ${title} ${endSymbol}  \n` +
    generateMenuOptions(category.options) +
    "\n"
  );
};

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
    m.mtype.includes("imageMessage") && 
    !m.isGroup && 
    !cekCmd(m.body)
){
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

const bug = async (err) => {
  m.reply("> "+err.message+"\nLapor ke *.owner* biar cepet di perbaiki");
}

const user = `${m.sender.split("@")[0]}@V1.1.1`

    const autoAI = async () => {
  try {
    if (gambar[m.sender]) {
      await client.sendMessage(m.chat, { react: { text: "✅", key: mkey[m.sender] } });
      mkey[m.sender] = null;
      await m.reply("*Memproses Gambar...*");
    }

    const hasil = gambar[m.sender]
      ? await ai.handleImageQuery(gambar[m.sender], m.body, user)
      : await ai.handleTextQuery(m.body, user);

    const remainingText = hasil
      .trim()
      .replace(/\*\*(.*?)\*\*/g, '*$1*')
      .replace(/```(.*?)```/g, '`$1`');

    const parts = remainingText.split(/(\[\{.*?\}\]|\{\{.*?\}\}|\[\[.*?\]\]|\[\|.*?\|\])/);
    const mediaQueue = [];
    const textQueue = [];
    let currentText = '';

    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith("[{")) {
        const query = parts[i].slice(2, -2).trim();
        const response = await axios.get(`https://api.ryzendesu.vip/api/search/gimage?query=${encodeURIComponent(query)}`);
        const images = response.data;

        if (images.length > 0) {
          for (let j = 0; j < Math.min(images.length, 3); j++) {
            try {
              const imageResponse = await axios.get(images[j].image, { responseType: 'arraybuffer' });
              mediaQueue.push({ type: 'image', buffer: Buffer.from(imageResponse.data, 'binary'), caption: currentText.trim() });
              currentText = '';
              break;
            } catch (error) {
              if (j === 2) m.reply("Gambar tidak ditemukan");
            }
          }
        } else {
          m.reply("Gambar tidak ditemukan");
        }
      } else if (parts[i].startsWith("{{")) {
        const query = parts[i].slice(2, -2).trim();
        const searchResponse = await axios.get("https://itzpire.com/search/tiktok", { params: { query: query } });
        const result = searchResponse.data.data;
        mediaQueue.push({ type: 'video', url: result.no_watermark, caption: currentText.trim() });
        currentText = '';
      } else if (parts[i].startsWith("[[")) {
        const query = parts[i].slice(2, -2).trim();
        m.reply("`Alicia sedang mencari lagu; "+query+". Tunggu ya...`")
        await play.get(m, client, query);
      } else if (parts[i].startsWith("[|")) {
        const query = parts[i].slice(2, -2).trim();
        const apiKey = "AIzaSyCBtH9e95qEE2nzFcxVuO0ZLPnncXO9oyg";
        const requestBody = {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: query
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
            responseMimeType: "text/plain"
          }
        };

        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
          requestBody,
          { headers: { 'Content-Type': 'application/json' } }
        );

        const aiResponse = response.data.candidates[0].content.parts
          .map(part => part.text)
          .join('')
          .trim()
          .replace(/\*\*(.*?)\*\*/g, '*$1*');

        await m.reply(`*Jawaban Gemini AI:*\n${aiResponse}\n*---------*`);
      } else {
        currentText += `${currentText ? '\n' : ''}${parts[i].trim()}`;
      }
    }

    if (currentText.trim()) {
      textQueue.push(currentText.trim());
    }

    for (const media of mediaQueue) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (media.type === 'image') {
        await client.sendMessage(m.chat, { image: media.buffer, caption: media.caption }, { quoted: m });
      } else if (media.type === 'video') {
        await client.sendMessage(m.chat, { video: { url: media.url }, caption: media.caption, mimetype: "video/mp4" }, { quoted: m });
      }
    }

    for (const text of textQueue) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await m.reply(text);
    }
  } catch (error) {
    bug(error);
  } finally {
    delete gambar[m.sender];
  }
};

    if (!m.isGroup && !cekCmd(m.body) && m.body) {
      return autoAI();
    }
    
if (m.isGroup && m.quoted && !cekCmd(m.body)){
      if (m.quoted.sender.includes(noBot)) return autoAI()
    } 

    if (cekCmd(m.body)) {
      switch (command) {
          case "search": {
            if (!msg) return m.reply("Masukkan judul anime yang ingin dicari");
            m.reply("Sedang mencari anime...");
            const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(msg)}&sfw`);
            const result = response.data.data;
            if (result.length === 0) return m.reply("Anime tidak ditemukan.");
              const anime = result[0];
              const originalSynopsis = anime.synopsis;
              const aiPrompt = `Terjemahkan dan ringkas sinopsis di bawah secara langsung tanpa basa basi:\n\n${originalSynopsis}`;
              const summarizedSynopsis = await ai.handleTextQuery(aiPrompt, user);
              const genres = anime.genres.map(genre => genre.name).join(', ');
              const themes = anime.themes.map(theme => theme.name).join(', ');

              await client.sendMessage(m.chat, {
                image: { url: anime.images.jpg.image_url },
                caption: `*Title:* ${anime.title}\n*Genre:* ${genres}\n*Theme:* ${themes}\n*Rating:* ${anime.score}\n\n*Sinopsis:* ${summarizedSynopsis.trim()}`
              }, { quoted: m });
            break;
          };
          case "jadwal": {
            if (!msg) return m.reply("Masukkan nama hari (senin, selasa, rabu, kamis, jumat, sabtu, minggu)");
            const result = await jadwalAnime(msg);
            m.reply(result);
            break;
          };
          case "populer": {
            const result = await populerAnime();
            m.reply(result);
            break;
          };
          case "random": {
            if (!msg) return m.reply("Masukkan genre anime yang ingin dicari (contoh: action, comedy)");
            m.reply("Sedang mencari anime...");
            const result = await random(msg);
            if (result.error) return m.reply(result.error);

            const originalSynopsis = result.sinopsis;
            const aiPrompt = `Terjemahkan dan ringkas sinopsis di bawah secara langsung tanpa basa basi:\n\n${originalSynopsis}`;
            const summarizedSynopsis = await ai.handleTextQuery(aiPrompt, user);

            await client.sendMessage(m.chat, {
              image: { url: result.image },
              caption: `*Title:* ${result.title}\n*Genre:* ${result.genre}\n\n*Sinopsis:* ${summarizedSynopsis.trim()}`
            }, { quoted: m });
            break;
          };
          case "ytmp4": {
            if (!msg) return m.reply("Masukkan URL YouTube yang valid");
            try {
              m.reply("Sedang memproses video...");
              const response = await axios.get(`https://api.agatz.xyz/api/ytmp4?url=${encodeURIComponent(msg)}`);
              const videoUrl = response.data.data.downloadUrl;
              await client.sendMessage(m.chat, { video: { url: videoUrl }, mimetype: "video/mp4" }, { quoted: m });
            } catch (e) {
              m.reply(`> ${e.message}\nLaporkan ke .owner`);
            }
            break;
          };
          case "tts": {
  if (!msg) return m.reply("Masukkan teks untuk diubah menjadi suara");
  try {
    m.reply("Sedang memproses teks...");
    const response = await axios.get(`https://api.agatz.xyz/api/voiceover?text=${encodeURIComponent(msg)}&model=miku`);
    const audioUrl = response.data.data.oss_url;
    await client.sendMessage(m.chat, { audio: { url: audioUrl }, mimetype: "audio/mpeg", ptt: true }, { quoted: m });
  } catch (e) {
    try {
      const fallbackResponse = await axios.get(`https://express-vercel-ytdl.vercel.app/tts?text=${encodeURIComponent(msg)}`, { responseType: "arraybuffer" });
      await client.sendMessage(m.chat, { audio: Buffer.from(fallbackResponse.data), mimetype: "audio/mpeg", ptt: true }, { quoted: m });
    } catch (e) {
      m.reply("Terjadi kesalahan saat memproses teks");
    }
  }
  break;
};
          case "gempa": {
    const response = await axios.get('https://cuaca-gempa-rest-api.vercel.app/quake');
    const data = response.data;
    if (data.success) {
        const gempaData = data.data;
        const gempaInfo = `
Tanggal: ${gempaData.tanggal}
Jam: ${gempaData.jam}
Magnitudo: ${gempaData.magnitude}
Kedalaman: ${gempaData.kedalaman}
Wilayah: ${gempaData.wilayah}
Potensi: ${gempaData.potensi}
Dirasakan: ${gempaData.dirasakan}
        `;
        const imageUrl = gempaData.shakemap;
        const caption = gempaInfo.trim();
        const media = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(media.data, 'binary');
        await client.sendMessage(m.chat, { image: imageBuffer, mimetype: "image/jpeg", caption: caption }, { quoted: m });
    } else {
        m.reply('Tidak ada data gempa terkini');
    }
} break;
          case "img": {
            if (!msg) return m.reply("Masukkan kata kunci untuk pencarian gambar");
            try {
              m.reply("Sedang mencari gambar...");
              const response = await axios.get(`https://api.agatz.xyz/api/pinsearch?message=${encodeURIComponent(msg)}`);
              const images = response.data.data;
              if (images.length === 0) return m.reply("Gambar tidak ditemukan.");
              const randomImage = images[Math.floor(Math.random() * images.length)].images_url;
              client.sendMessage(m.chat, { image: { url: randomImage } }, { quoted: m });
            } catch (e) {
              bug(e);
            }
            break;
          };
        case "videy": {
          if (!msg) return m.reply("*Ex:* .videy https://videy.co/v?id=6eWSwq2t");
          try {
            m.reply("*Mengirim media..*");
            const response = await axios.get(`https://api.agatz.xyz/api/videydl?url=${msg}`);
            const videoUrl = response.data.data;
            client.sendMessage(m.chat, { video: { url: videoUrl }, mimetype: "video/mp4" }, { quoted: m });
          } catch (e) {
            bug(e);
          }
          break;
        };

          case "lirik": {
              if (msg) {
                  m.reply("Mohon tunggu sebentar, bot sedang memproses permintaan Anda...");
                  const query = encodeURIComponent(msg);

                  try {
                      const response = await axios.get(`https://api.ryzendesu.vip/api/search/lyrics?query=${query}`, {
                          headers: {
                              accept: 'application/json'
                          }
                      });
                      const data = response.data;

                      if (data && data[0].plainLyrics) {
                          const cleanLyrics = data[0].plainLyrics.replace(/&quot;/g, '"').replace(/\[.*?\]/g, '').trim();
                          await play.get(m, client, data[0].name);
                          const resultMessage = `🎵 *Lirik Lagu* 🎵\n\n*Judul*: ${data[0].trackName}\n*Album*: ${data[0].albumName}\n*Penyanyi*: ${data[0].artistName}\n\n*Lirik*:\n${cleanLyrics}\n\n🌐 *Sumber*: ${response.config.url}`;
                          m.reply(resultMessage);
                      } else {
                          m.reply("Maaf, lirik lagu tidak ditemukan.");
                      }
                  } catch (error) {
                      m.reply("Terjadi kesalahan saat mengambil lirik lagu.");
                  }
              } else {
                  m.reply("Masukkan judul lagu yang ingin dicari liriknya.");
              }
              break;
          }

        case "hd": {
          if (m.mtype.includes("imageMessage")) {
            m.reply("Sedang di proses...");
            const url = await toUrl.get(m, client);
            return hd.get(m, client, url);
          } else {
            m.reply("Kirim gambar dengan caption *.hd*");
          }
          break;
        };

        case "sewa": {
          m.reply("Sewa Bot ke Group\n\n*1 Bulan:* Rp. 5.000\n\nNote: Jika Bot Mati/perbaikan, waktu expired akan berhenti secara otomatis");
          break;
        };

          case "ai": {
  if (!m.isGroup) return m.reply("Fitur AI hanya untuk di group chat.");
  m.reply("Hmm apaaa sihh reply ajaaa cok")
  break;
};

        case "m": {
          m.reply(JSON.stringify(m, null, 2));
          break;
        };

        case "play": {
          if (msg) {
            m.reply("Mohon tunggu sebentar, bot sedang memproses permintaan Anda...");
            return play.get(m, client, msg)
          } else {
            m.reply("Masukkan judul lagu yang ingin diputar");
          }
          break;
        };

        case "owner": {
          m.reply(`*Contact:* wa.me/${global.owner}\n\n*Note:* Nomor di atas adalah *nomor Owner* ya *bukan nomor bot* oke!.\n  Bot saya gratis untuk semua orang (kalo sewa ya bayar Server berat soalnya)`);
          break;
        };

        case "tourl": {
          if (m.mtype.includes("imageMessage") || m.mtype.includes("videoMessage")) {
            const hasil = await toUrl.get(m, client, true);
            m.reply(`${hasil}\n*note:* media is public with no expiration date, please be careful!.`);
          } else {
            m.reply("*Ex:* Upload gambar atau video dengan caption .tourl pastikan ukuran tidak melebihi 30 MB");
          }
          break;
        };

        case "ig": {
          if (!msg) return m.reply("*ex:* .ig https://www.instagram.com/p/ByxKbUSnubS/?utm_source=ig_web_copy_link");
          try {
            m.reply("*Mengirim media..*");
            const response = await alldown(msg);
            const video = response.data;
            client.sendMessage(m.chat, { video: { url: video.high || video.low }, mimetype: "video/mp4" }, { quoted: m });
          } catch (e) {
            bug(e);
          }
          break;
        };

        case "tiktok": {
          if (!msg) return m.reply("*Ex:* .tiktok https://vm.tiktok.com/ZSjBQ6t9g/\n*Ex:* .tiktok JJ naruto");
          try {
            m.reply("*Mengirim media..*");
            if (msg.startsWith("http")) {
              const response = await alldown(msg);
              const video = response.data;
              client.sendMessage(m.chat, { video: { url: video.high || video.low }, mimetype: "video/mp4" }, { quoted: m });
            } else {
              const searchResponse = await axios.get("https://itzpire.com/search/tiktok", { params: { query: msg } });
              const result = searchResponse.data.data;
              client.sendMessage(m.chat, { 
                video: { url: result.no_watermark }, 
                caption: `*Title:* ${result.title}\n*Author:* ${searchResponse.data.author.nickname}`, 
                mimetype: "video/mp4" 
              }, { quoted: m });
            }
          } catch (e) {
            bug(e);
          }
          break;
        };

        case "prem": {
          if (msg) {
            const hasil = await ai.handleTextQuery("setPrem:" + msg, user);
            m.reply(hasil.trim());
          } else {
            m.reply("User yang mau di jadikan prem");
          }
          break;
        };

        case "set": {
          if (!msg) return m.reply("*Contoh:* .set Kamu adalah Alicia gadis 17 tahun...\n\n*Note:* Anda dapat mereset prompt ke dafault dengan mengetik *.bawaan*");
          const hasil = await ai.handleTextQuery("setPrompt:" + msg, user);
          m.reply(hasil.trim());
          break;
        };

        case "bawaan": {
          const hasilBawaan = await ai.handleTextQuery("resetprompt", user);
          m.reply(hasilBawaan.trim());
          break;
        };

        case "persona": {
          if (!msg) return m.reply("*Contoh:* .persona Saya adalah Ricky umur saya 18 aku ganteng anjay");
     const hasilPersona = await ai.handleTextQuery("persona:" + msg, user);
          m.reply(hasilPersona.trim());
          break;
        };

        case "reset": {
          const hasilReset = await ai.handleTextQuery("reset", user);
          m.reply(hasilReset.trim());
          break;
        };

        case "menu": {
          m.reply(menu);
          break;
        };
        case "gcbot": {
          m.reply(global.gcbot);
          break;
        };
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