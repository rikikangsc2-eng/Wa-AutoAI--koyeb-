const fs = require('fs')
const path = require('path')
const axios = require('axios')

const responses = {
    ambilSoal: [
        "Nih soal buat kamu, semangat!",
        "Ada soal baru nih, siap jawab?",
        "Soal susun kata udah dateng, gas!",
        "Waktunya mikir keras, ini soalnya:",
        "Jangan nyerah ya, ini soalnya:",
        "Coba jawab soal ini deh:",
        "Mikir dikit ya, ini soalnya:",
        "Asah otak yuk, ini soalnya:",
        "Soal menantang buat kamu:",
        "Ini dia soal yang kamu tunggu:",
        "Yuk jawab soal ini:",
        "Soal baru sudah muncul:",
        "Perhatikan soal berikut:",
        "Siap? Ini soalnya:",
        "Jangan bingung ya, ini soalnya:",
        "Fokus! Ini soalnya:",
        "Konsentrasi! Soalnya muncul:",
        "Ada soal baru, ayo jawab:",
        "Soal siap dipecahkan:",
        "Ini soalnya, selamat mencoba:"
    ],
    soalSudahDiambil: [
        "Soal udah diambil duluan, sabar ya!",
        "Jangan serakah, soalnya udah ada yang ambil.",
        "Soalnya udah di tangan orang lain, tunggu giliranmu.",
        "Sabar ya, soalnya lagi dikerjain orang.",
        "Udah keduluan nih, soalnya udah ada yang punya.",
        "Soal udah ada yang punya, coba room lain aja.",
        "Telat nih, soalnya udah diambil.",
        "Yah, soalnya udah ludes diambil orang.",
        "Jangan sedih, tapi soalnya udah gak ada.",
        "Maaf, soalnya udah diambil peserta lain.",
        "Coba lagi nanti, soalnya udah ada yang ambil.",
        "Kesempatanmu hilang, soalnya udah diambil.",
        "Sayang sekali, soalnya udah diambil duluan.",
        "Kecewa deh, soalnya udah gak ada buat kamu.",
        "Yah telat, soalnya udah diembat orang lain.",
        "Udah gak kebagian soal, coba lain waktu ya.",
        "Soalnya udah ada yang duluan dapetin.",
        "Kamu kurang cepat, soalnya udah diambil.",
        "Jangan berkecil hati, tapi soalnya udah gak ada.",
        "Mungkin lain kali, soalnya udah diambil duluan."
    ],
    jawabSoalDulu: [
        "Sabar dulu, ambil soalnya baru jawab!",
        "Jangan grasak-grusuk, ambil soal dulu dong.",
        "Kamu belum punya soal, ambil dulu sana.",
        "Soalnya mana? Ambil dulu baru jawab.",
        "Belum ada soal yang aktif, ambil dulu ya.",
        "Gak bisa jawab kalau gak ada soalnya, ambil dulu!",
        "Pencet tombol ambil soal dulu baru jawab ya.",
        "Lupa ambil soal ya? Ambil dulu gih.",
        "Sebelum jawab, ambil soalnya dulu keles.",
        "Ambil soal dulu baru sok-sokan jawab.",
        "Soalnya belum muncul, ambil dulu biar muncul.",
        "Gak ada soal yang bisa dijawab, ambil dulu ya.",
        "Kamu harus ambil soal dulu sebelum menjawab.",
        "Jangan langsung jawab, ambil soalnya dulu please.",
        "Belum ada soal di room ini, ambil dulu ya.",
        "Klik ambil soal dulu sebelum jawab, oke?",
        "Langkah pertama ambil soal, langkah kedua jawab.",
        "Ambil soal dulu biar ada yang dijawab.",
        "Jangan keburu nafsu, ambil soal dulu ya.",
        "Kamu harus punya soal dulu baru bisa jawab."
    ],
    jawabanBenar: [
        "Asik, jawaban kamu bener banget!",
        "Keren, jawabanmu tepat sasaran!",
        "Mantap, betul sekali jawabanmu!",
        "Wih, pintar! Jawabanmu benar!",
        "Tepat! Jawabanmu tidak salah!",
        "Bagus! Jawabanmu benar seratus persen!",
        "Sip, jawabanmu benar!",
        "Gak salah lagi, jawabanmu benar!",
        "Kamu hebat, jawabannya benar!",
        "Selamat! Jawabanmu benar!",
        "Yeay! Jawabanmu benar!",
        "Benar! Kamu memang jago!",
        "Tepat sekali! Jawabanmu benar!",
        "Perfect! Jawabanmu benar!",
        "Luar biasa! Jawabanmu benar!",
        "Kamu memang cerdas, jawabannya benar!",
        "Jawaban yang benar! Good job!",
        "Betul! Kamu pintar!",
        "Jawabanmu benar! Keren!",
        "Kamu berhasil! Jawabanmu benar!"
    ],
    jawabanSalah: [
        "Waduh, jawabanmu kurang tepat nih.",
        "Hmm, jawabanmu belum benar.",
        "Sayang sekali, jawabanmu salah.",
        "Coba lagi deh, jawabanmu belum tepat.",
        "Kurang pas nih jawabannya.",
        "Jawabanmu masih melenceng jauh.",
        "Belum benar jawabanmu, coba pikir lagi.",
        "Salah jawabanmu, jangan menyerah!",
        "Jawabanmu kurang benar, semangat!",
        "Maaf, jawabanmu salah.",
        "Tidak tepat jawabanmu kali ini.",
        "Jawabanmu belum benar, tetap berusaha ya.",
        "Salah deh jawabannya, coba lagi ya.",
        "Kurang tepat, jangan putus asa!",
        "Jawabanmu salah, tapi jangan sedih!",
        "Masih salah jawabannya, semangat terus!",
        "Belum benar, ayo coba lagi!",
        "Salah nih, tapi jangan menyerah ya!",
        "Jawabanmu salah, tapi gak apa-apa kok!",
        "Tidak benar jawabanmu, semangat mencoba lagi!"
    ],
    nyerahText: [
        "yah nyerah Cupuu kau ni",
        "cih gitu aja nyerah",
        "payah, nyerah duluan",
        "lemah banget nyerah",
        "nyerah? gak seru ah",
        "baru segitu aja nyerah",
        "nyerah ternyata kamu",
        "kirain jago, nyerah juga",
        "nyerah oh nyerah",
        "segitunya doang nyerah",
        "nyerah mode on",
        "bendera putih dikibarkan",
        "nyerah detected",
        "terlalu cepat menyerah",
        "gak asik kalau nyerah",
        "nyerah is not the answer",
        "jangan biasakan nyerah",
        "nyerah tanda tak berdaya",
        "menyerah sebelum berjuang",
        "nyerah? sayang sekali"
    ],
    pointCek: [
        "Poin kamu saat ini:",
        "Jumlah poinmu sekarang:",
        "Saat ini poin kamu:",
        "Kamu punya poin sebanyak:",
        "Total poinmu adalah:",
        "Poin yang kamu kumpulkan:",
        "Ini dia poin kamu:",
        "Lihat poinmu di sini:",
        "Poin kamu tercatat:",
        "Kamu memiliki poin:",
        "Poinmu adalah:",
        "Jumlah poinmu saat ini:",
        "Poin yang kamu punya:",
        "Saat ini kamu punya poin:",
        "Total poin yang kamu miliki:",
        "Ini adalah poin kamu:",
        "Kamu sudah mengumpulkan poin:",
        "Poinmu sekarang ini:",
        "Lihat jumlah poinmu:",
        "Poin kamu tertera di sini:"
    ],
    topPoint: [
        "Peringkat teratas saat ini:",
        "Daftar pemain dengan poin tertinggi:",
        "Top player leaderboard:",
        "Pemain dengan poin terbanyak:",
        "Urutan pemain teratas:",
        "Siapa saja yang poinnya paling tinggi:",
        "Inilah daftar peringkat teratas:",
        "Pemain-pemain top saat ini:",
        "Lihat siapa saja yang ada di puncak:",
        "Daftar peringkat poin tertinggi:",
        "Top skor saat ini adalah:",
        "Pemain-pemain terhebat dengan poin tertinggi:",
        "Inilah peringkat pemain teratas:",
        "Siapa yang paling jago? Ini daftarnya:",
        "Pemain-pemain dengan poin paling banyak:",
        "Daftar top player game ini:",
        "Peringkat pemain terbaik:",
        "Siapa saja pemain teratasnya?",
        "Daftar pemain dengan skor tertinggi:",
        "Inilah daftar pemain peringkat atas:"
    ]
}

