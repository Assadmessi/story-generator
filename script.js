const adjectiveInput = document.getElementById("adjective");
const nounInput = document.getElementById("noun");
const verbInput = document.getElementById("verb");
const placeInput = document.getElementById("place");
const adjective2Input = document.getElementById("adjective2");
const noun2Input = document.getElementById("noun2");
const output = document.getElementById("output");
const generateBtn = document.getElementById("generateBtn");
const randomBtn = document.getElementById("randomBtn");
const speakBtn = document.getElementById("speakBtn");
const clearBtn = document.getElementById("clearBtn");

const randomWords = {
    adjectives: ["tiny", "brave", "sparkly", "mysterious", "funny", "sleepy", "wild", "gentle"],
    nouns: ["dragon", "lion", "robot", "pirate", "wizard", "dog", "cat", "fox"],
    verbs: ["dancing", "running", "singing", "jumping", "roaring", "spinning", "glowing", "flying"],
    places: ["park", "forest", "castle", "moon base", "village", "playground", "desert", "mountain"],
    nouns2: ["cupcake", "rabbit", "sandwich", "donut", "apple", "taco", "marshmallow", "pizza"]
};

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function buildStory(adjective, noun, verb, place, adjective2, noun2) {
    return `Once upon a time, there was a ${adjective} ${noun} who loved to eat ${noun2}. The ${noun} lived in a ${place} and had ${adjective2} nostrils that blew fire whenever it was ${verb}. Everyone in the ${place} talked about the amazing ${noun}, and that is how the story became legendary.`;
}

function generateStory() {
    const adjective = adjectiveInput.value.trim() || "tiny";
    const noun = nounInput.value.trim() || "dog";
    const verb = verbInput.value.trim() || "running";
    const place = placeInput.value.trim() || "park";
    const adjective2 = adjective2Input.value.trim() || "fast";
    const noun2 = noun2Input.value.trim() || "rabbit";

    const story = buildStory(adjective, noun, verb, place, adjective2, noun2);
    output.textContent = story;
    return story;
}

function fillRandomWords() {
    adjectiveInput.value = pickRandom(randomWords.adjectives);
    nounInput.value = pickRandom(randomWords.nouns);
    verbInput.value = pickRandom(randomWords.verbs);
    placeInput.value = pickRandom(randomWords.places);
    adjective2Input.value = pickRandom(randomWords.adjectives);
    noun2Input.value = pickRandom(randomWords.nouns2);

    generateStory();
}

function speakStory() {
    const storyText = output.textContent.trim();

    if (!storyText || storyText === "Your magical story will appear here...") {
        generateStory();
    }

    if (!("speechSynthesis" in window)) {
        alert("Sorry, your browser does not support voice narration.");
        return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(output.textContent);
    speech.rate = 0.95;
    speech.pitch = 1;
    speech.volume = 1;
    window.speechSynthesis.speak(speech);
}

function clearAll() {
    adjectiveInput.value = "";
    nounInput.value = "";
    verbInput.value = "";
    placeInput.value = "";
    adjective2Input.value = "";
    noun2Input.value = "";
    output.textContent = "Your magical story will appear here...";
    window.speechSynthesis.cancel();
}

generateBtn.addEventListener("click", generateStory);
randomBtn.addEventListener("click", fillRandomWords);
speakBtn.addEventListener("click", speakStory);
clearBtn.addEventListener("click", clearAll);
