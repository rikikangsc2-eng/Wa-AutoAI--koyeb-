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
    } else {
      hint += '×';
    }
  }
  return hint;
}

async function gameLogic(endpoint, params, query, m, client) {
  const { user, room } = params || {};
  const { text, hintType } = query || {};
  const ambilSoal = async (soalFetcher, gameType, soalMessage) => {
    const roomsData = await apiGetData('rooms');
    const currentRoom = roomsData.rooms[room];
    if (currentRoom && currentRoom.currentQuestion) {
      return 'Soal sudah diambil. Jawab atau nyerah dulu!';
    }
    const soalList = await soalFetcher();
    if (soalList.length === 0) {
      return `Soal ${gameType} lagi kosong, coba nanti ya!`;
    }
    const randomIndex = Math.floor(Math.random() * soalList.length);
    const selectedSoal = soalList[randomIndex];
    if (!roomsData.rooms[room]) {
      roomsData.rooms[room] = { currentQuestion: null };
    }
    roomsData.rooms[room].currentQuestion = { ...selectedSoal, gameType: gameType, answered: false, attempts: 0, timestamp: Date.now() };
    await apiWriteData('rooms', roomsData);
    return soalMessage(selectedSoal);
  };

  if (endpoint === 'susunkata') {
    return await ambilSoal(fetchSoalSusunKata, 'susunkata', (soal) => `Soal susun kata berikut: ${soal.soal} - Tipe: ${soal.tipe}`);
  } else if (endpoint === 'siapakahaku') {
    return await ambilSoal(fetchSoalSiapakahAku, 'siapakahaku', (soal) => `Soal siapakah aku berikut: ${soal.soal}`);
  } else if (endpoint === 'tebaktebakan') {
    return await ambilSoal(fetchSoalTebakTebakan, 'tebaktebakan', (soal) => `Soal tebak tebakan berikut: ${soal.soal}`);
  } else if (endpoint === 'tebakgambar') {
    const roomsData = await apiGetData('rooms');
    const currentRoom = roomsData.rooms[room];
    if (currentRoom && currentRoom.currentQuestion) {
      return 'Soal sudah diambil. Jawab atau nyerah dulu!';
    }
    const soalList = await fetchSoalTebakGambar();
    if (soalList.length === 0) {
      return 'Soal tebak gambar lagi kosong, coba nanti ya!';
    }
    const randomIndex = Math.floor(Math.random() * soalList.length);
    const selectedSoal = soalList[randomIndex];
    if (!roomsData.rooms[room]) {
      roomsData.rooms[room] = { currentQuestion: null };
    }
    roomsData.rooms[room].currentQuestion = { ...selectedSoal, gameType: 'tebakgambar', answered: false, attempts: 0, timestamp: Date.now() };
    await apiWriteData('rooms', roomsData);
    client.sendMessage(m.chat, { image: { url: selectedSoal.img }, caption: 'AliciaGames', mimetype: "image/jpeg" }, { quoted: m });
    return null;
  } else if (endpoint === 'jawab') {
    const usersData = await apiGetData('users');
    const roomsData = await apiGetData('rooms');
    let currentRoom = roomsData.rooms[room];
    if (!currentRoom || !currentRoom.currentQuestion) {
      return 'Ambil soal dulu sebelum jawab!';
    }
    if (currentRoom.currentQuestion.answered) {
      return 'Soal sudah dijawab atau timeout. Ambil soal baru!';
    }
    const jawabanBenar = currentRoom.currentQuestion.jawaban.toLowerCase();
    const jawabanUser = text ? text.toLowerCase() : '';
    let attempts = currentRoom.currentQuestion.attempts || 0;
    if (jawabanUser === jawabanBenar) {
      if (!usersData.users[user]) {
        usersData.users[user] = { points: 0 };
      }
      usersData.users[user].points = (usersData.users[user].points || 0) + 3;
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
        if (!usersData.users[user]) {
          usersData.users[user] = { points: 0 };
        }
        usersData.users[user].points = Math.max((usersData.users[user].points || 0) - 3, 0);
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
    if (currentRoom && currentRoom.ttt && currentRoom.ttt[user]) {
      return 'Tidak ada hint dalam permainan ini.';
    }
    if (!currentRoom || !currentRoom.currentQuestion) {
      return 'Ambil soal dulu sebelum minta hint!';
    }
    if (currentRoom.currentQuestion.answered) {
      return 'Soal sudah dijawab atau timeout, tidak bisa minta hint lagi.';
    }
    const jawaban = currentRoom.currentQuestion.jawaban;
    let hintText = '';
    let pointCost = 0;
    let hintPercentage = 0;
    if (hintType === 'murah') {
      hintPercentage = 0.3;
      pointCost = 0;
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
    const usersData = await apiGetData('users');
    const userPoints = usersData.users[user] ? usersData.users[user].points : 0;
    return `Poin kamu saat ini: ${userPoints}`;
  } else if (endpoint === 'top') {
    const usersData = await apiGetData('users');
    const users = usersData.users;
    const sortedUsers = Object.entries(users).sort(([, a], [, b]) => b.points - a.points).slice(0, 10);
    let topUsersFormatted = 'Top 10 Poin Tertinggi\n\n';
    let mentions = [];
    let positionMessage = '';
    if (sortedUsers.length > 0) {
      topUsersFormatted += '```\n';
      topUsersFormatted += 'No.  Username        Points\n';
      topUsersFormatted += '-------------------------\n';
      sortedUsers.forEach(([userName, data], index) => {
        const rank = String(index + 1).padEnd(3);
        const username = `@${userName}`;
        const points = String(data.points).padEnd(6);
        topUsersFormatted += `${rank}  ${username} ${points}\n`;
        mentions.push(`${userName}@s.whatsapp.net`);
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
      });
      topUsersFormatted += '```';
    } else {
      topUsersFormatted += 'Belum ada pemain yang memiliki poin.';
      positionMessage = 'Ayo main biar ada poinnya!';
    }
    client.sendMessage(m.chat, { text: topUsersFormatted + '\n' + positionMessage, mentions: mentions }, { qouted: m });
    return null;
  } else if (endpoint === 'nyerah') {
    const roomsData = await apiGetData('rooms');
    const usersData = await apiGetData('users');
    const currentRoom = roomsData.rooms[room];
    if (!currentRoom) {
      return 'Tidak ada permainan yang sedang berjalan!';
    }
    if (currentRoom.ttt && currentRoom.ttt[user]) {
      const game = currentRoom.ttt[user];
      delete currentRoom.ttt[user];
      await apiWriteData('rooms', roomsData);
      if (!usersData.users[user]) {
        usersData.users[user] = { points: 0 };
      }
      usersData.users[user].points = Math.max(usersData.users[user].points - 1, 0);
      await apiWriteData('users', usersData);
      return `Yah nyerah? Cupu! Permainan tic tac toe kamu dihentikan.\nPoint -1.`;
    } else if (currentRoom.currentQuestion) {
      const jawabanBenar = currentRoom.currentQuestion.jawaban;
      currentRoom.currentQuestion = null;
      await apiWriteData('rooms', roomsData);
      if (!usersData.users[user]) {
        usersData.users[user] = { points: 0 };
      }
      usersData.users[user].points = Math.max((usersData.users[user].points || 0) - 3, 0);
      await apiWriteData('users', usersData);
      return `Yah nyerah? Cupu! Jawaban yang benar adalah: ${jawabanBenar}. Point -3.`;
    } else {
      return 'Tidak ada soal yang bisa diserahin!';
    }
  } else if (endpoint === 'tictactoe') {
    const roomsData = await apiGetData('rooms');
    if (!roomsData.rooms[room]) {
      roomsData.rooms[room] = {};
    }
    const currentRoom = roomsData.rooms[room];
    if (!currentRoom.ttt) {
      currentRoom.ttt = {};
    }
    let game = currentRoom.ttt[user];
    if (!game) {
      if (!query || !query.text || (query.text.toLowerCase() !== 'sulit' && query.text.toLowerCase() !== 'mudah')) {
        return "ketik `.ttt sulit` atau `.ttt mudah`\n\n*Hadiah*:\n- Sulit: 99999 poin\n- Mudah: 5 poin";
      }
      let level = query.text.toLowerCase();
      let board = Array(9).fill(null);
      let turn = 'user';
      if (level === 'sulit') {
        turn = Math.random() < 0.5 ? 'user' : 'ai';
      }
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
          if (level === 'mudah') {
            const emptyIndices = board.map((cell, index) => cell === null ? index : null).filter(x => x !== null);
            aiMoveIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          } else {
            aiMoveIdx = getBestMove(board);
          }
        }
        game.board[aiMoveIdx] = 'ai';
        game.turn = 'user';
        await apiWriteData('rooms', roomsData);
        return `Giliran AI:\n${renderBoard(game.board)}\nGiliran kamu, kirim nomor kotak (1-9) untuk langkah selanjutnya.`;
      }
    } else {
      if (game.turn !== 'user') {
        return "Tunggu giliranmu.";
      }
      const move = parseInt(query.text);
      if (isNaN(move) || move < 1 || move > 9) {
        return "Masukkan nomor kotak yang valid (1-9) untuk langkahmu.";
      }
      const idx = move - 1;
      if (game.board[idx] !== null) {
        return "Kotak sudah terisi, pilih kotak lain.";
      }
      game.board[idx] = 'user';
      if (checkWin(game.board, 'user')) {
        const usersData = await apiGetData('users');
        if (!usersData.users[user]) {
          usersData.users[user] = { points: 0 };
        }
        let pointMessage = "";
        if (game.level === 'mudah') {
          usersData.users[user].points += 5;
          pointMessage = "Point +5.";
        } else {
          usersData.users[user].points += 99999;
          pointMessage = "Point +99999.";
        }
        await apiWriteData('users', usersData);
        delete currentRoom.ttt[user];
        await apiWriteData('rooms', roomsData);
        return `Kamu menang!\n${renderBoard(game.board)}\n${pointMessage}`;
      }
      if (game.board.every(cell => cell !== null)) {
        delete currentRoom.ttt[user];
        await apiWriteData('rooms', roomsData);
        return `Permainan seri!\n${renderBoard(game.board)}`;
      }
      game.turn = 'ai';
      let aiMoveIdx;
      if (game.level === 'mudah') {
        const emptyIndices = game.board.map((cell, index) => cell === null ? index : null).filter(x => x !== null);
        aiMoveIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        game.board[aiMoveIdx] = 'ai';
        if (checkWin(game.board, 'ai')) {
          const usersData = await apiGetData('users');
          if (!usersData.users[user]) {
            usersData.users[user] = { points: 0 };
          }
          usersData.users[user].points = Math.max(usersData.users[user].points - 1, 0);
          await apiWriteData('users', usersData);
          delete currentRoom.ttt[user];
          await apiWriteData('rooms', roomsData);
          return `Kamu kalah!\n${renderBoard(game.board)}\nPoint -1.`;
        }
        if (game.board.every(cell => cell !== null)) {
          delete currentRoom.ttt[user];
          await apiWriteData('rooms', roomsData);
          return `Permainan seri!\n${renderBoard(game.board)}`;
        }
        game.turn = 'user';
        await apiWriteData('rooms', roomsData);
        return `Setelah langkahmu:\n${renderBoard(game.board)}\nGiliran kamu. Kirim nomor kotak (1-9) untuk langkah selanjutnya.`;
      } else {
        let bestScore = -Infinity;
        let bestMove = null;
        for (let i = 0; i < game.board.length; i++) {
          if (game.board[i] === null) {
            game.board[i] = 'ai';
            let score = minimax(game.board, 0, false);
            game.board[i] = null;
            if (score > bestScore) {
              bestScore = score;
              bestMove = i;
            }
          }
        }
        if (bestScore === 0) {
          delete currentRoom.ttt[user];
          await apiWriteData('rooms', roomsData);
          return `Permainan seri!\n${renderBoard(game.board)}`;
        }
        const taunts = ["Yah, udah jelas gw bakal menang, bro!", "Santai aja, skor gw udah pasti, kamu kalah deh!", "Gak usah mikir, gw udah jago banget!", "Coba lagi, tapi gw tetep jagonya!", "Hmm, langkahmu lemah, gw menang terus!"];
        const taunt = taunts[Math.floor(Math.random() * taunts.length)];
        aiMoveIdx = bestMove;
        game.board[aiMoveIdx] = 'ai';
        if (checkWin(game.board, 'ai')) {
          const usersData = await apiGetData('users');
          if (!usersData.users[user]) {
            usersData.users[user] = { points: 0 };
          }
          usersData.users[user].points = Math.max(usersData.users[user].points - 1, 0);
          await apiWriteData('users', usersData);
          delete currentRoom.ttt[user];
          await apiWriteData('rooms', roomsData);
          return `Kamu kalah!\n${renderBoard(game.board)}\nPoint -1.\n${taunt}`;
        }
        if (game.board.every(cell => cell !== null)) {
          delete currentRoom.ttt[user];
          await apiWriteData('rooms', roomsData);
          return `Permainan seri!\n${renderBoard(game.board)}`;
        }
        game.turn = 'user';
        await apiWriteData('rooms', roomsData);
        return `Setelah langkahmu:\n${renderBoard(game.board)}\n${taunt}\nGiliran kamu. Kirim nomor kotak (1-9) untuk langkah selanjutnya.`;
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

function getBestMove(board) {
  let bestScore = -Infinity;
  let move = null;
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      board[i] = 'ai';
      let score = minimax(board, 0, false);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }
  return move;
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
