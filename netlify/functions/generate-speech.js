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
    voiceName: "Kore",
    stylePrompt: "Read this story out loud in warm, natural, expressive English. Keep the pacing smooth, clear, and pleasant. Speak exactly the story text with no extra introduction or commentary."
  },
  mm: {
    locale: "my-MM",
    voiceName: "Puck",
    stylePrompt: "Read this story out loud in natural Burmese (Myanmar language). Keep the pacing smooth, warm, clear, and pleasant. Speak exactly the story text with no extra introduction or commentary."
  }
};

function buildTtsPrompt(text, language = "en") {
  const config = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;
  return `${config.stylePrompt}\n\nStory:\n${String(text || "").trim()}`;
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

function pcmBase64ToWavBase64(base64Pcm) {
  const pcmBuffer = Buffer.from(base64Pcm, "base64");
  const wavHeader = createWavHeader(pcmBuffer.length);
  return Buffer.concat([wavHeader, pcmBuffer]).toString("base64");
}

async function callGeminiTts(apiKey, text, language = "en") {
  const config = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;
  const response = await fetch(`${GEMINI_TTS_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: buildTtsPrompt(text, language) }]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: config.voiceName
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

  return {
    audioBase64: pcmBase64ToWavBase64(base64Pcm),
    mimeType: "audio/wav",
    voiceName: config.voiceName,
    locale: config.locale,
    model: "gemini-2.5-flash-preview-tts"
  };
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

    const { text = "", language = "en" } = JSON.parse(event.body || "{}");
    const cleanedText = String(text || "").trim();

    if (!cleanedText) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Missing story text." })
      };
    }

    const audio = await callGeminiTts(apiKey, cleanedText, language);

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
