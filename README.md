# Menu Shield

Menu Shield is a small, privacy-minded proof of concept for restaurant-menu allergy screening. Upload a menu photo, list ingredients to avoid, and it highlights items to confirm with staff.

> Menu Shield is a screening tool, not a medical device. It cannot verify recipes, substitutions, shared equipment, or cross-contact. Always confirm with restaurant staff before ordering.

## Run locally

Requires Node.js 18 or newer. No package installation is required.

```powershell
Copy-Item .env.example .env
# Open .env and configure either OpenAI or NVIDIA, never both.
npm start
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000). The key remains on the server and is never sent to the browser. Restart the app after changing `.env`.

For OpenAI, set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` (default: `gpt-5-mini`). For an NVIDIA API Catalog key, set `NVIDIA_API_KEY` and optionally `NVIDIA_MODEL` (default: `meta/llama-3.2-90b-vision-instruct`). The server keeps either key local and never sends it to the browser or Git.

## Demo without an API key

Run `npm start`, open the page, and click **Try the demo menu**. This demonstrates the full interaction and clear uncertainty labeling without uploading anything.

## Checks

```powershell
npm run check
```

## Project documents

- [Scope](scope.md)
- [Product requirements](prd.md)
- [Technical specification](spec.md)
