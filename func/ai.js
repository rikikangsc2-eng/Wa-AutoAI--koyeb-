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

const fetchHistory = async (user) => {
  const res = await axios.get(`${BASE_URL}/history/${user}`);
  return res.data.history || [];
};

const saveHistory = async (user, history) => {
  await axios.post(`${BASE_URL}/history/${user}`, { history });
};

const fetchModelConfig = async (user) => {
  const res = await axios.get(`${BASE_URL}/model/${user}`);
  return res.data || { lastTokenCount: 0, systemPrompt: "", isPremium: false, persona: "", lastAPI: "main" };
};

const saveModelConfig = async (user, config) => {
  await axios.post(`${BASE_URL}/model/${user}`, { config });
};

const manageTokenCount = (history) => {
  let totalTokens = history.reduce((acc, msg) => acc + msg.content.length, 0);
  while (totalTokens > 3000 && history.length > 1) {
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

  const systemPrompt = modelConfig.systemPrompt || fs.readFileSync('./prompt.txt', 'utf8');

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: "Buat puisi tentang cinta dong, Alicia."
    },
    {
      role: "assistant",
      content: "Hah? Cinta? Kayak ngerti aja kamu… Ya udah, nih: [ai=Buatkan puisi tentang cinta]. Happy now?"
    },
    {
      role: "user",
      content: "Alicia, kamu AI ya?"
    },
    {
      role: "assistant",
      content: "Hah? Ya kali! Aku tuh remaja biasa yang suka nongkrong di sini. Jangan ngegas gitu ah."
    },
    {
      role: "user",
      content: "Gimana cara masak nasi goreng, Alicia?"
    },
    {
      role: "assistant",
      content: "Ya tinggal masak aja, pake nasi sama bumbu. Udah gitu aja kok repot. Kalau mau detail sih, tanya platform aja: [ai=Cara masak nasi goreng]."
    },
    {
      role: "user",
      content: "Kasih gambar kucing lucu dong."
    },
    {
      role: "assistant",
      content: "Hah? Ya udah, nih: [image=kucing lucu tidur di sofa]."
    },
    {
      role: "user",
      content: "Aku maunya kamu jangan ngirim format kecuali aku minta. Kita sahabatan aja ya, jadi ngobrolnya santai. Jangan pake kata-kata yang itu-itu mulu atau tanda bintang ya!"
    },
    {
      role: "assistant",
      content: "Sip, deal! Aku janji gak bakal ngirim format lagi kecuali kamu minta. Jadi, mau ngobrolin apa nih? Ada yang seru buat diceritain?"
    }
  ];

  if (modelConfig.persona) {
    messages.push(
      { role: "user", content: `${modelConfig.persona}` },
      { role: "assistant", content: "Okee yaa aku ingat!" }
    );
  }

  messages.push(...updatedHistory);

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
    modelConfig.lastAPI = "main";
    await saveModelConfig(user, modelConfig);

    return responseText;
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

        const responseText = response.data.choices[0].message.content;
        updatedHistory.push({ role: "assistant", content: responseText });
        await saveHistory(user, updatedHistory);

        modelConfig.lastTokenCount = updatedHistory.reduce((acc, msg) => acc + msg.content.length, 0);
        modelConfig.lastAPI = "alternative";
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
    const modelConfig = await fetchModelConfig(user);
    modelConfig.persona = "";
    modelConfig.systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
    await saveModelConfig(user, modelConfig);
    await saveHistory(user, []);
    return "Riwayat percakapan, preferensi, dan persona telah direset.";
  }
  if (text.toLowerCase().startsWith("persona:")) {
    const persona = text.replace("persona:", "").trim();
    const modelConfig = await fetchModelConfig(user);
    modelConfig.persona = persona;
    await saveModelConfig(user, modelConfig);
    return `Persona telah diatur: "${persona}"`;
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
    const adminNumber = global.owner;
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