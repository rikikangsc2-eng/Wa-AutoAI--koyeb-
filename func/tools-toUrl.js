const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const qs = require('qs');

const uploadToImgBB = async (buffer, noExpiration) => {
  try {
    const base64Image = buffer.toString('base64');
    const apiKey = '9e4671c6ee232da278ad037fe8a23ae8';

    const formData = qs.stringify(
      noExpiration
        ? { key: apiKey, image: base64Image }
        : { key: apiKey, image: base64Image, expiration: 86400 }
    );

    const response = await axios.post(
      `https://api.imgbb.com/1/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data.data.url;
  } catch (error) {
    throw error;
  }
};

const get = async (m, client, noExpiration = false) => {
  const messageType = m.mtype;
  let fileExtension;

  switch (messageType) {
    case 'stickerMessage':
      fileExtension = 'webp';
      break;
    case 'imageMessage':
      fileExtension = 'jpeg';
      break;
    case 'videoMessage':
      fileExtension = 'mp4';
      break;
    default:
      throw new Error('Invalid messageType');
  }

  const buffer = await downloadMediaMessage(m, 'buffer', {}, {
    reuploadRequest: client.updateMediaMessage,
  });

  const imageUrl = await uploadToImgBB(buffer, noExpiration);

  return imageUrl;
};

module.exports = { get };