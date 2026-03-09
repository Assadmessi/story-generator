const adjectiveInput = document.getElementById("adjective");
const nounInput = document.getElementById("noun");
const verbInput = document.getElementById("verb");
const placeInput = document.getElementById("place");
const adjective2Input = document.getElementById("adjective2");
const noun2Input = document.getElementById("noun2");
const output = document.getElementById("output");
const storyBox = document.getElementById("storyBox");
const generateBtn = document.getElementById("generateBtn");
const randomBtn = document.getElementById("randomBtn");
const speakBtn = document.getElementById("speakBtn");
const copyBtn = document.getElementById("copyBtn");
const shareBtn = document.getElementById("shareBtn");
const clearBtn = document.getElementById("clearBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const templateSelect = document.getElementById("templateSelect");
const activeTemplateLabel = document.getElementById("activeTemplateLabel");
const historyList = document.getElementById("historyList");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeText = document.getElementById("themeText");
const statusMessage = document.getElementById("statusMessage");

const DEFAULT_OUTPUT = "Your magical story will appear here...";
const HISTORY_KEY = "story-generator-history-v2";
const THEME_KEY = "story-generator-theme";

const randomWords = {
    adjectives: ["tiny", "brave", "sparkly", "mysterious", "funny", "sleepy", "wild", "gentle", "glowing", "fearless"],
    nouns: ["dragon", "lion", "robot", "pirate", "wizard", "dog", "cat", "fox", "astronaut", "panda"],
    verbs: ["dancing", "running", "singing", "jumping", "roaring", "spinning", "glowing", "flying", "exploring", "laughing"],
    places: ["park", "forest", "castle", "moon base", "village", "playground", "desert", "mountain", "secret lab", "ocean cave"],
    nouns2: ["cupcake", "rabbit", "sandwich", "donut", "apple", "taco", "marshmallow", "pizza", "meteor", "treasure map"]
};

const templateNames = {
    fantasy: "Fantasy Template",
    adventure: "Adventure Template",
    "sci-fi": "Sci‑Fi Template",
    funny: "Funny Template"
};

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? "#f87171" : "var(--success)";

    if (message) {
        clearTimeout(showStatus.timer);
        showStatus.timer = setTimeout(() => {
            statusMessage.textContent = "";
        }, 2400);
    }
}

function getFormValues() {
    return {
        adjective: adjectiveInput.value.trim() || "tiny",
        noun: nounInput.value.trim() || "dog",
        verb: verbInput.value.trim() || "running",
        place: placeInput.value.trim() || "park",
        adjective2: adjective2Input.value.trim() || "fast",
        noun2: noun2Input.value.trim() || "rabbit"
    };
}

function setFormValues(values) {
    adjectiveInput.value = values.adjective || "";
    nounInput.value = values.noun || "";
    verbInput.value = values.verb || "";
    placeInput.value = values.place || "";
    adjective2Input.value = values.adjective2 || "";
    noun2Input.value = values.noun2 || "";
}

function buildStory(values, template) {
    const { adjective, noun, verb, place, adjective2, noun2 } = values;

    const templates = {
        fantasy: `Once upon a time, a ${adjective} ${noun} lived in a ${place}. Every sunset, the ${noun} would start ${verb}, and its ${adjective2} energy lit up the sky like magic. One day it discovered a hidden ${noun2}, and from that moment the entire ${place} remembered the ${noun} as a legend.`,
        adventure: `Deep in the ${place}, a ${adjective} ${noun} was getting ready for its biggest mission. With a ${adjective2} grin, it kept ${verb} past every obstacle until it found the missing ${noun2}. That brave journey turned the ${noun} into the hero everyone in the ${place} talked about.`,
        "sci-fi": `On a distant station above the ${place}, a ${adjective} ${noun} activated its engines and began ${verb}. Its ${adjective2} sensors suddenly detected a mysterious ${noun2} drifting through space. After decoding the signal, the ${noun} changed the future of the ${place} forever.`,
        funny: `In the middle of the ${place}, a ${adjective} ${noun} could not stop ${verb}. The strangest part was its ${adjective2} habit of carrying a ${noun2} everywhere it went. Nobody understood the chaos, but everyone laughed so much that the ${noun} became the funniest celebrity in the ${place}.`
    };

    return templates[template] || templates.fantasy;
}

function animateStoryBox() {
    storyBox.classList.remove("story-animate");
    void storyBox.offsetWidth;
    storyBox.classList.add("story-animate");
}

