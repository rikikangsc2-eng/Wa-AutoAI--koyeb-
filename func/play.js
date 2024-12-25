const axios = require('axios');

async function get(m, client, msg) {
  try {
    const searchResponse = await axios.get(`https://api.agatz.xyz/api/ytsearch?message=${msg}`);
    const videos = searchResponse.data.data;

    if (!videos || videos.length === 0) {
      throw new Error("Tidak ada hasil pencarian.");
    }

    const video = videos.find(video => video.duration.seconds < 600);
    if (!video) {
      throw new Error("Tidak ada video yt dengan durasi di bawah 10 menit.");
    }

    const downloadResponse = await axios.get(`https://api.agatz.xyz/api/ytmp3?url=https://youtube.com/watch?v=${video.videoId}`);
    const downloadData = downloadResponse.data;

    if (!downloadData || downloadData.status !== 200) {
      throw new Error("Gagal mengunduh audio.");
    }

    const audioUrl = downloadData.data.find(item => item.quality === '128kbps').downloadUrl;

    if (!audioUrl) {
      throw new Error("Audio dengan kualitas 128kbps tidak ditemukan.");
    }

    await client.sendMessage(m.chat, { audio: { url: audioUrl }, mimetype: "audio/mpeg" }, { quoted: m });
  } catch (error) {
    console.error(error);
    m.reply(`Terjadi kesalahan: ${error.message}\nSilakan laporkan ke .owner`);
  }
}

module.exports = { get };