const axios = require('axios'),
  fs = require('fs'),
  { global } = require('../config.js'),
  openaiTokenCounter = require('openai-gpt-token-counter');
const GEMMA_API_URL = "https://api.groq.com/openai/v1/chat/completions",
  GEMMA_MODEL_NAME = global.model_groq,
  API_KEY = global.apikey,
  RAPID_API_KEY = global.rapidapikey,
  RAPID_API_HOST = "chatgpt-vision1.p.rapidapi.com",
  RAPID_API_URL = "https://chatgpt-vision1.p.rapidapi.com/matagvision21",
  DEFAULT_GENERATION_CONFIG = { max_tokens: 250, stream: false, stop: null, temperature: 0.8, top_p: 0.9 },
  API_ENDPOINT = 'https://copper-ambiguous-velvet.glitch.me/data',
  USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; RMX2185 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.260 Mobile Safari/537.36';
const apiGetData = async (dataType) => {
  try {
    const res = await axios.get(`${API_ENDPOINT}/${dataType}`, { headers: { 'User-Agent': USER_AGENT } });
    return res.data;
  } catch (e) {
    console.error(e);
    return {};
  }
};
const apiWriteData = async (dataType, data) => {
  try {
    await axios.post(`${API_ENDPOINT}/${dataType}`, data, { headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/json' } });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
const getUserRoom = async (user) => {
  let roomsData = await apiGetData('rooms');
  if (!roomsData || typeof roomsData !== 'object') roomsData = { rooms: {} };
  if (!roomsData.rooms) roomsData.rooms = {};
  if (!roomsData.rooms[user]) {
    roomsData.rooms[user] = { settings: { systemPrompt: fs.readFileSync('./prompt.txt', 'utf8'), persona: "", lastTokenCount: 0 }, history: [] };
    await apiWriteData('rooms', roomsData);
  } else {
    if (!roomsData.rooms[user].history) {
      roomsData.rooms[user].history = [];
      await apiWriteData('rooms', roomsData);
    }
    if (!roomsData.rooms[user].settings) {
      roomsData.rooms[user].settings = { systemPrompt: fs.readFileSync('./prompt.txt', 'utf8'), persona: "", lastTokenCount: 0 };
      await apiWriteData('rooms', roomsData);
    }
  }
  return roomsData.rooms[user];
};
const updateUserRoom = async (user, roomData) => {
  let roomsData = await apiGetData('rooms');
  if (!roomsData || typeof roomsData !== 'object') roomsData = { rooms: {} };
  roomsData.rooms = roomsData.rooms || {};
  roomsData.rooms[user] = roomData;
  await apiWriteData('rooms', roomsData);
};
const manageTokenCount = history => {
  let msgs = history.filter(m => m.role !== "system"),
    total = openaiTokenCounter.chat(msgs, "gpt-4");
  while (total > 2000 && history.filter(m => m.role !== "system").length > 1) {
    for (let i = 0; i < history.length; i++) {
      if (history[i].role !== "system") {
        history.splice(i, 1);
        break;
      }
    }
    msgs = history.filter(m => m.role !== "system");
    total = openaiTokenCounter.chat(msgs, "gpt-4");
  }
  return history;
};
const processTextQuery = async (text, user) => {
  let room = await getUserRoom(user);
  let modelConfig = room.settings;
  const promptFromFile = fs.readFileSync('./prompt.txt', 'utf8');
  if (modelConfig.systemPrompt !== promptFromFile) modelConfig.systemPrompt = promptFromFile;
  const generationConfig = { ...DEFAULT_GENERATION_CONFIG };
  let history = room.history || [];
  history.push({ role: "user", content: text });
  let updatedHistory = manageTokenCount(history);
  const systemPrompt = modelConfig.systemPrompt;
  let messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: "hai, Apa kabar?" },
    { role: "assistant", content: `<think>
Analisis teks user: Nanya kabar.
Analisis maksud user: Pengen tahu kondisi Alicia.
Analisis tindakan Alicia: Jawab santai, agak jual mahal.
Analisis metode respon: Teks.
</think>
Hah? Kepo banget sih. Tapi yaa... lumayan lah, nggak seburuk cuaca hati kamu pas ditinggal chat doang. 😏` }
  ];
  if (modelConfig.persona) {
    messages.push({ role: "user", content: modelConfig.persona }, { role: "assistant", content: "Okee yaa aku ingat!" });
  }
  messages.push(...updatedHistory);
  let responseText;
  try {
    const response = await axios.post(GEMMA_API_URL, { model: GEMMA_MODEL_NAME, messages, ...generationConfig }, { headers: { Authorization: `Bearer ${API_KEY}` } });
    responseText = response.data.choices[0].message.content;
    updatedHistory.push({ role: "assistant", content: responseText });
    room.history = updatedHistory;
    modelConfig.lastTokenCount = updatedHistory.reduce((acc, m) => acc + m.content.length, 0);
    room.settings = modelConfig;
    await updateUserRoom(user, room);
  } catch (error) {
    if (error.response && error.response.status === 429) {
      try {
        const response = await axios.post(GEMMA_API_URL, { model: GEMMA_MODEL_NAME, messages, ...generationConfig }, { headers: { Authorization: `Bearer ${API_KEY}` } });
        responseText = response.data.choices[0].message.content;
        updatedHistory.push({ role: "assistant", content: responseText });
        room.history = updatedHistory;
        modelConfig.lastTokenCount = updatedHistory.reduce((acc, m) => acc + m.content.length, 0);
        room.settings = modelConfig;
        await updateUserRoom(user, room);
      } catch (retryError) {
        return `Terlalu sering membuat permintaan dalam waktu dekat!`;
      }
    } else {
      return `API Error: ${error.message}`;
    }
  }
  responseText = responseText.includes("<think>") && responseText.includes("</think>")
    ? responseText.replace(/<think>[\s\S]*?<\/think>/, "").trim()
    : responseText.replace("<think>", "").trim();
  return responseText;
};
const handleTextQuery = async (text, user) => {
  let room = await getUserRoom(user);
  if (text.toLowerCase() === "reset") {
    room.settings.persona = "";
    room.settings.systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
    room.history = [];
    await updateUserRoom(user, room);
    return "Riwayat percakapan, preferensi, dan persona telah direset.";
  }
  if (text.toLowerCase().startsWith("persona:")) {
    const persona = text.replace("persona:", "").trim();
    room.settings.persona = persona;
    await updateUserRoom(user, room);
    return `Persona telah diatur: "${persona}"`;
  }
  if (text.toLowerCase() === "resetprompt") {
    room.settings.systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
    await updateUserRoom(user, room);
    return "Prompt telah direset.";
  }
  return processTextQuery(text, user);
};
const handleImageQuery = async (url, text, user) => {
  let room = await getUserRoom(user);
  try {
    const payload = { messages: [{ role: "user", content: [{ type: "text", text }, { type: "image", url }] }], web_access: true };
    const response = await axios.post(RAPID_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-ua': 'RapidAPI-Playground',
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': RAPID_API_HOST
      }
    });
    const responseText = response.data.result;
    room.history.push({ role: "user", content: `Gambar: ${url} , Pertanyaan: ${text}` }, { role: "assistant", content: responseText });
    await updateUserRoom(user, room);
    return responseText;
  } catch (error) {
    console.error("Error in handleImageQuery:", error);
    return `Error processing image query: ${error.message}`;
  }
};
const riwayat = async user => {
  let data = await apiGetData('rooms');
  return data.rooms && data.rooms[user] ? JSON.stringify(data.rooms[user].history, null, 2) : "Tidak ada riwayat untuk pengguna ini.";
};
module.exports = { handleTextQuery, handleImageQuery, riwayat };