function getHistory() {
    try {
        const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function renderHistory() {
    const history = getHistory();

    if (!history.length) {
        historyList.innerHTML = '<p class="empty-history">No saved stories yet. Generate one to build your collection.</p>';
        return;
    }

    historyList.innerHTML = history.map((item) => `
        <article class="history-card">
            <div class="history-meta">
                <strong>${item.title}</strong>
                <span class="history-template">${item.templateLabel} • ${item.createdAt}</span>
            </div>
            <p>${item.story}</p>
            <div class="history-actions">
                <button class="secondary" type="button" data-action="load" data-id="${item.id}">Load Story</button>
                <button class="secondary" type="button" data-action="copy" data-id="${item.id}">Copy</button>
            </div>
        </article>
    `).join("");
}

function addToHistory(story, values, template) {
    const history = getHistory();
    const newItem = {
        id: Date.now().toString(),
        title: `${values.adjective.charAt(0).toUpperCase() + values.adjective.slice(1)} ${values.noun}`,
        template,
        templateLabel: templateNames[template],
        values,
        story,
        createdAt: new Date().toLocaleString()
    };

    const updatedHistory = [newItem, ...history].slice(0, 8);
    saveHistory(updatedHistory);
    renderHistory();
}

function generateStory(save = true) {
    const values = getFormValues();
    const template = templateSelect.value;
    const story = buildStory(values, template);

    output.textContent = story;
    activeTemplateLabel.textContent = templateNames[template];
    animateStoryBox();

    if (save) {
        addToHistory(story, values, template);
        showStatus("Story generated and saved to history.");
    }

    return story;
}

function fillRandomWords() {
    const values = {
        adjective: pickRandom(randomWords.adjectives),
        noun: pickRandom(randomWords.nouns),
        verb: pickRandom(randomWords.verbs),
        place: pickRandom(randomWords.places),
        adjective2: pickRandom(randomWords.adjectives),
        noun2: pickRandom(randomWords.nouns2)
    };

    setFormValues(values);
    generateStory();
}

function speakStory() {
    const storyText = output.textContent.trim();

    if (!storyText || storyText === DEFAULT_OUTPUT) {
        generateStory();
    }

    if (!("speechSynthesis" in window)) {
        showStatus("Voice narration is not supported in this browser.", true);
        return;
    }

    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(output.textContent);
    speech.rate = 0.96;
    speech.pitch = 1;
    speech.volume = 1;
    window.speechSynthesis.speak(speech);
    showStatus("Reading your story out loud.");
}

async function copyStory(text = output.textContent.trim()) {
    if (!text || text === DEFAULT_OUTPUT) {
        showStatus("Generate a story first.", true);
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        showStatus("Story copied to clipboard.");
    } catch {
        showStatus("Copy failed in this browser.", true);
    }
}

async function shareStory() {
    const text = output.textContent.trim();

    if (!text || text === DEFAULT_OUTPUT) {
        showStatus("Generate a story first.", true);
        return;
    }

    if (navigator.share) {
        try {
            await navigator.share({
                title: "Story Generator Studio",
                text
            });
            showStatus("Story shared successfully.");
            return;
        } catch {
            showStatus("Share canceled.", true);
            return;
        }
    }

    await copyStory(text);
    showStatus("Share is not available here, so the story was copied instead.");
}

function clearAll() {
    setFormValues({
        adjective: "",
        noun: "",
        verb: "",
        place: "",
        adjective2: "",
        noun2: ""
    });
    output.textContent = DEFAULT_OUTPUT;
    activeTemplateLabel.textContent = templateNames[templateSelect.value];
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
    showStatus("Inputs cleared.");
}

function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    showStatus("Story history cleared.");
}

function loadHistoryItem(id) {
    const item = getHistory().find((entry) => entry.id === id);
    if (!item) {
        showStatus("Could not load that story.", true);
        return;
    }

    templateSelect.value = item.template;
    activeTemplateLabel.textContent = item.templateLabel;
    setFormValues(item.values);
    output.textContent = item.story;
    animateStoryBox();
    showStatus("Story loaded from history.");
}

function applyTheme(theme) {
    document.body.classList.toggle("light", theme === "light");
    themeIcon.textContent = theme === "light" ? "☀️" : "🌙";
    themeText.textContent = theme === "light" ? "Light Mode" : "Dark Mode";
    localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
    const nextTheme = document.body.classList.contains("light") ? "dark" : "light";
    applyTheme(nextTheme);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
    applyTheme(savedTheme);
}

function updateTemplateLabel() {
    activeTemplateLabel.textContent = templateNames[templateSelect.value];
}

generateBtn.addEventListener("click", () => generateStory());
randomBtn.addEventListener("click", fillRandomWords);
speakBtn.addEventListener("click", speakStory);
copyBtn.addEventListener("click", () => copyStory());
shareBtn.addEventListener("click", shareStory);
clearBtn.addEventListener("click", clearAll);
clearHistoryBtn.addEventListener("click", clearHistory);
themeToggle.addEventListener("click", toggleTheme);
templateSelect.addEventListener("change", updateTemplateLabel);

historyList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }

    const { action, id } = button.dataset;
    const item = getHistory().find((entry) => entry.id === id);

    if (action === "load") {
        loadHistoryItem(id);
    }

    if (action === "copy" && item) {
        copyStory(item.story);
    }
});

initializeTheme();
updateTemplateLabel();
renderHistory();
