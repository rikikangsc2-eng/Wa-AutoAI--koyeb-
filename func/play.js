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
        throw new Error(`Maaf nih kak, fitur ini error, statusnya sih ${data.status || 'tidak diketahui'}, kayaknya ada yang salah sama servernya deh.`);

    } catch (rapidError) {
        if (rapidError.response?.status === 429) {
            try {
                const { data } = await axios.get(alternativeApiUrl(songUrl));
                 if (data.success) return data.data.downloadLink;
                throw new Error(`Aduh kak, yang ini juga error, statusnya ${data.status || 'tidak diketahui'}, mungkin server alternatifnya lagi capek juga`);
            } catch (alternativeError) {
                if (alternativeError.response?.status === 429) throw new Error("Hmm, kayaknya Alicia kehabisan limit buat download lagu lagi, coba lagi besok yaa.");
                throw new Error(`Aduh kak, yang ini juga error, statusnya ${alternativeError.response?.status || 'tidak diketahui'}, mungkin server alternatifnya lagi capek juga`);

            }
        }
        throw new Error(`Maaf kak, fitur ini error, statusnya sih ${rapidError.response?.status || 'tidak diketahui'}, kayaknya ada yang salah sama server utamanya deh.`);
    }
}

async function get(m, client, msg) {
    try {
        const { data: searchData } = await axios.get(`https://api.agatz.xyz/api/spotify?message=${encodeURIComponent(msg)}`, {
            headers: { 'accept': 'application/json' },
        });

        if (!searchData.data.length) {
            return m.reply("> Maaf kak, hasil pencariannya gak ketemu nih, coba keyword lain yaa.");
        }

        const topTrack = searchData.data[0];
        const audioUrl = await getAudioUrl(topTrack.externalUrl);

        try {
            await client.sendMessage(m.chat, { audio: { url: audioUrl }, mimetype: 'audio/mpeg' }, { quoted: m });
        } catch (sendMessageError) {
            m.reply(`Aduh, maaf banget kak, lagunya gagal dikirim, coba kamu download sendiri aja di sini yaa => ${audioUrl}`);
        }

    } catch (error) {
        m.reply(error.message);
    }
}

module.exports = { get };