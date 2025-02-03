const fs = require('fs')
const path = require('path')
const axios = require('axios')

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

async function gameLogic(endpoint, params, query, m, client) {
    const { user, room } = params || {};
    const { text } = query || {};

    if (endpoint === 'susunkata') {
        const roomsData = readDataFromFile(ROOMS_FILE)
        const currentRoom = roomsData.rooms[room]

        if (currentRoom && currentRoom.currentQuestion) {
            return "Soal sudah diambil. Jawab atau nyerah dulu!"
        }

        const soalList = await fetchSoalSusunKata()
        if (soalList.length === 0) {
            return "Soal susun kata lagi kosong, coba nanti ya!"
        }

        const randomIndex = Math.floor(Math.random() * soalList.length)
        const selectedSoal = soalList[randomIndex]

        if (!roomsData.rooms[room]) {
            roomsData.rooms[room] = {}
        }
        roomsData.rooms[room].currentQuestion = { ...selectedSoal, answered: false, attempts: 0, timestamp: Date.now() }
        writeDataToFile(ROOMS_FILE, roomsData)

        return `Soal susun kata berikut: ${selectedSoal.soal} - Tipe: ${selectedSoal.tipe}`

    } else if (endpoint === 'siapakahaku') {
        const roomsData = readDataFromFile(ROOMS_FILE)
        const currentRoom = roomsData.rooms[room]

        if (currentRoom && currentRoom.currentQuestion) {
            return "Soal sudah diambil. Jawab atau nyerah dulu!"
        }

        const soalList = await fetchSoalSiapakahAku()
        if (soalList.length === 0) {
            return "Soal siapakah aku lagi kosong, coba nanti ya!"
        }

        const randomIndex = Math.floor(Math.random() * soalList.length)
        const selectedSoal = soalList[randomIndex]

        if (!roomsData.rooms[room]) {
            roomsData.rooms[room] = {}
        }
        roomsData.rooms[room].currentQuestion = { ...selectedSoal, answered: false, attempts: 0, timestamp: Date.now() }
        writeDataToFile(ROOMS_FILE, roomsData)

        return `Soal siapakah aku berikut: ${selectedSoal.soal}`

    } else if (endpoint === 'jawab') {
        const usersData = readDataFromFile(USERS_FILE)
        const roomsData = readDataFromFile(ROOMS_FILE)
        const currentRoom = roomsData.rooms[room]

        if (!currentRoom || !currentRoom.currentQuestion) {
            return "Ambil soal dulu sebelum jawab!"
        }

        if (currentRoom.currentQuestion.answered) {
            return "Soal sudah dijawab atau timeout. Ambil soal baru!"
        }

        const jawabanBenar = currentRoom.currentQuestion.jawaban.toLowerCase()
        const jawabanUser = text ? text.toLowerCase() : ''
        let attempts = currentRoom.currentQuestion.attempts || 0;

        if (jawabanUser === jawabanBenar) {
            if (!usersData.users[user]) {
                usersData.users[user] = { points: 0 }
            }
            usersData.users[user].points = (usersData.users[user].points || 0) + 3
            writeDataToFile(USERS_FILE, usersData)

            roomsData.rooms[room].currentQuestion = null
            writeDataToFile(ROOMS_FILE, roomsData)

            return "Jawaban kamu benar! Point +3."
        } else {
            attempts++;
            currentRoom.currentQuestion.attempts = attempts;
            writeDataToFile(ROOMS_FILE, roomsData)

            if (usersData.users[user]) {
                usersData.users[user].points = Math.max((usersData.users[user].points || 0) - 2, 0)
                writeDataToFile(USERS_FILE, usersData)
            }

            if (attempts >= 3) {
                roomsData.rooms[room].currentQuestion = null
                writeDataToFile(ROOMS_FILE, roomsData)
                return `Jawaban salah 3 kali. Soal dihapus. Point -2. Silakan ambil soal baru.`
            } else {
                return `Jawaban Salah! Point -2. Kesempatan menjawab tersisa ${3 - attempts} kali lagi.`
            }
        }
    } else if (endpoint === 'point') {
        const usersData = readDataFromFile(USERS_FILE)
        const userPoints = usersData.users[user] ? usersData.users[user].points : 0
        return `Poin kamu saat ini: ${userPoints}`
    } else if (endpoint === 'top') {
        const usersData = readDataFromFile(USERS_FILE)
        const users = usersData.users
        const sortedUsers = Object.entries(users)
            .sort(([, a], [, b]) => b.points - a.points)
            .slice(0, 10)

        let topUsersFormatted = "Top 10 Poin Tertinggi\n\n";
        let mentions = [];
        if (sortedUsers.length > 0) {
            topUsersFormatted += "```\n";
            topUsersFormatted += "No.  Username        Points\n";
            topUsersFormatted += "-------------------------\n";
            sortedUsers.forEach(([userName, data], index) => {
                const rank = String(index + 1).padEnd(3)
                const username = `@${userName}`; // Mention format
                const points = String(data.points).padEnd(6)
                topUsersFormatted += `${rank}  ${username} ${points}\n`;
                mentions.push(`${userName}@s.whatsapp.net`); // Assuming userName is the prefix for WhatsApp ID
            });
            topUsersFormatted += "```";
        } else {
            topUsersFormatted += "Belum ada pemain yang memiliki poin.";
        }

        client.sendMessage(
            m.chat,
            {
                text: topUsersFormatted,
                mentions: mentions
            }
        )
        return null; // Return null as the response is already handled by sendMessage
    } else if (endpoint === 'nyerah') {
        const roomsData = readDataFromFile(ROOMS_FILE)
        const currentRoom = roomsData.rooms[room]

        if (!currentRoom || !currentRoom.currentQuestion) {
            return "Tidak ada soal yang bisa diserahin!"
        }

        roomsData.rooms[room].currentQuestion = null
        writeDataToFile(ROOMS_FILE, roomsData)
        return "Yah nyerah? Cupu!"
    } else {
        return "Endpoint tidak dikenal"
    }
}

module.exports = { gameLogic }