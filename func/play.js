const axios = require('axios');

async function get(m, client, msg) {
  try {
    const searchResponse = await axios.get(`https://api.ryzendesu.vip/api/search/yt?query=${encodeURIComponent(msg)}`, {
      headers: { 'accept': 'application/json' }
    });
    const searchData = searchResponse.data;

    const filteredVideos = searchData.videos.filter(video => video.duration.seconds < 600);
    if (filteredVideos.length === 0) throw new Error("No suitable video found in search results.");

    const topVideo = filteredVideos[0];

    try {
      const downloadResponse = await axios.get(
        `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(topVideo.url)}`,
        { headers: { 'accept': 'application/json' } }
      );
      const downloadData = downloadResponse.data;

      const audioUrl = downloadData.downloadUrl;
      await client.sendMessage(m.chat, { audio: { url: audioUrl }, mimetype: "audio/mpeg" }, { quoted: m });
    } catch (downloadError) {
      throw new Error("Failed to download audio from the video. Please try again later.");
    }
  } catch (searchError) {
    if (searchError.response && searchError.response.status === 404) {
      m.reply("> No results found. Please try a different query.\nReport ke .owner");
    } else if (searchError.message.includes("No suitable video found")) {
      m.reply("> No suitable video found within the duration limit.\nReport ke .owner");
    } else if (searchError.message.includes("Failed to download audio")) {
      m.reply(`> ${searchError.message}\nReport ke .owner`);
    } else {
      m.reply(`> Unexpected error occurred: ${searchError.message}\nReport ke .owner`);
    }
  }
}

module.exports = { get };

