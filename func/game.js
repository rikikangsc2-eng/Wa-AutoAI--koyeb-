const axios = require('axios');
const API_ENDPOINT = 'https://copper-ambiguous-velvet.glitch.me/data';
const USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; RMX2185 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.260 Mobile Safari/537.36';

const apiGetData = async (dataType) => {
  try {
    return (await axios.get(`${API_ENDPOINT}/${dataType}`, { headers: { 'User-Agent': USER_AGENT } })).data;
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
const fetchSoal = async (url, errMsg) => {
  try {
    return (await axios.get(url)).data;
  } catch (e) {
    console.error(errMsg, e);
    return [];
  }
};
const fetchSoalSusunKata = async () => fetchSoal('https://github.com/BochilTeam/database/raw/refs/heads/master/games/susunkata.json', "Failed to fetch soal susun kata:");
const fetchSoalSiapakahAku = async () => fetchSoal('https://github.com/BochilTeam/database/raw/refs/heads/master/games/siapakahaku.json', "Failed to fetch soal siapakah aku:");
const fetchSoalTebakTebakan = async () => fetchSoal('https://github.com/BochilTeam/database/raw/refs/heads/master/games/tebaktebakan.json', "Failed to fetch soal tebak tebakan:");
const fetchSoalTebakGambar = async () => fetchSoal('https://github.com/BochilTeam/database/raw/refs/heads/master/games/tebakgambar.json', "Failed to fetch soal tebak gambar:");

function scrambleWithVowelsFirst(word) {
  const vowels = "AIUEOaiueo", letters = word.split(''), v = [], c = [];
  letters.forEach(l => vowels.includes(l) ? v.push(l) : c.push(l));
  v.sort(() => Math.random() - 0.5); c.sort(() => Math.random() - 0.5);
  return v.concat(c).join('-');
}
function generateHint(answer, perc) {
  const arr = answer.toLowerCase().split(''), indices = [];
  for (let i = 0; i < arr.length; i++) { if (arr[i] !== ' ') indices.push(i); }
  const shuffled = indices.sort(() => Math.random() - 0.5), reveal = Math.ceil(shuffled.length * perc);
  const revealSet = new Set(shuffled.slice(0, reveal));
  return arr.map((ch, i) => revealSet.has(i) ? ch : (ch === ' ' ? ' ' : '×')).join('');
}
function getDailyResetTime() {
  const now = new Date(), local = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour12: false }));
  local.setHours(0, 0, 0, 0); if (local.getTime() <= now.getTime()) local.setDate(local.getDate() + 1);
  return local.getTime();
}
function getWeeklyResetTime() {
  const now = new Date(), local = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour12: false }));
  local.setHours(0, 0, 0, 0);
  const day = local.getDay(), add = day === 1 ? 7 : day === 0 ? 1 : 8 - day;
  local.setDate(local.getDate() + add);
  return local.getTime();
}
function getMonthlyResetTime() {
  const now = new Date(), local = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour12: false }));
  local.setHours(0, 0, 0, 0); local.setDate(1); local.setMonth(local.getMonth() + 1);
  return local.getTime();
}
function initializeUser(users, user) {
  if (!users[user]) users[user] = { points: 0, harian: { value: 0, expires: getDailyResetTime() }, mingguan: { value: 0, expires: getWeeklyResetTime() }, bulanan: { value: 0, expires: getMonthlyResetTime() } };
  else {
    if (!users[user].harian) users[user].harian = { value: 0, expires: getDailyResetTime() };
    if (!users[user].mingguan) users[user].mingguan = { value: 0, expires: getWeeklyResetTime() };
    if (!users[user].bulanan) users[user].bulanan = { value: 0, expires: getMonthlyResetTime() };
  }
}
async function resetExpiredUserData() {
  const usersData = await apiGetData('users');
  let updated = false, now = Date.now();
  for (const uid in usersData.users) {
    let rec = usersData.users[uid];
    if (!rec.harian) { rec.harian = { value: 0, expires: getDailyResetTime() }; updated = true; }
    else if (now > rec.harian.expires) { rec.harian.value = 0; rec.harian.expires = getDailyResetTime(); updated = true; }
    if (!rec.mingguan) { rec.mingguan = { value: 0, expires: getWeeklyResetTime() }; updated = true; }
    else if (now > rec.mingguan.expires) { rec.mingguan.value = 0; rec.mingguan.expires = getWeeklyResetTime(); updated = true; }
    if (!rec.bulanan) { rec.bulanan = { value: 0, expires: getMonthlyResetTime() }; updated = true; }
    else if (now > rec.bulanan.expires) { rec.bulanan.value = 0; rec.bulanan.expires = getMonthlyResetTime(); updated = true; }
  }
  if (updated) await apiWriteData('users', usersData);
}
setInterval(resetExpiredUserData, 3600000);

