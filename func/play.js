const axios = require('axios');

async function get(m, client, msg) {
  try {
    const searchResponse = await axios.get(`https://api.agatz.xyz/api/spotify?message=${encodeURIComponent(msg)}`, {
      headers: { 'accept': 'application/json' }
    });
    const searchData = searchResponse.data;

    if (searchData.data.length === 0) {
      m.reply("> No results found. Please try a different query.\nReport ke .owner");
      return;
    }


    const topTrack = searchData.data[0];

    try {
      const downloadResponse = await axios.get(
        `https://api.ryzendesu.vip/api/downloader/spotify?url=${encodeURIComponent(topTrack.externalUrl)}`,
        { headers: { 'accept': 'application/json' } }
      );
      const downloadData = downloadResponse.data;

      if (!downloadData.success) {
        throw new Error("Failed to download audio from the track. Please try again later.");
      }

      const audioUrl = downloadData.link;
      await client.sendMessage(m.chat, { audio: { url: audioUrl }, mimetype: "audio/mpeg" }, { quoted: m });
    } catch (downloadError) {
      m.reply(`> Failed to download audio: ${downloadError.message}\nReport ke .owner`);
    }
  } catch (searchError) {
    m.reply(`> Unexpected error occurred: ${searchError.message}\nReport ke .owner`);
  }
}

module.exports = { get };