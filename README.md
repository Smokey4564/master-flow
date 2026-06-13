# Master Flow

Master Flow is a gamified productivity and budget tracker that combines RPG-style quest progression with envelope budgeting and a shared activity ledger.

## What the App Does

### Quests

Create dated quests with categories, notes, times, and difficulty tiers. Hold a quest card to complete it, earn XP and gold, and record the result in the ledger.

### Wallet

Create budget envelopes, track their balances, record spending, and review transaction history for each envelope.

### Summary

Review the total budget currently allocated across envelopes, total wallet spending, and the combined historical ledger.

### Settings

Set a custom hero name or reset the current player profile.

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- Firebase Firestore

## File Structure

- `index.html`: App layout, forms, tabs, and dark-theme styles.
- `script.js`: State management, rendering, interactions, local caching, and Firestore synchronization.

## Features Before Fixes

- Multi-profile local and Firestore synchronization
- RPG classes, stats, XP, gold, and quest rewards
- Quest creation, completion, deletion, and activity logging
- Envelope spending and expandable transaction history
- Tabbed quests, wallet, summary, and settings layout

## Features After Fixes

- Tier-styled quest cards with hold progress and completion animation
- Overdue quest highlighting and warning badges
- Correct allocated-budget and total-spent summary values
- User-created budget envelopes
- Saved and profile-aware custom hero names
- Plain-English JavaScript block comments and labeled HTML sections

## How to Run

Open `index.html` directly in a browser, or serve the directory locally:

```bash
npx serve
```

## What Was Fixed / Added

1. Added master-card, tier, hold-progress, time-badge, completion, and overdue styles.
2. Fixed the financial summary to show current envelope balances as allocated budget and negative wallet journal entries as total spent.
3. Added a wallet form and listener for creating budget envelopes.
4. Added a settings control for saving and loading a custom hero name.
5. Added overdue quest date detection, card styling, and warning badges.
6. Added plain-English comments to JavaScript behavior blocks and HTML labels for major sections and forms.
7. Added this README with app usage and implementation details.
