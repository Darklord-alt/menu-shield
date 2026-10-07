# Menu Shield — Technical Specification

## Architecture

```
Browser (vanilla HTML/CSS/JS)
  ├─ upload image + selected allergens
  ├─ POST /api/analyze
  └─ render structured result

Node HTTP server
  ├─ validates image data URL and allergens
  ├─ holds OPENAI_API_KEY server-side
  ├─ POST https://api.openai.com/v1/responses
  └─ returns structured menu-screening JSON
```

## Local run

```powershell
$env:OPENAI_API_KEY='your_key_here'
npm start
```

Open `http://127.0.0.1:3000`.

The `OPENAI_MODEL` environment variable is optional. The default is `gpt-5-mini`; select a vision-capable Responses API model available to the account when overriding it.

## API contract

### `POST /api/analyze`

Request:

```json
{
  "image": "data:image/jpeg;base64,...",
  "allergens": ["peanuts", "milk"]
}
```

Response fields:

- `menu_title`: readable name, if present
- `dishes[]`: `name`, `description`, `uncertainty`, and `matches[]`
- `matches[]`: allergen, menu-text evidence, and `likely` or `possible` risk
- `limitations`: required reminder to verify with restaurant staff

The server sends a data URL as an `input_image` in the Responses API request, with JSON Schema structured output. The request is set to `store: false`.

## Security and privacy

- `.env` is ignored by Git.
- Requests are capped at 12 MB; UI caps upload selection at 8 MB.
- No uploaded data is written to disk, logged, or stored in a database by the application.
- The static server blocks paths outside `public/`.
- API errors are truncated before being returned to the browser.

## Verification

```powershell
npm run check
npm start
Invoke-WebRequest http://127.0.0.1:3000/api/health
```

Use **Try the demo menu** to verify the end-to-end interface without a key. With an `OPENAI_API_KEY` configured, upload a clear menu photo and run a live scan.
