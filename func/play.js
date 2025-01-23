const axios = require('axios');
const fs = require('fs');
const path = require('path');

const searchApiUrl = (query) => `https://api.agatz.xyz/api/ytsearch?message=${encodeURIComponent(query)}`;
const downloadApiUrl = (videoId) => `https://copper-ambiguous-velvet.glitch.me/music?id=${encodeURIComponent(videoId)}`;

async function downloadAudio(url) {
    try {
        const response = await axios({
            method: 'GET',
            url,
            responseType: 'arraybuffer'
        });
        return Buffer.from(response.data)
    } catch (error) {
        throw new Error(`Aduh, maaf banget, ada masalah pas download audionya nih: ${error.message}`);
    }
}
async function getAudioBuffer(query) {
    try {
        const { data: searchData } = await axios.get(searchApiUrl(query));
        if (!searchData?.data?.length) {
            throw new Error("Aduh, maaf banget, hasil pencariannya gak ketemu nih, coba keyword lain yaa.");
        }
        const video = searchData.data.find(video => video.duration.seconds <= 600)
        if(!video){
            throw new Error("Aduh, maaf banget, gak ada video yang durasinya di bawah 10 menit nih.");
        }
        const audioBuffer = await downloadAudio(downloadApiUrl(video.videoId));
        return { audioBuffer, audioUrl: video.url };
    } catch (error) {
        throw new Error(error.message)
    }
}
async function get(m, client, msg) {
    try {
        const { audioBuffer, audioUrl } = await getAudioBuffer(msg);
        try {
           await client.sendMessage(m.chat, { audio: Buffer.from(audioBuffer), mimetype: 'audio/mpeg' }, { quoted: m });
        } catch (sendMessageError) {
           m.reply(`Aduh, maaf banget kak, lagunya gagal dikirim, coba kamu download sendiri aja di sini yaa => ${audioUrl}`);
       }
    } catch (error) {
      m.reply(error.message)
    }
}

module.exports = { get };