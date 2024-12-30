const axios = require('axios');

async function get(m, client, msg) {
  try {
    const response = await axios.get(`https://api.agatz.xyz/api/ytplay?message=${msg}`);
    const data = response.data;

    if (!data.success) throw new Error("Gagal mencari video.");

    const audioUrl = data.audio.url;
    await client.sendMessage(m.chat, { audio: { url: audioUrl }, mimetype: "audio/mpeg" }, { quoted: m });
  } catch (error) {
    m.reply(`> ${error.message}\nReport ke .owner`);
  }
}

module.exports = { get };