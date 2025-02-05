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

const fetchSoalTebakTebakan = async () => {
    try {
        const response = await axios.get('https://github.com/BochilTeam/database/raw/refs/heads/master/games/tebaktebakan.json')
        return response.data
    } catch (error) {
        console.error("Failed to fetch soal tebak tebakan:", error)
        return []
    }
}

const fetchSoalTebakGambar = async () => {
    try {
        const response = await axios.get('https://github.com/BochilTeam/database/raw/refs/heads/master/games/tebakgambar.json')
        return response.data
    } catch (error) {
        console.error("Failed to fetch soal tebak gambar:", error)
        return []
    }
}

function generateHint(answer, percentage) {
    const answerArray = answer.toLowerCase().split('');
    const visibleIndices = [];
    for (let i = 0; i < answerArray.length; i++) {
        if (answerArray[i] !== ' ') {
            visibleIndices.push(i);
        }
    }

    const shuffledIndices = visibleIndices.sort(() => Math.random() - 0.5);
    const revealCount = Math.ceil(shuffledIndices.length * percentage);
    const indicesToReveal = new Set(shuffledIndices.slice(0, revealCount));

    let hint = '';
    for (let i = 0; i < answerArray.length; i++) {
        if (indicesToReveal.has(i)) {
            hint += answerArray[i];
        } else if (answerArray[i] === ' ') {
            hint += ' ';
        }
        else {
            hint += '×';
        }
    }
    return hint;
}


