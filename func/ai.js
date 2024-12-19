const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMMA_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMMA_MODEL_NAME = "gemma2-9b-it";
const API_KEY = "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";
const BASE_URL = "https://copper-ambiguous-velvet.glitch.me";

const RESPONSE_SETTINGS = {
  "Kreatif": { temperature: 0.7, top_p: 0.9 },
  "Seimbang": { temperature: 0.5, top_p: 0.8 },
  "Standar": { temperature: 0.3, top_p: 0.7 },
};

const DEFAULT_GENERATION_CONFIG = {
  max_tokens: 512,
  stream: false,
  stop: null,
};

const genAI = new GoogleGenerativeAI(API_KEY);

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

const getResponseSettings = (responseType) => {
  return RESPONSE_SETTINGS[responseType] || RESPONSE_SETTINGS["Standar"];
};

const promptUserForResponseType = () => {
  return "Silakan pilih tipe respons dengan menuliskan angka:\n1. Kreatif\n2. Seimbang\n3. Standar";
};

const handleUserResponseTypeSelection = async (user, input) => {
  const options = { "1": "Kreatif", "2": "Seimbang", "3": "Standar" };
  const responseType = options[input];
  if (!responseType) return "Harap masukkan angka 1, 2, atau 3.";
  const modelConfig = await fetchModelConfig(user);
  modelConfig.responseType = responseType;
  await saveModelConfig(user, modelConfig);
  return `Tipe respons telah disetel ke: ${responseType}. Anda dapat mulai bertanya sekarang.`;
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

  if (!modelConfig.responseType) {
    if (/^\d$/.test(text)) {
      return handleUserResponseTypeSelection(user, text);
    }
    return promptUserForResponseType();
  }

  const responseSettings = getResponseSettings(modelConfig.responseType);
  const generationConfig = { ...DEFAULT_GENERATION_CONFIG, ...responseSettings };

  const history = await fetchHistory(user);
  history.push({ role: "user", content: text });
  const updatedHistory = manageTokenCount(history);

  const messages = [{ role: "system", content: modelConfig.systemPrompt || "" }, ...updatedHistory];

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
};

const handleTextQuery = async (text, user) => {
  if (text.toLowerCase() === "reset") {
    await resetUserPreferences(user);
    return "Riwayat percakapan dan preferensi telah direset. Silakan pilih tipe respons lagi:\n" + promptUserForResponseType();
  }

  return processTextQuery(text, user);
};

const handleImageQuery = async (url, text, user) => {
  const modelConfig = await fetchModelConfig(user);

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

  const result = await genAI.generateContent(prompt, responseSettings);
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