const axios = require('axios');

async function get(m, client, msg) {
  try {
    let tracks;
    try {
      const searchResponse = await axios.get(`https://api.agatz.xyz/api/spotify?message=${msg}`);
      tracks = searchResponse.data.data;
      if (!tracks || tracks.length === 0) {
        throw new Error("Tidak ada hasil pencarian.");
      }
    } catch (searchError) {
      if (searchError.response) {
        throw new Error(`[Search API] Error ${searchError.response.status}: ${searchError.response.statusText}`);
      } else {
        throw new Error(`[Search API] ${searchError.message}`);
      }
    }

    const track = tracks[0]; // Ambil track pertama dari hasil pencarian
    if (!track) {
      throw new Error("[Search API] Tidak ada lagu yang ditemukan.");
    }

    try {
      const downloadResponse = await axios.get(`https://api.agatz.xyz/api/spotifydl?url=${track.externalUrl}`);
      const downloadData = downloadResponse.data;
      if (!downloadData || !downloadData.data.url_audio_v1) {
        throw new Error("Gagal mengunduh audio.");
      }

      const audioUrl = downloadData.data.url_audio_v1;
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