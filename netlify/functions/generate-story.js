const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

const randomWords = {
  adjectives: ["tiny", "brave", "sparkly", "mysterious", "gentle", "fearless", "golden", "curious", "glowing", "playful"],
  nouns: ["dragon", "fox", "robot", "pirate", "wizard", "astronaut", "panda", "traveler", "lion", "inventor"],
  verbs: ["dancing", "running", "singing", "exploring", "gliding", "laughing", "searching", "building", "flying", "wandering"],
  places: ["enchanted forest", "moon base", "desert village", "hidden castle", "ocean cave", "sky city", "secret library", "snowy mountain", "golden harbor", "quiet island"],
  extra: ["lantern", "map", "cupcake", "compass", "treasure", "book", "crystal", "donut", "key", "star"],
};

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const fieldOrder = ["adjective", "noun", "verb", "place", "adjective2", "noun2"];

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

function buildInputs(rawInputs = {}, random = false) {
  const seeded = random
    ? {
        adjective: pickRandom(randomWords.adjectives),
        noun: pickRandom(randomWords.nouns),
        verb: pickRandom(randomWords.verbs),
        place: pickRandom(randomWords.places),
        adjective2: pickRandom(randomWords.adjectives),
        noun2: pickRandom(randomWords.extra),
      }
    : rawInputs;

  return {
    adjective: cleanValue(seeded.adjective, "curious"),
    noun: cleanValue(seeded.noun, "traveler"),
    verb: cleanValue(seeded.verb, "exploring"),
    place: cleanValue(seeded.place, "hidden valley"),
    adjective2: cleanValue(seeded.adjective2, "glowing"),
    noun2: cleanValue(seeded.noun2, "lantern"),
  };
}

function buildPrompt(inputs, random) {
  return `You are a warm, natural creative storyteller.
Write exactly one short story in clear, smooth, human-sounding English.
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

function buildFallbackStory(inputs) {
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

    const { inputs: rawInputs = {}, random = false } = JSON.parse(event.body || "{}");
    const inputs = buildInputs(rawInputs, Boolean(random));
    const prompt = buildPrompt(inputs, Boolean(random));

    let story = "";
    let normalizedInputs = { ...inputs };

    try {
      const data = await callGemini(apiKey, prompt);
      const text = extractText(data);
      const parsed = safeJsonParse(text);
      story = String(parsed?.story || "").trim();
      normalizedInputs = buildInputs(parsed?.normalizedInputs || inputs, false);
    } catch (error) {
      story = buildFallbackStory(inputs);
      normalizedInputs = inputs;
    }

    if (!story) {
      story = buildFallbackStory(inputs);
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
