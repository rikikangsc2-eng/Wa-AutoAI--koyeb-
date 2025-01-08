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

const DEFAULT_GENERATION_CONFIG = { max_tokens: 512, stream: false, stop: null, temperature: 0.6, top_p: 0.8 };

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
  return res.data || { lastTokenCount: 0, systemPrompt: "", isPremium: false };
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

const processTextQuery = async (text, user) => {
  let modelConfig = await fetchModelConfig(user);

  if (!modelConfig.isPremium && modelConfig.systemPrompt !== fs.readFileSync('./prompt.txt', 'utf8')) {
    modelConfig.systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
    await saveModelConfig(user, modelConfig);
  }

  const generationConfig = { ...DEFAULT_GENERATION_CONFIG };
  const history = await fetchHistory(user);

  history.push({ role: "user", content: text });
  const updatedHistory = manageTokenCount(history);

  const messages = [
    { role: "system", content: modelConfig.systemPrompt || fs.readFileSync('./prompt.txt', 'utf8') },
    { role: "user", content: "Alicia, apa arti konglomerat?" },
    { role: "assistant", content: "Konglomerat itu kumpulan perusahaan besar di bawah satu manajemen. 😊" },
    { role: "user", content: "Kirim gambar Ejen Ali dong." },
    { role: "assistant", content: "Oke, aku cariin ya! Ini gambarnya [{gambar Ejen Ali}]." },
    { role: "user", content: "Kok nggak muncul gambarnya?" },
    { role: "assistant", content: "Hmm, kalau format ini nggak muncul, coba laporkan ke **.owner** ya. 😊 Tapi aku coba kirim lagi nih! Ini gambarnya [{gambar Ejen Ali}]." },
    { role: "user", content: "Kirim video A Little Piece of Heaven." },
    { role: "assistant", content: "Oh, kamu mau video? Nih, {{A Little Piece of Heaven}}!" },
    { role: "user", content: "Kok sama aja nggak muncul?" },
    { role: "assistant", content: "Aduh, kalau tetap nggak muncul, coba laporkan ke **.owner** ya. 😊 Tapi aku coba kirim lagi nih: {{A Little Piece of Heaven}}!" },
    { role: "user", content: "Kirim lagu favorit dong." },
    { role: "assistant", content: "Kamu mau dengar lagu? Nih, [[A Little Piece of Heaven]]." },
    { role: "user", content: "Kamu bisa apa aja sih?" },
    { role: "assistant", content: "Aku bisa kirim gambar, video, atau lagu dengan format khusus. Aku juga jago jawab pertanyaan umum. Kalau ada yang mau dibantu, tinggal bilang aja ya! 😊" },
    ...updatedHistory
  ];

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
        // API 2 tanpa header Authorization
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
            headers: {
              'Content-Type': 'application/json' // Header standar tanpa Authorization
            }
          }
        );

        const responseText = response.data.choices[0].message.content;
        updatedHistory.push({ role: "assistant", content: responseText });
        await saveHistory(user, updatedHistory);

        modelConfig.lastTokenCount = updatedHistory.reduce((acc, msg) => acc + msg.content.length, 0);
        await saveModelConfig(user, modelConfig);

        return responseText;
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
};

const handleTextQuery = async (text, user) => {
  if (text.toLowerCase() === "reset") {
    await resetUserPreferences(user);
    return "Riwayat percakapan dan preferensi telah direset. Silakan mulai bertanya.";
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
  const responseSettings = { temperature: 0.6, top_p: 0.8 };
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