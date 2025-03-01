const axios = require('axios');
const fs = require('fs');
const { global } = require('../config.js');
const openaiTokenCounter = require('openai-gpt-token-counter');

const API_ENDPOINT = 'https://copper-ambiguous-velvet.glitch.me/data';
const USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; RMX2185 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.260 Mobile Safari/537.36';

const GEMMA_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMMA_MODEL_NAME = global.model_groq;
const API_KEY = global.apikey;
const RAPID_API_KEY = global.rapidapikey;
const RAPID_API_HOST = "chatgpt-vision1.p.rapidapi.com";
const RAPID_API_URL = "https://chatgpt-vision1.p.rapidapi.com/matagvision21";

const DEFAULT_GENERATION_CONFIG = { max_tokens: 512, stream: false, stop: null, temperature: 0.8, top_p: 0.9 };

const apiGetData = async (dataType) => {
  try {
    return (await axios.get(`${API_ENDPOINT}/${dataType}`, { headers: { 'User-Agent': USER_AGENT } })).data;
  } catch (e) {
    console.error(`GET ${dataType}:`, e);
    return {};
  }
};
const apiWriteData = async (dataType, data) => {
  try {
    await axios.post(`${API_ENDPOINT}/${dataType}`, data, { headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/json' } });
    return true;
  } catch (e) {
    console.error(`POST ${dataType}:`, e);
    return false;
  }
};

// Ambil dan perbarui data user (settings dan history) secara remote
const getUserData = async (user) => {
  let data = await apiGetData('history');
  return data[user] || { settings: { systemPrompt: fs.readFileSync('./prompt.txt', 'utf8'), persona: "" }, history: [] };
};
const updateUserData = async (user, userObj) => {
  let data = await apiGetData('history');
  data[user] = userObj;
  await apiWriteData('history', data);
};

const manageTokenCount = (history) => {
  let nonSystem = history.filter(m => m.role !== "system");
  let total = openaiTokenCounter.chat(nonSystem, "gpt-4");
  while (total > 1024 && history.filter(m => m.role !== "system").length > 1) {
    for (let i = 0; i < history.length; i++) {
      if (history[i].role !== "system") { history.splice(i, 1); break; }
    }
    nonSystem = history.filter(m => m.role !== "system");
    total = openaiTokenCounter.chat(nonSystem, "gpt-4");
  }
  return history;
};

const processTextQuery = async (text, user) => {
  let userObj = await getUserData(user);
  let modelConfig = userObj.settings;
  const promptTxt = fs.readFileSync('./prompt.txt', 'utf8');
  if (modelConfig.systemPrompt !== promptTxt) modelConfig.systemPrompt = promptTxt;
  const genConfig = { ...DEFAULT_GENERATION_CONFIG };
  let history = userObj.history;
  history.push({ role: "user", content: text });
  const updatedHistory = manageTokenCount(history);
  const messages = [
    { role: "system", content: modelConfig.systemPrompt },
    { role: "user", content: "Saat menjawab harus selalu memakai <think> yah!" },
    { role: "assistant", content: `<think>
- Analisis teks user: User suruh aku sentiasa guna <think> dalam jawapan.
- Analisis maksud user: User nak pastikan format jawapan aku teratur dan konsisten.
- Analisis tindakan Alicia: Aku akan pastikan setiap kali jawab, blok <think> ada kat depan.
- Analisis metode respon: Teks.
</think>
Yelah, yelah... Aku tahulah! Mana ada aku lupa pun.` }
  ];
  if (modelConfig.persona) messages.push({ role: "user", content: modelConfig.persona }, { role: "assistant", content: "Okee yaa aku ingat!" });
  messages.push(...updatedHistory);
  let responseText;
  try {
    const response = await axios.post(GEMMA_API_URL, { model: GEMMA_MODEL_NAME, messages, ...genConfig }, { headers: { Authorization: `Bearer ${API_KEY}` } });
    responseText = response.data.choices[0].message.content;
    updatedHistory.push({ role: "assistant", content: responseText });
    modelConfig.lastTokenCount = updatedHistory.reduce((acc, m) => acc + m.content.length, 0);
  } catch (error) {
    if (error.response && error.response.status === 429) {
      try {
        const response = await axios.post(GEMMA_API_URL, { model: GEMMA_MODEL_NAME, messages, ...genConfig }, { headers: { Authorization: `Bearer ${API_KEY}` } });
        responseText = response.data.choices[0].message.content;
        updatedHistory.push({ role: "assistant", content: responseText });
        modelConfig.lastTokenCount = updatedHistory.reduce((acc, m) => acc + m.content.length, 0);
      } catch (retryError) {
        return `Terlalu sering membuat permintaan dalam waktu dekat!`;
      }
    } else return `API Error: ${error.message}`;
  }
  if (responseText.includes("<think>") && responseText.includes("</think>"))
    responseText = responseText.replace(/<think>[\s\S]*?<\/think>/, "").trim();
  else responseText = responseText.replace("<think>", "").trim();
  userObj.history = updatedHistory;
  userObj.settings = modelConfig;
  await updateUserData(user, userObj);
  return responseText;
};

const handleTextQuery = async (text, user) => {
  let userObj = await getUserData(user);
  if (text.toLowerCase() === "reset") {
    userObj.settings.persona = "";
    userObj.settings.systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
    userObj.history = [];
    await updateUserData(user, userObj);
    return "Riwayat percakapan, preferensi, dan persona telah direset.";
  }
  if (text.toLowerCase().startsWith("persona:")) {
    userObj.settings.persona = text.replace("persona:", "").trim();
    await updateUserData(user, userObj);
    return `Persona telah diatur: "${userObj.settings.persona}"`;
  }
  if (text.toLowerCase() === "resetprompt") {
    userObj.settings.systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
    await updateUserData(user, userObj);
    return "Prompt telah direset.";
  }
  return processTextQuery(text, user);
};

const handleImageQuery = async (url, text, user) => {
  let userObj = await getUserData(user);
  try {
    const payload = {
      messages: [{ role: "user", content: [{ type: "text", text }, { type: "image", url }] }],
      web_access: true
    };
    const response = await axios.post(RAPID_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-ua': 'RapidAPI-Playground',
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': RAPID_API_HOST
      }
    });
    const responseText = response.data.result;
    userObj.history.push({ role: "user", content: `Gambar: ${url} , Pertanyaan: ${text}` });
    userObj.history.push({ role: "assistant", content: responseText });
    await updateUserData(user, userObj);
    return responseText;
  } catch (error) {
    console.error("Error in handleImageQuery:", error);
    return `Error processing image query: ${error.message}`;
  }
};

const riwayat = async (user) => {
  let userObj = await getUserData(user);
  return JSON.stringify(userObj.history, null, 2);
};

module.exports = { handleTextQuery, handleImageQuery, riwayat };
