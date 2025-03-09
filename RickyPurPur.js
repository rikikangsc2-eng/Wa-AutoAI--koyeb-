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
const game = require('./func/game.js')

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

const user = `${m.chat.split("@")[0]}`

const autoAI = async () => {
  try {
    if (gambar[m.sender]) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await client.sendMessage(m.chat, { react: { text: "✅", key: mkey[m.sender] } });
      mkey[m.sender] = null;
      await new Promise(resolve => setTimeout(resolve, 1000));
      await m.reply("*Memproses Gambar...*");
    }
    const hasil = gambar[m.sender]
      ? await ai.handleImageQuery(gambar[m.sender], m.body, user)
      : await ai.handleTextQuery(m.body, user);
    let cleanedText = hasil.trim();
    const remainingText = cleanedText
      .replace(/\*\*(.*?)\*\*/g, "*$1*")
      .replace(/```(.*?)```/g, "`$1`");
    const parts = remainingText.split(/(\*\*[^\*]+\*\*|\[song.*?\]|\[Song.*?\]|\[song =.*?\]|\[Song =.*?\]|\[diffusion.*?\]|\[Diffusion.*?\]|\[diffusion =.*?\]|\[Diffusion =.*?\]|\[animesearch.*?\])/g);
    const mediaQueue = [];
    const textQueue = [];
    const wait = "⏳";
    let currentText = "";
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].toLowerCase().startsWith("[song=") || parts[i].toLowerCase().startsWith("[song =")) {
        const query = parts[i].replace(/^\[.*?=/i, "").replace(/\]$/, "").trim();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await m.reply(wait);
        await play.get(m, client, query);
      } else if (parts[i].toLowerCase().startsWith("[animesearch=") || parts[i].toLowerCase().startsWith("[animesearch =")) {
        const query = parts[i].replace(/^\[.*?=/i, "").replace(/\]$/, "").trim();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await m.reply(wait);
        try {
          const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&sfw`);
          const result = response.data.data;
          if (result.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await m.reply("Anime tidak ditemukan.");
          } else {
            const anime = result[0];
            const originalSynopsis = anime.synopsis;
            const aiPrompt = `Terjemahkan dan ringkas sinopsis di bawah secara langsung tanpa basa basi:\n\n${originalSynopsis}`;
            const summarizedSynopsis = await ai.handleTextQuery(aiPrompt, user);
            const genres = anime.genres.map(genre => genre.name).join(", ");
            const themes = anime.themes.map(theme => theme.name).join(", ");
            await new Promise(resolve => setTimeout(resolve, 1000));
            await client.sendMessage(m.chat, {
              image: { url: anime.images.jpg.image_url },
              caption: `*Title:* ${anime.title}\n*Genre:* ${genres}\n*Theme:* ${themes}\n*Rating:* ${anime.score}\n\n*Sinopsis:* ${summarizedSynopsis.trim()}`
            }, { quoted: m });
          }
        } catch (error) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await m.reply("`Gagal mencari anime: " + error.message + "`");
        }
      } else if (parts[i].toLowerCase().startsWith("[diffusion=") || parts[i].toLowerCase().startsWith("[diffusion =")) {
        const query = parts[i].replace(/^\[.*?=/i, "").replace(/\]$/, "").trim();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await m.reply(wait);
        try {
          const response = await axios.get(`https://api.ryzendesu.vip/api/ai/waifu-diff?prompt=${encodeURIComponent(query)}`, { responseType: "arraybuffer" });
          const imageBuffer = Buffer.from(response.data);
          await new Promise(resolve => setTimeout(resolve, 1000));
          await client.sendMessage(m.chat, { image: imageBuffer, caption: query }, { quoted: m });
        } catch (error) {
          m.reply("Gagal membuat gambar:\n\n*Alternatif:* wa.me/13135550002?text=" + encodeURIComponent(query));
        }
      } else {
        currentText += `${currentText ? "\n" : ""}${parts[i].trim()}`;
      }
    }
    if (currentText.trim()) {
      textQueue.push(currentText.trim());
    }
    for (const media of mediaQueue) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (media.type === "image") {
        await client.sendMessage(m.chat, { image: media.buffer, caption: media.caption }, { quoted: m });
      } else if (media.type === "video") {
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

    
//Jawab GAME
    if (m.quoted && !cekCmd(m.body)) {
      if (m.quoted.text.includes("AliciaGames")){
        const params = { user: m.sender.split("@")[0], room: m.chat.split("@")[0] };
          const query = { text: body };
          const gameResponse = await game.gameLogic("jawab", params, query);
          m.reply(gameResponse);
        return;
      }
    }
if (m.quoted && !cekCmd(m.body)) {
  if (m.quoted.text.includes("Alicia-TTT")) {
    const params = { user: m.sender.split("@")[0], room: m.chat.split("@")[0] };
    const query = { text: body };
    const gameResponse = await game.gameLogic("tictactoe", params, query, m, client);
    if (gameResponse){
      if (gameResponse.toLowerCase().includes("menang!") || gameResponse.toLowerCase().includes("kalah!") || gameResponse.toLowerCase().includes("seri!")) {
        return m.reply(gameResponse+"\n\n*Ketik .ttt untuk memulai game baru*");
      }
      m.reply(gameResponse+"\n\nAlicia-TTT");
                     }
    return;
  }
}

    if (!m.isGroup && !cekCmd(m.body) && m.body) {
      return autoAI();
    }

if (m.isGroup && m.quoted && !cekCmd(m.body)){
      if (m.quoted.sender.includes(noBot)){
        if (m.mtype.includes("imageMessage")){
        await client.sendMessage(m.chat, {
          react: { text: "🆙", key: m.key }
        });

        mkey[m.sender] = m.key;
        gambar[m.sender] = await toUrl.get(m, client);
        }
      return autoAI()
                                          }
    } 

    if (m.body.includes("† *Intro🕊️*†") &&
        (m.body.includes("*Nama🕊️*:") ||
         m.body.includes("*asal🕊️*:")
        )
    ) {
      const introText = m.body;
      const aiPrompt = `Hallo alicia salam kenal aku member baru di sini \n\n${introText}\n\n"System: anda harus sapa pengguna dengan data yang ada"`;
      const aiResponse = await ai.handleTextQuery(aiPrompt, user);
      return m.reply(aiResponse.trim());
    }

    if (cekCmd(m.body)) {
      switch (command) { 
        case "setname":{
          const params = { user: m.sender.split("@")[0], room: m.chat.split("@")[0] };
  const query = { text: msg };
          const gameResponse = await game.gameLogic("setname", params, query, m, client);
          m.reply(gameResponse);
          break;
        }
        case "tictactoe":
        case "ttt": {
  const params = { user: m.sender.split("@")[0], room: m.chat.split("@")[0] };
  const query = { text: msg };
  const gameResponse = await game.gameLogic("tictactoe", params, query, m, client);
  if (gameResponse) m.reply(gameResponse+"\n\nAlicia-TTT");
  break;
          }
          
          case "diff": {
            const query = msg;
            if (!query) {
              return reply("*.diff IMAGE_DESCRIPTION_PROMPT*");
            }
            m.reply("`Alicia sedang membuat gambar; " + query + ". Tunggu ya...`");
            try {
              const response = await axios.get(`https://api.ryzendesu.vip/api/ai/waifu-diff?prompt=${encodeURIComponent(query)}`, { responseType: "arraybuffer" });
              const imageBuffer = Buffer.from(response.data);
              await client.sendMessage(m.chat, { image: imageBuffer, caption: query }, { quoted: m });
            } catch (error) {
              m.reply("`Gagal membuat gambar: " + error.message + "`");
            }
            break;
          };
      case "riwayat":{
        m.reply(ai.riwayat(user))
      }break;
      case "tebakgambar": {
          const params = { user: m.sender.split("@")[0], room: m.chat.split("@")[0] };
          await game.gameLogic(command, params, null, m, client);
          break;
        }
        case "hint": {
          const params = { user: m.sender.split("@")[0], room: m.chat.split("@")[0] };
          const query = { hintType: msg };
          const gameResponse = await game.gameLogic(command, params, query);
          m.reply(gameResponse);
          break;
        }
        case "tebaktebakan": {
          const params = { user: m.sender.split("@")[0], room: m.chat.split("@")[0] };
          const gameResponse = await game.gameLogic(command, params);
          m.reply(gameResponse+"\n\nAliciaGames");
          break;
        }
          case "think": {
          if (!msg) return m.reply("Masukkan pertanyaan");
          m.reply("AI sedang berpikir 🤔");
          try {
            const response = await axios.post(
              "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent?key="+global.apikey2,
              {
                contents: [
                  {
                    role: "user",
                    parts: [{ text: msg }],
                  },
                ],
                generationConfig: {
                  temperature: 0.7,
                  topK: 64,
                  topP: 0.95,
                  maxOutputTokens: 65536,
                  responseMimeType: "text/plain",
                },
              },
              {
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );
            const answer = response.data.candidates[0].content.parts[0].text;
            m.reply(answer);
          } catch (e) {
            bug(e);
          }
          break;
        };
                 case "susunkata": {
          const params = { user: m.sender.split("@")[0], room: m.chat.split("@")[0] };
          const gameResponse = await game.gameLogic(command, params);
          m.reply(gameResponse+"\n\nAliciaGames");
          break;
        }
        case "siapakahaku": {
          const params = { user: m.sender.split("@")[0], room: m.chat.split("@")[0] };
          const gameResponse = await game.gameLogic(command, params);
          m.reply(gameResponse+"\n\nAliciaGames");
          break;
        }
        case "point": {
          const game = require('./func/game.js')
          const params = { user: m.sender.split("@")[0] };
          const gameResponse = await game.gameLogic(command, params);
          m.reply(gameResponse);
          break;
        }
        case "top": {
          const params = { user: m.sender.split("@")[0], room: m.chat.split("@")[0] };
          const query = { text: msg };
          await game.gameLogic(command, params, query, m, client);
          break;
        }
        case "nyerah": {
          const params = { user: m.sender.split("@")[0], room: m.chat.split("@")[0] };
          const gameResponse = await game.gameLogic(command, params);
          m.reply(gameResponse);
          break;
        }
         case "intro": {
          if (!m.isGroup) return m.reply("Fitur intro hanya untuk di group chat.");
          m.reply("† *Intro🕊️*†\n*Nama🕊️*: \n*asal🕊️*   : \n*Waifu/husbu🕊️*:");
          break;
        };
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
              const response = await axios.get(`https://api.ryzendesu.vip/api/search/pinterest?query=${encodeURIComponent(msg)}`, {
                headers: {
                  'accept': 'application/json'
                }
              });
              const images = response.data;
              if (images.length === 0) return m.reply("Gambar tidak ditemukan.");
              const randomImage = images[Math.floor(Math.random() * images.length)].directLink;
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
          const mq = {
  "key": {
    "remoteJid": "120363394639766595@g.us",
    "fromMe": false,
    "id": "701A84583935D30735A173BE10719F2E",
    "participant": "6283894391287@s.whatsapp.net"
  },
  "messageTimestamp": 1741561884,
  "pushName": "Pak PurPur",
  "broadcast": false,
  "message": {
    "imageMessage": {
      "url": "https://mmg.whatsapp.net/o1/v/t62.7118-24/f2/m269/AQPrTw8OEXMf4D4Ns-LZXHZtpT5JLdOc6rqyaL7bvMJJF5Anorb0tDfbFhUFOPIhSn_V_wtAG1JXgpakA8dJlWbmwkLmOuiPVh0ygF2lXw?ccb=9-4&oh=01_Q5AaIEK0VYwMZPU8iPA0gLoElN695hW1iDxYLR02lW0a-2Qt&oe=67F59615&_nc_sid=e6ed6c&mms3=true",
      "mimetype": "image/jpeg",
      "caption": "*Alicia AI😎*",
      "fileSha256": "2SbnuSHfMzPYlOhdd3KIXAWRuiIn1viePcHOWSrigZw=",
      "fileLength": "24373",
      "height": 357,
      "width": 374,
      "mediaKey": "tHRmenfS02M2VQaJt8IbZ31LVuTG1ztLikhF4AtiLN4=",
      "fileEncSha256": "z1kikEz1B0YtwusCBJSpr1JSAsERo/TJinieSMUMrKQ=",
      "directPath": "/o1/v/t62.7118-24/f2/m269/AQPrTw8OEXMf4D4Ns-LZXHZtpT5JLdOc6rqyaL7bvMJJF5Anorb0tDfbFhUFOPIhSn_V_wtAG1JXgpakA8dJlWbmwkLmOuiPVh0ygF2lXw?ccb=9-4&oh=01_Q5AaIEK0VYwMZPU8iPA0gLoElN695hW1iDxYLR02lW0a-2Qt&oe=67F59615&_nc_sid=e6ed6c",
      "mediaKeyTimestamp": "1741561883",
      "jpegThumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEQASAMBIgACEQEDEQH/xAAvAAADAQEBAAAAAAAAAAAAAAAAAgQDBQEBAAMBAQAAAAAAAAAAAAAAAAECBAMA/9oADAMBAAIQAxAAAADuR08hNm0TaOxfdveXW2OmmTMQ3xij2zlvfWb3hWw6hKY6AENC2PjPsTXb28/plG5XVlfLmUy1YU1HhTG+RoTp6zgZLuhGG3jhlAHcq4NFqUAJYQ5qwAYQM9v/xAAkEAACAgEEAgIDAQAAAAAAAAABAgADEQQSITEQQRMiMmFxQv/aAAgBAQABPwCai7H1EE2Z7grQdCFSejKHJ4bseLjLG2ITCSzQQECBT6mwjEVAuG9xTNQcETVWEkKOonLQAl8CbSGiFhmOWcA56M35EViU47lhb/U1BzZgRVCGWNcn4cfuUvezYxn9xa3JxHsqrXYSBDtH4nIJiNgiamPZyZS/yA5lJyNjCVoF6EyOYdIWtyxyMwD47SoP1EqY2E4l5yB/IujOzJ7lemcE4h31OCymIwZQR41LipCc8yutjkt2ZTUapZhlhwqkgyplzk9zch4JESvbkjgR1ckYfAj1Ky4MWtKyPtDg8CfGPcUxKk/piooHXl3AhRCBmDaBGtAlLsSQZUefDEgSy51pd/Ymkte4Fnl1jIgIgJI7mpvdLAoM/8QAHREAAgMBAAMBAAAAAAAAAAAAAAECESEDECAiUf/aAAgBAgEBPwDpKkM05vKYjprYudxsUHpH5mIlCSRA0eybE8WkkV4pFL8H6Sbs/8QAHxEAAgICAgMBAAAAAAAAAAAAAAECEQMhEBIgMVEi/9oACAEDAQE/AMEOzt+kM7IyVdrjFqMUSyVKiUlr6TSceI5IN+zJQqZXWKVjW3oi0kxyLLP198YpUf/Z",
      "scansSidecar": "LTd08/ySSaBOPvLn33zPAaQITsKytuiromCyPFoP4ceWRDhPNr9scQ==",
      "scanLengths": [
        2117,
        9834,
        4923,
        7499
      ],
      "midQualityFileSha256": "zm3FMSSAxYL8BuJLhn2uawk5j/l8dNByDsvZXKMp5X0="
    },
    "messageContextInfo": {
      "messageSecret": "Jpgodo11psizROrUEWLGAfVcHdWIZ9erVLvWTarlwJk="
    }
  },
  "id": "701A84583935D30735A173BE10719F2E",
  "isBaileys": false,
  "chat": "120363394639766595@g.us",
  "fromMe": false,
  "isGroup": true,
  "sender": "6283894391287@s.whatsapp.net",
  "participant": "6283894391287@s.whatsapp.net",
  "mtype": "imageMessage",
  "msg": {
    "url": "https://mmg.whatsapp.net/o1/v/t62.7118-24/f2/m269/AQPrTw8OEXMf4D4Ns-LZXHZtpT5JLdOc6rqyaL7bvMJJF5Anorb0tDfbFhUFOPIhSn_V_wtAG1JXgpakA8dJlWbmwkLmOuiPVh0ygF2lXw?ccb=9-4&oh=01_Q5AaIEK0VYwMZPU8iPA0gLoElN695hW1iDxYLR02lW0a-2Qt&oe=67F59615&_nc_sid=e6ed6c&mms3=true",
    "mimetype": "image/jpeg",
    "caption": "*Alicia AI😎*",
    "fileSha256": "2SbnuSHfMzPYlOhdd3KIXAWRuiIn1viePcHOWSrigZw=",
    "fileLength": "24373",
    "height": 357,
    "width": 374,
    "mediaKey": "tHRmenfS02M2VQaJt8IbZ31LVuTG1ztLikhF4AtiLN4=",
    "fileEncSha256": "z1kikEz1B0YtwusCBJSpr1JSAsERo/TJinieSMUMrKQ=",
    "directPath": "/o1/v/t62.7118-24/f2/m269/AQPrTw8OEXMf4D4Ns-LZXHZtpT5JLdOc6rqyaL7bvMJJF5Anorb0tDfbFhUFOPIhSn_V_wtAG1JXgpakA8dJlWbmwkLmOuiPVh0ygF2lXw?ccb=9-4&oh=01_Q5AaIEK0VYwMZPU8iPA0gLoElN695hW1iDxYLR02lW0a-2Qt&oe=67F59615&_nc_sid=e6ed6c",
    "mediaKeyTimestamp": "1741561883",
    "jpegThumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEQASAMBIgACEQEDEQH/xAAvAAADAQEBAAAAAAAAAAAAAAAAAgQDBQEBAAMBAQAAAAAAAAAAAAAAAAECBAMA/9oADAMBAAIQAxAAAADuR08hNm0TaOxfdveXW2OmmTMQ3xij2zlvfWb3hWw6hKY6AENC2PjPsTXb28/plG5XVlfLmUy1YU1HhTG+RoTp6zgZLuhGG3jhlAHcq4NFqUAJYQ5qwAYQM9v/xAAkEAACAgEEAgIDAQAAAAAAAAABAgADEQQSITEQQRMiMmFxQv/aAAgBAQABPwCai7H1EE2Z7grQdCFSejKHJ4bseLjLG2ITCSzQQECBT6mwjEVAuG9xTNQcETVWEkKOonLQAl8CbSGiFhmOWcA56M35EViU47lhb/U1BzZgRVCGWNcn4cfuUvezYxn9xa3JxHsqrXYSBDtH4nIJiNgiamPZyZS/yA5lJyNjCVoF6EyOYdIWtyxyMwD47SoP1EqY2E4l5yB/IujOzJ7lemcE4h31OCymIwZQR41LipCc8yutjkt2ZTUapZhlhwqkgyplzk9zch4JESvbkjgR1ckYfAj1Ky4MWtKyPtDg8CfGPcUxKk/piooHXl3AhRCBmDaBGtAlLsSQZUefDEgSy51pd/Ymkte4Fnl1jIgIgJI7mpvdLAoM/8QAHREAAgMBAAMBAAAAAAAAAAAAAAECESEDECAiUf/aAAgBAgEBPwDpKkM05vKYjprYudxsUHpH5mIlCSRA0eybE8WkkV4pFL8H6Sbs/8QAHxEAAgICAgMBAAAAAAAAAAAAAAECEQMhEBIgMVEi/9oACAEDAQE/AMEOzt+kM7IyVdrjFqMUSyVKiUlr6TSceI5IN+zJQqZXWKVjW3oi0kxyLLP198YpUf/Z",
    "scansSidecar": "LTd08/ySSaBOPvLn33zPAaQITsKytuiromCyPFoP4ceWRDhPNr9scQ==",
    "scanLengths": [
      2117,
      9834,
      4923,
      7499
    ],
    "midQualityFileSha256": "zm3FMSSAxYL8BuJLhn2uawk5j/l8dNByDsvZXKMp5X0="
  },
  "body": "*Alicia AI😎*",
  "mentions": [],
  "name": "Pak PurPur"
}
          client.sendMessage(m.chat, {
            text: menu+"\n\n*Saluran:* https://whatsapp.com/channel/0029Vb3qLJRDuMRdjacRwe2T"
          },{quoted:mq})
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