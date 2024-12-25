const axios = require('axios');

async function get(m, client, msg) {
  try {
    let videos;
    try {
      const searchResponse = await axios.get(`https://api.agatz.xyz/api/ytsearch?message=${msg}`);
      videos = searchResponse.data.data;
      if (!videos || videos.length === 0) {
        throw new Error("Tidak ada hasil pencarian.");
      }
    } catch (searchError) {
      if (searchError.response) {
        throw new Error(`[Search API] Error ${searchError.response.status}: ${searchError.response.statusText}`);
      } else {
        throw new Error(`[Search API] ${searchError.message}`);
      }
    }

    const video = videos.find(video => video.duration.seconds < 600);
    if (!video) {
      throw new Error("[Search API] Tidak ada video yt dengan durasi di bawah 10 menit.");
    }

    try {
      const downloadResponse = await axios.get(`https://api.ryzendesu.vip/api/downloader/y2mate?url=https://youtube.com/watch?v=${video.videoId}`);
      const downloadData = downloadResponse.data;
      if (!downloadData || downloadData.type !== 'download') {
        throw new Error("Gagal mengunduh audio.");
      }

      const audioUrl = downloadData.download.dl.mp3['128kbps'].url;
      if (!audioUrl) {
        throw new Error("Audio dengan kualitas 128kbps tidak ditemukan.");
      }

      await client.sendMessage(m.chat, { audio: { url: audioUrl }, mimetype: "audio/mpeg" }, { quoted: m });
    } catch (downloadError) {
      if (downloadError.response) {
        throw new Error(`[Download API] Error ${downloadError.response.status}: ${downloadError.response.statusText}`);
      } else {
        throw new Error(`[Download API] ${downloadError.message}`);
      }
    }
  } catch (error) {
    console.error(error);
    m.reply(`Terjadi kesalahan: ${error.message}\nSilakan laporkan ke .owner`);
  }
}

module.exports = { get };