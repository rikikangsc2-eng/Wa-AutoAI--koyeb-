const processTextQuery = async (text, user) => {
  let modelConfig = await fetchModelConfig(user);

  if (!modelConfig.isPremium && modelConfig.systemPrompt !== fs.readFileSync('./prompt.txt', 'utf8')) {
    modelConfig.systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
    await saveModelConfig(user, modelConfig);
  }

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

  const messages = [
    { role: "system", content: modelConfig.systemPrompt || fs.readFileSync('./prompt.txt', 'utf8') },
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
