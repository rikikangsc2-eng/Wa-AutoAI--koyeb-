// gameLogic.js (File terpisah untuk logika game)
const axios = require('axios')

const API_ENDPOINT = 'https://copper-ambiguous-velvet.glitch.me/data'
const USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; RMX2185 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.260 Mobile Safari/537.36'

const apiGetData = async (dataType) => {
    try {
        const response = await axios.get(`${API_ENDPOINT}/${dataType}`, {
            headers: { 'User-Agent': USER_AGENT }
        })
        return response.data
    } catch (error) {
        console.error(`Failed to get ${dataType} data from API:`, error)
        return { users: {}, rooms: {} }
    }
}

const apiWriteData = async (dataType, data) => {
    try {
        await axios.post(`${API_ENDPOINT}/${dataType}`, data, {
            headers: {
                'User-Agent': USER_AGENT,
                'Content-Type': 'application/json'
            }
        })
        return true
    } catch (error) {
        console.error(`Failed to write ${dataType} data to API:`, error)
        return false
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

const QUESTION_TIMEOUT = 2 * 60 * 1000

async function gameLogic(endpoint, params, query, m, client) {
    const { user, room } = params || {}
    const { text } = query || {}

    if (endpoint === 'susunkata') {
        const roomsData = await apiGetData('rooms')
        const currentRoom = roomsData.rooms[room]

        if (currentRoom && currentRoom.currentQuestion) {
            return 'Soal sudah diambil. Jawab atau nyerah dulu!'
        }

        const soalList = await fetchSoalSusunKata()
        if (soalList.length === 0) {
            return 'Soal susun kata lagi kosong, coba nanti ya!'
        }

        const randomIndex = Math.floor(Math.random() * soalList.length)
        const selectedSoal = soalList[randomIndex]

        if (!roomsData.rooms[room]) {
            roomsData.rooms[room] = { currentQuestion: null }
        }
        roomsData.rooms[room].currentQuestion = { ...selectedSoal, answered: false, attempts: 0, timestamp: Date.now() }
        await apiWriteData('rooms', roomsData)

        return `Soal susun kata berikut: ${selectedSoal.soal} - Tipe: ${selectedSoal.tipe}`

    } else if (endpoint === 'siapakahaku') {
        const roomsData = await apiGetData('rooms')
        const currentRoom = roomsData.rooms[room]

        if (currentRoom && currentRoom.currentQuestion) {
            return 'Soal sudah diambil. Jawab atau nyerah dulu!'
        }

        const soalList = await fetchSoalSiapakahAku()
        if (soalList.length === 0) {
            return 'Soal siapakah aku lagi kosong, coba nanti ya!'
        }

        const randomIndex = Math.floor(Math.random() * soalList.length)
        const selectedSoal = soalList[randomIndex]

        if (!roomsData.rooms[room]) {
            roomsData.rooms[room] = { currentQuestion: null }
        }
        roomsData.rooms[room].currentQuestion = { ...selectedSoal, answered: false, attempts: 0, timestamp: Date.now() }
        await apiWriteData('rooms', roomsData)

        return `Soal siapakah aku berikut: ${selectedSoal.soal}`

    } else if (endpoint === 'jawab') {
        const usersData = await apiGetData('users')
        const roomsData = await apiGetData('rooms')
        const currentRoom = roomsData.rooms[room]

        if (!currentRoom || !currentRoom.currentQuestion) {
            return 'Ambil soal dulu sebelum jawab!'
        }

        if (currentRoom.currentQuestion.answered) {
            return 'Soal sudah dijawab atau timeout. Ambil soal baru!'
        }

        const jawabanBenar = currentRoom.currentQuestion.jawaban.toLowerCase()
        const jawabanUser = text ? text.toLowerCase() : ''
        let attempts = currentRoom.currentQuestion.attempts || 0

        if (jawabanUser === jawabanBenar) {
            if (!usersData.users[user]) {
                usersData.users[user] = { points: 0 }
            }
            usersData.users[user].points = (usersData.users[user].points || 0) + 3
            await apiWriteData('users', usersData)

            roomsData.rooms[room].currentQuestion = null
            await apiWriteData('rooms', roomsData)

            return 'Jawaban kamu benar! Point +3.'
        } else {
            attempts++
            currentRoom.currentQuestion.attempts = attempts
            await apiWriteData('rooms', roomsData)

            if (usersData.users[user]) {
                usersData.users[user].points = Math.max((usersData.users[user].points || 0) - 2, 0)
                await apiWriteData('users', usersData)
            }

            if (attempts >= 3) {
                roomsData.rooms[room].currentQuestion = null
                await apiWriteData('rooms', roomsData)
                return `Jawaban salah 3 kali. Soal dihapus. Point -2. Silakan ambil soal baru.`
            } else {
                return `Jawaban Salah! Point -2. Kesempatan menjawab tersisa ${3 - attempts} kali lagi.`
            }
        }
    } else if (endpoint === 'point') {
        const usersData = await apiGetData('users')
        const userPoints = usersData.users[user] ? usersData.users[user].points : 0
        return `Poin kamu saat ini: ${userPoints}`
    } else if (endpoint === 'top') {
        const usersData = await apiGetData('users')
        const users = usersData.users
        const sortedUsers = Object.entries(users)
            .sort(([, a], [, b]) => b.points - a.points)
            .slice(0, 10)

        let topUsersFormatted = 'Top 10 Poin Tertinggi\n\n'
        let mentions = []
        if (sortedUsers.length > 0) {
            topUsersFormatted += '```\n'
            topUsersFormatted += 'No.  Username        Points\n'
            topUsersFormatted += '-------------------------\n'
            sortedUsers.forEach(([userName, data], index) => {
                const rank = String(index + 1).padEnd(3)
                const username = `@${userName}`
                const points = String(data.points).padEnd(6)
                topUsersFormatted += `${rank}  ${username} ${points}\n`
                mentions.push(`${userName}@s.whatsapp.net`)
            })
            topUsersFormatted += '```'
        } else {
            topUsersFormatted += 'Belum ada pemain yang memiliki poin.'
        }

        client.sendMessage(
            m.chat,
            {
                text: topUsersFormatted,
                mentions: mentions
            }
        )
        return null
    } else if (endpoint === 'nyerah') {
        const roomsData = await apiGetData('rooms')
        const currentRoom = roomsData.rooms[room]

        if (!currentRoom || !currentRoom.currentQuestion) {
            return 'Tidak ada soal yang bisa diserahin!'
        }

        roomsData.rooms[room].currentQuestion = null
        await apiWriteData('rooms', roomsData)
        return 'Yah nyerah? Cupu!'
    } else {
        return 'Endpoint tidak dikenal'
    }
}

module.exports = { gameLogic }