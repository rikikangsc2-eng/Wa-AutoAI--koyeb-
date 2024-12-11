const axios = require('axios');
const GEMMA_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMMA_MODEL_NAME = "gemma2-9b-it";
const API_KEY = "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";
const ALT_API_URL = "https://express-vercel-ytdl.vercel.app/llm";
const BASE_URL = "https://copper-ambiguous-velvet.glitch.me";

const generationConfig = {
  temperature: 0.65,
  max_tokens: 512,
  top_p: 0.75,
  stream: false,
  stop: null,
};

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

    const sendRequest = async (apiUrl, apiKey, useKey = true) => {
      const payload = {
        model: GEMMA_MODEL_NAME,
        messages,
        ...generationConfig,
      };
      const headers = { 'Content-Type': 'application/json' };
      if (useKey) headers.Authorization = `Bearer ${apiKey}`;
      return await axios.post(apiUrl, payload, { headers });
    };

    let responseGemma;
    try {
      responseGemma = await sendRequest(GEMMA_API_URL, API_KEY);
    } catch (error) {
      if (error.response && error.response.status === 429) {
        try {
          responseGemma = await sendRequest(ALT_API_URL, null, false);
        } catch (altError) {
          if (altError.response && altError.response.status === 429) {
            return 'Terjadi kesalahan karena tingginya permintaan';
          }
          throw new Error(`Error status code ${altError.response?.status || 'unknown'} for alt API`);
        }
      } else {
        throw new Error(`Error status code ${error.response?.status || 'unknown'} for API 1`);
      }
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

    const prompt = [
      ...history.map(item => `**${item.role === 'assistant' ? 'Assistant' : 'User'}**: ${item.content}`),
      `**User**: ${text}`,
      `**Assistant**: `,
    ];

    const apiUrl = `https://api.ryzendesu.vip/api/ai/blackbox?chat=${encodeURIComponent(prompt.join('\n'))}&options=gemini-pro&imageurl=${encodeURIComponent(url)}`;
    const response = await axios.get(apiUrl, { headers: { 'accept': 'application/json' } });

    const responseText = response.data.response;
    history.push({ role: 'user', content: text });
    history.push({ role: 'assistant', content: responseText });
    await saveHistory(user, history);

    return responseText;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      return '> Terjadi masalah karena terlalu banyak permintaan. Coba lagi nanti.';
    }
    return `> ${error.message}\n*Coba lagi lain waktu*`;
  }
};

module.exports = {
  handleTextQuery,
  handleImageQuery,
};
