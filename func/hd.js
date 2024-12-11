const axios = require('axios');

async function get(m, client, url) {
    try {
        const response = await axios.get(`https://api.ryzendesu.vip/api/ai/remini?url=${url}`, {
            responseType: 'arraybuffer',
            headers: { 'accept': 'image/png' }
        });
        const buffer = Buffer.from(response.data);
        await client.sendMessage(m.chat, { image: buffer, mimetype: 'image/jpeg' }, { quoted: m });
    } catch (error) {
        m.reply(`> ${error.message}\nreport ke .owner`);
    }
}

module.exports = { get }