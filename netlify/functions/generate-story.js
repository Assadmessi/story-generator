const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

const randomWords = {
  en: {
    adjectives: ["tiny", "brave", "sparkly", "mysterious", "gentle", "fearless", "golden", "curious", "glowing", "playful"],
    nouns: ["dragon", "fox", "robot", "pirate", "wizard", "astronaut", "panda", "traveler", "lion", "inventor"],
    verbs: ["dancing", "running", "singing", "exploring", "gliding", "laughing", "searching", "building", "flying", "wandering"],
    places: ["enchanted forest", "moon base", "desert village", "hidden castle", "ocean cave", "sky city", "secret library", "snowy mountain", "golden harbor", "quiet island"],
    extra: ["lantern", "map", "cupcake", "compass", "treasure", "book", "crystal", "donut", "key", "star"]
  },
  mm: {
    adjectives: ["သေးငယ်တဲ့", "ရဲရင့်တဲ့", "တောက်ပတဲ့", "လျှို့ဝှက်ဆန်တဲ့", "နူးညံ့တဲ့", "ကြောက်မဲ့တဲ့", "ရွှေရောင်", "စူးစမ်းချင်တဲ့", "အလင်းရောင်ပြည့်တဲ့", "ပျော်ရွှင်တဲ့"],
    nouns: ["နဂါး", "မြေခွေး", "စက်ရုပ်", "ပင်လယ်ဓားပြ", "မှော်ဆရာ", "အာကာသခရီးသွား", "ပန်ဒါ", "ခရီးသွား", "ခြင်္သေ့", "တီထွင်သူ"],
    verbs: ["ကခုန်", "ပြေးလွှား", "သီချင်းဆို", "စူးစမ်း", "လေထဲလျှော", "ရယ်မော", "ရှာဖွေ", "တည်ဆောက်", "ပျံသန်း", "လှည့်လည်"],
    places: ["မှော်တောအုပ်", "လကမ္ဘာစခန်း", "သဲကန္တာရရွာ", "လျှို့ဝှက်ရဲတိုက်", "သမုဒ္ဒရာဂူ", "ကောင်းကင်မြို့", "လျှို့ဝှက်စာကြည့်တိုက်", "နှင်းဖုံးတောင်", "ရွှေဆိပ်ကမ်း", "တိတ်ဆိတ်ကျွန်း"],
    extra: ["မီးအိမ်", "မြေပုံ", "မုန့်", "ကွန်ပါစ်", "ရတနာ", "စာအုပ်", "ကျောက်တုံးတောက်ပ", "ဒိုးနတ်", "သော့", "ကြယ်"]
  }
};

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const fieldOrder = ["adjective", "noun", "verb", "place", "adjective2", "noun2"];

/**
 * Map supported language codes to human-readable names. This allows the
 * storytelling prompt to instruct Gemini to use the correct language. Only
 * languages supported by the UI need to be mapped here; unrecognised codes
 * will fall back to English.
 */
const LANGUAGE_NAMES = {
  en: "English",
  mm: "Burmese (the Myanmar language)",
};

function getRandomWordSet(language = "en") {
  return randomWords[String(language || "en").toLowerCase()] || randomWords.en;
}

