const GEMINI_TTS_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Gemini TTS supports a shared pool of prebuilt voices. There is no documented
// "Daniel" voice, so we use a small storyteller-style rotation that aims for a
// similarly warm, mature, narrative feel.
const LANGUAGE_CONFIG = {
  en: {
    locale: "en",
    voices: ["Sulafat", "Gacrux", "Achird"],
    stylePrompt:
      "You are a warm, mature storyteller. Read only the transcript in expressive, cinematic English with smooth pacing, clean pronunciation, and an immersive storybook feel. No extra introductions. No labels. No commentary."
  },
  mm: {
    locale: "my",
    voices: ["Sulafat", "Gacrux", "Achird"],
    stylePrompt:
      "သင်က ပုံပြင်ပြောသံ နွေးထွေးပြီး တည်ငြိမ်တဲ့ ဇာတ်ကြောင်းပြောသူတစ်ယောက်ပါ။ အောက်က စာသားကိုသာ သဘာဝကျတဲ့ မြန်မာအသံနဲ့ ပုံပြင်ဆန်ဆန် ဖတ်ပေးပါ။ အစကားမထည့်ပါနဲ့။ မှတ်ချက်မထည့်ပါနဲ့။ အညွှန်းစာမဖတ်ပါနဲ့။"
  }
};

const CHUNK_LIMITS = {
  en: 260,
  mm: 120
};

function getLanguageConfig(language = "en") {
  return LANGUAGE_CONFIG[String(language || "en").toLowerCase()] || LANGUAGE_CONFIG.en;
}

function splitTextForTts(text = "", language = "en") {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const maxLength = CHUNK_LIMITS[String(language || "en").toLowerCase()] || CHUNK_LIMITS.en;
  const sentencePattern = language === "mm"
    ? /[^။!?\n]+[။!?]?/g
    : /[^.!?\n]+[.!?]?/g;

  const sentences = normalized.match(sentencePattern) || [normalized];
  const chunks = [];
  let buffer = "";

  const flushBuffer = () => {
    const value = buffer.trim();
    if (value) {
      chunks.push(value);
    }
    buffer = "";
  };

  for (const rawSentence of sentences) {
    const sentence = String(rawSentence || "").trim();
    if (!sentence) {
      continue;
    }

    if (sentence.length > maxLength) {
      flushBuffer();
      const words = sentence.split(" ");
      let wordBuffer = "";

      for (const word of words) {
        const next = wordBuffer ? `${wordBuffer} ${word}` : word;
        if (next.length <= maxLength) {
          wordBuffer = next;
        } else {
          if (wordBuffer) {
            chunks.push(wordBuffer.trim());
          }
          wordBuffer = word;
        }
      }

      if (wordBuffer.trim()) {
        chunks.push(wordBuffer.trim());
      }
      continue;
    }

    const nextBuffer = buffer ? `${buffer} ${sentence}` : sentence;
    if (nextBuffer.length <= maxLength) {
      buffer = nextBuffer;
    } else {
      flushBuffer();
      buffer = sentence;
    }
  }

  flushBuffer();
  return chunks;
}

function buildTtsPrompt(text, language = "en", voiceName = "") {
  const config = getLanguageConfig(language);
  return `${config.stylePrompt}\n\nVoice direction: use a ${voiceName || "warm"} storyteller delivery with consistent pacing, clean pronunciation, and a polished narrative feel.\n\nStory:\n${String(text || "").trim()}`;
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

async function callGeminiTts(apiKey, text, language = "en", voiceName = "Kore") {
  const config = getLanguageConfig(language);
  const response = await fetch(`${GEMINI_TTS_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: buildTtsPrompt(text, language, voiceName) }]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName
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
    voiceName,
    locale: config.locale,
    model: "gemini-2.5-flash-preview-tts"
  };
}

async function generateChunkWithFallback(apiKey, text, language = "en", chunkIndex = 0) {
  const config = getLanguageConfig(language);
  const voiceRotation = config.voices || LANGUAGE_CONFIG.en.voices;
  const attempts = [];

  for (let i = 0; i < voiceRotation.length; i += 1) {
    const voiceName = voiceRotation[(chunkIndex + i) % voiceRotation.length];
    try {
      const audio = await callGeminiTts(apiKey, text, language, voiceName);
      return {
        ...audio,
        chunkIndex,
        text
      };
    } catch (error) {
      attempts.push(`${voiceName}: ${error?.message || "failed"}`);
    }
  }

  throw new Error(`All storyteller voices failed for chunk ${chunkIndex + 1}. ${attempts.join(" | ")}`);
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

    const chunks = splitTextForTts(cleanedText, language);
    if (!chunks.length) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Could not prepare the story for speech." })
      };
    }

    const audioSegments = [];
    for (let i = 0; i < chunks.length; i += 1) {
      const segment = await generateChunkWithFallback(apiKey, chunks[i], language, i);
      audioSegments.push(segment);
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        mimeType: "audio/wav",
        locale: getLanguageConfig(language).locale,
        model: "gemini-2.5-flash-preview-tts",
        chunkCount: audioSegments.length,
        voicesUsed: [...new Set(audioSegments.map((segment) => segment.voiceName))],
        audioSegments
      })
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
