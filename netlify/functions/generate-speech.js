const GEMINI_TTS_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Prebuilt Gemini voices are shared voice identities, not English-only voices.
// Burmese is supported by Gemini TTS, so the important part is making the
// transcript + direction prompt stay fully Burmese.
const LANGUAGE_CONFIG = {
  en: {
    locale: "en",
    voices: ["Sulafat", "Gacrux", "Achird"],
    stylePrompt:
      [
        "You are a warm, mature storytelling narrator.",
        "Read ONLY the provided transcript.",
        "Use expressive, cinematic English with smooth pacing, clear pronunciation, and a polished storybook feel.",
        "Do not translate anything.",
        "Do not add introductions, labels, commentary, or extra lines."
      ].join(" ")
  },
  mm: {
    locale: "my",
    voices: ["Sulafat", "Gacrux", "Achird"],
    stylePrompt:
      [
        "သင်သည် နွေးထွေးပြီး တည်ငြိမ်တဲ့ ပုံပြင်ပြောသူတစ်ယောက် ဖြစ်သည်။",
        "အောက်ပါ မြန်မာစာ ဇာတ်လမ်းကိုသာ ဖတ်ပါ။",
        "မြန်မာဘာသာဖြင့်သာ ဖတ်ပါ။",
        "အင်္ဂလိပ်လို မဖတ်ပါနဲ့။",
        "မဘာသာပြန်ပါနဲ့။",
        "အစကား၊ အဆုံးသတ်မှတ်ချက်၊ အညွှန်းစာ၊ မှတ်ချက်၊ extra စာသား မထည့်ပါနဲ့။",
        "သဘာဝကျပြီး ပုံပြင်ဆန်ဆန်၊ အသံအနိမ့်အမြင့် သင့်တော်စွာ၊ စကားလုံးပြတ်သားစွာ ဖတ်ပါ။"
      ].join(" ")
  }
};

const CHUNK_LIMITS = {
  en: 260,
  mm: 90
};

function normalizeLanguage(language = "en") {
  const value = String(language || "en").trim().toLowerCase();

  if (value === "mm" || value === "my" || value === "my-mm" || value === "burmese") {
    return "mm";
  }

  return "en";
}

function getLanguageConfig(language = "en") {
  return LANGUAGE_CONFIG[normalizeLanguage(language)] || LANGUAGE_CONFIG.en;
}

function containsMyanmar(text = "") {
  return /[\u1000-\u109F\uA9E0-\uA9FF]/.test(String(text || ""));
}

function normalizeMyanmarText(text = "") {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*([၊။!?])/g, "$1")
    .replace(/([၊။!?])(?=[^\s])/g, "$1 ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitLongMyanmarSegment(segment = "", maxLength = 90) {
  const parts = [];
  let remaining = String(segment || "").trim();

  while (remaining.length > maxLength) {
    let cutIndex = remaining.lastIndexOf(" ", maxLength);

    if (cutIndex < Math.floor(maxLength * 0.45)) {
      cutIndex = maxLength;
    }

    parts.push(remaining.slice(0, cutIndex).trim());
    remaining = remaining.slice(cutIndex).trim();
  }

  if (remaining) {
    parts.push(remaining);
  }

  return parts;
}

function splitTextForTts(text = "", language = "en") {
  const lang = normalizeLanguage(language);
  const normalized =
    lang === "mm"
      ? normalizeMyanmarText(text)
      : String(text || "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  const maxLength = CHUNK_LIMITS[lang] || CHUNK_LIMITS.en;
  const sentencePattern =
    lang === "mm"
      ? /[^။!?…\n]+[။!?…]?/g
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
    if (!sentence) continue;

    if (sentence.length > maxLength) {
      flushBuffer();

      if (lang === "mm") {
        const smallerParts = splitLongMyanmarSegment(sentence, maxLength);
        for (const part of smallerParts) {
          if (part) chunks.push(part);
        }
      } else {
        const words = sentence.split(" ");
        let wordBuffer = "";

        for (const word of words) {
          const next = wordBuffer ? `${wordBuffer} ${word}` : word;
          if (next.length <= maxLength) {
            wordBuffer = next;
          } else {
            if (wordBuffer) chunks.push(wordBuffer.trim());
            wordBuffer = word;
          }
        }

        if (wordBuffer.trim()) {
          chunks.push(wordBuffer.trim());
        }
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
  const lang = normalizeLanguage(language);
  const config = getLanguageConfig(lang);
  const cleanedText = lang === "mm" ? normalizeMyanmarText(text) : String(text || "").trim();

  if (lang === "mm") {
    return [
      config.stylePrompt,
      "",
      `အသံပုံစံ: ${voiceName || "storyteller"} လို နွေးထွေးပြီး တည်ငြိမ်တဲ့ ပုံပြင်ပြောသံနဲ့ ဖတ်ပါ။`,
      "အောက်ပါ မြန်မာစာကိုသာ ဖတ်ပါ။",
      "",
      "ဇာတ်လမ်း:",
      cleanedText
    ].join("\n");
  }

  return [
    config.stylePrompt,
    "",
    `Voice direction: use a ${voiceName || "warm"} storyteller delivery with consistent pacing, clean pronunciation, and a polished narrative feel.`,
    "",
    "Story:",
    cleanedText
  ].join("\n");
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

async function callGeminiTts(apiKey, text, language = "en", voiceName = "Sulafat") {
  const lang = normalizeLanguage(language);
  const config = getLanguageConfig(lang);

  const response = await fetch(`${GEMINI_TTS_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: buildTtsPrompt(text, lang, voiceName) }]
        }
      ],
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
  const lang = normalizeLanguage(language);
  const config = getLanguageConfig(lang);

  // Put the calmest storyteller-like voice first for Burmese.
  const voiceRotation =
    lang === "mm"
      ? ["Sulafat", "Achird", "Gacrux"]
      : (config.voices || ["Sulafat", "Gacrux", "Achird"]);

  const attempts = [];

  for (let i = 0; i < voiceRotation.length; i += 1) {
    const voiceName = voiceRotation[(chunkIndex + i) % voiceRotation.length];

    try {
      const audio = await callGeminiTts(apiKey, text, lang, voiceName);
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
    const lang = normalizeLanguage(language);
    const cleanedText =
      lang === "mm" ? normalizeMyanmarText(text) : String(text || "").trim();

    if (!cleanedText) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Missing story text." })
      };
    }

    if (lang === "mm" && !containsMyanmar(cleanedText)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: "Myanmar voice mode requires Myanmar-script story text."
        })
      };
    }

    const chunks = splitTextForTts(cleanedText, lang);
    if (!chunks.length) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Could not prepare the story for speech." })
      };
    }

    const audioSegments = [];
    for (let i = 0; i < chunks.length; i += 1) {
      const segment = await generateChunkWithFallback(apiKey, chunks[i], lang, i);
      audioSegments.push(segment);
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        mimeType: "audio/wav",
        locale: getLanguageConfig(lang).locale,
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