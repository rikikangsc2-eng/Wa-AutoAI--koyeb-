const axios = require('axios');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { global } = require('../config.js');

const GEMMA_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const ALTERNATIVE_API_URL = "https://express-vercel-ytdl.vercel.app/llm";
const GEMMA_MODEL_NAME = global.model_groq;
const API_KEY = global.apikey;
const API_KEY_2 = global.apikey2;
const model_gemini = global.model_gemini;
const BASE_URL = "https://copper-ambiguous-velvet.glitch.me";

const DEFAULT_GENERATION_CONFIG = { max_tokens: 512, stream: false, stop: null, temperature: 0.8, top_p: 0.9 };

const genAI = new GoogleGenerativeAI(API_KEY_2);
const userData = {};
const SYNC_INTERVAL = 30 * 60 * 1000;
const USER_AGENT = "Mozilla/5.0 (Linux; Android 10; RMX2185 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.260 Mobile Safari/537.36";
const API_DELAY = 2000;

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const apiRequest = async (url, options = {}) => {
    await delay(API_DELAY);
    return axios({
        url,
        ...options,
        headers: {
            ...options.headers,
            'User-Agent': USER_AGENT
        }
    });
};

const syncUserData = async (user) => {
  if (!userData[user]) {
        const modelConfig = await apiRequest(`${BASE_URL}/model/${user}`).then(res => res.data);
        const history = await apiRequest(`${BASE_URL}/history/${user}`).then(res => res.data.history);

    userData[user] = {
        first: true,
        date: Date.now(),
        settings: modelConfig || { lastTokenCount: 0, systemPrompt: "", isPremium: false, persona: "", lastAPI: "main" },
        history: history || []
      };
    return;
  }

  if (userData[user].first) {
        const modelConfig = await apiRequest(`${BASE_URL}/model/${user}`).then(res => res.data);
        const history = await apiRequest(`${BASE_URL}/history/${user}`).then(res => res.data.history);

    userData[user] = {
        first: false,
        date: Date.now(),
        settings: modelConfig || { lastTokenCount: 0, systemPrompt: "", isPremium: false, persona: "", lastAPI: "main" },
        history: history || []
      };
  }
};

const manageTokenCount = (history) => {
  let totalTokens = history.reduce((acc, msg) => acc + msg.content.length, 0);
  while (totalTokens > 1536 && history.length > 1) {
    history.shift();
    totalTokens = history.reduce((acc, msg) => acc + msg.content.length, 0);
  }
  return history;
};

const processTextQuery = async (text, user) => {
  await syncUserData(user);

  let modelConfig = userData[user].settings;

  if (!modelConfig.isPremium && modelConfig.systemPrompt !== fs.readFileSync('./prompt.txt', 'utf8')) {
    modelConfig.systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
  }

  const generationConfig = { ...DEFAULT_GENERATION_CONFIG };
  let history = userData[user].history;

  history.push({ role: "user", content: text });
  const updatedHistory = manageTokenCount(history);

  const systemPrompt = modelConfig.systemPrompt || fs.readFileSync('./prompt.txt', 'utf8');

  const messages = [
    { role: "system", content: systemPrompt },
    {role: "user", content: "Jangan pernah kirim musik kecuali saya yang minta. Kalau saya minta cari atau putar musik, kasih aja format teksnya yang sesuai. Ingat, jawabnya cuma satu paragraf dan maksimal 200 kata ya."},
    { role: "assistant", content: "Hmph, terserah. Aku bakal ingat itu! Tapi kalau kamu butuh musik, bilang aja ya. Aku bisa cariin kok. Nggak perlu ngomel-ngomel." }
  ];

  if (modelConfig.persona) {
    messages.push(
      { role: "user", content: `${modelConfig.persona}` },
      { role: "assistant", content: "Okee yaa aku ingat!" }
    );
  }

  messages.push(...updatedHistory);

  let responseText;
  try {
    const response = await axios.post(
      GEMMA_API_URL,
      { model: GEMMA_MODEL_NAME, messages, ...generationConfig },
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );

    responseText = response.data.choices[0].message.content;
    updatedHistory.push({ role: "assistant", content: responseText });
    userData[user].history = updatedHistory;

    modelConfig.lastTokenCount = updatedHistory.reduce((acc, msg) => acc + msg.content.length, 0);
    modelConfig.lastAPI = "main";
    userData[user].settings = modelConfig

  } catch (error) {
    if (error.response && error.response.status === 429) {
      try {
        const response = await axios.post(
          ALTERNATIVE_API_URL,
          {
            model: GEMMA_MODEL_NAME,
            messages,
            temperature: generationConfig.temperature,
            max_tokens: generationConfig.max_tokens,
            top_p: generationConfig.top_p,
            stream: generationConfig.stream,
            stop: generationConfig.stop
          },
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );

        responseText = response.data.choices[0].message.content;
        updatedHistory.push({ role: "assistant", content: responseText });
         userData[user].history = updatedHistory;

        modelConfig.lastTokenCount = updatedHistory.reduce((acc, msg) => acc + msg.content.length, 0);
        modelConfig.lastAPI = "alternative";
        userData[user].settings = modelConfig

      } catch (altError) {
        if (altError.response && altError.response.status === 400) {
          return "API 2 mengembalikan error 400. Mohon periksa payload.";
        } else if (altError.response && altError.response.status === 429) {
          return "API 2 juga mengalami batasan permintaan.";
        }
        return `API 2: ${altError.message}`;
      }
    }
    return `API 1: ${error.message}`;
  }

    if (Date.now() - userData[user].date >= SYNC_INTERVAL) {
    await apiRequest(`${BASE_URL}/model/${user}`, { method: 'post', data: { config: userData[user].settings } });
    await apiRequest(`${BASE_URL}/history/${user}`, { method: 'post', data: { history: userData[user].history } });

      const modelConfig = await apiRequest(`${BASE_URL}/model/${user}`).then(res => res.data);
        const history = await apiRequest(`${BASE_URL}/history/${user}`).then(res => res.data.history);

        userData[user] = {
            first: true,
            date: Date.now(),
           settings: modelConfig || { lastTokenCount: 0, systemPrompt: "", isPremium: false, persona: "", lastAPI: "main" },
           history: history || []
      };
  }

  return responseText;
};

