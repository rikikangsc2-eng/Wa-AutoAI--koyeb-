const axios = require('axios');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMMA_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const ALTERNATIVE_API_URL = "https://express-vercel-ytdl.vercel.app/llm";
const GEMMA_MODEL_NAME = "gemma2-9b-it";
const API_KEY = "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";
const API_KEY_2 = "AIzaSyAgZm62eZ4C4hZsldI52cka5XwNapGWPWw";
const model_gemini = `gemini-2.0-flash-exp`;
const BASE_URL = "https://copper-ambiguous-velvet.glitch.me";

const RESPONSE_SETTINGS = [
  {
    name: "Creative",
    description: "Mode ini menghasilkan respons yang sangat kreatif, penuh dengan ide-ide unik dan imajinatif.",
    temperature: 0.9,
    top_p: 0.95
  },
  {
    name: "Balanced",
    description: "Mode ini memberikan respons yang seimbang antara kreatif dan logis, cocok untuk percakapan umum.",
    temperature: 0.7,
    top_p: 0.8
  },
  {
    name: "Logical",
    description: "Mode ini memberikan respons yang fokus pada logika dan fakta, cocok untuk penyelesaian masalah.",
    temperature: 0.4,
    top_p: 0.6
  },
  {
    name: "Explorative",
    description: "Mode ini mengeksplorasi kemungkinan respons dengan keluasan ide, sering cocok untuk brainstorming.",
    temperature: 1.0,
    top_p: 0.9
  },
  {
    name: "Precise",
    description: "Mode ini menghasilkan respons yang fokus dan langsung, cocok untuk jawaban spesifik dan to the point.",
    temperature: 0.3,
    top_p: 0.5
  }
];

const DEFAULT_GENERATION_CONFIG = {
  max_tokens: 512,
  stream: false,
  stop: null,
};

const genAI = new GoogleGenerativeAI(API_KEY_2);

const fetchHistory = async (user) => {
  const res = await axios.get(`${BASE_URL}/history/${user}`);
  return res.data.history || [];
};

const saveHistory = async (user, history) => {
  await axios.post(`${BASE_URL}/history/${user}`, { history });
};

