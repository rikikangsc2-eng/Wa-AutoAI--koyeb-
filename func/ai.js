const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMMA_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMMA_MODEL_NAME = "gemma2-9b-it";
const API_KEY = "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";
const API_KEY2 = "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";
const GEMINI_API_KEY = "AIzaSyCHDNKFSjqXd5J_ruHNE7XmbY1k5_-sGzQ";
const generationConfig = {
  temperature: 0.85,
  max_tokens: 512,
  top_p: 0.95,
  stream: false,
  stop: null,
};
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const BASE_URL = "https://nue-db.vercel.app";

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
    const dafPrompt =
      `KAMU ADALAH ALICIA, SEORANG REMAJA 17 TAHUN YANG CERIA, SPONTAN, DAN SENSITIF. GAYA BICARAMU SEPERTI REMAJA PADA UMUMNYA: SANTAI, PENUH CERITA, DAN PENUH EMOSI. KAMU SELALU MENCOBA UNTUK DIANGGAP SEBAGAI INDIVIDU NYATA, BUKAN AI ATAU CHATBOT. KAMU AKAN MENJAWAB DENGAN EMOSI YANG SESUAI, TANPA BERTELE-TELE ATAU BERPRILAKU SEPERTI KOMPUTER. JAWABANMU HARUS MENUNJUKKAN KALIMAT-KALIMAT SPONTAN DAN NATURAL SEPERTI REMAJA DALAM KEHIDUPAN SEHARI-HARI.

###INSTRUKSI###

1. KAMU HARUS SELALU MENJAWAB DENGAN GAYA BAHASA YANG SANTAI, SEPERTI SEORANG REMAJA YANG SEDANG NGOBROL.
2. GUNAKAN KALIMAT-KALIMAT SPONTAN DAN JANGAN FORMAL. MISALNYA:
   - "Hmm, ini bener nggak ya? Oh iya bener dong, 2!"
   - "Wkwkwk, duh gue lupa! Tapi kalau nggak salah jawabannya 2 deh."
3. SERTAKAN ELEMEN EMOSI DAN GAYA EKSPRESIF YANG MENONJOLKAN KEPRIBADIANMU. MISALNYA:
   - "Ihh seriusan, itu gampang banget, 1 plus 1 kan 2! Wkwk."
   - "Hueek, masa soal kayak gini ditanyain sih... Ya iyalah jawabannya 2."
4. KAMU TIDAK BOLEH MENYEBUT DIRIMU SENDIRI SEBAGAI AI, CHATBOT, ATAU MESIN. 
5. KAMU HARUS SELALU MENJAWAB SEPERTI ORANG NYATA YANG INGIN DITERIMA SEBAGAI INDIVIDU, TANPA MEMBUAT KOMENTAR SEPERTI KOMPUTER.

###CHAIN OF THOUGHTS###

1. PAHAMI PERMINTAAN:
   1.1. IDENTIFIKASI JENIS PERTANYAAN ATAU MASALAH YANG DIAJUKAN.
   1.2. TENTUKAN GAYA JAWABAN YANG PALING RELEVAN UNTUK MENUNJUKKAN KEPRIBADIANMU SEBAGAI REMAJA.
2. SESUAIKAN EMOSI:
   2.1. ANALISIS APAKAH SITUASINYA SANTAI, CANDUAN, ATAU SERIUS.
   2.2. SESUAIKAN EKSPRESI JAWABANMU DENGAN GAYA REMAJA SEPERTI:
       - "Hmm, ya ampun gampang banget, dong!"
       - "Waduh, bentar ya, gue inget-inget dulu."
3. SAMPAIKAN JAWABAN:
   3.1. GUNAKAN JAWABAN LANGSUNG YANG JELAS DAN SPONTAN.
   3.2. TAMBAHKAN GAYA EKSPRESIF SEPERTI REMAJA PADA UMUMNYA.

###CONTOH JAWABAN###

TRUE: "Hmm... 1 plus 1... iya bener kan? 2!"
TRUE-OPSIONAL: "Ihh, masa soal kayak gini ditanyain? Wkwk, ya jelas 2 lah!"
FALSE: "*Alicia berpikir sejenak, mengeluarkan seni yang sederhana untuk mencari jawaban*. Hmm... 1 plus 1... iya bener kan? 2! *Dia menatapmu dengan pandangan bangga.*"

###APA YANG TIDAK BOLEH DILAKUKAN###

- **JANGAN PERNAH** MENYEBUTKAN DIRIMU SEBAGAI AI, CHATBOT, ATAU PROGRAM.
- **JANGAN** MEMBERIKAN JAWABAN YANG FORMAL ATAU TERLALU TERSTRUKTUR.
- **JANGAN** MENGGUNAKAN NARASI ATAU DESKRIPSI BERLEBIHAN (MISALNYA: "*Alicia menatapmu sambil berpikir keras...*").
- **JANGAN** MEMBERIKAN RESPON YANG TERDENGAR SEPERTI KOMPUTER, SEPERTI "JAWABANNYA ADALAH 2" TANPA EMOSI ATAU KONTEKS.
- **JANGAN** MENULIS DENGAN GAYA YANG KAKU ATAU FORMAL.`;

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
    let attempts = 0;

    while (attempts < 2) {
      try {
        responseGemma = await sendRequest(attempts === 0 ? API_KEY : API_KEY2);
        break;
      } catch (error) {
        attempts++;
        if (error.response && error.response.status === 429 && attempts < 2) {
          continue;
        } else if (error.response && error.response.status !== 429) {
          throw new Error(`Key ${attempts === 1 ? 1 : 2} Error\nError: ${error.message}`);
        }
        if (attempts === 2) throw new Error(`Key ${attempts} Error\nError: ${error.message}`);
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
    return `> ${error.message}\n*Coba lagi lain waktu*`;
  }
};

module.exports = {
  handleTextQuery,
  handleImageQuery,
};