function getDefaultInputs(language = "en") {
  if (String(language || "en").toLowerCase() === "mm") {
    return {
      adjective: "စူးစမ်းချင်တဲ့",
      noun: "ခရီးသွား",
      verb: "စူးစမ်း",
      place: "လျှို့ဝှက်ချိုင့်ဝှမ်း",
      adjective2: "တောက်ပတဲ့",
      noun2: "မီးအိမ်"
    };
  }

  return {
    adjective: "curious",
    noun: "traveler",
    verb: "exploring",
    place: "hidden valley",
    adjective2: "glowing",
    noun2: "lantern"
  };
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function cleanValue(value, fallback) {
  const normalized = String(value || "")
    .replace(/[_*#~`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || fallback;
}

function buildInputs(rawInputs = {}, random = false, language = "en") {
  const wordSet = getRandomWordSet(language);
  const defaults = getDefaultInputs(language);

  const seeded = random
    ? {
        adjective: pickRandom(wordSet.adjectives),
        noun: pickRandom(wordSet.nouns),
        verb: pickRandom(wordSet.verbs),
        place: pickRandom(wordSet.places),
        adjective2: pickRandom(wordSet.adjectives),
        noun2: pickRandom(wordSet.extra),
      }
    : rawInputs;

  return {
    adjective: cleanValue(seeded.adjective, defaults.adjective),
    noun: cleanValue(seeded.noun, defaults.noun),
    verb: cleanValue(seeded.verb, defaults.verb),
    place: cleanValue(seeded.place, defaults.place),
    adjective2: cleanValue(seeded.adjective2, defaults.adjective2),
    noun2: cleanValue(seeded.noun2, defaults.noun2),
  };
}

function buildPrompt(inputs, random, language = "en") {
  // Determine the requested language name; fall back to English for unknown codes.
  const languageName = LANGUAGE_NAMES[String(language).toLowerCase()] || LANGUAGE_NAMES.en;
  // Build a dynamic instruction telling Gemini which language to use. When the
  // language is not English we explicitly mention the language name in the
  // instruction to encourage the model to produce output in the target language.
  const languageInstruction =
    languageName === LANGUAGE_NAMES.en
      ? "Write exactly one short story in clear, smooth, human-sounding English."
      : `Write exactly one short story in clear, smooth, human-sounding ${languageName}.`;

  return `You are a warm, natural creative storyteller.
${languageInstruction}
${isMyanmarLanguage(language) ? "Use only Myanmar script for the full story. Do not write the story in English, romanized Burmese, or mixed language except for names the user already entered." : ""}
The story must feel natural and never awkward, robotic, childish, or template-based.
If any of the user words are strange, misspelled, or grammatically messy, intelligently smooth them into the story without making the writing feel weird.

Hard requirements:
- 150 to 230 words.
- Write one complete story with a beginning, middle, and ending.
- Keep the tone vivid, polished, and portfolio-worthy.
- Do not mention prompts, inputs, lists, templates, or AI.
- Avoid bullet points, labels, quotes around the input words, and meta commentary.
- The main character identity must come from the noun input. Do not reuse default fantasy names like Elara, Luna, Aria, or similar unless the noun input itself is that name.
- If the noun input is a role or creature, make that role or creature the protagonist, such as "the astronaut" or "the fox".
- If the noun input looks like a personal name, use that exact name as the protagonist.
- Naturally include these exact terms at least once when possible:
  adjective: ${inputs.adjective}
  noun: ${inputs.noun}
  verb/action: ${inputs.verb}
  place: ${inputs.place}
  extra detail: ${inputs.adjective2}
  extra object/character: ${inputs.noun2}
- If one term is too broken to use exactly, use the closest natural corrected version.
- Make the story emotionally smooth and pleasant to read.
- Random mode: ${random ? "yes" : "no"}.

Return ONLY valid JSON in this exact shape:
{
  "story": "...",
  "normalizedInputs": {
    "adjective": "...",
    "noun": "...",
    "verb": "...",
    "place": "...",
    "adjective2": "...",
    "noun2": "..."
  }
}`;
}

function extractText(payload) {
  return payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("")?.trim() || "";
}

function safeJsonParse(text) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const sliced = firstBrace >= 0 && lastBrace >= 0 ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;
  return JSON.parse(sliced);
}


function isMyanmarLanguage(language = "en") {
  return String(language || "").toLowerCase() === "mm";
}

function looksLikeMyanmarText(text = "") {
  return /[က-႟ꧠ-꧿]/.test(String(text || ""));
}

function buildMyanmarFallbackStory(inputs) {
  const { adjective, noun, verb, place, adjective2, noun2 } = inputs;
  const protagonist = noun && noun.trim() ? noun.trim() : "ခရီးသွား";
  const prefix = /^[A-Z]/.test(protagonist) ? protagonist : `${adjective} ${protagonist}`.trim();
  const subject = /^[A-Z]/.test(protagonist) ? protagonist : `အဲဒီ ${protagonist}`;
  return ` ${place} ရဲ့အလယ်ဗဟိုမှာ ${prefix} က ${verb} လုပ်တတ်သူတစ်ယောက်အဖြစ် လူသိများနေခဲ့တယ်။ ညနေကောင်းကင်အရောင်ပြောင်းတိုင်း လူတွေက အဲဒီမြင်ကွင်းကို ကြည့်ပြီး ပြုံးမိကြပေမယ့် ${adjective2} ${noun2} တစ်ခု ရောက်လာပြီး အရာအားလုံးကို တိတ်တဆိတ် ပြောင်းလဲမယ်လို့ ဘယ်သူမှ မထင်ခဲ့ကြဘူး။ တစ်နေ့မှာ မြို့ရဲ့ငြိမ်းချမ်းမှုကို ထိခိုက်စေနိုင်တဲ့ ပြဿနာတစ်ခု ပေါ်လာတော့ ${subject} က ${noun2} ချန်ထားခဲ့တဲ့ အမှတ်အသားကို လိုက်သွားပြီး တကယ့်သတ္တိဆိုတာ အမြဲတမ်း ဆူညံပြီး ကြီးကျယ်နေဖို့ မလိုအပ်ဘူးဆိုတာ နားလည်လာတယ်။ တစ်ခါတစ်ရံ သတ္တိဆိုတာ စိတ်တည်ငြိမ်နေဖို့၊ နောက်ထပ် တစ်လှမ်း ဆက်လှမ်းဖို့နဲ့ တခြားသူတွေကို မျှော်လင့်ချက် ပြန်ယုံကြည်လာအောင် ကူညီပေးဖို့ပဲ ဖြစ်တယ်။ မနက်မိုးလင်းချိန်ရောက်တော့ အန္တရာယ်က ပြေလည်သွားပြီး လမ်းမများပေါ်မှာ စိတ်သက်သာရာရတဲ့ ရယ်သံတွေ ပြန်ပြည့်လာခဲ့တယ်။ ${subject} လည်း တောက်ပလာတဲ့ မိုးကောင်းကင်အောက်မှာ ရည်ရွယ်ချက်အသစ်တစ်ခုနဲ့ ရပ်နေခဲ့တယ်။ အဲဒီနေ့ကစပြီး လူတွေက ဒီပုံပြင်ကို မှတ်မိနေကြတာ မမှော်ဆန်လို့တင် မဟုတ်ဘဲ နှလုံးသားနဲ့သယ်ဆောင်လာတဲ့ သေးငယ်တဲ့ မီးစတစ်စကတောင် လောကတစ်ခုလုံးကို လင်းပေးနိုင်တယ်ဆိုတဲ့ အမှန်တရားကို ခံစားမိလို့ပါ။`.trim();
}

function buildFallbackStory(inputs, language = "en") {
  if (isMyanmarLanguage(language)) {
    return buildMyanmarFallbackStory(inputs);
  }

  const { adjective, noun, verb, place, adjective2, noun2 } = inputs;
  const protagonist = noun && noun.trim() ? noun.trim() : "traveler";
  return `In the heart of ${place}, ${/^[A-Z]/.test(protagonist) ? protagonist : `a ${adjective} ${protagonist}` } became known for ${verb} whenever the evening sky changed color. Most people smiled at the sight, but no one expected that a ${adjective2} ${noun2} would arrive and quietly change everything. When a sudden problem threatened the peace of the place, ${/^[A-Z]/.test(protagonist) ? protagonist : `the ${protagonist}` } followed the strange clue left behind by the ${noun2} and discovered that courage did not always look loud or dramatic. Sometimes it looked like staying calm, taking one more step, and helping others believe again. By dawn, the danger had passed, the streets were full of relieved laughter, and ${/^[A-Z]/.test(protagonist) ? protagonist : `the ${protagonist}` } stood beneath the brightening sky with a new sense of purpose. From that day on, people remembered the story not only because it was magical, but because it felt true: even the smallest spark, carried with heart, can light an entire world.`;
}

async function callGemini(apiKey, prompt) {
  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.95,
        topP: 0.92,
        maxOutputTokens: 700,
        responseMimeType: "application/json"
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || "Gemini request failed.";
    throw new Error(message);
  }

  return data;
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

    const { inputs: rawInputs = {}, random = false, language = "en" } = JSON.parse(event.body || "{}");
    const inputs = buildInputs(rawInputs, Boolean(random), language);
    // Build a prompt that respects the requested language. If the language field
    // is missing or unsupported it falls back to English.
    const prompt = buildPrompt(inputs, Boolean(random), language);

    let story = "";
    let normalizedInputs = { ...inputs };

    try {
      const data = await callGemini(apiKey, prompt);
      const text = extractText(data);
      const parsed = safeJsonParse(text);
      story = String(parsed?.story || "").trim();
      normalizedInputs = buildInputs(parsed?.normalizedInputs || inputs, false, language);

      if (isMyanmarLanguage(language) && !looksLikeMyanmarText(story)) {
        throw new Error("Myanmar story was not returned in Myanmar text.");
      }
    } catch (error) {
      story = buildFallbackStory(inputs, language);
      normalizedInputs = inputs;
    }

    if (!story) {
      story = buildFallbackStory(inputs, language);
    }

    const highlightTerms = fieldOrder
      .map((key) => normalizedInputs[key])
      .filter(Boolean);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        story,
        normalizedInputs,
        highlightTerms,
        modeLabel: random ? "AI Random Story" : "AI Story Mode"
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: error?.message || "Failed to generate story."
      })
    };
  }
};