const fetchModelConfig = async (user) => {
  const res = await axios.get(`${BASE_URL}/model/${user}`);
  return res.data || { lastTokenCount: 0, systemPrompt: "", isPremium: false, responseType: null };
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

const promptUserForResponseType = () => {
  const options = RESPONSE_SETTINGS.map((setting, index) => 
    `${index + 1}. ${setting.name}: ${setting.description}`).join('\n');
  return `Sebelum lanjut chat dengan Alicia, ayok sesuaikan gaya respon yang kamu inginkan agar Alicia merespon dengan keinginan kamu\n\n${options}\n\n*Pilih antara 1 sampai 5*`;
};

const getResponseSettings = (responseType) => {
  const setting = RESPONSE_SETTINGS.find((s) => s.name === responseType);
  return setting ? { temperature: setting.temperature, top_p: setting.top_p } : null;
};

const handleUserResponseTypeSelection = async (user, input) => {
  const index = RESPONSE_SETTINGS.findIndex((setting, i) =>
    input.includes((i + 1).toString()) || input.toLowerCase().includes(['satu', 'dua', 'tiga', 'empat', 'lima'][i])
  );
  const selectedSetting = RESPONSE_SETTINGS[index];

  if (!selectedSetting) {
    return `Pilihan tidak valid. Harus memilih angka antara 1 sampai ${RESPONSE_SETTINGS.length}.\n\n${promptUserForResponseType()}`;
  }

  const modelConfig = await fetchModelConfig(user);
  modelConfig.responseType = selectedSetting.name;
  await saveModelConfig(user, modelConfig);
  return `Tipe respons telah disetel ke: ${selectedSetting.name}. Anda dapat mulai bertanya sekarang.`;
};

const resetUserPreferences = async (user) => {
  const modelConfig = await fetchModelConfig(user);
  modelConfig.responseType = null;
  modelConfig.lastTokenCount = 0;
  await saveModelConfig(user, modelConfig);
  await saveHistory(user, []);
};

const processTextQuery = async (text, user) => {
  let modelConfig = await fetchModelConfig(user);

  if (!modelConfig.responseType || !getResponseSettings(modelConfig.responseType)) {
    const numericMatch = text.match(/\b\d\b/) || text.toLowerCase().match(/satu|dua|tiga|empat|lima/);
    if (numericMatch) {
      return handleUserResponseTypeSelection(user, text);
    }
    return promptUserForResponseType();
  }

  const responseSettings = getResponseSettings(modelConfig.responseType);
  const generationConfig = { ...DEFAULT_GENERATION_CONFIG, ...responseSettings };

  const history = await fetchHistory(user);
  history.push({ role: "user", content: text });
  const updatedHistory = manageTokenCount(history);

  const messages = [{ role: "system", content: modelConfig.systemPrompt || fs.readFileSync('./prompt.txt', 'utf8') }, ...updatedHistory];

  try {
    const response = await axios.post(
      GEMMA_API_URL,
      { model: GEMMA_MODEL_NAME, messages, ...generationConfig },
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );
    const responseText = response.data.choices[0].message.content;
    updatedHistory.push({ role: "assistant", content: responseText });
    await saveHistory(user, updatedHistory);

    modelConfig.lastTokenCount = updatedHistory.reduce((acc, msg) => acc + msg.content.length, 0);
    await saveModelConfig(user, modelConfig);

    return responseText;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      try {
        const response = await axios.post(ALTERNATIVE_API_URL, { model: GEMMA_MODEL_NAME, messages, ...generationConfig });
        const responseText = response.data.choices[0].message.content;
        updatedHistory.push({ role: "assistant", content: responseText });
        await saveHistory(user, updatedHistory);

        modelConfig.lastTokenCount = updatedHistory.reduce((acc, msg) => acc + msg.content.length, 0);
        await saveModelConfig(user, modelConfig);

        return responseText;
      } catch (altError) {
        if (altError.response && altError.response.status === 429) {
          return "Server sedang kewalahan!";
        }
        return `API 2: ${altError.message}`;
      }
    }
    return `API 1: ${error.message}`;
  }
};

const handleTextQuery = async (text, user) => {
  if (text.toLowerCase() === "reset") {
    await resetUserPreferences(user);
    return "Riwayat percakapan dan preferensi telah direset. Silakan pilih tipe respons lagi:\n" + promptUserForResponseType();
  }

  if (text.toLowerCase().startsWith("setprompt:")) {
    const modelConfig = await fetchModelConfig(user);
    if (!modelConfig.isPremium) {
      return "Anda harus premium, beli di *.owner* hanya 5k kok";
    }
    modelConfig.systemPrompt = text.replace("setprompt:", "").trim();
    await saveModelConfig(user, modelConfig);
    await saveHistory(user, []);
    return "Prompt telah diubah dan riwayat telah dihapus.";
  }

  if (text.toLowerCase().startsWith("setprem:")) {
    const adminNumber = "94391287";
    if (user.includes(adminNumber)) {
      const targetUser = text.replace("setprem:", "").trim();
      const targetConfig = await fetchModelConfig(targetUser);
      targetConfig.isPremium = true;
      await saveModelConfig(targetUser, targetConfig);
      return `${targetUser} sekarang adalah pengguna premium.`;
    } else {
      return "Anda tidak memiliki izin untuk mengubah pengguna menjadi premium.";
    }
  }

  if (text.toLowerCase() === "resetprompt") {
    const modelConfig = await fetchModelConfig(user);
    modelConfig.systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
    await saveModelConfig(user, modelConfig);
    return "Prompt telah direset.";
  }

  return processTextQuery(text, user);
};

const handleImageQuery = async (url, text, user) => {
  const modelConfig = await fetchModelConfig(user);

  if (!modelConfig.isPremium) {
    return "Anda harus premium untuk menggunakan fitur ini.";
  }

  if (!modelConfig.responseType) {
    return promptUserForResponseType();
  }

  const responseSettings = getResponseSettings(modelConfig.responseType);
  const history = await fetchHistory(user);

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
  await saveHistory(user, history);

  return responseText;
};

module.exports = {
  handleTextQuery,
  handleImageQuery,
};