const getRandomResponse = (type) => {
    const listResponse = responses[type]
    return listResponse[Math.floor(Math.random() * listResponse.length)]
}

const USERS_FILE = path.join(__dirname, 'users.json')
const ROOMS_FILE = path.join(__dirname, 'rooms.json')

const ensureDataFilesExist = () => {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify({ users: {} }, null, 2))
    }
    if (!fs.existsSync(ROOMS_FILE)) {
        fs.writeFileSync(ROOMS_FILE, JSON.stringify({ rooms: {} }, null, 2))
    }
}

ensureDataFilesExist()

const readDataFromFile = (filePath) => {
    try {
        const rawData = fs.readFileSync(filePath)
        return JSON.parse(rawData)
    } catch (error) {
        console.error("Error reading data from file:", error)
        return { users: {}, rooms: {} }
    }
}

const writeDataToFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    } catch (error) {
        console.error("Error writing data to file:", error)
    }
}

const fetchSoalSusunKata = async () => {
    try {
        const response = await axios.get('https://github.com/BochilTeam/database/raw/refs/heads/master/games/susunkata.json')
        return response.data
    } catch (error) {
        console.error("Failed to fetch soal susun kata:", error)
        return []
    }
}

const fetchSoalSiapakahAku = async () => {
    try {
        const response = await axios.get('https://github.com/BochilTeam/database/raw/refs/heads/master/games/siapakahaku.json')
        return response.data
    } catch (error) {
        console.error("Failed to fetch soal siapakah aku:", error)
        return []
    }
}


