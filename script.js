const adjectiveInput = document.getElementById("adjective");
const nounInput = document.getElementById("noun");
const verbInput = document.getElementById("verb");
const placeInput = document.getElementById("place");
const adjective2Input = document.getElementById("adjective2");
const noun2Input = document.getElementById("noun2");

const output = document.getElementById("output");
const storyCard = document.getElementById("storyCard");
const storyTitle = document.getElementById("storyTitle");
const storyMeta = document.getElementById("storyMeta");
const exportStatus = document.getElementById("exportStatus");
const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");

const generateBtn = document.getElementById("generateBtn");
const randomBtn = document.getElementById("randomBtn");
const speakBtn = document.getElementById("speakBtn");
const clearBtn = document.getElementById("clearBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const downloadPngBtn = document.getElementById("downloadPngBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

const HISTORY_KEY = "story-generator-history";
const MAX_HISTORY = 8;
const DEFAULT_OUTPUT = "Your generated story will appear here.";

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

function capitalize(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDate(date = new Date()) {
    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function updateStoryPresentation(values, story) {
    storyTitle.textContent = `${capitalize(values.adjective)} ${capitalize(values.noun)} Adventure`;
    storyMeta.textContent = `${capitalize(values.place)} • ${formatDate()} • Ready to export`;
    output.textContent = story;
    storyCard.classList.remove("empty-state");
    exportStatus.textContent = "Your story card is ready to download as PNG or PDF.";
}

function saveToHistory(story, values) {
    const current = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");

    const updated = [
        {
            id: Date.now(),
            title: `${values.adjective} ${values.noun}`,
            story,
            values,
            createdAt: new Date().toISOString()
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
            <div class="history-item-footer">
                <span>${escapeHtml(formatDate(new Date(item.createdAt)))}</span>
                <button type="button" data-id="${item.id}">Load story</button>
            </div>
        </article>
    `).join("");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function isStoryReady() {
    const text = output.textContent.trim();
    return text && text !== DEFAULT_OUTPUT && text !== "Please fill in all fields to generate your story." && text !== "Generate a story first, then click speak to hear it.";
}

function generateStory() {
    const values = getFormValues();

    if (hasEmptyFields(values)) {
        output.textContent = "Please fill in all fields to generate your story.";
        storyTitle.textContent = "Complete every field first";
        storyMeta.textContent = "Add all six words to create your export-ready card";
        exportStatus.textContent = "Fill every input to enable PNG and PDF downloads.";
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

    updateStoryPresentation(values, story);
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
    if (!isStoryReady()) {
        output.textContent = "Generate a story first, then click speak to hear it.";
        storyCard.classList.remove("empty-state");
        animateStoryCard();
        return;
    }

    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(output.textContent.trim());
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

    storyTitle.textContent = "Generate your next adventure";
    storyMeta.textContent = "Ready for PNG and PDF export";
    output.textContent = DEFAULT_OUTPUT;
    exportStatus.textContent = "Generate a story to unlock polished exports.";
    storyCard.classList.add("empty-state");
    window.speechSynthesis.cancel();
    animateStoryCard();
}

function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
}

function sanitizeFilename(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "story-card";
}

async function createCardCanvas() {
    storyCard.classList.add("export-mode");
    try {
        const canvas = await window.html2canvas(storyCard, {
            scale: 2,
            backgroundColor: null,
            useCORS: true
        });
        return canvas;
    } finally {
        storyCard.classList.remove("export-mode");
    }
}

async function downloadStoryAsPng() {
    if (!isStoryReady()) {
        exportStatus.textContent = "Generate a story first before downloading a PNG.";
        return;
    }

    if (!window.html2canvas) {
        exportStatus.textContent = "PNG export library did not load. Please refresh and try again.";
        return;
    }

    exportStatus.textContent = "Preparing your PNG story card...";

    try {
        const canvas = await createCardCanvas();
        const link = document.createElement("a");
        link.download = `${sanitizeFilename(storyTitle.textContent)}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        exportStatus.textContent = "PNG download started successfully.";
    } catch (error) {
        console.error(error);
        exportStatus.textContent = "PNG export failed. Please try again.";
    }
}

async function downloadStoryAsPdf() {
    if (!isStoryReady()) {
        exportStatus.textContent = "Generate a story first before downloading a PDF.";
        return;
    }

    if (!window.html2canvas || !window.jspdf || !window.jspdf.jsPDF) {
        exportStatus.textContent = "PDF export library did not load. Please refresh and try again.";
        return;
    }

    exportStatus.textContent = "Preparing your PDF story card...";

    try {
        const canvas = await createCardCanvas();
        const imageData = canvas.toDataURL("image/png");
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
            unit: "px",
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imageData, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save(`${sanitizeFilename(storyTitle.textContent)}.pdf`);
        exportStatus.textContent = "PDF download started successfully.";
    } catch (error) {
        console.error(error);
        exportStatus.textContent = "PDF export failed. Please try again.";
    }
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
    updateStoryPresentation(selected.values, selected.story);
    animateStoryCard();
    exportStatus.textContent = "Loaded from history. You can speak it or export it now.";
});

generateBtn.addEventListener("click", generateStory);
randomBtn.addEventListener("click", fillRandomWords);
speakBtn.addEventListener("click", speakStory);
clearBtn.addEventListener("click", clearFields);
clearHistoryBtn.addEventListener("click", clearHistory);
downloadPngBtn.addEventListener("click", downloadStoryAsPng);
downloadPdfBtn.addEventListener("click", downloadStoryAsPdf);

renderHistory();
