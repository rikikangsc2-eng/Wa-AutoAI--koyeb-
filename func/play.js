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

    let audioUrl;
    try {
      const rapidResponse = await axios.get(
        `https://spotify-downloader9.p.rapidapi.com/downloadSong?songId=${encodeURIComponent(topTrack.externalUrl)}`,
        {
          headers: {
            'x-rapidapi-host': 'spotify-downloader9.p.rapidapi.com',
            'x-rapidapi-key': 'fad1bfa0dfmsha3fa3e06b80a387p147910jsn9452a840d8bb'
          }
        }
      );

      const rapidData = rapidResponse.data;
      if(rapidData.success){
          audioUrl = rapidData.data.downloadLink;
      } else {
        throw new Error("Failed to download audio from Rapid API");
      }

    } catch (rapidError) {
        try {
            const alternativeResponse = await axios.get(`https://express-vercel-ytdl.vercel.app/song?url=${encodeURIComponent(topTrack.externalUrl)}`)
            const alternativeData = alternativeResponse.data;
            if(alternativeData.success){
                audioUrl = alternativeData.data.downloadLink;
            } else {
                throw new Error("Failed to download audio from Alternative API");
            }

        } catch(alternativeError){
            m.reply(`> Failed to download audio: ${alternativeError.message}\nReport ke .owner`);
            return;
        }
    }


    await client.sendMessage(m.chat, { audio: { url: audioUrl }, mimetype: "audio/mpeg" }, { quoted: m });


  } catch (searchError) {
    m.reply(`> Unexpected error occurred: ${searchError.message}\nReport ke .owner`);
  }
}

module.exports = { get };