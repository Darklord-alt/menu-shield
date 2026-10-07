# Menu Shield — Product Requirements

## Goal

Make menu allergy screening understandable in under a minute while never presenting AI output as a medical or safety guarantee.

## Primary flow

1. User opens the landing page and sees the safety limitation before scanning.
2. User uploads a single menu image and adds one or more allergens.
3. The app sends the image and allergen list to a server-side image-analysis endpoint.
4. The app shows every readable dish, highlighting only `Likely match` and `Possible match` results with menu-text evidence.
5. The user uses the result to ask restaurant staff precise follow-up questions.

## Functional requirements

- The upload accepts PNG, JPG, and WebP only, and rejects images over 8 MB.
- The user can add and remove allergen chips, including common-allergen shortcuts.
- Scan is unavailable until both an image and at least one allergen exist.
- A response includes a menu title, dishes, description, confidence, evidence-backed matches, and a limitation statement.
- Users can run a fully local visual demo without uploading an image or using an API key.
- A missing API key produces a helpful configuration message rather than a broken interface.

## Non-functional requirements

- Mobile-first and keyboard-operable controls.
- No database and no intentional image/allergen persistence.
- API key never reaches the browser.
- UI makes uncertainty and limitations visible beside results.

## Safety requirements

- Do not say any dish is “safe.”
- Do not invent ingredients as facts.
- Clearly distinguish explicit from ambiguous evidence.
- Include staff confirmation and cross-contact warning before and after a scan.
