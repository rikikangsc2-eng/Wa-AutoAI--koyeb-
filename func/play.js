const axios = require('axios');

const rapidApiHost = 'spotify-downloader9.p.rapidapi.com';
const rapidApiKey = 'fad1bfa0dfmsha3fa3e06b80a387p147910jsn9452a840d8bb';
const rapidApiUrl = (songId) => `https://${rapidApiHost}/downloadSong?songId=${encodeURIComponent(songId)}`;
const alternativeApiUrl = (songUrl) => `https://express-vercel-ytdl.vercel.app/song?url=${encodeURIComponent(songUrl)}`;


async function getAudioUrl(songUrl) {
    try {
        const { data } = await axios.get(rapidApiUrl(songUrl), {
            headers: { 'x-rapidapi-host': rapidApiHost, 'x-rapidapi-key': rapidApiKey }
        });
         if (data.success) return data.data.downloadLink;
         throw new Error("Rapid API failed");

    } catch (rapidError) {
        if (rapidError.response?.status === 429) {
           try {
                const { data } = await axios.get(alternativeApiUrl(songUrl));
                if (data.success) return data.data.downloadLink;
                throw new Error("Alternative API failed");
           } catch(alternativeError){
               if(alternativeError.response?.status === 429) throw new Error("Limit reached");
               throw new Error(`Alternative API error: ${alternativeError.message}`);
           }
        }
       throw new Error(`Main API error: ${rapidError.message}`);
    }
}

async function get(m, client, msg) {
  try {
    const { data: searchData } = await axios.get(`https://api.agatz.xyz/api/spotify?message=${encodeURIComponent(msg)}`, {
      headers: { 'accept': 'application/json' },
    });

    if (!searchData.data.length) {
      return m.reply("> No results found. Please try a different query.\nReport ke .owner");
    }

    const topTrack = searchData.data[0];
    const audioUrl = await getAudioUrl(topTrack.externalUrl);

    try {
        await client.sendMessage(m.chat, { audio: { url: audioUrl }, mimetype: 'audio/mpeg' }, { quoted: m });
    } catch (sendMessageError) {
        m.reply(`lagu gagal di kirim, coba kamu download sendiri di sini => ${audioUrl}`);
    }


  } catch (error) {
      if (error.message === 'Limit reached') {
          m.reply("hmm Alicia kehabisan limit buat download lagu lagi coba lagi besok yaa");
      }else{
           m.reply(`> ${error.message}\nReport ke .owner`);
      }

  }
}

module.exports = { get };