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
const activeTemplateLabel = document.getElementById("activeTemplateLabel");
const historyList = document.getElementById("historyList");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeText = document.getElementById("themeText");
const statusMessage = document.getElementById("statusMessage");
const shareMenu = document.getElementById("shareMenu");
const shareBackdrop = document.getElementById("shareBackdrop");
const closeShareMenuBtn = document.getElementById("closeShareMenu");
const shareFacebookBtn = document.getElementById("shareFacebook");
const shareWhatsAppBtn = document.getElementById("shareWhatsApp");
const shareViberBtn = document.getElementById("shareViber");
const languageSelect = document.getElementById("languageSelect");
let currentLanguage="en";
if (languageSelect) {
    languageSelect.addEventListener("change", () => {
        currentLanguage = languageSelect.value;
        // Update the lang attribute on the root HTML element to help browsers and assistive
        // technologies handle the selected language correctly. This does not affect
        // styling but improves accessibility and ensures hyphenation and font fallback.
        document.documentElement.setAttribute("lang", currentLanguage === "mm" ? "my" : currentLanguage);
    });
    // Set the initial lang attribute on page load.
    document.documentElement.setAttribute("lang", currentLanguage === "mm" ? "my" : currentLanguage);
}

const DEFAULT_OUTPUT = "Your AI story will appear here...";
const HISTORY_KEY = "story-generator-history-v3";
const THEME_KEY = "story-generator-theme";
const API_ENDPOINT = "/.netlify/functions/generate-story";
const SPEECH_API_ENDPOINT = "/.netlify/functions/generate-speech";
const TYPING_SPEED = 16;

let currentAudio = null;
let isAiSpeaking = false;

const SPEECH_LANGUAGE_MAP = {
    en: ["en-US", "en-GB", "en"],
    mm: ["my-MM", "my", "mym-MM", "mym"]
};

function getSpeechLang() {
    const candidates = SPEECH_LANGUAGE_MAP[currentLanguage] || [currentLanguage || "en-US", "en"];
    return candidates[0];
}

function getVoices() {
    if (!("speechSynthesis" in window)) {
        return [];
    }
    return window.speechSynthesis.getVoices() || [];
}

function waitForVoices(timeout = 1200) {
    return new Promise((resolve) => {
        const existing = getVoices();
        if (existing.length) {
            resolve(existing);
            return;
        }

        let settled = false;
        const finish = () => {
            if (settled) {
                return;
            }
            settled = true;
            window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
            clearTimeout(timer);
            resolve(getVoices());
        };

        const handleVoicesChanged = () => finish();
        const timer = setTimeout(finish, timeout);
        window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    });
}

function pickBestVoice(voices = []) {
    if (!voices.length) {
        return null;
    }

    const preferredLangs = SPEECH_LANGUAGE_MAP[currentLanguage] || [currentLanguage || "en-US"];
    const normalizedPreferredLangs = preferredLangs.map((lang) => String(lang).toLowerCase());

    const exactMatch = voices.find((voice) => normalizedPreferredLangs.includes(String(voice.lang || "").toLowerCase()));
    if (exactMatch) {
        return exactMatch;
    }

    if (currentLanguage === "mm") {
        const myanmarVoice = voices.find((voice) => {
            const name = String(voice.name || "").toLowerCase();
            const lang = String(voice.lang || "").toLowerCase();
            return lang.startsWith("my") || lang.startsWith("mym") || /myanmar|burmese/.test(name);
        });

        if (myanmarVoice) {
            return myanmarVoice;
        }
    }

    const startsWithMatch = voices.find((voice) => {
        const lang = String(voice.lang || "").toLowerCase();
        return normalizedPreferredLangs.some((preferred) => lang.startsWith(preferred.split("-")[0]));
    });

    return startsWithMatch || voices.find((voice) => voice.default) || voices[0] || null;
}

function splitStoryForSpeech(text = "") {
    const normalized = String(text || "").replace(/\s+/g, " ").trim();
    if (!normalized) {
        return [];
    }

    const sentences = normalized.match(/[^.!?။]+[.!?။]?/g) || [normalized];
    const chunks = [];
    let buffer = "";

    sentences.forEach((sentence) => {
        const part = sentence.trim();
        if (!part) {
            return;
        }

        if (!buffer) {
            buffer = part;
            return;
        }

        if ((buffer + " " + part).length <= 220) {
            buffer += " " + part;
            return;
        }

        chunks.push(buffer);
        buffer = part;
    });

    if (buffer) {
        chunks.push(buffer);
    }

    return chunks;
}

