const axios = require('axios');

async function get(m, client, msg) {
  let trackId;

  try {
    const rapidSearchResponse = await axios.get(
      `https://spotify-downloader9.p.rapidapi.com/search?q=${encodeURIComponent(msg)}&type=tracks&limit=1&offset=0&noOfTopResults=5`,
      {
        headers: {
          'x-rapidapi-host': 'spotify-downloader9.p.rapidapi.com',
          'x-rapidapi-key': 'fad1bfa0dfmsha3fa3e06b80a387p147910jsn9452a840d8bb'
        }
      }
    );
    const rapidSearchData = rapidSearchResponse.data;

    if (rapidSearchData.success && rapidSearchData.data.tracks.items.length > 0) {
      trackId = rapidSearchData.data.tracks.items[0].id;
    } else {
      throw new Error("Failed to search track from Rapid API");
    }
  } catch (rapidSearchError) {
    try {
      const alternativeSearchResponse = await axios.get(
        `https://express-vercel-ytdl.vercel.app/search?q=${encodeURIComponent(msg)}`
      );
      const alternativeSearchData = alternativeSearchResponse.data;

      if (alternativeSearchData.success && alternativeSearchData.data.tracks.items.length > 0) {
        trackId = alternativeSearchData.data.tracks.items[0].id;
      } else {
        throw new Error("Failed to search track from Alternative API");
      }
    } catch (alternativeSearchError) {
      m.reply("> No results found. Please try a different query.\nReport ke .owner");
      return;
    }
  }

  let audioUrl;
  try {
    const rapidResponse = await axios.get(
      `https://spotify-downloader9.p.rapidapi.com/downloadSong?songId=${encodeURIComponent(trackId)}`,
      {
        headers: {
          'x-rapidapi-host': 'spotify-downloader9.p.rapidapi.com',
          'x-rapidapi-key': 'fad1bfa0dfmsha3fa3e06b80a387p147910jsn9452a840d8bb'
        }
      }
    );

    const rapidData = rapidResponse.data;
    if (rapidData.success) {
      audioUrl = rapidData.data.downloadLink;
    } else {
      throw new Error("Failed to download audio from Rapid API");
    }
  } catch (rapidError) {
    try {
      const alternativeResponse = await axios.get(
        `https://express-vercel-ytdl.vercel.app/song?url=${encodeURIComponent(trackId)}`
      );
      const alternativeData = alternativeResponse.data;

      if (alternativeData.success) {
        audioUrl = alternativeData.data.downloadLink;
      } else {
        throw new Error("Failed to download audio from Alternative API");
      }
    } catch (alternativeError) {
      m.reply(`> Failed to download audio: ${alternativeError.message}\nReport ke .owner`);
      return;
    }
  }

  try {
    await client.sendMessage(
      m.chat,
      { audio: { url: audioUrl }, mimetype: "audio/mpeg" },
      { quoted: m }
    );
  } catch (error) {
    m.reply(`> Unexpected error occurred: ${error.message}\nReport ke .owner`);
  }
}

module.exports = { get };