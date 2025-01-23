const axios = require('axios');

const searchApiUrl = (query) => `https://api.agatz.xyz/api/ytsearch?message=${encodeURIComponent(query)}`;
const downloadApiUrl = (videoId) => `https://express-vercel-ytdl.vercel.app/song?id=${encodeURIComponent(videoId)}`;

async function getAudioUrl(query) {
    try {
        const { data: searchData } = await axios.get(searchApiUrl(query));

        if (!searchData?.data?.length) {
            throw new Error("Aduh, maaf banget, hasil pencariannya gak ketemu nih, coba keyword lain yaa.");
        }


        const video = searchData.data.find(video => video.duration.seconds <= 600)
        if(!video){
          throw new Error("Aduh, maaf banget, gak ada video yang durasinya di bawah 10 menit nih.");
        }

        const { data: downloadData } = await axios.get(downloadApiUrl(video.videoId));
          if(downloadData.status !== "ok"){
            throw new Error(`Aduh kak, maaf banget, fitur ini error, statusnya sih ${downloadData.status || 'tidak diketahui'}, kayaknya ada yang salah sama servernya deh.`);
        }
        return downloadData.link;


    } catch (error) {
        throw new Error(error.message)
    }
}

async function get(m, client, msg) {
    try {
        const audioUrl = await getAudioUrl(msg);

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