const axios = require('axios');

const searchApiUrl = (query) => `https://api.agatz.xyz/api/ytsearch?message=${encodeURIComponent(query)}`;

async function downloadAudio(videoId) {
    try {
        const response = await axios.get(
            `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`,
            {
                headers: {
                    'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com',
                    'x-rapidapi-key': '222ac7fb8bmsh0cb23acb6003932p1bfcadjsne797ba726a04'
                }
            }
        );

        const audioUrl = response.data.link;

        const audioResponse = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; RMX2185 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.260 Mobile Safari/537.36',
                'Referer': 'https://youtube-mp36.p.rapidapi.com'
            }
        });
        return Buffer.from(audioResponse.data);
    } catch (error) {
        throw new Error(`Error downloading audio: ${error.message}`);
    }
}
async function getAudioBuffer(query) {
    try {
        const { data: searchData } = await axios.get(searchApiUrl(query));
        if (!searchData?.data?.length) {
            throw new Error("No search results found, try another keyword.");
        }
        const video = searchData.data.find(video => video.duration.seconds <= 600);
        if(!video){
            throw new Error("No videos found with duration under 10 minutes.");
        }
        const audioBuffer = await downloadAudio(video.videoId);
        return { audioBuffer, audioUrl: video.url };
    } catch (error) {
        throw new Error(error.message)
    }
}
async function get(m, client, msg) {
    try {
        const { audioBuffer, audioUrl } = await getAudioBuffer(msg);
        try {
           await client.sendMessage(m.chat, { audio: audioBuffer, mimetype: 'audio/mpeg' }, { quoted: m });
        } catch (sendMessageError) {
           m.reply(`Failed to send the song, here is the url => ${audioUrl}`);
       }
    } catch (error) {
      m.reply(error.message)
    }
}

module.exports = { get };