
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
