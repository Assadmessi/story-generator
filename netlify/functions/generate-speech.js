const GEMINI_TTS_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const LANGUAGE_CONFIG = {
  en: {
    locale: "en-US",
    voices: [
      {
        voiceName: "Kore",
        label: "Storyteller 1",
        stylePrompt: "Read this story out loud in warm, natural, expressive English. Make it feel like a polished storyteller voice. Keep the pacing smooth, clear, and pleasant. Speak only the story text with no extra introduction or commentary."
      },
      {
        voiceName: "Aoede",
        label: "Storyteller 2",
        stylePrompt: "Read this story out loud in breezy, cinematic English with a gentle storytelling feel. Keep it smooth, emotionally natural, and easy to follow. Speak only the story text with no extra introduction or commentary."
      },
      {
        voiceName: "Umbriel",
        label: "Storyteller 3",
        stylePrompt: "Read this story out loud in calm, easy-going English with a rich bedtime-story rhythm. Keep the delivery smooth, warm, and immersive. Speak only the story text with no extra introduction or commentary."
      }
    ]
  },
  mm: {
    locale: "my-MM",
    voices: [
      {
        voiceName: "Puck",
        label: "Storyteller 1",
        stylePrompt: "Read this story out loud in natural Burmese (Myanmar language) with a warm, vivid storytelling tone. Keep the pacing smooth, clear, expressive, and pleasant. Speak only the story text with no extra introduction or commentary."
      },
      {
        voiceName: "Kore",
        label: "Storyteller 2",
        stylePrompt: "Read this story out loud in natural Burmese (Myanmar language) with a steady, polished storyteller voice. Keep the delivery clear, emotionally smooth, and easy to follow. Speak only the story text with no extra introduction or commentary."
      },
      {
        voiceName: "Aoede",
        label: "Storyteller 3",
        stylePrompt: "Read this story out loud in natural Burmese (Myanmar language) with a gentle, cinematic storytelling style. Keep it smooth, warm, and immersive. Speak only the story text with no extra introduction or commentary."
      }
    ]
  }
};

function getLanguageConfig(language = "en") {
  return LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;
}

function getVoiceSequence(language = "en", voiceVariant = 0) {
  const config = getLanguageConfig(language);
  const voices = Array.isArray(config.voices) && config.voices.length ? config.voices : LANGUAGE_CONFIG.en.voices;
  const normalizedIndex = Number.isInteger(voiceVariant) ? voiceVariant : Number.parseInt(voiceVariant, 10) || 0;
  const startIndex = ((normalizedIndex % voices.length) + voices.length) % voices.length;
  return voices.slice(startIndex).concat(voices.slice(0, startIndex));
}

function buildTtsPrompt(text, preset) {
  return `${preset.stylePrompt}\n\nStory:\n${String(text || "").trim()}`;
}

function createWavHeader(dataLength, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const buffer = Buffer.alloc(44);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

function pcmBufferToWavBase64(pcmBuffer) {
  const wavHeader = createWavHeader(pcmBuffer.length);
  return Buffer.concat([wavHeader, pcmBuffer]).toString("base64");
}

function splitTextForTts(text = "", language = "en") {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const sentencePattern = language === "mm" ? /[^။!?\n]+[။!?]?/g : /[^.!?\n]+[.!?]?/g;
  const sentences = normalized.match(sentencePattern) || [normalized];
  const chunks = [];
  let buffer = "";
  const maxChunkLength = language === "mm" ? 260 : 320;

  for (const rawSentence of sentences) {
    const sentence = String(rawSentence || "").trim();
    if (!sentence) {
      continue;
    }

    const candidate = buffer ? `${buffer} ${sentence}` : sentence;
    if (candidate.length <= maxChunkLength) {
      buffer = candidate;
      continue;
    }

    if (buffer) {
      chunks.push(buffer);
      buffer = "";
    }

    if (sentence.length <= maxChunkLength) {
      buffer = sentence;
      continue;
    }

    const words = sentence.split(" ");
    let wordBuffer = "";
    for (const word of words) {
      const wordCandidate = wordBuffer ? `${wordBuffer} ${word}` : word;
      if (wordCandidate.length <= maxChunkLength) {
        wordBuffer = wordCandidate;
      } else {
        if (wordBuffer) {
          chunks.push(wordBuffer);
        }
        wordBuffer = word;
      }
    }
    if (wordBuffer) {
      buffer = wordBuffer;
    }
  }

  if (buffer) {
    chunks.push(buffer);
  }

  return chunks.filter(Boolean);
}

async function callGeminiTtsChunk(apiKey, text, preset) {
  const response = await fetch(`${GEMINI_TTS_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: buildTtsPrompt(text, preset) }]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: preset.voiceName
            }
          }
        }
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini TTS request failed.");
  }

  const base64Pcm = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Pcm) {
    throw new Error("No audio was returned from Gemini TTS.");
  }

  return Buffer.from(base64Pcm, "base64");
}

async function callGeminiTts(apiKey, text, language = "en", voiceVariant = 0) {
  const config = getLanguageConfig(language);
  const textChunks = splitTextForTts(text, language);

  if (!textChunks.length) {
    throw new Error("Missing story text.");
  }

  const voiceSequence = getVoiceSequence(language, voiceVariant);
  let lastError = null;

  for (const preset of voiceSequence) {
    try {
      const pcmParts = [];
      for (const chunk of textChunks) {
        const pcmChunk = await callGeminiTtsChunk(apiKey, chunk, preset);
        pcmParts.push(pcmChunk);
      }

      const mergedPcm = Buffer.concat(pcmParts);
      return {
        audioBase64: pcmBufferToWavBase64(mergedPcm),
        mimeType: "audio/wav",
        voiceName: preset.voiceName,
        voiceLabel: preset.label,
        locale: config.locale,
        model: "gemini-2.5-flash-preview-tts"
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Failed to generate speech.");
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method not allowed." })
    };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Missing GEMINI_API_KEY in Netlify environment variables." })
      };
    }

    const { text = "", language = "en", voiceVariant = 0 } = JSON.parse(event.body || "{}");
    const cleanedText = String(text || "").trim();

    if (!cleanedText) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Missing story text." })
      };
    }

    const audio = await callGeminiTts(apiKey, cleanedText, language, voiceVariant);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(audio)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: error?.message || "Failed to generate speech."
      })
    };
  }
};
