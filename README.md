# Master Flow

Master Flow is a gamified productivity and budget tracker that combines RPG-style quest progression with envelope budgeting and a shared activity ledger.

## What the App Does

### Quests

Create dated quests with categories, notes, times, and difficulty tiers. Hold a quest card to complete it, earn XP and gold, automatically grow relevant character attributes based on smart-text recognition, and record the final result in the ledger.

### Wallet

Create budget envelopes, track their balances, record spending, transfer money seamlessly between envelopes, and review transaction history for each isolated envelope.

### Summary

Review the total budget currently allocated across envelopes, total wallet spending, and the combined historical ledger.

### Settings

Set a custom hero name, change your character class archetype, or reset the current player profile.

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- Firebase Firestore

## File Structure

- `index.html`: App layout, forms, tabs, and dark-theme styles.
- `script.js`: State management, rendering, core RPG/financial logic, local caching, and live Firestore snapshot synchronization.

## Features Before Fixes

- Multi-profile local and Firestore synchronization
- RPG classes, core stats, XP, gold, and quest rewards
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
- Dynamic contextual attribute allocations driven by a keyword-matching string engine
- Real-time internal asset reallocations between financial envelopes
- A dynamic level-up rewards system that triggers sensory visual explosions or localized floating reward gains
- Active daily streak protective shields that mitigate attribute penalties upon abandoning tasks

## How to Run

Open `index.html` directly in a browser, or serve the directory locally:

```bash
npx serve
What Was Fixed / Added
Added master-card, tier, hold-progress, time-badge, completion, and overdue styles.

Fixed the financial summary to show current envelope balances as allocated budget and negative wallet journal entries as total spent.

Added a wallet form and listener for creating budget envelopes.

Added a settings control for saving and loading a custom hero name.

Added overdue quest date detection, card styling, and warning badges.

Added plain-English comments to JavaScript behavior blocks and HTML labels for major sections and forms.

Added this README with app usage and implementation details.

Added player attributes tracking (Strength, Dexterity, Intelligence, Endurance, Focus) powered by a preset keyword dictionary to automatically route stat points based on activity names. (New - 6/13)

Added an internal money-transfer feature to seamlessly reallocate funds between different budget envelopes with automated ledger tracking. (New - 6/13)

Fixed the Hobby Grind engine to distribute dynamic Gold, XP, and Stat points alongside floating dopamine-text popups and level-up visual celebrations. (New - 6/13)

Added a daily streak protection safeguard shield that intercepts and blocks attribute point penalties when a quest has to be abandoned. (New - 6/13)

Added a new version of rules to Firebase Firestore for structured profile data syncs. (New - 6/13)