async function gameLogic(endpoint, params, query, m, client) {
  const { user, room } = params || {}, { text, hintType } = query || {};
  const ambilSoal = async (soalFetcher, gameType, soalMessage) => {
    const roomsData = await apiGetData('rooms');
    const currentRoom = roomsData.rooms[room];
    if (currentRoom && currentRoom.currentQuestion) return 'Soal sudah diambil. Jawab atau nyerah dulu!';
    const soalList = await soalFetcher();
    if (soalList.length === 0) return `Soal ${gameType} lagi kosong, coba nanti ya!`;
    const selectedSoal = soalList[Math.floor(Math.random() * soalList.length)];
    if (!roomsData.rooms[room]) roomsData.rooms[room] = { currentQuestion: null };
    roomsData.rooms[room].currentQuestion = { ...selectedSoal, gameType, answered: false, attempts: 0, timestamp: Date.now() };
    await apiWriteData('rooms', roomsData);
    return soalMessage(selectedSoal);
  };
  if (endpoint === 'susunkata') {
    return await ambilSoal(fetchSoalSusunKata, 'susunkata', soal => {
      const scrambled = scrambleWithVowelsFirst(soal.jawaban);
      return `Soal susun kata berikut: ${scrambled} - Tipe: ${soal.tipe}`;
    });
  } else if (endpoint === 'siapakahaku') {
    return await ambilSoal(fetchSoalSiapakahAku, 'siapakahaku', soal => `Soal siapakah aku berikut: ${soal.soal}`);
  } else if (endpoint === 'tebaktebakan') {
    return await ambilSoal(fetchSoalTebakTebakan, 'tebaktebakan', soal => `Soal tebak tebakan berikut: ${soal.soal}`);
  } else if (endpoint === 'tebakgambar') {
    const roomsData = await apiGetData('rooms');
    const currentRoom = roomsData.rooms[room];
    if (currentRoom && currentRoom.currentQuestion) return 'Soal sudah diambil. Jawab atau nyerah dulu!';
    const soalList = await fetchSoalTebakGambar();
    if (soalList.length === 0) return 'Soal tebak gambar lagi kosong, coba nanti ya!';
    const selectedSoal = soalList[Math.floor(Math.random() * soalList.length)];
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
    let hintPercentage = 0, pointCost = 0;
    if (hintType === 'murah') { hintPercentage = 0.3; pointCost = 0; }
    else if (hintType === 'mahal') { hintPercentage = 0.5; pointCost = 1; }
    else if (hintType === 'sultan') { hintPercentage = 0.8; pointCost = 2; }
    else return 'Tipe hint tidak valid. Pilih: murah, mahal, sultan';
    initializeUser(usersData.users, user);
    if (pointCost > 0) {
      if (usersData.users[user].points < pointCost) return `Poin tidak cukup untuk hint ${hintType}. Butuh ${pointCost} poin. Poin kamu: ${usersData.users[user].points}`;
      usersData.users[user].points -= pointCost;
      usersData.users[user].harian.value = Math.max(usersData.users[user].harian.value - pointCost, 0);
      usersData.users[user].mingguan.value = Math.max(usersData.users[user].mingguan.value - pointCost, 0);
      usersData.users[user].bulanan.value = Math.max(usersData.users[user].bulanan.value - pointCost, 0);
      await apiWriteData('users', usersData);
    }
    const hintText = generateHint(jawaban, hintPercentage);
    return `Hint ${hintType} (${pointCost > 0 ? `-${pointCost} poin` : 'gratis'}):\nJawaban: ${hintText}`;
  } else if (endpoint === 'point') {
    const usersData = await apiGetData('users');
    initializeUser(usersData.users, user);
    const { points, harian, mingguan, bulanan } = usersData.users[user];
    return `Poin Semua: ${points}\nPoin Harian: ${harian.value}\nPoin Mingguan: ${mingguan.value}\nPoin Bulanan: ${bulanan.value}`;
  } else if (endpoint === 'top') {
    const type = (text || '').toLowerCase();
    if (!['hari', 'minggu', 'bulan', 'semua'].includes(type)) {
      m.reply("*Ketik:* `.top hari` `.top minggu` `.top bulan` atau `.top semua`");
      return;
    }
    const usersData = await apiGetData('users');
    const users = usersData.users;
    let sortedUsers;
    if (type === 'semua') {
      sortedUsers = Object.entries(users)
        .filter(([_, data]) => (data.points || 0) > 0)
        .sort(([, a], [, b]) => (b.points || 0) - (a.points || 0))
        .slice(0, 10);
    } else if (type === 'hari') {
      sortedUsers = Object.entries(users)
        .filter(([_, data]) => ((data.harian ? data.harian.value : 0) > 0))
        .sort(([, a], [, b]) => ((b.harian ? b.harian.value : 0) - (a.harian ? a.harian.value : 0)))
        .slice(0, 10);
    } else if (type === 'minggu') {
      sortedUsers = Object.entries(users)
        .filter(([_, data]) => ((data.mingguan ? data.mingguan.value : 0) > 0))
        .sort(([, a], [, b]) => ((b.mingguan ? b.mingguan.value : 0) - (a.mingguan ? a.mingguan.value : 0)))
        .slice(0, 10);
    } else if (type === 'bulan') {
      sortedUsers = Object.entries(users)
        .filter(([_, data]) => ((data.bulanan ? data.bulanan.value : 0) > 0))
        .sort(([, a], [, b]) => ((b.bulanan ? b.bulanan.value : 0) - (a.bulanan ? a.bulanan.value : 0)))
        .slice(0, 10);
    }
    let topUsersFormatted = `Top 10 Poin ${type}\n\n\`\`\`\nNo.  Username        Points\n-------------------------\n`;
    let mentions = [], positionMessage = '';
    const mapping = { hari: 'harian', minggu: 'mingguan', bulan: 'bulanan' };
    sortedUsers.forEach(([userName, data], i) => {
      let displayName = (data.name && /^[A-Za-z0-9_-]{1,60}$/.test(data.name)) ? data.name : userName;
      let pointsVal = type === 'semua' ? (data.points || 0) : (data[mapping[type]] ? data[mapping[type]].value : 0);
      topUsersFormatted += `${(i + 1).toString().padEnd(3)}  @${displayName} ${String(pointsVal).padEnd(6)}\n`;
      if (!data.name) mentions.push(`${userName}@s.whatsapp.net`);
      if (userName === user) {
        if (i === 0) positionMessage = "wahh hebat banget ada di peringkat pertama 😁";
        else if (i <= 2) positionMessage = `Selamat! Kamu berada di peringkat ${i + 1} besar!`;
        else if (i >= sortedUsers.length - 2) positionMessage = `Lumayan lah ya, peringkat ${i + 1}.`;
        else positionMessage = `Kamu di peringkat ${i + 1}, biasa aja sih.`;
      }
    });
    topUsersFormatted += '```';
    const finalCaption = topUsersFormatted + '\n' + positionMessage + "\n_Anda bisa mengubah Username di_ `.setname`\n\n*Note:* 3 sepuh refresh 24 jam";
    const imgResponse = await axios.get('https://express-vercel-ytdl.vercel.app/top', { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imgResponse.data);
    client.sendMessage(m.chat, { image: imageBuffer, caption: finalCaption, mentions, mimetype: "image/jpeg" }, { quoted: m });
    return null;
  } else if (endpoint === 'nyerah') {
    const roomsData = await apiGetData('rooms');
    const usersData = await apiGetData('users');
    const currentRoom = roomsData.rooms[room];
    if (!currentRoom) return 'Tidak ada permainan yang sedang berjalan!';
    if (currentRoom.ttt && currentRoom.ttt[user]) {
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
    } else return 'Tidak ada soal yang bisa diserahin!';
  } else if (endpoint === 'tictactoe') {
    const roomsData = await apiGetData('rooms');
    if (!roomsData.rooms[room]) roomsData.rooms[room] = {};
    const currentRoom = roomsData.rooms[room];
    if (!currentRoom.ttt) currentRoom.ttt = {};
    let game = currentRoom.ttt[user];
    if (!game) {
      if (!query || !query.text || !['sulit', 'mudah', 'normal'].includes(query.text.toLowerCase()))
        return "ketik `.ttt sulit` `.ttt mudah` atau `.ttt normal`\n\n*Hadiah*:\n- Sulit: 99999 poin\n- Mudah: 5 poin\n- Normal: 10 poin";
      let level = query.text.toLowerCase(), board = Array(9).fill(null), turn = (level === 'sulit' ? (Math.random() < 0.5 ? 'user' : 'ai') : 'user');
      game = { gameType: 'tictactoe', board, level, turn, answered: false, attempts: 0, timestamp: Date.now(), user };
      currentRoom.ttt[user] = game;
      await apiWriteData('rooms', roomsData);
      let msg = `Tic Tac Toe (${level}) game dimulai!\n${renderBoard(board)}\n`;
      if (turn === 'user') msg += "Giliran kamu, kirim nomor kotak (1-9) untuk menempatkan ❌.";
      else {
        let aiMoveIdx;
        if (board.every(cell => cell === null)) {
          const groups = { corner: [0, 2, 6, 8], center: [4], edge: [1, 3, 5, 7] };
          const groupKeys = Object.keys(groups), randomGroupKey = groupKeys[Math.floor(Math.random() * groupKeys.length)];
          aiMoveIdx = groups[randomGroupKey][Math.floor(Math.random() * groups[randomGroupKey].length)];
        } else {
          let bestScore = -Infinity, bestMove = null;
          for (let i = 0; i < board.length; i++) {
            if (board[i] === null) {
              board[i] = 'ai';
              let score = minimax(game.board, 0, false, level);
              board[i] = null;
              if (score > bestScore) { bestScore = score; bestMove = i; }
            }
          }
          aiMoveIdx = bestMove;
        }
        game.board[aiMoveIdx] = 'ai';
        game.turn = 'user';
        await apiWriteData('rooms', roomsData);
        msg = `Tic Tac Toe (${level}) game dimulai!\n*AI memilih angka ${aiMoveIdx + 1}*\n${renderBoard(game.board)}\nGiliran kamu, kirim nomor kotak (1-9) untuk langkah selanjutnya.`;
      }
      return msg;
    } else {
      if (game.turn !== 'user') return "Tunggu giliranmu.";
      const move = parseInt(query.text), idx = move - 1;
      if (isNaN(move) || move < 1 || move > 9) return "Masukkan nomor kotak yang valid (1-9) untuk langkahmu.";
      if (game.board[idx] !== null) return "Kotak sudah terisi, pilih kotak lain.";
      game.board[idx] = 'user';
      const userWin = checkWin(game.board, 'user'), aiWin = checkWin(game.board, 'ai');
      if (userWin || aiWin || game.board.every(cell => cell !== null)) {
        let resMsg = `Permainan selesai!\n${renderBoard(game.board)}\n`;
        if (userWin && !aiWin) {
          const usersData = await apiGetData('users');
          initializeUser(usersData.users, user);
          let emoji = (game.level === 'mudah' || game.level === 'normal') ? '🙄' : '';
          if (game.level === 'mudah') { usersData.users[user].points += 5; usersData.users[user].harian.value += 5; usersData.users[user].mingguan.value += 5; usersData.users[user].bulanan.value += 5; }
          else if (game.level === 'normal') { usersData.users[user].points += 10; usersData.users[user].harian.value += 10; usersData.users[user].mingguan.value += 10; usersData.users[user].bulanan.value += 10; }
          else { usersData.users[user].points += 99999; usersData.users[user].harian.value += 99999; usersData.users[user].mingguan.value += 99999; usersData.users[user].bulanan.value += 99999; }
          await apiWriteData('users', usersData);
          resMsg += `Kamu menang! ${emoji}`;
        } else if (aiWin && !userWin) {
          const usersData = await apiGetData('users');
          initializeUser(usersData.users, user);
          usersData.users[user].points = Math.max(usersData.users[user].points - 1, 0);
          usersData.users[user].harian.value = Math.max(usersData.users[user].harian.value - 1, 0);
          usersData.users[user].mingguan.value = Math.max(usersData.users[user].mingguan.value - 1, 0);
          usersData.users[user].bulanan.value = Math.max(usersData.users[user].bulanan.value - 1, 0);
          await apiWriteData('users', usersData);
          resMsg += "Kamu kalah!";
        } else resMsg += "Permainan seri!";
        delete currentRoom.ttt[user];
        await apiWriteData('rooms', roomsData);
        return resMsg;
      }
      let aiMoveIdx;
      if (game.level === 'mudah') {
        const empty = game.board.map((cell, i) => cell === null ? i : null).filter(x => x !== null);
        aiMoveIdx = empty[Math.floor(Math.random() * empty.length)];
      } else if (game.level === 'normal') {
        if (Math.random() < 0.5) {
          const empty = game.board.map((cell, i) => cell === null ? i : null).filter(x => x !== null);
          aiMoveIdx = empty[Math.floor(Math.random() * empty.length)];
        } else {
          let bestScore = -Infinity, bestMove = null;
          for (let i = 0; i < game.board.length; i++) {
            if (game.board[i] === null) {
              game.board[i] = 'ai';
              let score = minimax(game.board, 0, false, game.level);
              game.board[i] = null;
              if (score > bestScore) { bestScore = score; bestMove = i; }
            }
          }
          aiMoveIdx = bestMove;
        }
      } else {
        let bestScore = -Infinity, bestMove = null;
        for (let i = 0; i < game.board.length; i++) {
          if (game.board[i] === null) {
            game.board[i] = 'ai';
            let score = minimax(game.board, 0, false, game.level);
            game.board[i] = null;
            if (score > bestScore) { bestScore = score; bestMove = i; }
          }
        }
        aiMoveIdx = bestMove;
      }
      game.board[aiMoveIdx] = 'ai';
      const aiExp = `*AI memilih angka ${aiMoveIdx + 1}*`;
      if (checkWin(game.board, 'user') || checkWin(game.board, 'ai') || game.board.every(cell => cell !== null)) {
        let resMsg = `${aiExp}\n${renderBoard(game.board)}${game.level === 'sulit' && checkWin(game.board, 'ai') ? ' 😜' : ''}\n`;
        if (checkWin(game.board, 'user') && !checkWin(game.board, 'ai')) {
          const usersData = await apiGetData('users');
          initializeUser(usersData.users, user);
          let emoji = (game.level === 'mudah' || game.level === 'normal') ? '🙄' : '';
          if (game.level === 'mudah') { usersData.users[user].points += 5; usersData.users[user].harian.value += 5; usersData.users[user].mingguan.value += 5; usersData.users[user].bulanan.value += 5; }
          else if (game.level === 'normal') { usersData.users[user].points += 10; usersData.users[user].harian.value += 10; usersData.users[user].mingguan.value += 10; usersData.users[user].bulanan.value += 10; }
          else { usersData.users[user].points += 99999; usersData.users[user].harian.value += 99999; usersData.users[user].mingguan.value += 99999; usersData.users[user].bulanan.value += 99999; }
          await apiWriteData('users', usersData);
          resMsg += `Kamu menang! ${emoji}`;
        } else if (checkWin(game.board, 'ai') && !checkWin(game.board, 'user')) {
          const usersData = await apiGetData('users');
          initializeUser(usersData.users, user);
          usersData.users[user].points = Math.max(usersData.users[user].points - 1, 0);
          usersData.users[user].harian.value = Math.max(usersData.users[user].harian.value - 1, 0);
          usersData.users[user].mingguan.value = Math.max(usersData.users[user].mingguan.value - 1, 0);
          usersData.users[user].bulanan.value = Math.max(usersData.users[user].bulanan.value - 1, 0);
          await apiWriteData('users', usersData);
          resMsg += "Kamu kalah!";
        } else resMsg += "Permainan seri!";
        delete currentRoom.ttt[user];
        await apiWriteData('rooms', roomsData);
        return resMsg;
      }
      game.turn = 'user';
      await apiWriteData('rooms', roomsData);
      return `${aiExp}\n${renderBoard(game.board)}\nGiliran kamu. Kirim nomor kotak (1-9) untuk langkah selanjutnya.`;
    }
  } else if (endpoint === 'setname') {
    const usersData = await apiGetData('users');
    let newName = text;
    if (!newName) return 'ketik `.setname nama-kamu` atau `.setname dafault`';
    const validNameRegex = /^[A-Za-z0-9_-]{1,60}$/;
    if (newName.toLowerCase() === 'dafault') {
      if (usersData.users[user]) delete usersData.users[user].name;
      await apiWriteData('users', usersData);
      return 'Nama telah di-reset ke default.';
    } else {
      if (!validNameRegex.test(newName)) {
        if (usersData.users[user] && usersData.users[user].name) delete usersData.users[user].name;
        await apiWriteData('users', usersData);
        return 'Nama tidak valid. Nama di-reset ke default.';
      } else {
        initializeUser(usersData.users, user);
        usersData.users[user].name = newName;
        await apiWriteData('users', usersData);
        return `Nama telah disetel ke ${newName}.`;
      }
    }
  } else return 'Endpoint tidak dikenal';
}

function renderBoard(board) {
  const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
  return board.map((cell, i) => cell === 'user' ? '❌' : cell === 'ai' ? '⭕' : numberEmojis[i]).slice(0, 3).join(' ') + '\n' +
         board.map((cell, i) => cell === 'user' ? '❌' : cell === 'ai' ? '⭕' : numberEmojis[i]).slice(3, 6).join(' ') + '\n' +
         board.map((cell, i) => cell === 'user' ? '❌' : cell === 'ai' ? '⭕' : numberEmojis[i]).slice(6, 9).join(' ');
}
function checkWin(board, player) {
  const wins = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  return wins.some(c => c.every(i => board[i] === player));
}
function minimax(board, depth, isMaximizing, level) {
  if (checkWin(board, 'ai')) return 10 - depth;
  if (checkWin(board, 'user')) return depth - 10;
  if (board.every(cell => cell !== null)) return 0;
  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) {
        board[i] = 'ai';
        best = Math.max(best, minimax(board, depth + 1, false, level));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) {
        board[i] = 'user';
        best = Math.min(best, minimax(board, depth + 1, true, level));
        board[i] = null;
      }
    }
    return best;
  }
}

module.exports = { gameLogic };