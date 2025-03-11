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
const userData = {};
const apiGetData = async (dataType) => {
  try {
    const res = await axios.get(`${API_ENDPOINT}/${dataType}`, { headers: { 'User-Agent': USER_AGENT } });
    return res.data;
  } catch (e) { console.error(e); return {}; }
};
const apiWriteData = async (dataType, data) => {
  try {
    await axios.post(`${API_ENDPOINT}/${dataType}`, data, { headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/json' } });
    return true;
  } catch (e) { console.error(e); return false; }
};
const updateRoomHistory = async (user, history) => {
  try {
    let roomsData = await apiGetData('rooms');
    roomsData.rooms = roomsData.rooms || {};
    roomsData.rooms[user] = { ...(roomsData.rooms[user] || {}), history };
    await apiWriteData('rooms', roomsData);
  } catch (e) { console.error("Error updating room history", e); }
};
const manageTokenCount = history => {
  let msgs = history.filter(m => m.role !== "system"),
    total = openaiTokenCounter.chat(msgs, "gpt-4");
  while (total > 1024 && history.filter(m => m.role !== "system").length > 1) {
    for (let i = 0; i < history.length; i++) {
      if (history[i].role !== "system") { history.splice(i, 1); break; }
    }
    msgs = history.filter(m => m.role !== "system");
    total = openaiTokenCounter.chat(msgs, "gpt-4");
  }
  return history;
};
const processTextQuery = async (text, user) => {
  if (!userData[user]) userData[user] = { settings: { lastTokenCount: 0, systemPrompt: "", persona: "" }, history: [] };
  let modelConfig = userData[user].settings;
  if (modelConfig.systemPrompt !== fs.readFileSync('./prompt.txt', 'utf8')) modelConfig.systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
  const generationConfig = { ...DEFAULT_GENERATION_CONFIG },
    history = userData[user].history;
  history.push({ role: "user", content: text });
  const updatedHistory = manageTokenCount(history);
  const systemPrompt = modelConfig.systemPrompt || fs.readFileSync('./prompt.txt', 'utf8');
  let messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: "Saat menjawab harus selalu memakai 'think' yah!" },
    { role: "assistant", content: `<think>
Analisis teks user: Permintaan agar selalu menampilkan blok "think".
Analisis maksud user: Ingin melihat think block di setiap respons.
Analisis tindakan Alicia: Setuju dengan enggan tapi tetap akan menampilkannya.
Analisis metode respon: Teks.
</think>
Yah, baiklah... Aku akan tunjukkan think block tiap respons, tapi jangan kira aku jadi lembek, ya!` }
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
    userData[user].history = updatedHistory;
    modelConfig.lastTokenCount = updatedHistory.reduce((acc, m) => acc + m.content.length, 0);
    userData[user].settings = modelConfig;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      try {
        const response = await axios.post(GEMMA_API_URL, { model: GEMMA_MODEL_NAME, messages, ...generationConfig }, { headers: { Authorization: `Bearer ${API_KEY}` } });
        responseText = response.data.choices[0].message.content;
        updatedHistory.push({ role: "assistant", content: responseText });
        userData[user].history = updatedHistory;
        modelConfig.lastTokenCount = updatedHistory.reduce((acc, m) => acc + m.content.length, 0);
        userData[user].settings = modelConfig;
      } catch (retryError) { return `Terlalu sering membuat permintaan dalam waktu dekat!`; }
    } else { return `API Error: ${error.message}`; }
  }
  responseText = responseText.includes("<think>") && responseText.includes("</think>")
    ? responseText.replace(/<think>[\s\S]*?<\/think>/, "").trim()
    : responseText.replace("<think>", "").trim();
  await updateRoomHistory(user, updatedHistory);
  return responseText;
};
const handleTextQuery = async (text, user) => {
  if (!userData[user]) userData[user] = { settings: { systemPrompt: fs.readFileSync('./prompt.txt', 'utf8'), persona: "" }, history: [] };
  if (text.toLowerCase() === "reset") {
    userData[user].settings.persona = "";
    userData[user].settings.systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
    userData[user].history = [];
    return "Riwayat percakapan, preferensi, dan persona telah direset.";
  }
  if (text.toLowerCase().startsWith("persona:")) {
    const persona = text.replace("persona:", "").trim();
    userData[user].settings.persona = persona;
    return `Persona telah diatur: "${persona}"`;
  }
  if (text.toLowerCase() === "resetprompt") {
    userData[user].settings.systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
    return "Prompt telah direset.";
  }
  return processTextQuery(text, user);
};
const handleImageQuery = async (url, text, user) => {
  if (!userData[user]) userData[user] = { settings: { systemPrompt: fs.readFileSync('./prompt.txt', 'utf8'), persona: "" }, history: [] };
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
    userData[user].history.push({ role: "user", content: `Gambar: ${url} , Pertanyaan: ${text}` }, { role: "assistant", content: responseText });
    await updateRoomHistory(user, userData[user].history);
    return responseText;
  } catch (error) {
    console.error("Error in handleImageQuery:", error);
    return `Error processing image query: ${error.message}`;
  }
};
const riwayat = user => userData[user] ? JSON.stringify(userData[user].history, null, 2) : "Tidak ada riwayat untuk pengguna ini.";
module.exports = { handleTextQuery, handleImageQuery, riwayat };