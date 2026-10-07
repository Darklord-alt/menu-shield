# Menu Shield — Scope

## One sentence

Menu Shield helps a diner turn a photo of a restaurant menu into a short, reviewable list of dishes that may conflict with their stated allergens.

## User and problem

People with food allergies often face dense, inconsistent menu wording. They need a fast first pass that makes the important staff conversation easier, not an unsafe promise that something is safe to eat.

## In scope for this proof of concept

- Upload one PNG, JPG, or WebP menu photograph.
- Enter one or more allergens to avoid.
- Use image analysis to extract dishes and identify explicitly stated or plausibly implied matches.
- Display each finding with a `Likely match` or `Possible match` label, supporting menu evidence, and visible uncertainty.
- Offer a working sample result for a demo without an API key.
- Keep API credentials on the server; do not persist menu images or allergen lists.

## Out of scope

- Medical advice, dietary clearance, or guarantees of safety.
- Restaurant inventory, recipe, or cross-contact verification.
- User accounts, saved histories, payments, or restaurant integrations.
- PDF menus, live camera capture, translations, and nutrition calculation.

## Success criteria

A first-time user can add allergens, upload a clear menu photo, receive readable dish-by-dish flags, and understand from the product itself that restaurant confirmation is still required.