async function gameLogic(endpoint, params, query, m, client) {
    const { user, room } = params || {}
    const { text, hintType } = query || {}

    const ambilSoal = async (soalFetcher, gameType, soalMessage) => {
        const roomsData = await apiGetData('rooms')
        const currentRoom = roomsData.rooms[room]

        if (currentRoom && currentRoom.currentQuestion) {
            return 'Soal sudah diambil. Jawab atau nyerah dulu!'
        }

        const soalList = await soalFetcher()
        if (soalList.length === 0) {
            return `Soal ${gameType} lagi kosong, coba nanti ya!`
        }

        const randomIndex = Math.floor(Math.random() * soalList.length)
        const selectedSoal = soalList[randomIndex]

        if (!roomsData.rooms[room]) {
            roomsData.rooms[room] = { currentQuestion: null }
        }
        roomsData.rooms[room].currentQuestion = { ...selectedSoal, gameType: gameType, answered: false, attempts: 0, timestamp: Date.now() }
        await apiWriteData('rooms', roomsData)

        return soalMessage(selectedSoal)
    }


    if (endpoint === 'susunkata') {
        return await ambilSoal(
            fetchSoalSusunKata,
            'susunkata',
            (soal) => `Soal susun kata berikut: ${soal.soal} - Tipe: ${soal.tipe}`
        )
    } else if (endpoint === 'siapakahaku') {
        return await ambilSoal(
            fetchSoalSiapakahAku,
            'siapakahaku',
            (soal) => `Soal siapakah aku berikut: ${soal.soal}`
        )
    } else if (endpoint === 'tebaktebakan') {
        return await ambilSoal(
            fetchSoalTebakTebakan,
            'tebaktebakan',
            (soal) => `Soal tebak tebakan berikut: ${soal.soal}`
        )
    } else if (endpoint === 'tebakgambar') {
        const roomsData = await apiGetData('rooms')
        const currentRoom = roomsData.rooms[room]

        if (currentRoom && currentRoom.currentQuestion) {
            return 'Soal sudah diambil. Jawab atau nyerah dulu!'
        }

        const soalList = await fetchSoalTebakGambar()
        if (soalList.length === 0) {
            return 'Soal tebak gambar lagi kosong, coba nanti ya!'
        }

        const randomIndex = Math.floor(Math.random() * soalList.length)
        const selectedSoal = soalList[randomIndex]

        if (!roomsData.rooms[room]) {
            roomsData.rooms[room] = { currentQuestion: null }
        }
        roomsData.rooms[room].currentQuestion = { ...selectedSoal, gameType: 'tebakgambar', answered: false, attempts: 0, timestamp: Date.now() }
        await apiWriteData('rooms', roomsData)

        client.sendMessage(m.chat, {
            image: { url: selectedSoal.img },
            caption: 'AliciaGames'
        },{quoted:m})
        return null

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

            if (attempts >= 3) {
                roomsData.rooms[room].currentQuestion = null
                await apiWriteData('rooms', roomsData)

                if (!usersData.users[user]) {
                    usersData.users[user] = { points: 0 }
                }
                usersData.users[user].points = Math.max((usersData.users[user].points || 0) - 3, 0)
                await apiWriteData('users', usersData)

                return `Jawaban salah 3 kali. Soal dihapus. Point -3. Silakan ambil soal baru. Jawaban yang benar adalah: ${currentRoom.currentQuestion.jawaban}`
            } else {
                return `Jawaban Salah! Kesempatan menjawab tersisa ${3 - attempts} kali lagi.`
            }
        }
    } else if (endpoint === 'hint') {
        const usersData = await apiGetData('users')
        const roomsData = await apiGetData('rooms')
        const currentRoom = roomsData.rooms[room]

        if (!currentRoom || !currentRoom.currentQuestion) {
            return 'Ambil soal dulu sebelum minta hint!'
        }

        if (currentRoom.currentQuestion.answered) {
            return 'Soal sudah dijawab atau timeout, tidak bisa minta hint lagi.'
        }

        const jawaban = currentRoom.currentQuestion.jawaban;
        let hintText = '';
        let pointCost = 0;
        let hintPercentage = 0;

        if (hintType === 'murah') {
            hintPercentage = 0.3;
            pointCost = 0; // Gratis
        } else if (hintType === 'mahal') {
            hintPercentage = 0.5;
            pointCost = 1;
        } else if (hintType === 'sultan') {
            hintPercentage = 0.8;
            pointCost = 2;
        } else {
            return 'Tipe hint tidak valid. Pilih: murah, mahal, sultan';
        }

        if (pointCost > 0) {
            if (!usersData.users[user] || (usersData.users[user].points || 0) < pointCost) {
                return `Poin tidak cukup untuk hint ${hintType}. Butuh ${pointCost} poin. Poin kamu: ${usersData.users[user] ? usersData.users[user].points : 0}`;
            }
            usersData.users[user].points -= pointCost;
            await apiWriteData('users', usersData);
        }

        hintText = generateHint(jawaban, hintPercentage);
        return `Hint ${hintType} (${pointCost > 0 ? `-${pointCost} poin` : 'gratis'}):\nJawaban: ${hintText}`;


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
        let positionMessage = '';

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

                if (userName === user) {
                    if (index === 0) {
                        positionMessage = "wahh hebat banget ada di peringkat pertama 😁";
                    } else if (index <= 2) {
                        positionMessage = `Selamat! Kamu berada di peringkat ${index + 1} besar!`;
                    } else if (index >= sortedUsers.length - 2) {
                        positionMessage = `Lumayan lah ya, peringkat ${index + 1}.`;
                    } else {
                        positionMessage = `Kamu di peringkat ${index + 1}, biasa aja sih.`;
                    }
                }
            })
            topUsersFormatted += '```'
        } else {
            topUsersFormatted += 'Belum ada pemain yang memiliki poin.'
            positionMessage = 'Ayo main biar ada poinnya!';
        }

        client.sendMessage(
            m.chat,
            {
                text: topUsersFormatted + '\n' + positionMessage,
                mentions: mentions
            }, {qouted:m}
        )
        return null

    } else if (endpoint === 'nyerah') {
        const roomsData = await apiGetData('rooms')
        const usersData = await apiGetData('users')
        const currentRoom = roomsData.rooms[room]

        if (!currentRoom || !currentRoom.currentQuestion) {
            return 'Tidak ada soal yang bisa diserahin!'
        }

        const jawabanBenar = currentRoom.currentQuestion.jawaban;
        roomsData.rooms[room].currentQuestion = null
        await apiWriteData('rooms', roomsData)

        if (!usersData.users[user]) {
            usersData.users[user] = { points: 0 }
        }
        usersData.users[user].points = Math.max((usersData.users[user].points || 0) - 3, 0)
        await apiWriteData('users', usersData)

        return `Yah nyerah? Cupu! Jawaban yang benar adalah: ${jawabanBenar}. Point -3.`
    } else {
        return 'Endpoint tidak dikenal'
    }
}

module.exports = { gameLogic }