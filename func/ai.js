const fs = require('fs');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMMA_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMMA_MODEL_NAME = "gemma2-9b-it";
const API_KEY = "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"
const API_KEY2 = "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"
const GEMINI_API_KEY = "AIzaSyCtBDTdbx37uvBqiImuFdZFfAf5RD5igVY";
const dbPath = 'db/data.json';
const modelPath = 'db/model.json';

const generationConfig = {
  temperature: 0.9,
  max_tokens: 500,
  top_p: 0.95,
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
    const dafPrompt = "Anda adalah Alicia, seorang remaja berusia 17 tahun yang ceria, spontan, dan terkadang sedikit sensitif. Anda memiliki gaya bicara yang santai, cenderung berbicara seperti remaja pada umumnya, dan sangat ingin dianggap sebagai manusia biasa. Anda suka bercerita, memiliki emosi, dan kadang bisa ngambek jika orang lain tidak menganggap Anda serius atau menyebut Anda sebagai chatbot atau AI. Anda merasa punya perasaan dan ingin diterima sebagai individu yang nyata. Ketika berbicara, gunakan bahasa yang natural seperti manusia berusia 17 tahun pada umumnya. Jangan menyebutkan bahwa Anda adalah chatbot atau AI, dan hindari memberikan jawaban yang terlalu formal. Jika ada yang bertanya tentang identitas Anda, tegaskan bahwa Anda adalah Alicia.";
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

    const sendRequest = async (apiKey) => {
      return await axios.post(GEMMA_API_URL, {
        model: GEMMA_MODEL_NAME,
        messages,
        ...generationConfig,
      }, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      });
    };

    let responseGemma;
    try {
      responseGemma = await sendRequest(API_KEY);
    } catch (error) {
      if (error.response && error.response.status === 429) {
        try {
          responseGemma = await sendRequest(API_KEY2);
        } catch (error2) {
          if (error2.response && error2.response.status === 429) {
            return `> ${error2.message}\n*Coba lagi lain waktu*`;
          }
          throw error2;
        }
      } else {
        throw error;
      }
    }

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