const adjectiveInput = document.getElementById("adjective");
const nounInput = document.getElementById("noun");
const verbInput = document.getElementById("verb");
const placeInput = document.getElementById("place");
const adjective2Input = document.getElementById("adjective2");
const noun2Input = document.getElementById("noun2");

const output = document.getElementById("output");
const storyCard = document.getElementById("storyCard");
const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");

const generateBtn = document.getElementById("generateBtn");
const randomBtn = document.getElementById("randomBtn");
const speakBtn = document.getElementById("speakBtn");
const clearBtn = document.getElementById("clearBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const HISTORY_KEY = "story-generator-history";
const MAX_HISTORY = 8;

const randomWords = {
    adjectives: ["tiny", "brave", "glowing", "mischievous", "sparkly", "fearless", "sleepy", "legendary"],
    nouns: ["dog", "dragon", "lion", "robot", "wizard", "rabbit", "pirate", "fox"],
    verbs: ["running", "dancing", "singing", "jumping", "spinning", "laughing", "flying", "exploring"],
    places: ["park", "forest", "castle", "moon garden", "secret cave", "desert", "sky city", "ocean village"],
    adjectives2: ["fast", "golden", "fiery", "shiny", "wild", "frozen", "magic", "electric"],
    nouns2: ["rabbit", "pizza", "cupcake", "deer", "marshmallow", "taco", "apple", "sandwich"]
};

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function buildStory(adjective, noun, verb, place, adjective2, noun2) {
    return `Once upon a time, there was a ${adjective} ${noun} who loved to eat ${noun2}. The ${noun} lived in a ${place} and had ${adjective2} nostrils that blew fire whenever it was ${verb}. Every visitor who passed through the ${place} stopped to watch the incredible ${noun}, and before long the whole place was talking about the unforgettable adventure.`;
}

function getFormValues() {
    return {
        adjective: adjectiveInput.value.trim(),
        noun: nounInput.value.trim(),
        verb: verbInput.value.trim(),
        place: placeInput.value.trim(),
        adjective2: adjective2Input.value.trim(),
        noun2: noun2Input.value.trim()
    };
}

function setFormValues(values) {
    adjectiveInput.value = values.adjective;
    nounInput.value = values.noun;
    verbInput.value = values.verb;
    placeInput.value = values.place;
    adjective2Input.value = values.adjective2;
    noun2Input.value = values.noun2;
}

function hasEmptyFields(values) {
    return Object.values(values).some((value) => !value);
}

function animateStoryCard() {
    storyCard.classList.remove("story-animate");
    void storyCard.offsetWidth;
    storyCard.classList.add("story-animate");
}

function saveToHistory(story, values) {
    const current = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");

    const updated = [
        {
            id: Date.now(),
            title: `${values.adjective} ${values.noun}`,
            story,
            values
        },
        ...current.filter((item) => item.story !== story)
    ].slice(0, MAX_HISTORY);

    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    renderHistory();
}

function renderHistory() {
    const items = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    historyCount.textContent = `${items.length} stor${items.length === 1 ? "y" : "ies"} saved`;

    if (!items.length) {
        historyList.innerHTML = `<div class="history-empty">No stories yet. Generate one to save it here.</div>`;
        return;
    }

    historyList.innerHTML = items.map((item) => `
        <article class="history-item">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.story)}</p>
            <button type="button" data-id="${item.id}">Load story</button>
        </article>
    `).join("");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function generateStory() {
    const values = getFormValues();

    if (hasEmptyFields(values)) {
        output.textContent = "Please fill in all fields to generate your story.";
        storyCard.classList.add("empty-state");
        animateStoryCard();
        return;
    }

    const story = buildStory(
        values.adjective,
        values.noun,
        values.verb,
        values.place,
        values.adjective2,
        values.noun2
    );

    output.textContent = story;
    storyCard.classList.remove("empty-state");
    animateStoryCard();
    saveToHistory(story, values);
}

function fillRandomWords() {
    const values = {
        adjective: pickRandom(randomWords.adjectives),
        noun: pickRandom(randomWords.nouns),
        verb: pickRandom(randomWords.verbs),
        place: pickRandom(randomWords.places),
        adjective2: pickRandom(randomWords.adjectives2),
        noun2: pickRandom(randomWords.nouns2)
    };

    setFormValues(values);
    generateStory();
}

function speakStory() {
    const text = output.textContent.trim();

    if (!text || text === "Your generated story will appear here." || text === "Please fill in all fields to generate your story.") {
        output.textContent = "Generate a story first, then click speak to hear it.";
        storyCard.classList.remove("empty-state");
        animateStoryCard();
        return;
    }

    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;
    window.speechSynthesis.speak(speech);
}

function clearFields() {
    setFormValues({
        adjective: "",
        noun: "",
        verb: "",
        place: "",
        adjective2: "",
        noun2: ""
    });

    output.textContent = "Your generated story will appear here.";
    storyCard.classList.add("empty-state");
    window.speechSynthesis.cancel();
    animateStoryCard();
}

function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
}

historyList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const id = target.getAttribute("data-id");
    if (!id) return;

    const items = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    const selected = items.find((item) => String(item.id) === id);

    if (!selected) return;

    setFormValues(selected.values);
    output.textContent = selected.story;
    storyCard.classList.remove("empty-state");
    animateStoryCard();
});

generateBtn.addEventListener("click", generateStory);
randomBtn.addEventListener("click", fillRandomWords);
speakBtn.addEventListener("click", speakStory);
clearBtn.addEventListener("click", clearFields);
clearHistoryBtn.addEventListener("click", clearHistory);

renderHistory();