const handleTextQuery = async (text, user) => {
  await syncUserData(user)
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
  if (text.toLowerCase().startsWith("setprompt:")) {
      if (!userData[user].settings.isPremium) {
      return "Anda harus premium, beli di *.owner* hanya 5k kok";
    }
    userData[user].settings.systemPrompt = text.replace("setprompt:", "").trim();
    userData[user].history = [];
    return "Prompt telah diubah dan riwayat telah dihapus.";
  }
  if (text.toLowerCase().startsWith("setprem:")) {
    const adminNumber = global.owner;
    if (user.includes(adminNumber)) {
      const targetUser = text.replace("setprem:", "").trim();
     if(!userData[targetUser]) {
         await syncUserData(targetUser)
     }
      userData[targetUser].settings.isPremium = true;
      return `${targetUser} sekarang adalah pengguna premium.`;
    } else {
      return "Anda tidak memiliki izin untuk mengubah pengguna menjadi premium.";
    }
  }
    if (text.toLowerCase() === "resetprompt") {
    userData[user].settings.systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
    return "Prompt telah direset.";
  }
  return processTextQuery(text, user);
};

const handleImageQuery = async (url, text, user) => {
  await syncUserData(user);

  if (!userData[user].settings.isPremium) {
    return "Anda harus premium untuk menggunakan fitur ini.";
  }
  const responseSettings = { temperature: 0.6, top_p: 0.8 };
  let history = userData[user].history;
  const response = await axios.get(url, { responseType: "arraybuffer" });
  const imageData = Buffer.from(response.data).toString("base64");
  const prompt = [
    ...history.map(item => `**${item.role === "assistant" ? "Gemini" : "User"}**: ${item.content}`),
    `**User**: ${text}`,
    { inlineData: { data: imageData, mimeType: "image/png" } },
  ];
  const model = genAI.getGenerativeModel({ model: model_gemini });
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  history.push({ role: "user", content: text });
  history.push({ role: "assistant", content: responseText });
  userData[user].history = history

      if (Date.now() - userData[user].date >= SYNC_INTERVAL) {
    await apiRequest(`${BASE_URL}/model/${user}`, { method: 'post', data: { config: userData[user].settings } });
    await apiRequest(`${BASE_URL}/history/${user}`, { method: 'post', data: { history: userData[user].history } });

       const modelConfig = await apiRequest(`${BASE_URL}/model/${user}`).then(res => res.data);
       const history = await apiRequest(`${BASE_URL}/history/${user}`).then(res => res.data.history);

        userData[user] = {
            first: true,
            date: Date.now(),
           settings: modelConfig || { lastTokenCount: 0, systemPrompt: "", isPremium: false, persona: "", lastAPI: "main" },
           history: history || []
        };
  }

  return responseText;
};

module.exports = {
  handleTextQuery,
  handleImageQuery,
};