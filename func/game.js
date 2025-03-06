const axios = require('axios');
const API_ENDPOINT = 'https://copper-ambiguous-velvet.glitch.me/data';
const USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; RMX2185 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/131.0.6778.260 Mobile Safari/537.36';
const apiGetData = async (dataType) => {
  try {
    return (await axios.get(`${API_ENDPOINT}/${dataType}`, { headers: { 'User-Agent': USER_AGENT } })).data;
  } catch (error) {
    console.error(`Gagal mengambil data ${dataType}:`, error);
    return { users: {}, rooms: {} };
  }
};
const apiWriteData = async (dataType, data) => {
  try {
    await axios.post(`${API_ENDPOINT}/${dataType}`, data, { headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/json' } });
    return true;
  } catch (error) {
    console.error(`Gagal menulis data ${dataType}:`, error);
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
const fetchSoalSusunKata = async () => fetchSoal('https://github.com/BochilTeam/database/raw/refs/heads/master/games/susunkata.json', "Gagal mengambil soal susun kata:");
const fetchSoalSiapakahAku = async () => fetchSoal('https://github.com/BochilTeam/database/raw/refs/heads/master/games/siapakahaku.json', "Gagal mengambil soal siapakah aku:");
const fetchSoalTebakTebakan = async () => fetchSoal('https://github.com/BochilTeam/database/raw/refs/heads/master/games/tebaktebakan.json', "Gagal mengambil soal tebak tebakan:");
const fetchSoalTebakGambar = async () => fetchSoal('https://github.com/BochilTeam/database/raw/refs/heads/master/games/tebakgambar.json', "Gagal mengambil soal tebak gambar:");
function scrambleWithVowelsFirst(word) {
  const vowels = "AIUEOaiueo", letters = word.split(''), v = [], c = [];
  letters.forEach(l => vowels.includes(l) ? v.push(l) : c.push(l));
  v.sort(() => Math.random() - 0.5);
  c.sort(() => Math.random() - 0.5);
  return v.concat(c).join('-');
}
function generateHint(answer, perc) {
  const arr = answer.toLowerCase().split(''), indices = [];
  for (let i = 0; i < arr.length; i++) { if (arr[i] !== ' ') indices.push(i); }
  const shuffled = indices.sort(() => Math.random() - 0.5),
        reveal = Math.ceil(shuffled.length * perc);
  const revealSet = new Set(shuffled.slice(0, reveal));
  return arr.map((ch, i) => revealSet.has(i) ? ch : (ch === ' ' ? ' ' : '×')).join('');
}
function getDailyResetTime() {
  const now = new Date(),
    local = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour12: false }));
  local.setHours(0, 0, 0, 0);
  if (local.getTime() <= now.getTime()) local.setDate(local.getDate() + 1);
  return local.getTime();
}
function getWeeklyResetTime() {
  const now = new Date(),
    local = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour12: false }));
  local.setHours(0, 0, 0, 0);
  const day = local.getDay(),
    add = day === 1 ? 7 : day === 0 ? 1 : 8 - day;
  local.setDate(local.getDate() + add);
  return local.getTime();
}
function getMonthlyResetTime() {
  const now = new Date(),
    local = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour12: false }));
  local.setHours(0, 0, 0, 0);
  local.setDate(1);
  local.setMonth(local.getMonth() + 1);
  return local.getTime();
}
function getQuestResetTime() {
  const now = new Date(),
    local = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour12: false }));
  local.setHours(0, 0, 0, 0);
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
function initializeRPG(users, user) {
  if (!users[user].rpg) {
    users[user].rpg = {
      level: 1,
      exp: 0,
      hp: 100,
      maxHp: 100,
      atk: 10,
      def: 5,
      gold: 50,
      inventory: [],
      equippedWeapon: null,
      artifacts: 0,
      globalQuestProgress: 0,
      globalQuestCompleted: false,
      lastRecovery: Date.now()
    };
  }
}
function generateMonster(playerLevel) {
  const monsters = ['Goblin', 'Orc', 'Troll', 'Serigala', 'Bandit', 'Harpy', 'Prajurit', 'Penyihir', 'Golem'];
  const name = monsters[Math.floor(Math.random() * monsters.length)];
  const level = playerLevel + Math.floor(Math.random() * 2) - 1;
  const actualLevel = Math.max(1, level);
  const hp = 60 + actualLevel * 15 + Math.floor(Math.random() * 20);
  const atk = 8 + actualLevel * 3 + Math.floor(Math.random() * 5);
  const def = 4 + actualLevel * 2 + Math.floor(Math.random() * 3);
  const expReward = 25 + actualLevel * 8;
  const goldReward = 15 + actualLevel * 5;
  return { name, level: actualLevel, hp, atk, def, expReward, goldReward };
}
let globalQuest = null;
const questList = [
  { jenis: 'battle', deskripsi: 'Kalahkan 5 Goblin', target: 5, expReward: 70, goldReward: 30 },
  { jenis: 'collection', deskripsi: 'Kumpulkan 8 Ramuan', target: 8, expReward: 50, goldReward: 20 },
  { jenis: 'exploration', deskripsi: 'Jelajahi 2 wilayah baru', target: 2, expReward: 80, goldReward: 40 },
  { jenis: 'harta', deskripsi: 'Temukan harta karun tersembunyi', target: 1, expReward: 100, goldReward: 70 },
  { jenis: 'battle', deskripsi: 'Tumbangkan 7 Bandit', target: 7, expReward: 90, goldReward: 50 },
  { jenis: 'collection', deskripsi: 'Kumpulkan 10 Benda Ajaib', target: 10, expReward: 120, goldReward: 60 },
  { jenis: 'exploration', deskripsi: 'Jelajahi 3 gua misterius', target: 3, expReward: 130, goldReward: 70 },
  { jenis: 'harta', deskripsi: 'Cari petunjuk rahasia di reruntuhan', target: 1, expReward: 80, goldReward: 50 },
  { jenis: 'battle', deskripsi: 'Kalahkan 6 Orc', target: 6, expReward: 100, goldReward: 50 },
  { jenis: 'collection', deskripsi: 'Kumpulkan 9 Permata', target: 9, expReward: 90, goldReward: 40 },
  { jenis: 'exploration', deskripsi: 'Jelajahi 4 daerah terlarang', target: 4, expReward: 140, goldReward: 80 },
  { jenis: 'harta', deskripsi: 'Buka peti harta yang tersembunyi', target: 1, expReward: 120, goldReward: 80 },
  { jenis: 'battle', deskripsi: 'Tumbangkan 3 Troll', target: 3, expReward: 150, goldReward: 90 },
  { jenis: 'collection', deskripsi: 'Kumpulkan 12 Artefak kuno', target: 12, expReward: 160, goldReward: 100 },
  { jenis: 'exploration', deskripsi: 'Telusuri 2 reruntuhan kuno', target: 2, expReward: 95, goldReward: 55 },
  { jenis: 'battle', deskripsi: 'Hancurkan 6 Kapak Besi', target: 6, expReward: 105, goldReward: 60 },
  { jenis: 'collection', deskripsi: 'Kumpulkan 8 Jimat mistis', target: 8, expReward: 85, goldReward: 40 },
  { jenis: 'exploration', deskripsi: 'Jelajahi 1 kastil angker', target: 1, expReward: 115, goldReward: 65 },
  { jenis: 'harta', deskripsi: 'Temukan gulungan rahasia', target: 1, expReward: 135, goldReward: 80 },
  { jenis: 'battle', deskripsi: 'Taklukkan 4 Prajurit bayaran', target: 4, expReward: 120, goldReward: 70 }
];
function generateGlobalQuest() {
  globalQuest = questList[Math.floor(Math.random() * questList.length)];
  globalQuest.timestamp = getQuestResetTime();
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
function renderBoard(board) {
  const numberEmojis = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
  return board.map((cell, i) => cell === 'user' ? '❌' : cell === 'ai' ? '⭕' : numberEmojis[i]).slice(0, 3).join(' ') + '\n' +
         board.map((cell, i) => cell === 'user' ? '❌' : cell === 'ai' ? '⭕' : numberEmojis[i]).slice(3, 6).join(' ') + '\n' +
         board.map((cell, i) => cell === 'user' ? '❌' : cell === 'ai' ? '⭕' : numberEmojis[i]).slice(6, 9).join(' ');
}
function checkWin(board, player) {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
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
async function gameLogic(endpoint, params, query, m, client) {
  const { user, room } = params || {};
  const { text, hintType } = query || {};
  const ambilSoal = async (soalFetcher, gameType, soalMessage) => {
    const roomsData = await apiGetData('rooms');
    const currentRoom = roomsData.rooms[room];
    if (currentRoom && currentRoom.currentQuestion)
      return `*Info:*\nSoal sudah diambil. Jawab atau nyerah dulu!`;
    const soalList = await soalFetcher();
    if (soalList.length === 0)
      return `*Info:*\nSoal ${gameType} lagi kosong, coba nanti ya!`;
    const selectedSoal = soalList[Math.floor(Math.random() * soalList.length)];
    if (!roomsData.rooms[room]) roomsData.rooms[room] = { currentQuestion: null };
    roomsData.rooms[room].currentQuestion = { ...selectedSoal, gameType, answered: false, attempts: 0, timestamp: Date.now() };
    await apiWriteData('rooms', roomsData);
    return soalMessage(selectedSoal);
  };
  if (endpoint === 'susunkata') {
    return await ambilSoal(fetchSoalSusunKata, 'susunkata', soal => {
      const scr = scrambleWithVowelsFirst(soal.jawaban);
      return `*Soal Susun Kata:*\nAyo, susun kata ini: *${scr}*\nTipe: *${soal.tipe}*`;
    });
  } else if (endpoint === 'siapakahaku') {
    return await ambilSoal(fetchSoalSiapakahAku, 'siapakahaku', soal => {
      return `*Soal Siapakah Aku:*\nCoba tebak, siapakah aku: *${soal.soal}*`;
    });
  } else if (endpoint === 'tebaktebakan') {
    return await ambilSoal(fetchSoalTebakTebakan, 'tebaktebakan', soal => {
      return `*Soal Tebak Tebakan:*\nAyo, tebak tebakan ini: *${soal.soal}*`;
    });
  } else if (endpoint === 'tebakgambar') {
    const roomsData = await apiGetData('rooms');
    const currentRoom = roomsData.rooms[room];
    if (currentRoom && currentRoom.currentQuestion)
      return `*Info:*\nSoal sudah diambil. Jawab atau nyerah dulu!`;
    const soalList = await fetchSoalTebakGambar();
    if (soalList.length === 0)
      return `*Info:*\nSoal tebak gambar lagi kosong, coba nanti ya!`;
    const selectedSoal = soalList[Math.floor(Math.random() * soalList.length)];
    if (!roomsData.rooms[room]) roomsData.rooms[room] = { currentQuestion: null };
    roomsData.rooms[room].currentQuestion = { ...selectedSoal, gameType: 'tebakgambar', answered: false, attempts: 0, timestamp: Date.now() };
    await apiWriteData('rooms', roomsData);
    client.sendMessage(m.chat, { image: { url: selectedSoal.img }, caption: '*Soal Tebak Gambar:*', mimetype: "image/jpeg" }, { quoted: m });
    return null;
  } else if (endpoint === 'jawab') {
    const usersData = await apiGetData('users');
    const roomsData = await apiGetData('rooms');
    const currentRoom = roomsData.rooms[room];
    if (!currentRoom || !currentRoom.currentQuestion)
      return `*Info:*\nAmbil soal dulu sebelum jawab!`;
    if (currentRoom.currentQuestion.answered)
      return `*Info:*\nSoal sudah dijawab atau timeout. Ambil soal baru!`;
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
      currentRoom.currentQuestion = null;
      await apiWriteData('rooms', roomsData);
      return `*Jawaban Benar!*\nPoint +3.`;
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
        currentRoom.currentQuestion = null;
        await apiWriteData('rooms', roomsData);
        return `*Jawaban Salah 3 Kali!*\nSoal dihapus. Point -3.\nJawaban yang benar adalah: *${jawaban}*`;
      } else {
        return `*Jawaban Salah!*\nKesempatan tersisa: *${3 - attempts}* kali.`;
      }
    }
  } else if (endpoint === 'hint') {
    const usersData = await apiGetData('users');
    const roomsData = await apiGetData('rooms');
    const currentRoom = roomsData.rooms[room];
    if (currentRoom && currentRoom.ttt && currentRoom.ttt[user])
      return `*Info:*\nTidak ada hint dalam permainan ini.`;
    if (!currentRoom || !currentRoom.currentQuestion)
      return `*Info:*\nAmbil soal dulu sebelum minta hint!`;
    if (currentRoom.currentQuestion.answered)
      return `*Info:*\nSoal sudah dijawab atau timeout, tidak bisa minta hint lagi.`;
    const jawaban = currentRoom.currentQuestion.jawaban;
    let hintPercentage = 0, pointCost = 0;
    if (hintType === 'murah') { hintPercentage = 0.3; pointCost = 0; }
    else if (hintType === 'mahal') { hintPercentage = 0.5; pointCost = 1; }
    else if (hintType === 'sultan') { hintPercentage = 0.8; pointCost = 2; }
    else return `*Error:*\nTipe hint tidak valid. Pilih: murah, mahal, sultan.`;
    initializeUser(usersData.users, user);
    if (pointCost > 0) {
      if (usersData.users[user].points < pointCost)
        return `*Error:*\nPoin tidak cukup untuk hint ${hintType}. Butuh *${pointCost}* poin. Poin kamu: *${usersData.users[user].points}*`;
      usersData.users[user].points -= pointCost;
      usersData.users[user].harian.value = Math.max(usersData.users[user].harian.value - pointCost, 0);
      usersData.users[user].mingguan.value = Math.max(usersData.users[user].mingguan.value - pointCost, 0);
      usersData.users[user].bulanan.value = Math.max(usersData.users[user].bulanan.value - pointCost, 0);
      await apiWriteData('users', usersData);
    }
    const hintText = generateHint(jawaban, hintPercentage);
    return `*Hint ${hintType}* (${pointCost > 0 ? `-${pointCost} poin` : 'gratis'}):\nJawaban: *${hintText}*`;
  } else if (endpoint === 'point') {
    const usersData = await apiGetData('users');
    initializeUser(usersData.users, user);
    const { points, harian, mingguan, bulanan } = usersData.users[user];
    return `*Poin:*\nPoin Semua: *${points}*\nPoin Harian: *${harian.value}*\nPoin Mingguan: *${mingguan.value}*\nPoin Bulanan: *${bulanan.value}*`;
  } else if (endpoint === 'top') {
    const type = (text || '').toLowerCase();
    if (!['hari', 'minggu', 'bulan', 'semua'].includes(type)) {
      m.reply(`*Error:*\nKetik: top hari, top minggu, top bulan, atau top semua`);
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
    let topUsersFormatted = `*Top 10 Poin ${type}:*\n\n\`\`\`\nNo.  Username        Points\n-------------------------\n`;
    let mentions = [], positionMessage = '';
    const mapping = { hari: 'harian', minggu: 'mingguan', bulan: 'bulanan' };
    sortedUsers.forEach(([userName, data], i) => {
      let displayName = (data.name && /^[A-Za-z0-9_-]{1,60}$/.test(data.name)) ? data.name : userName;
      let pointsVal = type === 'semua' ? (data.points || 0) : (data[mapping[type]] ? data[mapping[type]].value : 0);
      topUsersFormatted += `${(i + 1).toString().padEnd(3)}  @${displayName} ${String(pointsVal).padEnd(6)}\n`;
      if (!data.name) mentions.push(`${userName}@s.whatsapp.net`);
      if (userName === user) {
        if (i === 0) positionMessage = "Wah, kamu juara nomor satu!";
        else if (i <= 2) positionMessage = `Mantap, kamu ada di peringkat ${i + 1} besar!`;
        else if (i >= sortedUsers.length - 2) positionMessage = `Lumayan, peringkat ${i + 1}.`;
        else positionMessage = `Peringkat kamu: ${i + 1}.`;
      }
    });
    topUsersFormatted += '```';
    const finalCaption = `${topUsersFormatted}\n${positionMessage}\n_Ubah Username dengan setname_\n\n*Note:* Refresh setiap 24 jam`;
    const imgResponse = await axios.get('https://express-vercel-ytdl.vercel.app/top', { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imgResponse.data);
    client.sendMessage(m.chat, { image: imageBuffer, caption: finalCaption, mentions, mimetype: "image/jpeg" }, { quoted: m });
    return;
  } else if (endpoint === 'nyerah') {
    const roomsData = await apiGetData('rooms');
    const usersData = await apiGetData('users');
    const currentRoom = roomsData.rooms[room];
    if (!currentRoom)
      return `*Info:*\nTidak ada permainan yang berjalan!`;
    if (currentRoom.ttt && currentRoom.ttt[user]) {
      delete currentRoom.ttt[user];
      await apiWriteData('rooms', roomsData);
      initializeUser(usersData.users, user);
      usersData.users[user].points = Math.max(usersData.users[user].points - 1, 0);
      usersData.users[user].harian.value = Math.max(usersData.users[user].harian.value - 1, 0);
      usersData.users[user].mingguan.value = Math.max(usersData.users[user].mingguan.value - 1, 0);
      usersData.users[user].bulanan.value = Math.max(usersData.users[user].bulanan.value - 1, 0);
      await apiWriteData('users', usersData);
      return `*Nyerah:*\nYah, nyerah ya? Point -1.`;
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
      return `*Nyerah:*\nYah, nyerah ya? Jawaban yang benar: *${jawabanBenar}*.\nPoint -3.`;
    } else return `*Info:*\nTidak ada soal untuk diserahin!`;
  } else if (endpoint === 'tictactoe') {
    const roomsData = await apiGetData('rooms');
    if (!roomsData.rooms[room]) roomsData.rooms[room] = {};
    const currentRoom = roomsData.rooms[room];
    if (!currentRoom.ttt) currentRoom.ttt = {};
    let game = currentRoom.ttt[user];
    if (!game) {
      if (!query || !query.text || !['sulit','mudah','normal'].includes(query.text.toLowerCase()))
        return `*Tic Tac Toe:*\nPilih level: sulit, mudah, atau normal.\nHadiah:\n- Sulit: 99999 poin\n- Mudah: 5 poin\n- Normal: 10 poin`;
      let level = query.text.toLowerCase(), board = Array(9).fill(null),
          turn = (level === 'sulit' ? (Math.random() < 0.5 ? 'user' : 'ai') : 'user');
      game = { gameType: 'tictactoe', board, level, turn, answered: false, attempts: 0, timestamp: Date.now(), user };
      currentRoom.ttt[user] = game;
      await apiWriteData('rooms', roomsData);
      let msg = `*Tic Tac Toe (${level}):*\n${renderBoard(board)}\n`;
      if (turn === 'user') msg += `Giliranmu, kirim nomor kotak (1-9).`;
      else {
        let aiMoveIdx;
        if (board.every(cell => cell === null)) {
          const groups = { corner: [0,2,6,8], center: [4], edge: [1,3,5,7] };
          const groupKeys = Object.keys(groups),
                randomGroupKey = groupKeys[Math.floor(Math.random() * groupKeys.length)];
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
        msg = `*Tic Tac Toe (${level}):*\n*AI memilih angka ${aiMoveIdx + 1}*\n${renderBoard(game.board)}\nGiliranmu.`;
      }
      return msg;
    } else {
      if (game.turn !== 'user') { game.turn = 'user'; await apiWriteData('rooms', roomsData); }
      const move = parseInt(query.text), idx = move - 1;
      if (isNaN(move) || move < 1 || move > 9)
        return `*Error:*\nMasukkan nomor kotak yang valid (1-9).`;
      if (game.board[idx] !== null)
        return `*Info:*\nKotak sudah terisi, pilih yang lain.`;
      game.board[idx] = 'user';
      const userWin = checkWin(game.board, 'user'),
            aiWin = checkWin(game.board, 'ai');
      if (userWin || aiWin || game.board.every(cell => cell !== null)) {
        let resMsg = `*Tictactoe Selesai:*\n${renderBoard(game.board)}\n`;
        if (userWin && !aiWin) {
          const usersData = await apiGetData('users');
          initializeUser(usersData.users, user);
          let emoji = (game.level === 'mudah' || game.level === 'normal') ? '🙄' : '';
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
          resMsg += `Kamu menang! ${emoji}`;
        } else if (aiWin && !userWin) {
          const usersData = await apiGetData('users');
          initializeUser(usersData.users, user);
          usersData.users[user].points = Math.max(usersData.users[user].points - 1, 0);
          usersData.users[user].harian.value = Math.max(usersData.users[user].harian.value - 1, 0);
          usersData.users[user].mingguan.value = Math.max(usersData.users[user].mingguan.value - 1, 0);
          usersData.users[user].bulanan.value = Math.max(usersData.users[user].bulanan.value - 1, 0);
          await apiWriteData('users', usersData);
          resMsg += `Kamu kalah!`;
        } else resMsg += `Seri!`;
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
        let resMsg = `${aiExp}\n${renderBoard(game.board)}\n`;
        if (checkWin(game.board, 'user') && !checkWin(game.board, 'ai')) {
          const usersData = await apiGetData('users');
          initializeUser(usersData.users, user);
          let emoji = (game.level === 'mudah' || game.level === 'normal') ? '🙄' : '';
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
          resMsg += `Kamu menang! ${emoji}`;
        } else if (checkWin(game.board, 'ai') && !checkWin(game.board, 'user')) {
          const usersData = await apiGetData('users');
          initializeUser(usersData.users, user);
          usersData.users[user].points = Math.max(usersData.users[user].points - 1, 0);
          usersData.users[user].harian.value = Math.max(usersData.users[user].harian.value - 1, 0);
          usersData.users[user].mingguan.value = Math.max(usersData.users[user].mingguan.value - 1, 0);
          usersData.users[user].bulanan.value = Math.max(usersData.users[user].bulanan.value - 1, 0);
          await apiWriteData('users', usersData);
          resMsg += `Kamu kalah!`;
        } else resMsg += `Seri!`;
        delete currentRoom.ttt[user];
        await apiWriteData('rooms', roomsData);
        return resMsg;
      }
      game.turn = 'user';
      await apiWriteData('rooms', roomsData);
      return `${aiExp}\n${renderBoard(game.board)}\nGiliranmu.`;
    }
  } else if (endpoint === 'setname') {
    const usersData = await apiGetData('users');
    let newName = text;
    if (!newName) return `*Error:*\nKetik setname nama-kamu atau setname dafault`;
    const validNameRegex = /^[A-Za-z0-9_-]{1,60}$/;
    if (newName.toLowerCase() === 'dafault') {
      if (usersData.users[user]) delete usersData.users[user].name;
      await apiWriteData('users', usersData);
      return `*Info:*\nNama di-reset ke default.`;
    } else {
      if (!validNameRegex.test(newName)) {
        if (usersData.users[user] && usersData.users[user].name) delete usersData.users[user].name;
        await apiWriteData('users', usersData);
        return `*Error:*\nNama tidak valid, di-reset ke default.`;
      } else {
        initializeUser(usersData.users, user);
        usersData.users[user].name = newName;
        await apiWriteData('users', usersData);
        return `*Info:*\nNama disetel ke *${newName}*.`;
      }
    }
  } else if (endpoint === 'rpg') {
    const usersData = await apiGetData('users');
    initializeUser(usersData.users, user);
    initializeRPG(usersData.users, user);
    const roomsData = await apiGetData('rooms');
    if (!roomsData.rooms[room]) roomsData.rooms[room] = {};
    if (!roomsData.rooms[room].rpgAdventure) roomsData.rooms[room].rpgAdventure = {};
    let player = usersData.users[user].rpg;
    let now = Date.now();
    if (now - player.lastRecovery >= 30 * 60000) {
        player.hp = Math.min(player.maxHp, player.hp + Math.ceil(player.maxHp * 0.2));
        player.lastRecovery = now;
    }
    const inputText = text ? text.trim() : '';
    const [subCmd, ...args] = inputText.split(' ');
    const cmd = subCmd.toLowerCase();
    switch(cmd) {
      case 'mulai': {
        if (roomsData.rooms[room].rpgAdventure[user])
          return `*RPG - Petualangan:*\nKamu sedang berpetualang!`;
        const adventureState = {
            round: 0,
            rewards: { exp: 0, gold: 0, artifacts: 0 },
            inventoryChanges: [],
            lastEvent: null,
            isRunning: true,
            startTime: now
        };
        roomsData.rooms[room].rpgAdventure[user] = adventureState;
        await apiWriteData('rooms', roomsData);
        return `*RPG - Petualangan Dimulai!*\nKetik *lanjut* untuk berpetualang, atau *berhenti* untuk mengakhiri petualangan.`;
      }
      case 'lanjut': {
        const adventure = roomsData.rooms[room].rpgAdventure[user];
        if (!adventure) return `*RPG - Error:*\nPetualangan belum dimulai. Ketik *mulai*.`;
        if (!adventure.isRunning) return `*RPG - Error:*\nPetualangan sudah berakhir. Mulai petualangan baru dengan ketik *mulai*.`;

        adventure.round += 1;
        let eventType = Math.random();
        let eventMsg = `*RPG - Ronde ${adventure.round} Petualangan:*\n`;

        if (eventType < 0.6) { // 60% Monster Encounter
          const monster = generateMonster(player.level);
          adventure.lastEvent = 'monster';
          adventure.currentMonster = monster;
          eventMsg += `Kamu bertemu *${monster.name}* (Lvl ${monster.level})! HP Monster: ${monster.hp}\n`;
          eventMsg += `Ketik *serang* untuk melawan atau *kabur* untuk mencoba melarikan diri.`;
        } else if (eventType < 0.8) { // 20% Treasure/Artifact Find
          adventure.lastEvent = 'treasure';
          if (Math.random() < 0.5) {
            let goldFind = 50 + Math.floor(Math.random() * 100);
            adventure.rewards.gold += goldFind;
            eventMsg += `Kamu menemukan peti berisi *${goldFind} emas*! Berkah!\n`;
          } else {
            adventure.rewards.artifacts += 1;
            eventMsg += `Kamu menemukan *Artefak Kuno*! Sangat beruntung!\n`;
          }
          eventMsg += `Ketik *lanjut* untuk meneruskan petualangan.`;
        } else if (eventType < 0.9) { // 10% Trap Event
          adventure.lastEvent = 'trap';
          let hpLossPercentage = 0.1 + Math.random() * 0.2;
          let hpLoss = Math.floor(player.hp * hpLossPercentage);
          player.hp -= hpLoss;
          eventMsg += `Kamu terjebak! Kehilangan *${hpLoss} HP*.\n`;
          if (player.hp <= 0) {
              player.hp = 0;
              eventMsg += `HP habis! Petualangan berakhir.\n`;
              adventure.isRunning = false;
              adventure.endTime = now;
          } else {
              eventMsg += `HP Kamu: *${player.hp}*\n`;
          }
          eventMsg += `Ketik *lanjut* untuk meneruskan petualangan.`;
        }
        else { // 10% Nothing Happens
          adventure.lastEvent = 'nothing';
          eventMsg += `Kamu berjalan tanpa kejadian berarti.\nKetenangan...\n`;
          eventMsg += `Ketik *lanjut* untuk meneruskan petualangan.`;
        }

        await apiWriteData('rooms', roomsData);
        await apiWriteData('users', usersData);
        return eventMsg;
      }
      case 'serang': {
        const adventure = roomsData.rooms[room].rpgAdventure[user];
        if (!adventure) return `*RPG - Error:*\nPetualangan belum dimulai. Ketik *mulai*.`;
        if (!adventure.isRunning) return `*RPG - Error:*\nPetualangan sudah berakhir. Mulai petualangan baru dengan ketik *mulai*.`;
        if (adventure.lastEvent !== 'monster' || !adventure.currentMonster) return `*RPG - Error:*\nTidak ada monster untuk diserang. Ketik *lanjut* untuk berpetualang.`;

        let battleLog = `*RPG - Pertempuran Ronde ${adventure.round}:*\n`;
        let monster = adventure.currentMonster;
        let totalDamageToMonster = 0;
        let totalDamageToPlayer = 0;
        let weaponBonus = player.equippedWeapon ? player.equippedWeapon.bonus : 0;

        for (let attackRound = 0; attackRound < 3; attackRound++) { // Simulate 3 attack rounds
            if (monster.hp <= 0 || player.hp <= 0) break;

            // Player Attack
            let baseDamageToMonster = Math.max(player.atk + weaponBonus - monster.def, 1);
            let randomFactorUser = Math.random() * 0.1 + 0.9;
            let damageToMonster = Math.floor(baseDamageToMonster * randomFactorUser);
            monster.hp -= damageToMonster;
            totalDamageToMonster += damageToMonster;
            battleLog += `Kamu menyerang ${monster.name} dan memberikan ${damageToMonster} damage. HP Monster: ${monster.hp > 0 ? monster.hp : 0}\n`;

            if (monster.hp <= 0) {
                battleLog += `\n*${monster.name} dikalahkan!*\n`;
                let expGain = monster.expReward;
                let goldGain = monster.goldReward;
                let artifactDrop = Math.random() < 0.1 ? 1 : 0;
                let weaponDropChance = 0.1 + (player.level * 0.01);

                adventure.rewards.exp += expGain;
                adventure.rewards.gold += goldGain;
                adventure.rewards.artifacts += artifactDrop;

                if (globalQuest && globalQuest.jenis === 'battle') { player.globalQuestProgress += 1; }

                if (player.equippedWeapon) {
                    player.equippedWeapon.xp = (player.equippedWeapon.xp || 0) + 10;
                    if (player.equippedWeapon.xp >= 100) { player.equippedWeapon.level += 1; player.equippedWeapon.xp -= 100; player.equippedWeapon.bonus += 1; battleLog += `Senjata ${player.equippedWeapon.name} naik level ke ${player.equippedWeapon.level}!\n`; }
                }

                if (Math.random() < weaponDropChance) {
                    const weaponStore = [
                        { id: 1, name: "Pedang Kayu", costPoints: 10, costGold: 150, bonus: 2 },
                        { id: 2, name: "Tombak", costPoints: 15, costGold: 200, bonus: 3 },
                        { id: 3, name: "Kapak", costPoints: 20, costGold: 250, bonus: 4 },
                        { id: 4, name: "Belati", costPoints: 12, costGold: 170, bonus: 2 },
                        { id: 5, name: "Busur", costPoints: 18, costGold: 230, bonus: 3 },
                        { id: 6, name: "Pedang Besi", costPoints: 25, costGold: 300, bonus: 5 },
                        { id: 7, name: "Golok", costPoints: 15, costGold: 200, bonus: 3 },
                        { id: 8, name: "Parang", costPoints: 20, costGold: 250, bonus: 4 },
                        { id: 9, name: "Pedang Perak", costPoints: 30, costGold: 350, bonus: 6 },
                        { id: 10, name: "Pedang Emas", costPoints: 50, costGold: 550, bonus: 10 }
                    ];
                    let droppedWeapon = weaponStore[Math.floor(Math.random() * weaponStore.length)];
                    let newWeapon = { id: droppedWeapon.id, name: droppedWeapon.name, level: 1, xp: 0, bonus: droppedWeapon.bonus, baseCost: droppedWeapon.costPoints };
                    player.inventory.push(newWeapon);
                    adventure.inventoryChanges.push({ type: 'add', item: newWeapon });
                    battleLog += `Kamu menemukan senjata: ${newWeapon.name}!\n`;
                }
                if (artifactDrop > 0) battleLog += `Kamu menemukan ${artifactDrop} artefak!\n`;
                battleLog += `Mendapatkan ${expGain} EXP dan ${goldGain} emas.\n`;

                adventure.lastEvent = 'none';
                delete adventure.currentMonster;
                break; // Monster defeated, end battle rounds
            }

            // Monster Attack
            let baseDamageToPlayer = Math.max(monster.atk - player.def, 1);
            let randomFactorMonster = Math.random() * 0.1 + 0.9;
            let damageToPlayer = Math.floor(baseDamageToPlayer * randomFactorMonster);
            player.hp -= damageToPlayer;
            totalDamageToPlayer += damageToPlayer;
            battleLog += `${monster.name} menyerangmu dan memberikan ${damageToPlayer} damage. HP Kamu: ${player.hp > 0 ? player.hp : 0}\n`;

            if (player.hp <= 0) {
                player.hp = 0;
                battleLog += `\n*Kamu kalah dalam pertempuran!*\nPetualangan berakhir.\n`;
                adventure.isRunning = false;
                adventure.endTime = now;
                break; // Player defeated, end battle rounds
            }
        }

        battleLog += `\n*--- Rangkuman Pertempuran ---*\n`;
        battleLog += `Total damage diberikan ke ${monster.name}: ${totalDamageToMonster}\n`;
        battleLog += `Total damage diterima dari ${monster.name}: ${totalDamageToPlayer}\n`;
        battleLog += `HP Kamu sekarang: ${player.hp}\n`;
        if (monster.hp > 0 && player.hp > 0) battleLog += `Pertempuran berlanjut. Ketik *serang* lagi atau *kabur*.\n`;
        else if (player.hp > 0) battleLog += `Ketik *lanjut* untuk meneruskan petualangan.\n`;

        const expNeeded = player.level * 100;
        if (player.exp >= expNeeded) { player.level += 1; player.exp -= expNeeded; player.maxHp += 20; player.atk += 5; player.def += 2; player.hp = player.maxHp; battleLog += `\nSelamat, kamu naik ke level *${player.level}*! (HP: *${player.maxHp}*, ATK: *${player.atk}*, DEF: *${player.def}*)\n`; }


        await apiWriteData('rooms', roomsData);
        await apiWriteData('users', usersData);
        return battleLog;

      }
      case 'kabur': {
        const adventure = roomsData.rooms[room].rpgAdventure[user];
        if (!adventure) return `*RPG - Error:*\nPetualangan belum dimulai. Ketik *mulai*.`;
        if (!adventure.isRunning) return `*RPG - Error:*\nPetualangan sudah berakhir. Mulai petualangan baru dengan ketik *mulai*.`;
        if (adventure.lastEvent !== 'monster') return `*RPG - Error:*\nTidak ada monster untuk kabur. Ketik *lanjut* untuk berpetualang.`;

        if (Math.random() < 0.7) {
            delete adventure.currentMonster;
            adventure.lastEvent = 'none';
            await apiWriteData('rooms', roomsData);
            return `*RPG - Kabur:*\nBerhasil melarikan diri dari pertempuran! Ketik *lanjut* untuk meneruskan petualangan.`;
        } else {
            let freeAttack = Math.max(adventure.currentMonster.atk - player.def, 1);
            player.hp -= freeAttack;
            let escapeMsg = `*RPG - Kabur Gagal:*\nSaat mencoba kabur, ${adventure.currentMonster.name} menyerang dan memberikan ${freeAttack} damage.\n`;
            if (player.hp <= 0) {
                player.hp = 0;
                escapeMsg += `HP habis! Petualangan berakhir.\n`;
                adventure.isRunning = false;
                adventure.endTime = now;
            } else {
                escapeMsg += `HP Kamu sekarang: ${player.hp}. Ketik *serang* atau *kabur* lagi.\n`;
            }
            await apiWriteData('rooms', roomsData);
            await apiWriteData('users', usersData);
            return escapeMsg;
        }
      }
      case 'berhenti': {
        const adventure = roomsData.rooms[room].rpgAdventure[user];
        if (!adventure || !adventure.isRunning) return `*RPG - Error:*\nTidak ada petualangan yang sedang berjalan.`;
        adventure.isRunning = false;
        adventure.endTime = now;

        player.exp += adventure.rewards.exp;
        player.gold += adventure.rewards.gold;
        player.artifacts += adventure.rewards.artifacts;

        const expNeeded = player.level * 100;
        if (player.exp >= expNeeded) { player.level += 1; player.exp -= expNeeded; player.maxHp += 20; player.atk += 5; player.def += 2; player.hp = player.maxHp; }

        delete roomsData.rooms[room].rpgAdventure[user];
        await apiWriteData('rooms', roomsData);
        await apiWriteData('users', usersData);

        let summaryMsg = `*RPG - Petualangan Berakhir!*\n--- Ringkasan Petualangan ---\n`;
        summaryMsg += `Ronde yang dilewati: ${adventure.round}\n`;
        summaryMsg += `EXP diperoleh: ${adventure.rewards.exp}\n`;
        summaryMsg += `Emas diperoleh: ${adventure.rewards.gold}\n`;
        summaryMsg += `Artefak ditemukan: ${adventure.rewards.artifacts}\n`;
        if (player.level > usersData.users[user].rpg.level ) summaryMsg += `Naik level menjadi: ${player.level}!\n`;

        if (globalQuest && player.globalQuestProgress >= globalQuest.target && !player.globalQuestCompleted) {
          player.exp += globalQuest.expReward;
          player.gold += globalQuest.goldReward;
          player.globalQuestCompleted = true;
          summaryMsg += `\nSelamat, misi global selesai! Kamu dapat *${globalQuest.expReward}* EXP dan *${globalQuest.goldReward}* emas.\n`;
        }
        await apiWriteData('users', usersData);

        return summaryMsg;
      }
      case 'status': {
        let statusMsg = `*RPG - Status Petualangan:*\nLevel: *${player.level}*\nEXP: *${player.exp}/${player.level * 100}*\nHP: *${player.hp}/${player.maxHp}*\nATK: *${player.atk}*\nDEF: *${player.def}*\nEmas: *${player.gold}*\nArtefak: *${player.artifacts || 0}*\nInventory: *${player.inventory.length > 0 ? player.inventory.map((w, i) => `${i+1}. ${w.name} (Lvl:${w.level})`).join(', ') : 'Kosong'}*\nSenjata Dipakai: *${player.equippedWeapon ? player.equippedWeapon.name : 'Tidak ada'}*`;
        const adventure = roomsData.rooms[room].rpgAdventure[user];
        if (adventure && adventure.isRunning && adventure.lastEvent === 'monster' && adventure.currentMonster) {
             statusMsg += `\n\nSedang bertarung melawan *${adventure.currentMonster.name}* (HP: *${adventure.currentMonster.hp}*).`;
             statusMsg += `\nKetik *serang* atau *kabur*.`;
        } else if (adventure && adventure.isRunning) {
            statusMsg += `\n\nSedang berpetualang. Ronde ke ${adventure.round}.`;
            statusMsg += `\nKetik *lanjut* atau *berhenti*.`;
        } else {
            statusMsg += `\n\nTidak sedang berpetualang. Ketik *mulai* untuk memulai petualangan.`;
        }
        return statusMsg;
      }
      case 'quest': {
        const resetTime = getQuestResetTime();
        if (!globalQuest || globalQuest.timestamp < getQuestResetTime()) { generateGlobalQuest(); }
        let timeLeft = Math.ceil((resetTime - now) / 3600000);
        if (isNaN(timeLeft)) timeLeft = 24;
        let questMsg = `*RPG - Misi Global Hari Ini:*\n${globalQuest.deskripsi}\nTarget: *${globalQuest.target}*\n`;
        if (player.globalQuestProgress === undefined) { player.globalQuestProgress = 0; player.globalQuestCompleted = false; }
        questMsg += `Progress: *${player.globalQuestProgress}/${globalQuest.target}*\nWaktu tersisa: *${timeLeft}* jam.\n`;
        if (player.globalQuestProgress >= globalQuest.target && !player.globalQuestCompleted) {
          player.exp += globalQuest.expReward;
          player.gold += globalQuest.goldReward;
          player.globalQuestCompleted = true;
          questMsg += `\nSelamat, misi global selesai! Kamu dapat *${globalQuest.expReward}* EXP dan *${globalQuest.goldReward}* emas.\n`;
        }
        await apiWriteData('users', usersData);
        return questMsg;
      }
      case 'heal': {
        if (player.hp >= player.maxHp) return `HP kamu sudah penuh.`;
        let method = args[0] ? args[0].toLowerCase() : 'emas';
        let missing = player.maxHp - player.hp;
        let costPoints = Math.ceil((missing / player.maxHp) * 20); // Increased point cost for heal
        if (method === 'point') {
          if (usersData.users[user].points < costPoints) return `Poin tidak cukup. Butuh ${costPoints} poin.`;
          usersData.users[user].points -= costPoints;
          player.hp = player.maxHp;
          await apiWriteData('users', usersData);
          return `Heal berhasil dengan mengurangi ${costPoints} poin. HP kamu sekarang penuh.`;
        } else if (method === 'emas') {
          let costGold = Math.ceil(costPoints); // Increased gold cost for heal
          if (player.gold < costGold) return `Emas tidak cukup. Butuh ${costGold} emas.`;
          player.gold -= costGold;
          player.hp = player.maxHp;
          await apiWriteData('users', usersData);
          return `Heal berhasil dengan mengurangi ${costGold} emas. HP kamu sekarang penuh.`;
        } else {
          return `Metode pembayaran tidak valid. Pilih 'point' atau 'emas'.`;
        }
      }
      case 'toko': {
        if (!args[0] || args[0].toLowerCase() !== 'senjata') return `Perintah toko tidak valid. Gunakan: toko senjata`;
        const weaponStore = [
          { id: 1, name: "Pedang Kayu", costPoints: 20, costGold: 300, bonus: 2 },
          { id: 2, name: "Tombak", costPoints: 30, costGold: 400, bonus: 3 },
          { id: 3, name: "Kapak", costPoints: 40, costGold: 500, bonus: 4 },
          { id: 4, name: "Belati", costPoints: 25, costGold: 350, bonus: 2 },
          { id: 5, name: "Busur", costPoints: 35, costGold: 450, bonus: 3 },
          { id: 6, name: "Pedang Besi", costPoints: 50, costGold: 600, bonus: 5 },
          { id: 7, name: "Golok", costPoints: 30, costGold: 400, bonus: 3 },
          { id: 8, name: "Parang", costPoints: 40, costGold: 500, bonus: 4 },
          { id: 9, name: "Pedang Perak", costPoints: 60, costGold: 700, bonus: 6 },
          { id: 10, name: "Pedang Emas", costPoints: 100, costGold: 1100, bonus: 10 }
        ];
        if (args.length === 1) {
          let listMsg = `*Toko Senjata:*\n`;
          weaponStore.forEach(ws => {
            listMsg += `${ws.id}. ${ws.name} - ${ws.costPoints} poin / ${ws.costGold} emas\n`;
          });
          listMsg += `\nUntuk membeli, ketik: toko senjata [nomor] [point/emas]`;
          return listMsg;
        } else if (args.length >= 3) {
          let weaponId = parseInt(args[1]);
          let payMethod = args[2].toLowerCase();
          let selected = weaponStore.find(w => w.id === weaponId);
          if (!selected) return `Senjata tidak ditemukan.`;
          if (payMethod === 'point') {
            if (usersData.users[user].points < selected.costPoints) return `Poin tidak cukup. Butuh ${selected.costPoints} poin.`;
            usersData.users[user].points -= selected.costPoints;
          } else if (payMethod === 'emas') {
            if (player.gold < selected.costGold) return `Emas tidak cukup. Butuh ${selected.costGold} emas.`;
            player.gold -= selected.costGold;
          } else {
            return `Metode pembayaran tidak valid. Gunakan 'point' atau 'emas'.`;
          }
          let newWeapon = { id: selected.id, name: selected.name, level: 1, xp: 0, bonus: selected.bonus, baseCost: selected.costPoints };
          player.inventory.push(newWeapon);
          adventure.inventoryChanges.push({ type: 'add', item: newWeapon });
          await apiWriteData('users', usersData);
          return `Pembelian berhasil: ${newWeapon.name} telah ditambahkan ke inventory.`;
        } else {
          return `Perintah toko tidak lengkap. Gunakan: toko senjata [nomor] [point/emas]`;
        }
      }
      case 'inv': {
        let invMsg = `*Inventory Senjata:*\n`;
        if (player.inventory.length === 0) invMsg += `Kosong.`;
        else {
          player.inventory.forEach((w, i) => {
            invMsg += `${i+1}. ${w.name} (Lvl: ${w.level}, XP: ${w.xp}, Bonus: ${w.bonus})\n`;
          });
        }
        invMsg += `\nArtefak: ${player.artifacts || 0}`;
        return invMsg;
      }
      case 'pakai': {
        if (player.inventory.length === 0) return `Inventory kosong.`;
        let index = parseInt(args[0]) - 1;
        if (isNaN(index) || index < 0 || index >= player.inventory.length) return `Indeks senjata tidak valid.`;
        player.equippedWeapon = player.inventory[index];
        await apiWriteData('users', usersData);
        return `Senjata ${player.equippedWeapon.name} telah dipakai.`;
      }
      case 'jual': {
        if (player.inventory.length === 0) return `Inventory kosong.`;
        let index = parseInt(args[0]) - 1;
        if (isNaN(index) || index < 0 || index >= player.inventory.length) return `Indeks senjata tidak valid.`;
        let weaponToSell = player.inventory.splice(index, 1)[0];
        let sellGold = Math.floor((weaponToSell.baseCost || 20) / 2); // Base cost increased to 20
        player.gold += sellGold;
        if (player.equippedWeapon && player.equippedWeapon.id === weaponToSell.id) {
          delete player.equippedWeapon;
        }
        await apiWriteData('users', usersData);
        return `Senjata ${weaponToSell.name} dijual dan mendapatkan ${sellGold} emas.`;
      }
      case 'tempa': {
        if (player.inventory.length === 0) return `Inventory kosong.`;
        if (!player.artifacts || player.artifacts < 1) return `Tidak ada artefak untuk menempa senjata.`;
        let index = parseInt(args[0]) - 1;
        if (isNaN(index) || index < 0 || index >= player.inventory.length) return `Indeks senjata tidak valid.`;
        let weaponToForge = player.inventory[index];
        player.artifacts -= 1;
        weaponToForge.xp = (weaponToForge.xp || 0) + 20;
        let msg = `Artefak digunakan untuk menempa ${weaponToForge.name}. XP bertambah 20.`;
        if (weaponToForge.xp >= 100) {
          weaponToForge.level += 1;
          weaponToForge.xp -= 100;
          weaponToForge.bonus += 1;
          msg += ` Senjata naik level ke ${weaponToForge.level}!`;
        }
        await apiWriteData('users', usersData);
        return msg;
      }
      default:
        return `*RPG - Perintah:* Gunakan *mulai*, *lanjut*, *serang*, *kabur*, *berhenti*, *status*, *quest*, *heal [point/emas]*, *toko senjata [nomor] [point/emas]*, *inv*, *pakai [nomor]*, *jual [nomor]*, atau *tempa [nomor]*.`;
    }
  } else return `*Error:*\nEndpoint tidak dikenal.`;
}
module.exports = { gameLogic };