function speakChunks(chunks, voice) {
    return new Promise((resolve, reject) => {
        if (!chunks.length) {
            resolve();
            return;
        }

        let index = 0;

        const speakNext = () => {
            if (index >= chunks.length) {
                resolve();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(chunks[index]);
            utterance.lang = getSpeechLang();
            if (voice) {
                utterance.voice = voice;
                utterance.lang = voice.lang || utterance.lang;
            }
            utterance.rate = 0.96;
            utterance.pitch = 1;
            utterance.volume = 1;
            utterance.onend = () => {
                index += 1;
                speakNext();
            };
            utterance.onerror = (event) => reject(event.error || new Error("Speech failed."));
            window.speechSynthesis.speak(utterance);
        };

        speakNext();
    });
}

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? "#f87171" : "var(--success)";

    if (message) {
        clearTimeout(showStatus.timer);
        showStatus.timer = setTimeout(() => {
            statusMessage.textContent = "";
        }, 3200);
    }
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

function setFormValues(values = {}) {
    adjectiveInput.value = values.adjective || "";
    nounInput.value = values.noun || "";
    verbInput.value = values.verb || "";
    placeInput.value = values.place || "";
    adjective2Input.value = values.adjective2 || "";
    noun2Input.value = values.noun2 || "";
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

function escapeHtml(text = "") {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeRegExp(text = "") {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildHighlightMarkup(story, highlightTerms = []) {
    const safeStory = escapeHtml(story || "");
    const uniqueTerms = [...new Set(
        (highlightTerms || [])
            .map((term) => (term || "").trim())
            .filter((term) => term.length > 1)
    )].sort((a, b) => b.length - a.length);

    if (!uniqueTerms.length) {
        return safeStory;
    }

    const pattern = uniqueTerms
        .map((term) => escapeRegExp(escapeHtml(term)))
        .join("|");

    if (!pattern) {
        return safeStory;
    }

    const matcher = new RegExp(`(${pattern})`, "gi");
    return safeStory.replace(matcher, '<mark class="story-highlight">$1</mark>');
}

function renderStory(story, highlightTerms = []) {
    output.innerHTML = buildHighlightMarkup(story, highlightTerms);
    output.dataset.storyText = story;
    storyBox.classList.remove("is-loading");
    animateStoryBox();
}

function showLoadingSkeleton() {
    storyBox.classList.add("is-loading");
    output.dataset.storyText = "";
    output.innerHTML = `
        <div class="story-skeleton" aria-hidden="true">
            <span class="skeleton-line long"></span>
            <span class="skeleton-line medium"></span>
            <span class="skeleton-line long"></span>
            <span class="skeleton-line short"></span>
            <span class="skeleton-line medium"></span>
        </div>
    `;
}

async function typeStory(story, highlightTerms = []) {
    storyBox.classList.remove("is-loading");
    output.innerHTML = "";
    output.dataset.storyText = "";
    const text = String(story || "");

    if (!text) {
        renderStory("", highlightTerms);
        return;
    }

    for (let i = 0; i <= text.length; i += 1) {
        output.textContent = text.slice(0, i);
        output.dataset.storyText = text.slice(0, i);
        await new Promise((resolve) => setTimeout(resolve, TYPING_SPEED));
    }

    renderStory(text, highlightTerms);
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
                <strong>${escapeHtml(item.title)}</strong>
                <span class="history-template">${escapeHtml(item.modeLabel)} • ${escapeHtml(item.createdAt)}</span>
            </div>
            <p>${escapeHtml(item.story)}</p>
            <div class="history-actions">
                <button class="secondary" type="button" data-action="load" data-id="${item.id}">Load Story</button>
                <button class="secondary" type="button" data-action="copy" data-id="${item.id}">Copy</button>
            </div>
        </article>
    `).join("");
}

function createStoryTitle(values = {}) {
    const words = [values.adjective, values.noun, values.place]
        .filter(Boolean)
        .slice(0, 3)
        .join(" ")
        .trim();

    if (!words) {
        return "AI Story";
    }

    return words
        .split(" ")
        .slice(0, 5)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function addToHistory(story, values, highlightTerms) {
    const history = getHistory();
    const newItem = {
        id: Date.now().toString(),
        title: createStoryTitle(values),
        modeLabel: "AI Story Mode",
        values,
        highlightTerms,
        story,
        createdAt: new Date().toLocaleString()
    };

    const updatedHistory = [newItem, ...history].slice(0, 8);
    saveHistory(updatedHistory);
    renderHistory();
}

function setLoadingState(isLoading, mode = "generate") {
    generateBtn.disabled = isLoading;
    randomBtn.disabled = isLoading;
    clearBtn.disabled = isLoading;

    if (!isLoading) {
        generateBtn.textContent = "Generate Story";
        randomBtn.textContent = "🎲 Random Story";
        return;
    }

    showLoadingSkeleton();

    if (mode === "random") {
        randomBtn.textContent = "Generating...";
    } else {
        generateBtn.textContent = "Generating...";
    }
}

async function requestStory({ random = false } = {}) {
    setLoadingState(true, random ? "random" : "generate");
    showStatus(random ? "Creating a random AI story..." : "Creating your AI story...");

    try {
        const response = await fetch(API_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                random,
                inputs: getFormValues(),
                language: currentLanguage
            })
        });

        const data = await response.json();

        if (!response.ok || !data?.story) {
            throw new Error(data?.error || "Could not generate story.");
        }

        const finalValues = data.normalizedInputs || getFormValues();
        const highlightTerms = data.highlightTerms || Object.values(finalValues).filter(Boolean);

        setFormValues(finalValues);
        activeTemplateLabel.textContent = data.modeLabel || "AI Story Mode";
        await typeStory(data.story, highlightTerms);
        addToHistory(data.story, finalValues, highlightTerms);
        showStatus(random ? "Random AI story generated." : "AI story generated and saved.");
        return data.story;
    } catch (error) {
        const fallbackMessage = error?.message || "Something went wrong while generating your story.";
        showStatus(fallbackMessage, true);
        throw error;
    } finally {
        setLoadingState(false);
    }
}

function setSpeakButtonState(isLoading = false) {
    speakBtn.disabled = isLoading;
    speakBtn.textContent = isLoading ? "🔊 Loading Voice..." : "🔊 Speak";
}

function stopCurrentAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    isAiSpeaking = false;
    setSpeakButtonState(false);
}

async function requestAiSpeech(text) {
    const response = await fetch(SPEECH_API_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text,
            language: currentLanguage
        })
    });

    const data = await response.json();

    if (!response.ok || !data?.audioBase64) {
        throw new Error(data?.error || "Could not generate AI voice.");
    }

    return data;
}

async function playAiSpeech(text) {
    setSpeakButtonState(true);
    showStatus(currentLanguage === "mm" ? "Creating Myanmar AI voice..." : "Creating AI voice...");

    try {
        const data = await requestAiSpeech(text);
        const audioSrc = `data:${data.mimeType || "audio/wav"};base64,${data.audioBase64}`;

        stopCurrentAudio();
        currentAudio = new Audio(audioSrc);
        currentAudio.preload = "auto";
        currentAudio.onended = () => {
            isAiSpeaking = false;
            setSpeakButtonState(false);
            showStatus(currentLanguage === "mm" ? "Myanmar AI voice finished playing." : "AI voice finished playing.");
        };
        currentAudio.onerror = () => {
            isAiSpeaking = false;
            setSpeakButtonState(false);
            showStatus(currentLanguage === "mm" ? "Could not play the Myanmar AI voice." : "Could not play the AI voice.", true);
        };

        await currentAudio.play();
        isAiSpeaking = true;
        setSpeakButtonState(false);
        showStatus(currentLanguage === "mm" ? "Playing Myanmar AI voice." : "Playing AI voice.");
        return true;
    } catch (error) {
        setSpeakButtonState(false);
        throw error;
    }
}

async function speakStory() {
    const storyText = (output.dataset.storyText || output.textContent || "").trim();

    if (!storyText || storyText === DEFAULT_OUTPUT) {
        showStatus("Generate a story first.", true);
        return;
    }

    if (isAiSpeaking && currentAudio) {
        stopCurrentAudio();
        showStatus("Voice stopped.");
        return;
    }

    try {
        await playAiSpeech(storyText);
    } catch (error) {
        if (!("speechSynthesis" in window)) {
            showStatus(error?.message || "Voice narration is not supported in this browser.", true);
            return;
        }

        try {
            const voices = await waitForVoices();
            const selectedVoice = pickBestVoice(voices);
            const chunks = splitStoryForSpeech(storyText);

            if (!chunks.length) {
                throw new Error("No story available for speech.");
            }

            window.speechSynthesis.cancel();
            await speakChunks(chunks, selectedVoice);
            showStatus(
                currentLanguage === "mm"
                    ? "AI voice was unavailable, so browser voice is reading your Myanmar story."
                    : "AI voice was unavailable, so browser voice is reading your story."
            );
        } catch {
            showStatus(
                error?.message || (currentLanguage === "mm"
                    ? "Could not read the Myanmar story right now."
                    : "Could not read the story right now."),
                true
            );
        }
    }
}

async function copyStory(text = (output.dataset.storyText || output.textContent || "").trim()) {
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

function getSharePayload() {
    const text = (output.dataset.storyText || output.textContent || "").trim();
    const pageUrl = window.location.href;
    const combinedText = `${text}

Made with Story Generator Studio
${pageUrl}`.trim();

    return {
        text,
        pageUrl,
        combinedText,
        encodedText: encodeURIComponent(text),
        encodedCombinedText: encodeURIComponent(combinedText),
        encodedUrl: encodeURIComponent(pageUrl)
    };
}

function openShareMenu() {
    shareMenu.hidden = false;
    document.body.classList.add("share-menu-open");
}

function closeShareMenu() {
    shareMenu.hidden = true;
    document.body.classList.remove("share-menu-open");
}

function openShareWindow(url) {
    window.open(url, "_blank", "noopener,noreferrer,width=720,height=720");
}

async function shareToPlatform(platform) {
    const payload = getSharePayload();

    if (!payload.text || payload.text === DEFAULT_OUTPUT) {
        showStatus("Generate a story first.", true);
        return;
    }

    if (platform === "facebook") {
        await copyStory(payload.text);
        openShareWindow(`https://www.facebook.com/dialog/share?app_id=966242223397117&display=popup&href=${payload.encodedUrl}`);
        showStatus("Facebook share opened. Your story was copied, so you can paste it into your post.");
        closeShareMenu();
        return;
    }

    if (platform === "whatsapp") {
        openShareWindow(`https://wa.me/?text=${payload.encodedCombinedText}`);
        showStatus("WhatsApp share opened.");
        closeShareMenu();
        return;
    }

    if (platform === "viber") {
        openShareWindow(`viber://forward?text=${payload.encodedCombinedText}`);
        showStatus("Viber share opened.");
        closeShareMenu();
        return;
    }

        showStatus("Instagram does not support direct text share from normal web pages, so your story was copied and Instagram was opened.", true);
        closeShareMenu();
    }


async function shareStory() {
    const text = (output.dataset.storyText || output.textContent || "").trim();

    if (!text || text === DEFAULT_OUTPUT) {
        showStatus("Generate a story first.", true);
        return;
    }

    await copyStory(text);

    if (navigator.share) {
        openShareMenu();
        showStatus("Choose where you want to share your story.");
        return;
    }

    openShareMenu();
    showStatus("Choose a sharing app.");
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
    storyBox.classList.remove("is-loading");
    output.textContent = DEFAULT_OUTPUT;
    output.dataset.storyText = DEFAULT_OUTPUT;
    activeTemplateLabel.textContent = "AI Story Mode";
    stopCurrentAudio();
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

    setFormValues(item.values);
    renderStory(item.story, item.highlightTerms || Object.values(item.values || {}).filter(Boolean));
    activeTemplateLabel.textContent = item.modeLabel || "AI Story Mode";
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

generateBtn.addEventListener("click", () => {
    requestStory().catch(() => {});
});

randomBtn.addEventListener("click", () => {
    requestStory({ random: true }).catch(() => {});
});

speakBtn.addEventListener("click", speakStory);
copyBtn.addEventListener("click", () => copyStory());
shareBtn.addEventListener("click", shareStory);
clearBtn.addEventListener("click", () => {
    stopCurrentAudio();
    clearAll();
});
clearHistoryBtn.addEventListener("click", clearHistory);
themeToggle.addEventListener("click", toggleTheme);

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
renderHistory();
output.dataset.storyText = DEFAULT_OUTPUT;


shareBackdrop.addEventListener("click", closeShareMenu);
closeShareMenuBtn.addEventListener("click", closeShareMenu);
shareFacebookBtn.addEventListener("click", () => shareToPlatform("facebook"));
shareWhatsAppBtn.addEventListener("click", () => shareToPlatform("whatsapp"));
shareViberBtn.addEventListener("click", () => shareToPlatform("viber"));

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !shareMenu.hidden) {
        closeShareMenu();
    }
});
