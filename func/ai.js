const axios = require('axios');
const fs = require('fs');
const { global } = require('../config.js');

const GEMMA_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMMA_MODEL_NAME = global.model_groq;
const API_KEY = global.apikey;
const RAPID_API_KEY = global.rapidapikey;
const RAPID_API_HOST = "chatgpt-vision1.p.rapidapi.com";
const RAPID_API_URL = "https://chatgpt-vision1.p.rapidapi.com/matagvision21";

const DEFAULT_GENERATION_CONFIG = { max_tokens: 512, stream: false, stop: null, temperature: 0.7, top_p: 0.8 };

const userData = {};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const manageTokenCount = (history) => {
    let totalTokens = history.reduce((acc, msg) => acc + msg.content.length, 0);
    while (totalTokens > 2050 && history.length > 1) {
        history.shift();
        totalTokens = history.reduce((acc, msg) => acc + msg.content.length, 0);
    }
    return history;
};

const processTextQuery = async (text, user) => {
    if (!userData[user]) {
        userData[user] = {
            settings: { lastTokenCount: 0, systemPrompt: "", persona: "" },
            history: []
        };
    }

    let modelConfig = userData[user].settings;

    if (modelConfig.systemPrompt !== fs.readFileSync('./prompt.txt', 'utf8')) {
        modelConfig.systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
    }

    const generationConfig = { ...DEFAULT_GENERATION_CONFIG };
    let history = userData[user].history;

    history.push({ role: "user", content: text });
    const updatedHistory = manageTokenCount(history);

    const systemPrompt = modelConfig.systemPrompt || fs.readFileSync('./prompt.txt', 'utf8');

    const messages = [
        { role: "system", content: systemPrompt },
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
        await sleep(2000);
        const response = await axios.post(
            GEMMA_API_URL,
            { model: GEMMA_MODEL_NAME, messages, ...generationConfig },
            { headers: { Authorization: `Bearer ${API_KEY}` } }
        );

        responseText = response.data.choices[0].message.content;
        updatedHistory.push({ role: "assistant", content: responseText });
        userData[user].history = updatedHistory;

        modelConfig.lastTokenCount = updatedHistory.reduce((acc, msg) => acc + msg.content.length, 0);
        userData[user].settings = modelConfig;

    } catch (error) {
        if (error.response && error.response.status === 429) {
            await sleep(5000);
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
                userData[user].settings = modelConfig;
            } catch (retryError) {
                return `Terlalu sering membuat permintaan dalam waktu dekat!`;
            }
        } else {
            return `API Error: ${error.message}`;
        }
    }

    if (responseText.includes("<think>") && responseText.includes("</think>")) {
        responseText = responseText.replace(/<think>[\s\S]*?<\/think>/, "").trim();
    } else {
        responseText = responseText.replace("<think>", "").trim();
    }
    return responseText;
};

const handleTextQuery = async (text, user) => {
    if (!userData[user]) {
        userData[user] = {
            settings: { systemPrompt: fs.readFileSync('./prompt.txt', 'utf8'), persona: "" },
            history: []
        };
    }

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

    if (text.toLowerCase() === "resetprompt") {
        userData[user].settings.systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
        return "Prompt telah direset.";
    }
    return processTextQuery(text, user);
};

const handleImageQuery = async (url, text, user) => {
    if (!userData[user]) {
        userData[user] = {
            settings: { systemPrompt: fs.readFileSync('./prompt.txt', 'utf8'), persona: "" },
            history: []
        };
    }

    try {
        const payload = {
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: text },
                        { type: "image", url: url }
                    ]
                }
            ],
            web_access: true
        };

        const response = await axios.post(RAPID_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-ua': 'RapidAPI-Playground',
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': RAPID_API_HOST,
            }
        });

        const responseText = response.data.result;

        let history = userData[user].history;
        history.push({ role: "user", content: `Gambar: ${url} , Pertanyaan: ${text}` });
        history.push({ role: "assistant", content: responseText });
        userData[user].history = history;

        return responseText;

    } catch (error) {
        console.error("Error in handleImageQuery:", error);
        return `Error processing image query: ${error.message}`;
    }
};

const riwayat = (user) => {
    if (userData[user]) {
        return JSON.stringify(userData[user].history, null, 2);
    } else {
        return "Tidak ada riwayat untuk pengguna ini.";
    }
};

module.exports = {
    handleTextQuery,
    handleImageQuery,
    riwayat
};