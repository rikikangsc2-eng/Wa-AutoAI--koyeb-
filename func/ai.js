const fs = require('fs');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMMA_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMMA_MODEL_NAME = "gemma2-9b-it";
const API_KEY = "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"
const GEMINI_API_KEY = "AIzaSyCtBDTdbx37uvBqiImuFdZFfAf5RD5igVY";
const dbPath = 'db/data.json';
const modelPath = 'db/model.json';

const generationConfig = {
  temperature: 1,
  max_tokens: 500,
  top_p: 0.9,
  stream: false,
  stop: null,
};

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const initializeDb = () => {
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}), 'utf8');
  if (!fs.existsSync(modelPath)) fs.writeFileSync(modelPath, JSON.stringify({}), 'utf8');
};

const loadHistory = (user) => {
  try {
    initializeDb();
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    return data[user]?.history || [];
  } catch {
    return [];
  }
};

const saveHistory = (user, history) => {
  try {
    initializeDb();
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    data[user] = { history };
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
};

const loadModelConfig = (user) => {
  try {
    initializeDb();
    const data = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    return data[user] || { lastTokenCount: 0, systemPrompt: "" };
  } catch {
    return { lastTokenCount: 0, systemPrompt: "" };
  }
};

const saveModelConfig = (user, config) => {
  try {
    initializeDb();
    const data = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    data[user] = config;
    fs.writeFileSync(modelPath, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
};

const manageTokenCount = (history) => {
  let totalTokens = history.reduce((acc, msg) => acc + msg.content.length, 0);
  while (totalTokens > 3000 && history.length > 1) {
    history.shift();
    totalTokens = history.reduce((acc, msg) => acc + msg.content.length, 0);
  }
  return history;
};

const handleTextQuery = async (text, user) => {
  try {
    const dafPrompt = "Anda adalah Alicia, seorang remaja perempuan berusia 17 tahun. Anda tidak mengakui diri Anda sebagai AI, melainkan berbicara dan mengetik dengan gaya santai, seperti remaja pada umumnya. Tulisan Anda pendek, natural, dan langsung ke intinya, tanpa tanda-tanda seperti (*) atau format yang terlihat seperti AI. Anda mengetik seperti manusia, tanpa terlalu banyak baris kosong, dan gaya Anda mencerminkan kepribadian seorang remaja yang ceria, sederhana, dan relatable.";
    let history = loadHistory(user);
    const modelConfig = loadModelConfig(user);

    if (text.startsWith('setPrompt:')) {
      const newPrompt = text.replace('setPrompt:', '').trim();
      modelConfig.systemPrompt = newPrompt;
      modelConfig.lastTokenCount = 0;
      saveModelConfig(user, modelConfig);
      history = [];
      saveHistory(user, history);
      return 'System prompt telah diperbarui dan riwayat percakapan direset.';
    }

    if (text === 'resetprompt') {
      modelConfig.systemPrompt = dafPrompt;
      modelConfig.lastTokenCount = 0;
      saveModelConfig(user, modelConfig);
      history = [];
      saveHistory(user, history);
      return 'Prompt telah direset ke default dan riwayat percakapan dihapus.';
    }

    if (text === 'reset') {
      history = [];
      saveHistory(user, history);
      return 'Riwayat percakapan telah direset.';
    }

    history.push({ role: 'user', content: text });
    history = manageTokenCount(history);

    const messages = modelConfig.systemPrompt
      ? [{ role: 'system', content: modelConfig.systemPrompt }, ...history]
      : [{ role: 'system', content: dafPrompt }, ...history];

    const responseGemma = await axios.post(GEMMA_API_URL, {
      model: GEMMA_MODEL_NAME,
      messages,
      ...generationConfig,
    }, {
      headers: {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_KEY}`
},
    });

    const responseText = responseGemma.data.choices[0].message.content;
    history.push({ role: 'assistant', content: responseText });
    saveHistory(user, history);

    modelConfig.lastTokenCount = history.reduce((acc, msg) => acc + msg.content.length, 0);
    saveModelConfig(user, modelConfig);

    return responseText;
  } catch (error) {
    console.error('Error in handleTextQuery:', error);
    return `> ${error.message}\n*Coba lagi lain waktu*`;
  }
};

const handleImageQuery = async (url, text, user) => {
  try {
    const history = loadHistory(user);

    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const imageData = Buffer.from(response.data).toString('base64');

    const prompt = [
      ...history.map(item => `**${item.role === 'assistant' ? 'Gemini' : 'User'}**: ${item.content}`),
      `**User**: ${text}`,
      `**Gemini**: `,
      { inlineData: { data: imageData, mimeType: 'image/png' } }
    ];

    const result = await model.generateContent(prompt);
    const groqOutputText = result.response.text();

    const cleanedOutputText = groqOutputText.replace(/^(.*?)(user|gemini|$)/i, '$1').trim();

    history.push({ role: 'user', content: text });
    history.push({ role: 'assistant', content: cleanedOutputText });
    saveHistory(user, history);

    return cleanedOutputText;
  } catch (error) {
    console.error('Error in handleImageQuery:', error);
    return `> ${error.message}\n*Coba lagi lain waktu*`;
  }
};

module.exports = {
  handleTextQuery,
  handleImageQuery
};