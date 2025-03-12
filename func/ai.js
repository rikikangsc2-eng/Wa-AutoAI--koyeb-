const axios = require('axios');
const fs = require('fs');
const { global } = require('../config.js');
const openaiTokenCounter = require('openai-gpt-token-counter');
const GEMMA_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMMA_MODEL_NAME = global.model_groq;
const API_KEY = global.apikey;
const RAPID_API_KEY = global.rapidapikey;
const RAPID_API_HOST = "chatgpt-vision1.p.rapidapi.com";
const RAPID_API_URL = "https://chatgpt-vision1.p.rapidapi.com/matagvision21";
const DEFAULT_GENERATION_CONFIG = { max_tokens: 250, stream: false, stop: null, temperature: 0.8, top_p: 0.9 };
const userData = {};
const DB_FOLDER = "./db";

const ensureDbFolder = () => {
  if (!fs.existsSync(DB_FOLDER)) fs.mkdirSync(DB_FOLDER, { recursive: true });
};

const loadHistory = user => {
  ensureDbFolder();
  const files = fs.readdirSync(DB_FOLDER).filter(file => new RegExp(`^${user}-(\\d+)\\.json$`).test(file));
  let history = [];
  let chosenFile = null;
  let latestTimestamp = 0;
  files.forEach(file => {
    const match = file.match(new RegExp(`^${user}-(\\d+)\\.json$`));
    if (match) {
      const timestamp = parseInt(match[1], 10);
      if (Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) {
        fs.unlinkSync(`${DB_FOLDER}/${file}`);
      } else if (timestamp > latestTimestamp) {
        latestTimestamp = timestamp;
        chosenFile = file;
      }
    }
  });
  if (chosenFile) {
    try {
      history = JSON.parse(fs.readFileSync(`${DB_FOLDER}/${chosenFile}`, 'utf8'));
    } catch (e) {
      history = [];
    }
  } else {
    history = [];
    const newFile = `${user}-${Date.now()}.json`;
    fs.writeFileSync(`${DB_FOLDER}/${newFile}`, JSON.stringify(history), 'utf8');
  }
  return history;
};

const saveHistory = (user, history) => {
  ensureDbFolder();
  const files = fs.readdirSync(DB_FOLDER).filter(file => new RegExp(`^${user}-(\\d+)\\.json$`).test(file));
  files.forEach(file => fs.unlinkSync(`${DB_FOLDER}/${file}`));
  const newFile = `${user}-${Date.now()}.json`;
  fs.writeFileSync(`${DB_FOLDER}/${newFile}`, JSON.stringify(history), 'utf8');
};

const manageTokenCount = history => {
  let msgs = history.filter(m => m.role !== "system"), total = openaiTokenCounter.chat(msgs, "gpt-4");
  while (total > 2000 && history.filter(m => m.role !== "system").length > 1) {
    for (let i = 0; i < history.length; i++) {
      if (history[i].role !== "system") { history.splice(i, 1); break; }
    }
    msgs = history.filter(m => m.role !== "system");
    total = openaiTokenCounter.chat(msgs, "gpt-4");
  }
  return history;
};

const processTextQuery = async (text, user) => {
  if (!userData[user]) userData[user] = { settings: { lastTokenCount: 0, systemPrompt: "", persona: "" } };
  const promptTxt = fs.readFileSync('./prompt.txt', 'utf8');
  if (userData[user].settings.systemPrompt !== promptTxt) userData[user].settings.systemPrompt = promptTxt;
  const generationConfig = { ...DEFAULT_GENERATION_CONFIG };
  let history = loadHistory(user);
  history.push({ role: "user", content: text });
  const updatedHistory = manageTokenCount(history);
  const systemPrompt = userData[user].settings.systemPrompt || fs.readFileSync('./prompt.txt', 'utf8');
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
  if (userData[user].settings.persona) {
    messages.push({ role: "user", content: userData[user].settings.persona }, { role: "assistant", content: "Okee yaa aku ingat!" });
  }
  messages.push(...updatedHistory);
  let responseText;
  try {
    const response = await axios.post(GEMMA_API_URL, { model: GEMMA_MODEL_NAME, messages, ...generationConfig }, { headers: { Authorization: `Bearer ${API_KEY}` } });
    responseText = response.data.choices[0].message.content;
    updatedHistory.push({ role: "assistant", content: responseText });
    saveHistory(user, updatedHistory);
    userData[user].settings.lastTokenCount = updatedHistory.reduce((acc, m) => acc + m.content.length, 0);
  } catch (error) {
    if (error.response && error.response.status === 429) {
      try {
        const response = await axios.post(GEMMA_API_URL, { model: GEMMA_MODEL_NAME, messages, ...generationConfig }, { headers: { Authorization: `Bearer ${API_KEY}` } });
        responseText = response.data.choices[0].message.content;
        updatedHistory.push({ role: "assistant", content: responseText });
        saveHistory(user, updatedHistory);
        userData[user].settings.lastTokenCount = updatedHistory.reduce((acc, m) => acc + m.content.length, 0);
      } catch (retryError) { return `Terlalu sering membuat permintaan dalam waktu dekat!`; }
    } else { return `API Error: ${error.message}`; }
  }
  responseText = responseText.includes("<think>") && responseText.includes("</think>")
    ? responseText.replace(/<think>[\s\S]*?<\/think>/, "").trim()
    : responseText.replace("<think>", "").trim();
  return responseText;
};

const handleTextQuery = async (text, user) => {
  if (!userData[user]) userData[user] = { settings: { systemPrompt: fs.readFileSync('./prompt.txt', 'utf8'), persona: "" } };
  if (text.toLowerCase() === "reset") {
    userData[user].settings.persona = "";
    userData[user].settings.systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
    saveHistory(user, []);
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
  if (!userData[user]) userData[user] = { settings: { systemPrompt: fs.readFileSync('./prompt.txt', 'utf8'), persona: "" } };
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
    let history = loadHistory(user);
    history.push({ role: "user", content: `Gambar: ${url} , Pertanyaan: ${text}` }, { role: "assistant", content: responseText });
    saveHistory(user, history);
    return responseText;
  } catch (error) {
    return `Error processing image query: ${error.message}`;
  }
};

const riwayat = user => {
  const history = loadHistory(user);
  return history.length ? JSON.stringify(history, null, 2) : "Tidak ada riwayat untuk pengguna ini.";
};

module.exports = { handleTextQuery, handleImageQuery, riwayat };