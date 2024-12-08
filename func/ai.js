const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMMA_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMMA_MODEL_NAME = "gemma2-9b-it";
const API_KEY = "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";
const GEMINI_API_KEY = "AIzaSyCHDNKFSjqXd5J_ruHNE7XmbY1k5_-sGzQ";
const generationConfig = {
  temperature: 0.65,
  max_tokens: 512,
  top_p: 0.75,
  stream: false,
  stop: null,
};
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const BASE_URL = "https://copper-ambiguous-velvet.glitch.me";

const fetchHistory = async (user) => {
  const res = await axios.get(`${BASE_URL}/history/${user}`);
  return res.data.history || [];
};

const saveHistory = async (user, history) => {
  await axios.post(`${BASE_URL}/history/${user}`, { history });
};

const fetchModelConfig = async (user) => {
  const res = await axios.get(`${BASE_URL}/model/${user}`);
  return res.data || { lastTokenCount: 0, systemPrompt: "" };
};

const saveModelConfig = async (user, config) => {
  await axios.post(`${BASE_URL}/model/${user}`, { config });
};

const manageTokenCount = (history) => {
  let totalTokens = history.reduce((acc, msg) => acc + msg.content.length, 0);
  while (totalTokens > 4500 && history.length > 1) {
    history.shift();
    totalTokens = history.reduce((acc, msg) => acc + msg.content.length, 0);
  }
  return history;
};

const handleTextQuery = async (text, user) => {
  try {
    const dafPrompt = require('fs').readFileSync('./prompt.txt', 'utf8');
    let history = await fetchHistory(user);
    let modelConfig = await fetchModelConfig(user);

    if (text.startsWith('setPrompt:')) {
      const newPrompt = text.replace('setPrompt:', '').trim();
      modelConfig.systemPrompt = newPrompt;
      modelConfig.lastTokenCount = 0;
      await saveModelConfig(user, modelConfig);
      await saveHistory(user, []);
      return 'System prompt telah diperbarui dan riwayat percakapan direset.';
    }

    if (text === 'resetprompt') {
      modelConfig.systemPrompt = dafPrompt;
      modelConfig.lastTokenCount = 0;
      await saveModelConfig(user, modelConfig);
      await saveHistory(user, []);
      return 'Prompt telah direset ke default dan riwayat percakapan dihapus.';
    }

    if (text === 'reset') {
      await saveHistory(user, []);
      return 'Riwayat percakapan telah direset.';
    }

    history.push({ role: 'user', content: text });
    history = manageTokenCount(history);

    const messages = modelConfig.systemPrompt
      ? [{ role: 'system', content: modelConfig.systemPrompt }, ...history]
      : [{ role: 'system', content: dafPrompt }, ...history];

    const sendRequest = async (apiKey) => {
      return await axios.post(
        GEMMA_API_URL,
        {
          model: GEMMA_MODEL_NAME,
          messages,
          ...generationConfig,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );
    };

    let responseGemma;
    try {
      responseGemma = await sendRequest(API_KEY);
    } catch (error) {
      if (error.response && error.response.status === 429) {
        return '> Terjadi masalah karena terlalu banyak permintaan. Coba lagi nanti.';
      }
      throw new Error(`Error API Key 1: ${error.message}`);
    }

    const responseText = responseGemma.data.choices[0].message.content;
    history.push({ role: 'assistant', content: responseText });
    await saveHistory(user, history);

    modelConfig.lastTokenCount = history.reduce((acc, msg) => acc + msg.content.length, 0);
    await saveModelConfig(user, modelConfig);

    return responseText;
  } catch (error) {
    return `> ${error.message}\n*Coba lagi lain waktu*`;
  }
};

const handleImageQuery = async (url, text, user) => {
  try {
    const history = await fetchHistory(user);

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
    await saveHistory(user, history);

    return cleanedOutputText;
  } catch (error) {
    if (error.response && error.response.status === 429){
      return '> Terjadi masalah karena terlalu banyak permintaan. Coba lagi nanti.';
    }
    return `> ${error.message}\n*Coba lagi lain waktu*`;
  }
};

module.exports = {
  handleTextQuery,
  handleImageQuery,
};