const QUESTION_TIMEOUT = 2 * 60 * 1000;

const clearExpiredQuestions = () => {
    const roomsData = readDataFromFile(ROOMS_FILE);
    let roomsUpdated = false;
    for (const roomName in roomsData.rooms) {
        const room = roomsData.rooms[roomName];
        if (room.currentQuestion && room.currentQuestion.timestamp) {
            if (Date.now() - room.currentQuestion.timestamp > QUESTION_TIMEOUT) {
                room.currentQuestion = null;
                roomsUpdated = true;
            }
        }
    }
    if (roomsUpdated) {
        writeDataToFile(ROOMS_FILE, roomsData);
    }
};

setInterval(clearExpiredQuestions, 30 * 1000);

async function gameLogic(endpoint, params, query) {
    const { user, room } = params || {};
    const { text } = query || {};

    if (endpoint === 'susunkata') {
        const roomsData = readDataFromFile(ROOMS_FILE)
        const currentRoom = roomsData.rooms[room]

        if (currentRoom && currentRoom.currentQuestion) {
            return getRandomResponse('soalSudahDiambil')
        }

        const soalList = await fetchSoalSusunKata()
        if (soalList.length === 0) {
            return "Soal lagi kosong nih, coba nanti lagi ya!"
        }

        const randomIndex = Math.floor(Math.random() * soalList.length)
        const selectedSoal = soalList[randomIndex]

        if (!roomsData.rooms[room]) {
            roomsData.rooms[room] = {}
        }
        roomsData.rooms[room].currentQuestion = { ...selectedSoal, answered: false, timestamp: Date.now() }
        writeDataToFile(ROOMS_FILE, roomsData)

        const introText = getRandomResponse('ambilSoal')
        const soalText = `Soal: ${selectedSoal.soal}\nTipe: ${selectedSoal.tipe}`
        return `${introText}\n\n${soalText}`
    } else if (endpoint === 'siapakahaku') {
        const roomsData = readDataFromFile(ROOMS_FILE)
        const currentRoom = roomsData.rooms[room]

        if (currentRoom && currentRoom.currentQuestion) {
            return getRandomResponse('soalSudahDiambil')
        }

        const soalList = await fetchSoalSiapakahAku()
        if (soalList.length === 0) {
            return "Soal lagi kosong nih, coba nanti lagi ya!"
        }

        const randomIndex = Math.floor(Math.random() * soalList.length)
        const selectedSoal = soalList[randomIndex]

        if (!roomsData.rooms[room]) {
            roomsData.rooms[room] = {}
        }
        roomsData.rooms[room].currentQuestion = { ...selectedSoal, answered: false, timestamp: Date.now() }
        writeDataToFile(ROOMS_FILE, roomsData)

        const introText = getRandomResponse('ambilSoal')
        const soalText = `Soal: ${selectedSoal.soal}`
        return `${introText}\n\n${soalText}`

    } else if (endpoint === 'jawab') {
        const usersData = readDataFromFile(USERS_FILE)
        const roomsData = readDataFromFile(ROOMS_FILE)
        const currentRoom = roomsData.rooms[room]

        if (!currentRoom || !currentRoom.currentQuestion) {
            return getRandomResponse('jawabSoalDulu')
        }

        if (currentRoom.currentQuestion.answered) {
            return getRandomResponse('soalSudahDiambil')
        }

        const jawabanBenar = currentRoom.currentQuestion.jawaban.toLowerCase()
        const jawabanUser = text ? text.toLowerCase() : ''

        currentRoom.currentQuestion.answered = true;
        writeDataToFile(ROOMS_FILE, roomsData)


        if (jawabanUser === jawabanBenar) {
            if (!usersData.users[user]) {
                usersData.users[user] = { points: 0 }
            }
            usersData.users[user].points = (usersData.users[user].points || 0) + 3
            writeDataToFile(USERS_FILE, usersData)

            roomsData.rooms[room].currentQuestion = null
            writeDataToFile(ROOMS_FILE, roomsData)

            return getRandomResponse('jawabanBenar')
        } else {
            if (usersData.users[user]) {
                usersData.users[user].points = Math.max((usersData.users[user].points || 0) - 2, 0)
                writeDataToFile(USERS_FILE, usersData)
            }
            return getRandomResponse('jawabanSalah')
        }
    } else if (endpoint === 'point') {
        const usersData = readDataFromFile(USERS_FILE)
        const userPoints = usersData.users[user] ? usersData.users[user].points : 0
        return `${getRandomResponse('pointCek')} ${userPoints}`
    } else if (endpoint === 'top') {
        const usersData = readDataFromFile(USERS_FILE)
        const users = usersData.users
        const sortedUsers = Object.entries(users)
            .sort(([, a], [, b]) => b.points - a.points)
            .slice(0, 10)

        let topUsersFormatted = "";
        if (sortedUsers.length > 0) {
            topUsersFormatted += getRandomResponse('topPoint') + "\n\n";
            topUsersFormatted += "```\n";
            topUsersFormatted += "No.  Username        Points\n";
            topUsersFormatted += "-------------------------\n";
            sortedUsers.forEach(([userName, data], index) => {
                const rank = String(index + 1).padEnd(3)
                const username = userName.padEnd(15)
                const points = String(data.points).padEnd(6)
                topUsersFormatted += `${rank}  ${username} ${points}\n`;
            });
            topUsersFormatted += "```";
        } else {
            topUsersFormatted = getRandomResponse('topPoint') + "\nBelum ada pemain yang memiliki poin.";
        }
        return topUsersFormatted
    } else if (endpoint === 'nyerah') {
        const roomsData = readDataFromFile(ROOMS_FILE)
        const currentRoom = roomsData.rooms[room]

        if (!currentRoom || !currentRoom.currentQuestion) {
            return "Gak ada soal yang bisa diserahin, emang lagi kosong!"
        }

        roomsData.rooms[room].currentQuestion = null
        writeDataToFile(ROOMS_FILE, roomsData)
        return getRandomResponse('nyerahText')
    } else {
        return "Endpoint tidak dikenal"
    }
}

module.exports = { gameLogic }