# Story Generator Studio

This version removes the old template-based story builder and uses a secure Netlify Function as the backend for real AI story generation.

## What changed

- removed template story generation from the frontend
- added real AI story generation through `/.netlify/functions/generate-story`
- keeps the API key in the backend only
- supports messy user input and smooths it into natural story writing
- highlights the important prompt words inside the generated story
- supports random AI story generation
- keeps your original styling, layout feel, animations, history, voice, copy, and share actions

## Free setup for Netlify

This project is wired for the Gemini API free tier. Google documents that Gemini Developer API offers a free tier, and Netlify Functions can use runtime environment variables for secrets.

### 1. Create a free Gemini API key

Create a free key in Google AI Studio and copy it.

### 2. Add the key in Netlify

In your Netlify site settings, add this environment variable:

- `GEMINI_API_KEY=your_key_here`

Make sure the variable is available to Functions at runtime.

### 3. Deploy

Upload the project to GitHub and connect it to Netlify, or drag and drop it into Netlify.

### 4. Local development

```bash
npm install
npx netlify dev
```

## Notes

- The frontend never exposes your API key.
- The app includes a safe fallback story if the AI provider is temporarily unavailable.
- "Free of charge" here means using the provider's free tier, so usage limits can still apply.
