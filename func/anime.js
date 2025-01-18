const axios = require("axios");

const jadwalAnime = async (hari) => {
    const daysMap = {
        senin: "monday",
        selasa: "tuesday",
        rabu: "wednesday",
        kamis: "thursday",
        jumat: "friday",
        sabtu: "saturday",
        minggu: "sunday"
    };
    const day = daysMap[hari.toLowerCase()] || hari.toLowerCase();
    try {
        const response = await axios.get(`https://api.jikan.moe/v4/schedules/${day}`);
        const data = response.data.data;
        if (!data.length) return `*Tidak ada anime yang update di hari ${hari}.*`;
        return `*Berikut anime yang update setiap hari ${hari}:*\n` + 
            data.map((anime, index) => `\`No:\` ${index + 1}\n\`Title:\` ${anime.title}\n--------`).join("\n");
    } catch (error) {
        return `*Terjadi kesalahan: ${error.message}*`;
    }
};

const populerAnime = async () => {
    try {
        const response = await axios.get("https://api.jikan.moe/v4/top/anime");
        const data = response.data.data;
        if (!data.length) return "*Tidak ada data anime populer saat ini.*";
        return `*Berikut anime populer saat ini:*\n` +
            data.map((anime, index) => `\`No:\` ${index + 1}\n\`Title:\` ${anime.title}\n--------`).join("\n");
    } catch (error) {
        return `*Terjadi kesalahan: ${error.message}*`;
    }
};

const random = async (genre) => {
    try {
        const response = await axios.get(`https://api.jikan.moe/v4/anime?genres=${genre}&limit=100`);
        const data = response.data.data;
        if (!data.length) return { error: "Tidak ada anime untuk genre ini." };
        const randomAnime = data[Math.floor(Math.random() * data.length)];
        return {
            image: randomAnime.images.jpg.image_url,
            title: randomAnime.title,
            genre: randomAnime.genres.map((g) => g.name).join(", "),
            sinopsis: randomAnime.synopsis
        };
    } catch (error) {
        return { error: `Terjadi kesalahan: ${error.message}` };
    }
};

module.exports = { jadwalAnime, populerAnime, random };
