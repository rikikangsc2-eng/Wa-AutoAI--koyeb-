const axios = require('axios');

async function get(m, client, msg) {
  try {
    const searchResponse = await axios.get(`https://api.ryzendesu.vip/api/search/yt?query=${msg}`);
    const videos = searchResponse.data.videos;

    const video = videos.find(video => video.duration.seconds < 600);
    if (!video) throw new Error("Tidak ada video yt dengan durasi di bawah 10 menit.");

    const downloadResponse = await axios.get(`https://api.ryzendesu.vip/api/downloader/ytmp3?url=${video.url}`);
    const downloadData = downloadResponse.data;

    if (downloadData.status !== "tunnel") throw new Error("Gagal mengunduh audio.");

    const audioUrl = downloadData.url;
    await client.sendMessage(m.chat, { audio: { url: audioUrl }, mimetype: "audio/mpeg" }, { quoted: m });
  } catch (error) {
    m.reply(`> ${error.message}\nReport ke .owner`);
  }
}

module.exports = { get };