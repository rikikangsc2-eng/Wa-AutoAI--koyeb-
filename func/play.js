const axios = require('axios');

async function get(m, client, msg) {
  try {
    const searchResponse = await axios.get(`https://api.ryzendesu.vip/api/search/yt?query=${encodeURIComponent(msg)}`, {
      headers: { 'accept': 'application/json' }
    });
    const searchData = searchResponse.data;

    const filteredVideos = searchData.videos.filter(video => video.duration.seconds < 600);
    if (filteredVideos.length === 0) throw new Error("No suitable video found.");

    const topVideo = filteredVideos[0];

    const downloadResponse = await axios.get(
      `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(topVideo.url)}`,
      { headers: { 'accept': 'application/json' } }
    );
    const downloadData = downloadResponse.data;

    const audioUrl = downloadData.downloadUrl;
    await client.sendMessage(m.chat, { audio: { url: audioUrl }, mimetype: "audio/mpeg" }, { quoted: m });
  } catch (error) {
    m.reply(`> ${error.message}\nReport ke .owner`);
  }
}

module.exports = { get };