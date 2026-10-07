# Menu Shield

Menu Shield is a small, privacy-minded proof of concept for restaurant-menu allergy screening. Upload a menu photo, list ingredients to avoid, and it highlights items to confirm with staff.

> Menu Shield is a screening tool, not a medical device. It cannot verify recipes, substitutions, shared equipment, or cross-contact. Always confirm with restaurant staff before ordering.

## Run locally

Requires Node.js 18 or newer. No package installation is required.

```powershell
Copy-Item .env.example .env
# Open .env and replace "replace_me" with your OpenAI API key.
npm start
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000). The key remains on the server and is never sent to the browser. Restart the app after changing `.env`.

Optionally set `OPENAI_MODEL` to a vision-capable Responses API model available to your account. The default is `gpt-5-mini`.

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
