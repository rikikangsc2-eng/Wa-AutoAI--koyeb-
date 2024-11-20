const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const qs = require('qs'); // Untuk encoding form data

const uploadToImgBB = async (buffer) => {
  try {
    const base64Image = buffer.toString('base64'); // Konversi buffer ke base64
    const expiration = 86400; // 24 jam dalam detik
    const apiKey = '9e4671c6ee232da278ad037fe8a23ae8';

    const formData = qs.stringify({
      key: apiKey,
      image: base64Image,
      expiration: expiration,
    });

    const response = await axios.post(
      `https://api.imgbb.com/1/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data.data.url; // Mengambil URL gambar dari respons
  } catch (error) {
    console.error('Terjadi kesalahan saat mengunggah ke ImgBB:', error.message);
    throw error;
  }
};

const get = async (m, client) => {
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
    reuploadRequest: client.updateMediaMessage
  });

  // Unggah gambar ke ImgBB tanpa menyimpan ke file
  const imageUrl = await uploadToImgBB(buffer);

  return imageUrl; // Mengembalikan URL gambar
};

module.exports = { get };