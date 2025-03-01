const axios = require('axios');
const API_ENDPOINT = 'https://copper-ambiguous-velvet.glitch.me/data';
const USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; RMX2185 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.260 Mobile Safari/537.36';
const apiGetData = async (dataType) => {
  try {
    const response = await axios.get(`${API_ENDPOINT}/${dataType}`, { headers: { 'User-Agent': USER_AGENT } });
    return response.data;
  } catch (error) {
    console.error(`Failed to get ${dataType} data from API:`, error);
    return { users: {}, rooms: {} };
  }
};
const apiWriteData = async (dataType, data) => {
  try {
    await axios.post(`${API_ENDPOINT}/${dataType}`, data, { headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/json' } });
    return true;
  } catch (error) {
    console.error(`Failed to write ${dataType} data to API:`, error);
    return false;
  }
};
const fetchSoalSusunKata = async () => {
  try {
    const response = await axios.get('https://github.com/BochilTeam/database/raw/refs/heads/master/games/susunkata.json');
    return response.data;
  } catch (error) {
    console.error("Failed to fetch soal susun kata:", error);
    return [];
  }
};
const fetchSoalSiapakahAku = async () => {
  try {
    const response = await axios.get('https://github.com/BochilTeam/database/raw/refs/heads/master/games/siapakahaku.json');
    return response.data;
  } catch (error) {
    console.error("Failed to fetch soal siapakah aku:", error);
    return [];
  }
};
const fetchSoalTebakTebakan = async () => {
  try {
    const response = await axios.get('https://github.com/BochilTeam/database/raw/refs/heads/master/games/tebaktebakan.json');
    return response.data;
  } catch (error) {
    console.error("Failed to fetch soal tebak tebakan:", error);
    return [];
  }
};
const fetchSoalTebakGambar = async () => {
  try {
    const response = await axios.get('https://github.com/BochilTeam/database/raw/refs/heads/master/games/tebakgambar.json');
    return response.data;
  } catch (error) {
    console.error("Failed to fetch soal tebak gambar:", error);
    return [];
  }
};
function scrambleWithVowelsFirst(word) {
  const vowelsList = "AIUEOaiueo";
  const letters = word.split('');
  let vowels = [];
  let consonants = [];
  letters.forEach(letter => {
    if (vowelsList.includes(letter)) vowels.push(letter);
    else consonants.push(letter);
  });
  vowels.sort(() => Math.random() - 0.5);
  consonants.sort(() => Math.random() - 0.5);
  return vowels.concat(consonants).join('-');
}
function generateHint(answer, percentage) {
  const answerArray = answer.toLowerCase().split('');
  const visibleIndices = [];
  for (let i = 0; i < answerArray.length; i++) {
    if (answerArray[i] !== ' ') visibleIndices.push(i);
  }
  const shuffledIndices = visibleIndices.sort(() => Math.random() - 0.5);
  const revealCount = Math.ceil(shuffledIndices.length * percentage);
  const indicesToReveal = new Set(shuffledIndices.slice(0, revealCount));
  let hint = '';
  for (let i = 0; i < answerArray.length; i++) {
    if (indicesToReveal.has(i)) hint += answerArray[i];
    else if (answerArray[i] === ' ') hint += ' ';
    else hint += '×';
  }
  return hint;
}
function getDailyResetTime() {
  const now = new Date();
  const options = { timeZone: "Asia/Jakarta", hour12: false };
  const local = new Date(now.toLocaleString("en-US", options));
  local.setHours(0, 0, 0, 0);
  if (local.getTime() <= now.getTime()) local.setDate(local.getDate() + 1);
  return local.getTime();
}
function getWeeklyResetTime() {
  const now = new Date();
  const options = { timeZone: "Asia/Jakarta", hour12: false };
  const local = new Date(now.toLocaleString("en-US", options));
  local.setHours(0, 0, 0, 0);
  const day = local.getDay();
  let daysToAdd = day === 1 ? 7 : day === 0 ? 1 : 8 - day;
  local.setDate(local.getDate() + daysToAdd);
  return local.getTime();
}
function getMonthlyResetTime() {
  const now = new Date();
  const options = { timeZone: "Asia/Jakarta", hour12: false };
  const local = new Date(now.toLocaleString("en-US", options));
  local.setHours(0, 0, 0, 0);
  local.setDate(1);
  local.setMonth(local.getMonth() + 1);
  return local.getTime();
}
function initializeUser(users, user) {
  if (!users[user]) {
    users[user] = {
      points: 0,
      harian: { value: 0, expires: getDailyResetTime() },
      mingguan: { value: 0, expires: getWeeklyResetTime() },
      bulanan: { value: 0, expires: getMonthlyResetTime() }
    };
  } else {
    if (!users[user].harian) users[user].harian = { value: 0, expires: getDailyResetTime() };
    if (!users[user].mingguan) users[user].mingguan = { value: 0, expires: getWeeklyResetTime() };
    if (!users[user].bulanan) users[user].bulanan = { value: 0, expires: getMonthlyResetTime() };
  }
}
async function resetExpiredUserData() {
  const usersData = await apiGetData('users');
  let updated = false;
  const now = Date.now();
  for (const uid in usersData.users) {
    let record = usersData.users[uid];
    if (!record.harian) { record.harian = { value: 0, expires: getDailyResetTime() }; updated = true; }
    else if (now > record.harian.expires) { record.harian.value = 0; record.harian.expires = getDailyResetTime(); updated = true; }
    if (!record.mingguan) { record.mingguan = { value: 0, expires: getWeeklyResetTime() }; updated = true; }
    else if (now > record.mingguan.expires) { record.mingguan.value = 0; record.mingguan.expires = getWeeklyResetTime(); updated = true; }
    if (!record.bulanan) { record.bulanan = { value: 0, expires: getMonthlyResetTime() }; updated = true; }
    else if (now > record.bulanan.expires) { record.bulanan.value = 0; record.bulanan.expires = getMonthlyResetTime(); updated = true; }
  }
  if (updated) await apiWriteData('users', usersData);
}
setInterval(resetExpiredUserData, 3600000);
async function gameLogic(endpoint, params, query, m, client) {
  const { user, room } = params || {};
  const { text, hintType } = query || {};
  const ambilSoal = async (soalFetcher, gameType, soalMessage) => {
    const roomsData = await apiGetData('rooms');
    const currentRoom = roomsData.rooms[room];
    if (currentRoom && currentRoom.currentQuestion) return 'Soal sudah diambil. Jawab atau nyerah dulu!';
    const soalList = await soalFetcher();
    if (soalList.length === 0) return `Soal ${gameType} lagi kosong, coba nanti ya!`;
    const randomIndex = Math.floor(Math.random() * soalList.length);
    const selectedSoal = soalList[randomIndex];
    if (!roomsData.rooms[room]) roomsData.rooms[room] = { currentQuestion: null };
    roomsData.rooms[room].currentQuestion = { ...selectedSoal, gameType: gameType, answered: false, attempts: 0, timestamp: Date.now() };
    await apiWriteData('rooms', roomsData);
    return soalMessage(selectedSoal);
  };
  if (endpoint === 'susunkata') {
    return await ambilSoal(fetchSoalSusunKata, 'susunkata', (soal) => {
      const scrambled = scrambleWithVowelsFirst(soal.jawaban);
      return `Soal susun kata berikut: ${scrambled} - Tipe: ${soal.tipe}`;
    });
  } else if (endpoint === 'siapakahaku') {
    return await ambilSoal(fetchSoalSiapakahAku, 'siapakahaku', (soal) => `Soal siapakah aku berikut: ${soal.soal}`);
  } else if (endpoint === 'tebaktebakan') {
    return await ambilSoal(fetchSoalTebakTebakan, 'tebaktebakan', (soal) => `Soal tebak tebakan berikut: ${soal.soal}`);
  } else if (endpoint === 'tebakgambar') {
    const roomsData = await apiGetData('rooms');
    const currentRoom = roomsData.rooms[room];
    if (currentRoom && currentRoom.currentQuestion) return 'Soal sudah diambil. Jawab atau nyerah dulu!';
    const soalList = await fetchSoalTebakGambar();
    if (soalList.length === 0) return 'Soal tebak gambar lagi kosong, coba nanti ya!';
    const randomIndex = Math.floor(Math.random() * soalList.length);
    const selectedSoal = soalList[randomIndex];
    if (!roomsData.rooms[room]) roomsData.rooms[room] = { currentQuestion: null };
    roomsData.rooms[room].currentQuestion = { ...selectedSoal, gameType: 'tebakgambar', answered: false, attempts: 0, timestamp: Date.now() };
    await apiWriteData('rooms', roomsData);
    client.sendMessage(m.chat, { image: { url: selectedSoal.img }, caption: 'AliciaGames', mimetype: "image/jpeg" }, { quoted: m });
    return null;
  } else if (endpoint === 'jawab') {
    const usersData = await apiGetData('users');
    const roomsData = await apiGetData('rooms');
    let currentRoom = roomsData.rooms[room];
    if (!currentRoom || !currentRoom.currentQuestion) return 'Ambil soal dulu sebelum jawab!';
    if (currentRoom.currentQuestion.answered) return 'Soal sudah dijawab atau timeout. Ambil soal baru!';
    const jawabanBenar = currentRoom.currentQuestion.jawaban.toLowerCase();
    const jawabanUser = text ? text.toLowerCase() : '';
    let attempts = currentRoom.currentQuestion.attempts || 0;
    if (jawabanUser === jawabanBenar) {
      initializeUser(usersData.users, user);
      usersData.users[user].points += 3;
      usersData.users[user].harian.value += 3;
      usersData.users[user].mingguan.value += 3;
      usersData.users[user].bulanan.value += 3;
      await apiWriteData('users', usersData);
      roomsData.rooms[room].currentQuestion = null;
      await apiWriteData('rooms', roomsData);
      return 'Jawaban kamu benar! Point +3.';
    } else {
      attempts++;
      currentRoom.currentQuestion.attempts = attempts;
      await apiWriteData('rooms', roomsData);
      currentRoom = roomsData.rooms[room];
      if (attempts >= 3) {
        initializeUser(usersData.users, user);
        usersData.users[user].points = Math.max(usersData.users[user].points - 3, 0);
        usersData.users[user].harian.value = Math.max(usersData.users[user].harian.value - 3, 0);
        usersData.users[user].mingguan.value = Math.max(usersData.users[user].mingguan.value - 3, 0);
        usersData.users[user].bulanan.value = Math.max(usersData.users[user].bulanan.value - 3, 0);
        await apiWriteData('users', usersData);
        const jawaban = currentRoom.currentQuestion.jawaban;
        roomsData.rooms[room].currentQuestion = null;
        await apiWriteData('rooms', roomsData);
        return `Jawaban salah 3 kali. Soal dihapus. Point -3. Silakan ambil soal baru. Jawaban yang benar adalah: ${jawaban}`;
      } else {
        return `Jawaban Salah! Kesempatan menjawab tersisa ${3 - attempts} kali lagi.`;
      }
    }
  } else if (endpoint === 'hint') {
    const usersData = await apiGetData('users');
    const roomsData = await apiGetData('rooms');
    const currentRoom = roomsData.rooms[room];
    if (currentRoom && currentRoom.ttt && currentRoom.ttt[user]) return 'Tidak ada hint dalam permainan ini.';
    if (!currentRoom || !currentRoom.currentQuestion) return 'Ambil soal dulu sebelum minta hint!';
    if (currentRoom.currentQuestion.answered) return 'Soal sudah dijawab atau timeout, tidak bisa minta hint lagi.';
    const jawaban = currentRoom.currentQuestion.jawaban;
    let hintText = '';
    let pointCost = 0;
    let hintPercentage = 0;
    if (hintType === 'murah') { hintPercentage = 0.3; pointCost = 0; }
    else if (hintType === 'mahal') { hintPercentage = 0.5; pointCost = 1; }
    else if (hintType === 'sultan') { hintPercentage = 0.8; pointCost = 2; }
    else { return 'Tipe hint tidak valid. Pilih: murah, mahal, sultan'; }
    initializeUser(usersData.users, user);
    if (pointCost > 0) {
      if (usersData.users[user].points < pointCost) {
        return `Poin tidak cukup untuk hint ${hintType}. Butuh ${pointCost} poin. Poin kamu: ${usersData.users[user].points}`;
      }
      usersData.users[user].points -= pointCost;
      usersData.users[user].harian.value = Math.max(usersData.users[user].harian.value - pointCost, 0);
      usersData.users[user].mingguan.value = Math.max(usersData.users[user].mingguan.value - pointCost, 0);
      usersData.users[user].bulanan.value = Math.max(usersData.users[user].bulanan.value - pointCost, 0);
      await apiWriteData('users', usersData);
    }
    hintText = generateHint(jawaban, hintPercentage);
    return `Hint ${hintType} (${pointCost > 0 ? `-${pointCost} poin` : 'gratis'}):\nJawaban: ${hintText}`;
  } else if (endpoint === 'point') {
    const usersData = await apiGetData('users');
    initializeUser(usersData.users, user);
    const globalPoints = usersData.users[user].points;
    const harian = usersData.users[user].harian.value;
    const mingguan = usersData.users[user].mingguan.value;
    const bulanan = usersData.users[user].bulanan.value;
    return `Poin Semua: ${globalPoints}\nPoin Harian: ${harian}\nPoin Mingguan: ${mingguan}\nPoin Bulanan: ${bulanan}`;
  } else if (endpoint === 'top') {
    const type = (text || '').toLowerCase();
    if (!['hari','minggu','bulan','semua'].includes(type)) {
      m.reply("*Ketik:* `.top hari` `.top minggu` `.top bulan` atau `.top semua`");
      return;
    }
    const usersData = await apiGetData('users');
    const users = usersData.users;
    let sortedUsers;
    if (type === 'semua') {
      sortedUsers = Object.entries(users)
        .filter(([userName, data]) => (data.points || 0) > 0)
        .sort(([, a], [, b]) => (b.points || 0) - (a.points || 0))
        .slice(0, 10);
    } else if (type === 'hari') {
      sortedUsers = Object.entries(users)
        .filter(([userName, data]) => ((data.harian ? data.harian.value : 0) > 0))
        .sort(([, a], [, b]) => ((b.harian ? b.harian.value : 0) - (a.harian ? a.harian.value : 0)))
        .slice(0, 10);
    } else if (type === 'minggu') {
      sortedUsers = Object.entries(users)
        .filter(([userName, data]) => ((data.mingguan ? data.mingguan.value : 0) > 0))
        .sort(([, a], [, b]) => ((b.mingguan ? b.mingguan.value : 0) - (a.mingguan ? a.mingguan.value : 0)))
        .slice(0, 10);
    } else if (type === 'bulan') {
      sortedUsers = Object.entries(users)
        .filter(([userName, data]) => ((data.bulanan ? data.bulanan.value : 0) > 0))
        .sort(([, a], [, b]) => ((b.bulanan ? b.bulanan.value : 0) - (a.bulanan ? a.bulanan.value : 0)))
        .slice(0, 10);
    }
    let topUsersFormatted = `Top 10 Poin ${type}\n\n`;
    topUsersFormatted += '```\nNo.  Username        Points\n-------------------------\n';
    let mentions = [];
    let positionMessage = '';
    for (let index = 0; index < sortedUsers.length; index++) {
      let [userName, data] = sortedUsers[index];
      let displayName = (data.name && /^[A-Za-z0-9_-]{1,60}$/.test(data.name)) ? data.name : userName;
      let rank = String(index + 1).padEnd(3);
      let points;
      if (type === 'semua') points = String(data.points || 0).padEnd(6);
      else if (type === 'hari') points = String((data.harian ? data.harian.value : 0)).padEnd(6);
      else if (type === 'minggu') points = String((data.mingguan ? data.mingguan.value : 0)).padEnd(6);
      else if (type === 'bulan') points = String((data.bulanan ? data.bulanan.value : 0)).padEnd(6);
      topUsersFormatted += `${rank}  ${"@"+displayName} ${points}\n`;
      if (!data.name) mentions.push(`${userName}@s.whatsapp.net`);
      if (userName === user) {
        if (index === 0) positionMessage = "wahh hebat banget ada di peringkat pertama 😁";
        else if (index <= 2) positionMessage = `Selamat! Kamu berada di peringkat ${index + 1} besar!`;
        else if (index >= sortedUsers.length - 2) positionMessage = `Lumayan lah ya, peringkat ${index + 1}.`;
        else positionMessage = `Kamu di peringkat ${index + 1}, biasa aja sih.`;
      }
    }
    topUsersFormatted += '```';
    const finalCaption = topUsersFormatted + '\n' + positionMessage + "\n_Anda bisa mengubah Username di_ `.setname`\n\n*Note:* 3 sepuh refresh 24 jam";
    const imgResponse = await axios.get('https://express-vercel-ytdl.vercel.app/top', { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imgResponse.data);
    client.sendMessage(m.chat, { image: imageBuffer, caption: finalCaption, mentions: mentions, mimetype: "image/jpeg" }, { quoted: m });
    return null;
  } else if (endpoint === 'nyerah') {
    const roomsData = await apiGetData('rooms');
    const usersData = await apiGetData('users');
    const currentRoom = roomsData.rooms[room];
    if (!currentRoom) return 'Tidak ada permainan yang sedang berjalan!';
    if (currentRoom.ttt && currentRoom.ttt[user]) {
      const game = currentRoom.ttt[user];
      delete currentRoom.ttt[user];
      await apiWriteData('rooms', roomsData);
      initializeUser(usersData.users, user);
      usersData.users[user].points = Math.max(usersData.users[user].points - 1, 0);
      usersData.users[user].harian.value = Math.max(usersData.users[user].harian.value - 1, 0);
      usersData.users[user].mingguan.value = Math.max(usersData.users[user].mingguan.value - 1, 0);
      usersData.users[user].bulanan.value = Math.max(usersData.users[user].bulanan.value - 1, 0);
      await apiWriteData('users', usersData);
      return `Yah nyerah? Cupu! Permainan tic tac toe kamu dihentikan.\nPoint -1.`;
    } else if (currentRoom.currentQuestion) {
      const jawabanBenar = currentRoom.currentQuestion.jawaban;
      currentRoom.currentQuestion = null;
      await apiWriteData('rooms', roomsData);
      initializeUser(usersData.users, user);
      usersData.users[user].points = Math.max(usersData.users[user].points - 3, 0);
      usersData.users[user].harian.value = Math.max(usersData.users[user].harian.value - 3, 0);
      usersData.users[user].mingguan.value = Math.max(usersData.users[user].mingguan.value - 3, 0);
      usersData.users[user].bulanan.value = Math.max(usersData.users[user].bulanan.value - 3, 0);
      await apiWriteData('users', usersData);
      return `Yah nyerah? Cupu! Jawaban yang benar adalah: ${jawabanBenar}. Point -3.`;
    } else {
      return 'Tidak ada soal yang bisa diserahin!';
    }
  } else if (endpoint === 'tictactoe') {
    const roomsData = await apiGetData('rooms');
    if (!roomsData.rooms[room]) roomsData.rooms[room] = {};
    const currentRoom = roomsData.rooms[room];
    if (!currentRoom.ttt) currentRoom.ttt = {};
    let game = currentRoom.ttt[user];
    if (!game) {
      if (!query || !query.text || !['sulit','mudah','normal'].includes(query.text.toLowerCase()))
        return "ketik `.ttt sulit` `.ttt mudah` atau `.ttt normal`\n\n*Hadiah*:\n- Sulit: 99999 poin\n- Mudah: 5 poin\n- Normal: 10 poin";
      let level = query.text.toLowerCase();
      let board = Array(9).fill(null);
      let turn = 'user';
      if (level === 'sulit') turn = Math.random() < 0.5 ? 'user' : 'ai';
      if (level === 'normal') turn = 'user';
      game = { gameType: 'tictactoe', board: board, level: level, turn: turn, answered: false, attempts: 0, timestamp: Date.now(), user: user };
      currentRoom.ttt[user] = game;
      await apiWriteData('rooms', roomsData);
      let initialMessage = `Tic Tac Toe (${level}) game dimulai!\n${renderBoard(board)}\n`;
      if (turn === 'user') {
        initialMessage += "Giliran kamu, kirim nomor kotak (1-9) untuk menempatkan ❌.";
        return initialMessage;
      } else {
        let aiMoveIdx;
        if (board.every(cell => cell === null)) {
          const groups = { corner: [0,2,6,8], center: [4], edge: [1,3,5,7] };
          const groupKeys = Object.keys(groups);
          const randomGroupKey = groupKeys[Math.floor(Math.random() * groupKeys.length)];
          const possibleMoves = groups[randomGroupKey];
          aiMoveIdx = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        } else {
          let bestScore = -Infinity;
          let bestMove = null;
          for (let i = 0; i < board.length; i++) {
            if (board[i] === null) {
              board[i] = 'ai';
              let score = minimax(board, 0, false);
              board[i] = null;
              if (score > bestScore) { bestScore = score; bestMove = i; }
            }
          }
          aiMoveIdx = bestMove;
        }
        game.board[aiMoveIdx] = 'ai';
        game.turn = 'user';
        await apiWriteData('rooms', roomsData);
        let initialMessageAI = `Tic Tac Toe (${level}) game dimulai!\n*AI memilih angka ${aiMoveIdx+1}*\n${renderBoard(game.board)}\nGiliran kamu, kirim nomor kotak (1-9) untuk langkah selanjutnya.`;
        return initialMessageAI;
      }
    } else {
      if (game.turn !== 'user') return "Tunggu giliranmu.";
      const move = parseInt(query.text);
      if (isNaN(move) || move < 1 || move > 9) return "Masukkan nomor kotak yang valid (1-9) untuk langkahmu.";
      const idx = move - 1;
      if (game.board[idx] !== null) return "Kotak sudah terisi, pilih kotak lain.";
      game.board[idx] = 'user';
      if (game.board.every(cell => cell !== null)) {
        const userWin = checkWin(game.board, 'user');
        const aiWin = checkWin(game.board, 'ai');
        let resultMessage = `Permainan selesai!\n${renderBoard(game.board)}\n`;
        if (userWin && !aiWin) {
          const usersData = await apiGetData('users');
          initializeUser(usersData.users, user);
          if (game.level === 'mudah') {
            usersData.users[user].points += 5;
            usersData.users[user].harian.value += 5;
            usersData.users[user].mingguan.value += 5;
            usersData.users[user].bulanan.value += 5;
          } else if (game.level === 'normal') {
            usersData.users[user].points += 10;
            usersData.users[user].harian.value += 10;
            usersData.users[user].mingguan.value += 10;
            usersData.users[user].bulanan.value += 10;
          } else {
            usersData.users[user].points += 99999;
            usersData.users[user].harian.value += 99999;
            usersData.users[user].mingguan.value += 99999;
            usersData.users[user].bulanan.value += 99999;
          }
          await apiWriteData('users', usersData);
          resultMessage += "Kamu menang!";
        } else if (aiWin && !userWin) {
          const usersData = await apiGetData('users');
          initializeUser(usersData.users, user);
          usersData.users[user].points = Math.max(usersData.users[user].points - 1, 0);
          usersData.users[user].harian.value = Math.max(usersData.users[user].harian.value - 1, 0);
          usersData.users[user].mingguan.value = Math.max(usersData.users[user].mingguan.value - 1, 0);
          usersData.users[user].bulanan.value = Math.max(usersData.users[user].bulanan.value - 1, 0);
          await apiWriteData('users', usersData);
          resultMessage += "Kamu kalah!";
        } else {
          resultMessage += "Permainan seri!";
        }
        delete currentRoom.ttt[user];
        await apiWriteData('rooms', roomsData);
        return resultMessage;
      }
      let aiMoveIdx;
      if (game.level === 'mudah') {
        const emptyIndices = game.board.map((cell, index) => cell === null ? index : null).filter(x => x !== null);
        aiMoveIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      } else {
        let bestScore = -Infinity;
        let bestMove = null;
        for (let i = 0; i < game.board.length; i++) {
          if (game.board[i] === null) {
            game.board[i] = 'ai';
            let score = minimax(game.board, 0, false);
            game.board[i] = null;
            if (score > bestScore) { bestScore = score; bestMove = i; }
          }
        }
        aiMoveIdx = bestMove;
      }
      game.board[aiMoveIdx] = 'ai';
      const aiExplanation = `*AI memilih angka ${aiMoveIdx+1}*`;
      if (game.board.every(cell => cell !== null)) {
        const userWin = checkWin(game.board, 'user');
        const aiWin = checkWin(game.board, 'ai');
        let resultMessage = `${aiExplanation}\n${renderBoard(game.board)}\n`;
        if (userWin && !aiWin) {
          const usersData = await apiGetData('users');
          initializeUser(usersData.users, user);
          if (game.level === 'mudah') {
            usersData.users[user].points += 5;
            usersData.users[user].harian.value += 5;
            usersData.users[user].mingguan.value += 5;
            usersData.users[user].bulanan.value += 5;
          } else if (game.level === 'normal') {
            usersData.users[user].points += 10;
            usersData.users[user].harian.value += 10;
            usersData.users[user].mingguan.value += 10;
            usersData.users[user].bulanan.value += 10;
          } else {
            usersData.users[user].points += 99999;
            usersData.users[user].harian.value += 99999;
            usersData.users[user].mingguan.value += 99999;
            usersData.users[user].bulanan.value += 99999;
          }
          await apiWriteData('users', usersData);
          resultMessage += "Kamu menang!";
        } else if (aiWin && !userWin) {
          const usersData = await apiGetData('users');
          initializeUser(usersData.users, user);
          usersData.users[user].points = Math.max(usersData.users[user].points - 1, 0);
          usersData.users[user].harian.value = Math.max(usersData.users[user].harian.value - 1, 0);
          usersData.users[user].mingguan.value = Math.max(usersData.users[user].mingguan.value - 1, 0);
          usersData.users[user].bulanan.value = Math.max(usersData.users[user].bulanan.value - 1, 0);
          await apiWriteData('users', usersData);
          resultMessage += "Kamu kalah!";
        } else {
          resultMessage += "Permainan seri!";
        }
        delete currentRoom.ttt[user];
        await apiWriteData('rooms', roomsData);
        return resultMessage;
      }
      game.turn = 'user';
      await apiWriteData('rooms', roomsData);
      return `${aiExplanation}\n${renderBoard(game.board)}\nGiliran kamu. Kirim nomor kotak (1-9) untuk langkah selanjutnya.`;
    }
  } else if (endpoint === 'setname') {
    const usersData = await apiGetData('users');
    let newName = text;
    if (!newName) return 'ketik `.setname nama-kamu` atau `.setname dafault`';
    const validNameRegex = /^[A-Za-z0-9_-]{1,60}$/;
    if (newName.toLowerCase() === 'dafault') {
      if(usersData.users[user]) delete usersData.users[user].name;
      await apiWriteData('users', usersData);
      return 'Nama telah di-reset ke default.';
    } else {
      if (!validNameRegex.test(newName)) {
        if(usersData.users[user] && usersData.users[user].name) delete usersData.users[user].name;
        await apiWriteData('users', usersData);
        return 'Nama tidak valid. Nama di-reset ke default.';
      } else {
        initializeUser(usersData.users, user);
        usersData.users[user].name = newName;
        await apiWriteData('users', usersData);
        return `Nama telah disetel ke ${newName}.`;
      }
    }
  } else {
    return 'Endpoint tidak dikenal';
  }
}
function renderBoard(board) {
  const numberEmojis = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
  const symbols = board.map((cell, index) => {
    if (cell === 'user') return '❌';
    if (cell === 'ai') return '⭕';
    return numberEmojis[index];
  });
  return `${symbols.slice(0,3).join(' ')}\n${symbols.slice(3,6).join(' ')}\n${symbols.slice(6,9).join(' ')}`;
}
function checkWin(board, player) {
  const winCombinations = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return winCombinations.some(comb => comb.every(index => board[index] === player));
}
function minimax(board, depth, isMaximizing) {
  if (checkWin(board, 'ai')) return 10 - depth;
  if (checkWin(board, 'user')) return depth - 10;
  if (board.every(cell => cell !== null)) return 0;
  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) {
        board[i] = 'ai';
        let score = minimax(board, depth + 1, false);
        board[i] = null;
        bestScore = Math.max(score, bestScore);
      }
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) {
        board[i] = 'user';
        let score = minimax(board, depth + 1, true);
        board[i] = null;
        bestScore = Math.min(score, bestScore);
      }
    }
    return bestScore;
  }
}
module.exports = { gameLogic };
