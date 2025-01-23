const axios = require('axios');
const fs = require('fs');
const path = require('path');

const searchApiUrl = (query) => `https://api.agatz.xyz/api/ytsearch?message=${encodeURIComponent(query)}`;
const downloadApiUrl = (videoId) => `https://express-vercel-ytdl.vercel.app/song?id=${encodeURIComponent(videoId)}`;
const tmpAudioPath = path.join(__dirname, '../tmp/audio.mp3');

async function downloadAudio(url) {
    try {
        const response = await axios({
            method: 'GET',
            url,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(tmpAudioPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        throw new Error(`Aduh, maaf banget, ada masalah pas download audionya nih: ${error.message}`);
    }
}
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
       await downloadAudio(downloadData.link);
        return {audioPath: tmpAudioPath, audioUrl: downloadData.link};

    } catch (error) {
        throw new Error(error.message)
    }
}


async function get(m, client, msg) {
    try {
        const {audioPath, audioUrl} = await getAudioUrl(msg);
        try {
           await client.sendMessage(m.chat, { audio: { url: audioPath }, mimetype: 'audio/mpeg' }, { quoted: m });

        } catch (sendMessageError) {
           m.reply(`Aduh, maaf banget kak, lagunya gagal dikirim, coba kamu download sendiri aja di sini yaa => ${audioUrl}`);
       } finally {
            fs.unlink(audioPath, (err) => {
                if (err) console.error(`Gagal hapus file ${audioPath}:`, err);
            });
        }

    } catch (error) {
      m.reply(error.message)
    }
}

module.exports = { get };