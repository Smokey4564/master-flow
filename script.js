/**
 * Master Flow v4.3.2 - Air-Tight Cloud Core Engine
 * Core Systems: Real-Time Firebase Sync, Haptic Feedbacks, Fixed Rewards & Dynamic UI Bars
 */

// import modules dynamically from the CDN network pipeline
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, runTransaction, collection, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Project credentials live in their own file so this one holds only app logic
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase Core Engines
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global App State Machine
// activePlayer and currentHouseholdId stay null until the gatekeeper loads them from this
// device's localStorage (or onboarding creates them). Never hardcode an identity here —
// a baked-in default silently points a brand new user at somebody else's household.
let state = {
  activePlayer: null,
  currentHouseholdId: null,
  activeTab: 'quests',
  walletMode: 'spend',
  ledgerPage: 1,
  chroniclePage: 1,
  profiles: {}
};
// RPG Class Title Matrix matching Gender Expression & Level Milestone Evolution
const CLASS_MATRIX = {
    warrior: {
        male:   { base: "🛡️ Guardian Novice", evolved: "⚔️ Guardian Knight" },
        female: { base: "🛡️ Valkyrie Squire",  evolved: "⚔️ Valkyrie Justiciar" },
        stats:  { hp: 120, mp: 40, atk: 15, def: 18 }
    },
    mage: {
        male:   { base: "🔮 Apprentice Mage", evolved: "🌀 Grand Archmage" },
        female: { base: "🔮 Mystic Initiate", evolved: "🌀 High Sorceress" },
        stats:  { hp: 70, mp: 150, atk: 22, def: 6 }
    },
    rogue: {
        male:   { base: "⚡ Thief Rogue",     evolved: "🎭 Shadow Assassin" },
        female: { base: "⚡ Scout Rogue",     evolved: "🎭 Phantom Rogue" },
        stats:  { hp: 90, mp: 60, atk: 19, def: 10 }
    },
    ranger: {
        male:   { base: "🏹 Wildland Strider", evolved: "🎯 Elite Pathfinder" },
        female: { base: "🏹 Forest Scout",     evolved: "🎯 Elite Huntress" },
        stats:  { hp: 100, mp: 70, atk: 18, def: 11 }
    },
    royalty: {
        male:   { base: "👑 Royal Prince",    evolved: "🏰 Sovereign King" },
        female: { base: "👑 Royal Princess",  evolved: "🏰 Sovereign Queen" },
        stats:  { hp: 100, mp: 100, atk: 14, def: 14 }
    },
    cleric: {
        male:   { base: "🙏 Novice Cleric",   evolved: "☀️ High Battle Priest" },
        female: { base: "🙏 Devout Novice",   evolved: "☀️ High Priestess" },
        stats:  { hp: 110, mp: 90, atk: 10, def: 15 }
    }
};

const BASE_ATTRIBUTES = {
    "Strength (STR)": 10,
    "Dexterity (DEX)": 10,
    "Intelligence (INT)": 10,
    "Constitution (CON)": 10,
    "Charisma (CHA)": 10,
    "Wisdom (WIS)": 10
};

const ATTR_MAP = {
    "💪 Fitness/Gym": "Strength (STR)",
    "🌲 Outdoor/Chill": "Constitution (CON)",
    "💻 Coding/App Dev": "Intelligence (INT)",
    "📚 School/Studying": "Intelligence (INT)",
    "🛠️ Maintenance/Repairs": "Dexterity (DEX)",
    "🏠 House Task": "Dexterity (DEX)",
    "🛒 Errands/Shopping": "Constitution (CON)",
    "💼 Work/Career": "Charisma (CHA)",
    "🎮 Digital/Game Time": "Charisma (CHA)",
    "❤️ Family Time": "Charisma (CHA)",
    "🙏 Worship/Devotion": "Wisdom (WIS)",
    "💅 Personal Care": "Wisdom (WIS)",
    "🎯 Personal Habit": "Constitution (CON)"
};

// ==========================================
// ⚖️ GAME BALANCE & APP TUNING
// ==========================================
// Every tunable number lives here instead of being scattered through the logic, so balance
// can be adjusted in one place without hunting through render and resolution code.
const BALANCE = {
    XP_PER_LEVEL: 100,          // XP needed to clear one level
    EVOLUTION_LEVEL: 10,        // level at which class titles upgrade to their evolved form

    // Quest payouts by difficulty tier
    QUEST_REWARDS: {
        common: { xp: 25,  gold: 10 },
        rare:   { xp: 60,  gold: 25 },
        epic:   { xp: 120, gold: 50 }
    },

    // Per-class payout multipliers (anything omitted simply pays 1x)
    CLASS_BONUSES: {
        mage:    { xp: 1.2 },
        rogue:   { gold: 1.2 },
        ranger:  { xp: 1.15 },
        warrior: { xp: 1.1, gold: 1.1 }
    },

    HOLD_TO_COMPLETE_MS: 1000,  // how long a quest card must be held before it resolves
    HOLD_TICK_MS: 100,          // progress-bar refresh rate during the hold
    STREAK_SHIELD_EVERY: 7,     // a shield is granted every N quests in a row
    STREAK_PENALTY_MULTIPLIER: 0.8, // attributes keep this fraction when a streak breaks
    ROWS_PER_PAGE: 5,           // ledger / chronicle table page size

    // A whole profile lives in ONE Firestore document, and those cap out at 1 MiB. History
    // arrays only ever grow, so without a ceiling the document eventually exceeds the limit
    // and every save starts failing — not just history, but gold, quests and balances too.
    // These caps keep the newest entries and drop the oldest tail.
    MAX_LEDGER_ENTRIES: 500,
    MAX_CHRONICLE_ENTRIES: 500
};

// Envelope health thresholds and defaults
const ENVELOPE_DEFAULTS = {
    TARGET: 100,          // monthly goal assumed when none is set
    MIN_THRESHOLD: 0,
    DANGER_PERCENT: 15,   // at or below this % of target -> red
    DANGER_BUFFER: 25,    // ...or this close to the min threshold in dollars
    CAUTION_PERCENT: 30   // at or below this % of target -> amber
};

// Envelopes every brand new profile starts with
const STARTER_ENVELOPES = [
    { id: "env-general", name: "🍔 General Expenses", balance: 0.00 },
    { id: "env-savings", name: "🏦 Iron Bank Savings", balance: 0.00 }
];

// ==========================================
// 🛡️ SAFE TEXT RENDERING HELPER
// ==========================================
// Anything a player types (quest names, memos, envelope names) is shared with the whole
// household through Firestore. Pasting it straight into innerHTML would let one person's
// text run as code in everyone else's browser, so every value gets neutralized first.
function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ==========================================
// 🧮 PROFILE HELPERS
// ==========================================

// 💰 The wallet total is DERIVED, never stored as a running tally. Keeping a separate
// counter in sync with the envelopes was a standing source of drift — one missed update
// (deleting a funded envelope, say) left a phantom balance that never self-corrected.
function getWalletTotal(profile) {
    if (!profile || !Array.isArray(profile.envelopes)) return 0;
    return profile.envelopes.reduce((sum, env) => sum + (parseFloat(env.balance) || 0), 0);
}

// ✂️ Keep the newest history and drop the oldest tail, so the profile document stays
// comfortably under Firestore's 1 MiB per-document ceiling.
function trimProfileHistory(profile) {
    if (!profile) return;
    if (Array.isArray(profile.walletLedger) && profile.walletLedger.length > BALANCE.MAX_LEDGER_ENTRIES) {
        const dropped = profile.walletLedger.length - BALANCE.MAX_LEDGER_ENTRIES;
        profile.walletLedger = profile.walletLedger.slice(0, BALANCE.MAX_LEDGER_ENTRIES);
        console.warn(`✂️ Trimmed ${dropped} oldest wallet entries to stay under the document size limit.`);
    }
    if (Array.isArray(profile.questChronicle) && profile.questChronicle.length > BALANCE.MAX_CHRONICLE_ENTRIES) {
        const dropped = profile.questChronicle.length - BALANCE.MAX_CHRONICLE_ENTRIES;
        profile.questChronicle = profile.questChronicle.slice(0, BALANCE.MAX_CHRONICLE_ENTRIES);
        console.warn(`✂️ Trimmed ${dropped} oldest quest archives to stay under the document size limit.`);
    }
}

// 📴 LOCAL SAFETY NET
// The app writes a copy of each profile to this device. It used to be written and never read,
// so "operating on backup" was a claim the code couldn't actually honour. These two functions
// make it real: written on every local change, read back when the cloud can't be reached.
function writeLocalBackup(id) {
    try {
        if (state.profiles[id]) {
            localStorage.setItem(`masterflow_backup_${id}`, JSON.stringify(state.profiles[id]));
        }
    } catch (err) {
        console.warn("⚠️ Could not write local backup (storage full or blocked):", err);
    }
}

// Returns true if a usable backup was loaded into state.
function hydrateFromLocalBackup(id) {
    if (!id) return false;
    try {
        const raw = localStorage.getItem(`masterflow_backup_${id}`);
        if (!raw) return false;
        state.profiles[id] = normalizeProfile(JSON.parse(raw), id);
        console.log("📴 Restored profile from this device's local backup:", id);
        return true;
    } catch (err) {
        console.warn("⚠️ Local backup unreadable, ignoring it:", err);
        return false;
    }
}

// 🩹 Older documents predate some fields. Fill the gaps on load so a missing value can't
// crash a render (profile.walletBalance.toFixed on undefined, for one).
function normalizeProfile(profile, fallbackId) {
    if (!profile || typeof profile !== 'object') return createBlankProfile(fallbackId, fallbackId);
    const blank = createBlankProfile(profile.id || fallbackId, profile.name || fallbackId);

    for (const key of Object.keys(blank)) {
        if (profile[key] === undefined || profile[key] === null) profile[key] = blank[key];
    }
    if (!Array.isArray(profile.envelopes)) profile.envelopes = blank.envelopes;
    if (!Array.isArray(profile.activeQuests)) profile.activeQuests = [];
    if (!Array.isArray(profile.walletLedger)) profile.walletLedger = [];
    if (!Array.isArray(profile.questChronicle)) profile.questChronicle = [];
    if (!profile.attributes || typeof profile.attributes !== 'object') {
        profile.attributes = { ...BASE_ATTRIBUTES };
    } else {
        // a newly added attribute shouldn't render as blank on an old profile
        for (const key of Object.keys(BASE_ATTRIBUTES)) {
            if (typeof profile.attributes[key] !== 'number') profile.attributes[key] = BASE_ATTRIBUTES[key];
        }
    }
    if (!CLASS_MATRIX[profile.rpgClass]) profile.rpgClass = blank.rpgClass;
    if (profile.gender !== 'male' && profile.gender !== 'female') profile.gender = blank.gender;
    return profile;
}

// ==========================================
// 🎵 AUDIO SYNTHESIZER SYSTEM ENGINE
// ==========================================
const SoundEngine = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    playTone(freq, type, duration) {
        this.init();
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    coin() { this.playTone(587.33, "sine", 0.1); setTimeout(() => this.playTone(880, "sine", 0.15), 80); },
    levelUp() {
        let notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((n, i) => setTimeout(() => this.playTone(n, "triangle", 0.3), i * 150));
    }
};

// Initialize App Lifecycle
document.addEventListener("DOMContentLoaded", () => {
  setupEventHandlers();
  
  // 🛡️ The Gatekeeper intercepts the bootup loop here
  runGatekeeperCheck(); 
});
// 🔍 CHECK FOR REGISTERED ROOM KEY ON DEVICE BOOTUP
function runGatekeeperCheck() {
  const modal = document.getElementById("gatekeeper-modal");
  
  // Try to pull existing credentials from phone's local storage memory
  const savedPlayer = localStorage.getItem("masterflow_active_player");
  const savedHouse = localStorage.getItem("masterflow_household_id");

  if (savedPlayer && savedHouse) {
    // 🟢 Credentials Found! Pass variables seamlessly straight to state machine
    state.activePlayer = savedPlayer;
    state.currentHouseholdId = savedHouse;
    
    // Hide the blocker overlay completely
    if (modal) modal.style.display = "none";
    
    // Fire up your live Firebase Cloud sync pipeline
    initializeCloudSync();
  } else {
    // ⛔ New Device Detected! Force open the overlay form
    if (modal) modal.style.display = "flex";
    
    // Attach event click trigger to the submit button
    document.getElementById("btn-submit-onboarding").addEventListener("click", executeHeroOnboarding);
  }
}

async function executeHeroOnboarding() {
  const rawName = document.getElementById("onboard-hero-name").value.trim();
  let rawHouse = document.getElementById("onboard-house-id").value.trim();
  
  if (!rawName) {
    alert("❌ Your Hero requires a name to step into the tracking field!");
    return;
  }

  const playerId = rawName.toLowerCase().replace(/\s+/g, "_"); // Format name safely for Firestore Doc title

  // 🎲 AUTOMATIC HOUSE ID GENERATION LOGIC
  if (!rawHouse) {
    // Roll a clean, random 6-digit numeric string identifier
    rawHouse = String(Math.floor(100000 + Math.random() * 900000));
    alert(`🏠 Forging Brand New Household! Your unique 6-digit Room Key is: ${rawHouse}\n\nWrite this down in your notebook so others can link to your house!`);
  }

  try {
    const statusBtn = document.getElementById("btn-submit-onboarding");
    if (statusBtn) statusBtn.innerText = "⏳ Seeding Cloud Records...";

    // 1. Build a clean, initial blank profile data template structure
    const newProfile = createBlankProfile(playerId, rawName);
    newProfile.household_id = rawHouse; // Inject the room-key identifier directly

    // 2. Write the fresh profile document straight up to household_leaderboard collection
    await setDoc(doc(db, "household_leaderboard", playerId), newProfile);

    // 3. Optional: Seed the master house metadata record to your households collection
    await setDoc(doc(db, "households", rawHouse), { 
      created_by: playerId, 
      timestamp: Date.now() 
    });

    // 4. Set the native local storage lock variables onto the phone's memory
    localStorage.setItem("masterflow_active_player", playerId);
    localStorage.setItem("masterflow_household_id", rawHouse);

    // 5. Force a full hard reload of the screen state to transition smoothly into live gameplay mode
    window.location.reload();
    
  } catch (err) {
    console.error("Onboarding database seed crash: ", err);
    alert("🔴 System link failed. Check your Firebase network pipeline settings.");
  }
}
// ==========================================
// ⚡ COMPREHENSIVE CLOUD DATA PIPELINE
// ==========================================
// Handle for the live Firestore listener so we never stack two of them on top of each other
let activeSyncUnsubscribe = null;

// 🌐 MULTI-HOUSEHOLD LIVE STREAM SYNCHRONIZATION PIPELINE
function initializeCloudSync() {
  const statusEl = document.getElementById("cloud-status");

  // Drop any listener from a previous call before opening a new one. Without this, every
  // re-sync would add another permanent subscription — duplicate renders and duplicate reads.
  if (activeSyncUnsubscribe) {
    activeSyncUnsubscribe();
    activeSyncUnsubscribe = null;
  }
  
  // 🛡️ STRICT HOUSEHOLD ISOLATION LOCK
  const targetHousehold = state.currentHouseholdId;

  console.log("📡 [SYSTEM DIAGNOSTIC] Target Household ID:", targetHousehold);
  console.log("👤 [SYSTEM DIAGNOSTIC] Active Player ID:", state.activePlayer);

  // Safety break: If there is no active household assigned yet, abort the sync loop
  if (!targetHousehold) {
    console.warn("⚠️ Cloud Sync aborted: No Household ID loaded into local state machine yet.");
    if (statusEl) { 
      statusEl.innerText = "🔒 Awaiting House Registration..."; 
    }
    return;
  }

  if (statusEl) {
    statusEl.innerText = `⏳ Scanning House: ${targetHousehold}`;
  }

  // Paint immediately from this device's last known good copy, so a slow or unreachable
  // network shows your data instead of an empty shell. The live snapshot overwrites it
  // moments later when it arrives.
  if (hydrateFromLocalBackup(state.activePlayer)) {
    renderEntireViewport();
  }

  try {
    // Query Firestore for documents matching the household ID
    const q = query(
      collection(db, "household_leaderboard"),
      where("household_id", "==", targetHousehold)
    );

    // Bind live snapshot listener (keeping the handle so it can be torn down later)
    activeSyncUnsubscribe = onSnapshot(q, (querySnapshot) => {
      // Clear out old memory tracking to prepare for fresh household data
      state.profiles = {};

      if (!querySnapshot.empty) {
        querySnapshot.forEach((docSnap) => {
          const playerId = docSnap.id;
          // Backfill anything an older document is missing before the UI touches it
          state.profiles[playerId] = normalizeProfile(docSnap.data(), playerId);
        });

        // Set our active profile pointer safely from the newly streamed data
        const id = state.activePlayer;
        if (state.profiles[id]) {
          writeLocalBackup(id);
          if (typeof runStreakCalendarAudit === 'function') {
            runStreakCalendarAudit();
          }
        } else {
          // Fallback if the house exists but your specific character slot is missing
          state.profiles[id] = createBlankProfile(id, id.charAt(0).toUpperCase() + id.slice(1));
        }
        if (statusEl) statusEl.innerText = "🟢 Cloud Sync Active";
      } else {
        // Empty House Initializer
        const id = state.activePlayer;
        state.profiles[id] = createBlankProfile(id, id.charAt(0).toUpperCase() + id.slice(1));
        if (statusEl) statusEl.innerText = "💡 Empty House Initialized";
      }

      // 🔍 Breadcrumb 2: Log downloaded profiles
      console.log("🔥 [FIRESTORE FETCH] Profiles loaded:", Object.keys(state.profiles));

      if (typeof renderEntireViewport === 'function') {
        renderEntireViewport();
      } else if (typeof renderApp === 'function') {
        renderApp();
      }
    }, (error) => {
      // The live listener dropped (offline, permission denied, project unreachable).
      // Fall back to this device's copy rather than leaving the user staring at nothing.
      console.error("Pipeline link failure: ", error);
      const restored = hydrateFromLocalBackup(state.activePlayer);
      if (restored) renderEntireViewport();
      if (statusEl) {
        statusEl.innerText = restored
          ? "📴 Offline — showing this device's saved copy"
          : "🔴 Sync Disconnected";
      }
    });

  } catch (err) {
    console.error("Failed to construct query pipeline: ", err);
  }
}
/**
 * 💾 Apply a change to a profile and persist it WITHOUT clobbering concurrent edits.
 *
 * The old approach mutated the local profile and then overwrote the whole document with it.
 * If a teammate (or a second tab) saved in between, their change was silently destroyed.
 * Here the same change is re-applied on top of whatever the server currently holds, inside a
 * transaction, so both edits survive.
 *
 * ⚠️ `mutate(profile)` runs TWICE — once on the local copy for an instant UI update, and
 * again on the fresh server copy. It must therefore ONLY touch profile data:
 *   - no DOM, no sounds, no alerts (do those in the caller, using the returned outcome)
 *   - no Date.now() / Math.random() inside; generate those in the caller and close over them,
 *     otherwise the two runs produce different ids and timestamps
 *   - look items up by id rather than by array index, since the server ordering may differ
 * Returns whatever mutate() returned from the local run.
 */
async function saveProfileChange(id, mutate) {
  const local = state.profiles[id];
  if (!local) {
    console.warn("⚠️ Save skipped: no profile loaded for", id);
    return null;
  }

  // 1. Apply locally first so the interface responds immediately
  const outcome = mutate(local);
  trimProfileHistory(local);
  renderEntireViewport();

  // Save the backup HERE, not just after a successful cloud write — otherwise a change made
  // offline is lost on reload, which is the exact moment the backup is supposed to matter.
  writeLocalBackup(id);

  const targetHousehold = state.currentHouseholdId;
  if (!targetHousehold) {
    console.warn("⚠️ Save skipped: no household registered on this device yet.");
    return outcome;
  }

  const statusEl = document.getElementById("cloud-status");
  try {
    const docRef = doc(db, "household_leaderboard", id);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(docRef);

      // 2. Replay the change onto the freshest server state. If the document doesn't exist
      //    yet, the already-mutated local copy is the starting point.
      const merged = snap.exists() ? normalizeProfile(snap.data(), id) : { ...local };
      if (snap.exists()) mutate(merged);

      trimProfileHistory(merged);
      merged.id = id;
      merged.household_id = targetHousehold;
      merged.walletBalance = getWalletTotal(merged); // convenience mirror of the envelope sum

      tx.set(docRef, merged);
    });

    writeLocalBackup(id);
    if (statusEl) statusEl.innerText = "🟢 Cloud Matrix Synchronized Securely";
  } catch (err) {
    // Be blunt about what actually happens: the change lives on this device so you can keep
    // working, but there is no write queue — when the cloud reconnects, its copy wins and
    // this edit is dropped. Saying "will re-sync" would be a promise the code can't keep.
    console.error("Cloud push failed: ", err);
    if (statusEl) statusEl.innerText = "📴 Offline — shown on this device only; the cloud copy wins on reconnect";
  }
  return outcome;
}

// (pushProfileToCloud used to live here — it overwrote the whole document on every save,
//  which is what destroyed concurrent edits. saveProfileChange above replaces it.)

function createBlankProfile(id, structuralName) {
    return {
        id: id,
        name: structuralName,
        gender: "male",
        rpgClass: "warrior",
        level: 1,
        xp: 0,
        gold: 0,
        walletBalance: 0.00,
        streakCount: 0,
        maxStreak: 0,
        streakShields: 1,
        lastCheckInDate: "",
        attributePenaltyActive: false,
        attributes: { ...BASE_ATTRIBUTES },
        envelopes: STARTER_ENVELOPES.map(env => ({ ...env })), // copy, so profiles never share objects
        activeQuests: [],
        walletLedger: [],
        questChronicle: []
    };
}

function runStreakCalendarAudit() {
    const profile = state.profiles[state.activePlayer];
    if (!profile) return;
    const todayStr = new Date().toLocaleDateString();

    if (profile.lastCheckInDate === todayStr) return;

    // Work out what the miss costs BEFORE saving, so the change we persist is a set of
    // absolute values. Re-running this decision against the server copy could double-charge
    // a shield if the two copies disagreed about the last check-in.
    let shieldUsed = false;
    let streakBroken = false;

    if (profile.lastCheckInDate !== "") {
        const today = new Date(); today.setHours(0,0,0,0);
        const lastCheck = new Date(profile.lastCheckInDate); lastCheck.setHours(0,0,0,0);
        const diffDays = Math.ceil(Math.abs(today - lastCheck) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
            if (profile.streakShields > 0) shieldUsed = true;
            else streakBroken = true;
        }
    }

    // Snapshot the resulting values off the local profile...
    const preview = { ...profile, attributes: { ...profile.attributes } };
    if (shieldUsed) preview.streakShields = Math.max(0, preview.streakShields - 1);
    if (streakBroken) {
        preview.streakCount = 0;
        preview.attributePenaltyActive = true;
        applyHeavyAttributePenalty(preview);
    }

    // ...then write those absolute values, which are safe to apply to either copy.
    saveProfileChange(profile.id, p => {
        p.streakShields = preview.streakShields;
        p.streakCount = preview.streakCount;
        p.attributePenaltyActive = preview.attributePenaltyActive;
        p.attributes = { ...preview.attributes };
        if (preview.attributesBeforePenalty) p.attributesBeforePenalty = { ...preview.attributesBeforePenalty };
        p.lastCheckInDate = todayStr;
    });

    if (shieldUsed) alert(`⚠️ Warning! A day slipped past, but your Streak Shield absorbed the penalty! (${preview.streakShields} remaining)`);
    if (streakBroken) alert("💔 STREAK SHATTERED! You skipped active goals without a shield. Stats reduced by 20% until your next quest victory!");
}

function applyHeavyAttributePenalty(profile) {
    // Stash exactly what the player had earned so victory can hand it all back later.
    profile.attributesBeforePenalty = { ...profile.attributes };

    // Take 20% off the CURRENT value. Recomputing from BASE + level would silently throw away
    // every attribute point earned from completed quests.
    for (let key in profile.attributes) {
        profile.attributes[key] = Math.max(1, Math.floor(profile.attributes[key] * BALANCE.STREAK_PENALTY_MULTIPLIER));
    }
}

// Returns true when a penalty was actually lifted, so the caller can announce it.
// (No alert in here — this runs inside a save mutation, which executes twice.)
function restoreAttributesFromVictory(profile) {
    if (!profile.attributePenaltyActive) return false;
    profile.attributePenaltyActive = false;

    // Put back the pre-penalty snapshot so quest-earned progress survives the streak break.
    const banked = profile.attributesBeforePenalty;
    if (banked) {
        for (let key in profile.attributes) {
            if (banked[key] !== undefined) profile.attributes[key] = banked[key];
        }
        delete profile.attributesBeforePenalty;
    } else {
        // Older profiles penalized before this fix have no snapshot — undo the 20% cut as best we can.
        for (let key in profile.attributes) {
            profile.attributes[key] = Math.max(BASE_ATTRIBUTES[key], Math.round(profile.attributes[key] / BALANCE.STREAK_PENALTY_MULTIPLIER));
        }
    }
    return true;
}

// ==========================================
// ⚔️ RPG ENGINE CORE & RENDERING VISUALS
// ==========================================
// 👥 Rebuild the hero switcher from whoever is actually in this household.
// The roster used to be two hardcoded <option> tags, so a household whose members weren't
// named angel/brianna could never select their own profile.
function renderPlayerRoster() {
    const sel = document.getElementById("global-player-select");
    if (!sel) return;

    const ids = Object.keys(state.profiles);
    if (ids.length === 0) { sel.innerHTML = ""; return; }

    // Alphabetical by display name so the list doesn't reshuffle on every snapshot
    ids.sort((a, b) => {
        const nameA = (state.profiles[a].name || a).toLowerCase();
        const nameB = (state.profiles[b].name || b).toLowerCase();
        return nameA.localeCompare(nameB);
    });

    sel.innerHTML = ids.map(id => {
        const label = state.profiles[id].name || id;
        return `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`;
    }).join("");

    // Keep the active hero selected across re-renders
    if (state.activePlayer && ids.includes(state.activePlayer)) {
        sel.value = state.activePlayer;
    }
}

function renderCharacterPanel() {
    const profile = state.profiles[state.activePlayer];
    if (!profile) return;
    
    const evolutionTier = profile.level >= BALANCE.EVOLUTION_LEVEL ? "evolved" : "base";
    const classData = CLASS_MATRIX[profile.rpgClass];
    const identityTitle = classData[profile.gender][evolutionTier];
    
    document.getElementById("render-hero-title").innerText = `${profile.name} - ${identityTitle}`;
    document.getElementById("render-hero-level").innerText = `LVL ${profile.level}`;
    document.getElementById("streak-counter-display").innerHTML = `🔥 Streak: ${profile.streakCount} Days | 🛡️ Shields: ${profile.streakShields}`;
    
    document.getElementById("hero-name-input").value = profile.name;
    document.getElementById("hero-gender-select").value = profile.gender;
    document.getElementById("hero-class-select").value = profile.rpgClass;
    
    const xpPercent = Math.min(100, (profile.xp / BALANCE.XP_PER_LEVEL) * 100);
    document.getElementById("render-xp-bar").style.width = `${xpPercent}%`;
    document.getElementById("render-xp-text").innerText = `${profile.xp} / ${BALANCE.XP_PER_LEVEL} XP`;
    
    document.getElementById("stat-hp").innerText = classData.stats.hp + (profile.level * 10);
    document.getElementById("stat-mp").innerText = classData.stats.mp + (profile.level * 5);
    document.getElementById("stat-atk").innerText = classData.stats.atk + profile.level;
    document.getElementById("stat-def").innerText = classData.stats.def + profile.level;
    
    let attrHtml = "";
    for (let [key, val] of Object.entries(profile.attributes)) {
        const textStyle = profile.attributePenaltyActive ? "color: #ef4444;" : "color: #a1a1aa;";
        const barColor = profile.attributePenaltyActive ? "#ef4444" : "var(--purple, #8a2be2)";
        
        // Balanced scaling based on a max capacity metric pool cap of 100
        const visualFill = Math.min(100, (val / 100) * 100); 
        
        attrHtml += `
            <div style="margin-bottom: 12px; ${textStyle}">
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
                    <span>${key}</span>
                    <strong>${val}</strong>
                </div>
                <div style="background:#18181b; border:1px solid #27272a; height:6px; border-radius:3px; overflow:hidden;">
                    <div style="background:${barColor}; width:${visualFill}%; height:100%; transition:width 0.3s ease;"></div>
                </div>
            </div>
        `;
    }
    document.getElementById("attributes-display").innerHTML = attrHtml;
    
    document.getElementById("top-wallet").innerText = `💰 $${getWalletTotal(profile).toFixed(2)}`;
    document.getElementById("top-gold").innerText = `🪙 ${profile.gold} Gold`;
}

function renderQuestsBoard() {
    const profile = state.profiles[state.activePlayer];
    const board = document.getElementById("quests-board");
    const filterElem = document.getElementById("quest-board-filter");
    const selectedFilter = filterElem ? filterElem.value : "all";
    if (!profile || !board) return;
    
    board.innerHTML = "";
    
    const activeQuests = profile.activeQuests || [];
    const targetedQuests = activeQuests.filter(q => {
        return selectedFilter === "all" ? true : q.category === selectedFilter;
    });
    
    if (targetedQuests.length === 0) {
        board.innerHTML = `<div class="empty-notice" style="text-align:center; padding:20px; color:var(--text-dim);">The Notice Board is clear. No active quests found.</div>`;
        return;
    }

    // 1. CHRONOLOGICAL SORT (earliest deadline first)
    // Note: the board only ever holds ACTIVE quests — completing one moves it straight to
    // questChronicle, so there is no "completed" state to sort to the bottom.
    targetedQuests.sort((a, b) => {
        const dateA = new Date(`${a.date || '9999-12-31'}T${a.time || '23:59'}`);
        const dateB = new Date(`${b.date || '9999-12-31'}T${b.time || '23:59'}`);
        return dateA - dateB;
    });
    
    // 2. RENDER CARDS
    targetedQuests.forEach(quest => {
        // Deadline already passed? style.css ships .overdue / .overdue-badge for exactly this.
        const deadlineStamp = quest.date ? new Date(`${quest.date}T${quest.time || "23:59"}`) : null;
        const isOverdue = deadlineStamp && !isNaN(deadlineStamp) && deadlineStamp < new Date();
        const overdueBadge = isOverdue ? ` <span class="overdue-badge">⚠️ OVERDUE</span>` : "";

        const card = document.createElement("div");
        card.className = isOverdue ? "quest-card panel overdue" : "quest-card panel";
        card.style.position = "relative";
        card.style.borderLeft = `5px solid ${quest.difficulty === 'epic' ? '#a855f7' : quest.difficulty === 'rare' ? '#3b82f6' : '#22c55e'}`;

        const titleStyle = "margin:0; font-size:1.1rem;";

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                <div>
                    <h3 style="${titleStyle}">${escapeHtml(quest.name)}</h3>
                    <span style="font-size:0.75rem; background:#18181b; padding:2px 6px; border-radius:4px; color:var(--text-dim); display:inline-block; margin-top:4px;">${escapeHtml(quest.category)}</span>
                </div>
                <span style="text-transform:uppercase; font-size:0.7rem; font-weight:bold; color:var(--gold);">${escapeHtml(quest.difficulty)}</span>
            </div>
            <p style="font-size:0.85rem; color:var(--text-dim); margin:5px 0;">📅 Deadline: ${escapeHtml(quest.date)} ${escapeHtml(quest.time || "")}${overdueBadge}</p>
            ${quest.notes ? `<p style="font-size:0.8rem; padding:6px; background:#18181b; border-radius:4px; color:var(--text-main); margin-bottom:12px;">📝 ${escapeHtml(quest.notes)}</p>` : ''}
            
            <div class="hold-container" style="background:#27272a; height:40px; border-radius:6px; position:relative; overflow:hidden; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                <div class="hold-progress-bar" id="progress-${quest.id}" style="position:absolute; left:0; top:0; height:100%; width:0%; background:linear-gradient(90deg, #ffd700, #4caf50); opacity: 0.4; transition: width 0.1s linear;"></div>
                <span style="z-index:2; font-size:0.85rem; font-weight:bold; pointer-events:none; color: #fff;">⚔️ HOLD TO COMPLETE QUEST</span>
            </div>

            <button onclick="window.abandonQuest('${escapeHtml(quest.id)}')" style="position:absolute; top:10px; right:10px; background:none; border:none; color:var(--danger); cursor:pointer; font-size:0.9rem;" title="Delete Quest">✖</button>
        `;

        bindHoldActionEvents(card.querySelector(".hold-container"), quest.id);
        board.appendChild(card);
    });
}

function bindHoldActionEvents(element, questId) {
    let trackingInterval = null;
    let heldMs = 0;
    const targetRequired = BALANCE.HOLD_TO_COMPLETE_MS;
    
    const startTrigger = (e) => {
        e.preventDefault();
        heldMs = 0;
        SoundEngine.init();
        
        trackingInterval = setInterval(() => {
            heldMs += BALANCE.HOLD_TICK_MS;
            const progressPct = Math.min(100, (heldMs / targetRequired) * 100);
            const progressBar = document.getElementById(`progress-${questId}`);
            if (progressBar) progressBar.style.width = `${progressPct}%`;
            
            // Native Phone Haptic Charging Pulse
            if (navigator.vibrate) navigator.vibrate(25);
            
            if (heldMs >= targetRequired) {
                clearInterval(trackingInterval);
                executeQuestResolution(questId, e);
            }
        }, BALANCE.HOLD_TICK_MS);
    };
    
    const cancelTrigger = () => {
        clearInterval(trackingInterval);
        const progressBar = document.getElementById(`progress-${questId}`);
        if (progressBar) progressBar.style.width = "0%";
    };
    
    element.addEventListener("mousedown", startTrigger);
    element.addEventListener("mouseup", cancelTrigger);
    element.addEventListener("mouseleave", cancelTrigger);
    element.addEventListener("touchstart", startTrigger, { passive: false });
    element.addEventListener("touchend", cancelTrigger);
}

async function executeQuestResolution(questId, event) {
    const profile = state.profiles[state.activePlayer];
    if (!profile) return;

    const quest = (profile.activeQuests || []).find(q => q.id === questId);
    if (!quest) return;

    // Payout is decided once, up front, so both runs of the mutation award the same amount.
    const reward = BALANCE.QUEST_REWARDS[quest.difficulty] || BALANCE.QUEST_REWARDS.common;
    const bonus = BALANCE.CLASS_BONUSES[profile.rpgClass] || {};
    const xpGain = Math.floor(reward.xp * (bonus.xp || 1));
    const goldGain = Math.floor(reward.gold * (bonus.gold || 1));

    // Timestamps generated out here — inside the mutation they'd differ between the two runs.
    const chronicleEntry = {
        date: new Date().toLocaleDateString(),
        ts: Date.now(), // machine-readable stamp so time filters don't depend on locale formatting
        name: quest.name,
        category: quest.category,
        bounty: `+${xpGain}XP / +${goldGain}G`
    };

    const outcome = await saveProfileChange(profile.id, p => {
        // Look the quest up by id, not index — the server copy may be ordered differently.
        // If it's already gone, someone else completed it: bail out rather than double-pay.
        const idx = (p.activeQuests || []).findIndex(q => q.id === questId);
        if (idx === -1) return { alreadyResolved: true };
        p.activeQuests.splice(idx, 1);

        // Lift any active penalty FIRST — restoring afterwards would overwrite the point earned below.
        const penaltyLifted = restoreAttributesFromVictory(p);

        // ⭐ Attributes are assigned strictly at quest resolution completion here
        const linkedAttribute = ATTR_MAP[quest.category];
        if (linkedAttribute && p.attributes[linkedAttribute] !== undefined) {
            p.attributes[linkedAttribute] += 1;
        }

        p.xp += xpGain;
        p.gold += goldGain;
        p.streakCount++;
        if (p.streakCount > p.maxStreak) p.maxStreak = p.streakCount;
        if (p.streakCount % BALANCE.STREAK_SHIELD_EVERY === 0) p.streakShields++;

        p.questChronicle.unshift({ ...chronicleEntry });

        // Loop, don't branch: a big Epic payout can clear more than one level at once.
        let levelsGained = 0;
        while (p.xp >= BALANCE.XP_PER_LEVEL) {
            p.level++;
            p.xp -= BALANCE.XP_PER_LEVEL;
            levelsGained++;
        }
        return { levelsGained, newLevel: p.level, penaltyLifted };
    });

    // Everything below is presentation only, driven by what the mutation reported back.
    if (!outcome || outcome.alreadyResolved) return;

    SoundEngine.coin();
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Heavy Double Complete Pulse
    createHardwarePopupText(`✨ +${xpGain} XP\n🪙 +${goldGain} Gold`, event);

    if (outcome.levelsGained > 0) {
        SoundEngine.levelUp();
        triggerLevelUpBreakoutModal(outcome.newLevel);
    }
    if (outcome.penaltyLifted) {
        alert("✨ Grace Restored! Your core attributes have returned to optimal values.");
    }
}

function createHardwarePopupText(message, event) {
    let clientX = window.innerWidth / 2; let clientY = window.innerHeight / 2;
    if (event) {
        if (event.touches && event.touches.length > 0) { clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; }
        else if (event.clientX) { clientX = event.clientX; clientY = event.clientY; }
    }
    const node = document.createElement("span");
    node.className = "floating-grind-text";
    node.innerText = message;
    node.style.left = `${clientX - 30}px`; node.style.top = `${clientY - 20}px`;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 1200);
}

// ==========================================
// 📊 SUMMARY TABLES & FINANCIAL ENVELOPES
// ==========================================

// 🎨 ENVELOPE HEALTH COLOR CALCULATOR
// Single source of truth for envelope colour/messaging — the summary view and the envelope
// cards both call this, so they can never drift apart.
window.getEnvelopeStatus = function(currentBalance, targetAmount, minThreshold) {
    const current = parseFloat(currentBalance) || 0;
    const target = (parseFloat(targetAmount) > 0) ? parseFloat(targetAmount) : ENVELOPE_DEFAULTS.TARGET;
    const min = parseFloat(minThreshold) || ENVELOPE_DEFAULTS.MIN_THRESHOLD;

    const percentRemaining = (current / target) * 100;
    const distanceToMin = current - min;

    // 🔴 RED ZONE
    if (percentRemaining <= ENVELOPE_DEFAULTS.DANGER_PERCENT || distanceToMin <= ENVELOPE_DEFAULTS.DANGER_BUFFER) {
        return {
            color: "#ef4444",
            status: "DANGER",
            message: `⚠️ Last $${current.toFixed(2)} in this envelope! Spend wisely.`
        };
    }

    // 🟡 YELLOW ZONE
    if (percentRemaining <= ENVELOPE_DEFAULTS.CAUTION_PERCENT) {
        return {
            color: "#f59e0b",
            status: "CAUTION",
            message: "⚡ Budget getting low. Keep an eye on entries."
        };
    }

    // 🟢 GREEN ZONE
    return {
        color: "#10b981",
        status: "SAFE",
        message: "✅ Budget healthy."
    };
};

// ✉️ ENVELOPE MANAGER (Edit Name, Target, Low-Balance Alert, or Delete)
window.openEditEnvelopeModal = function(envelopeId) {
    const profile = state.profiles ? state.profiles[state.activePlayer] : null;
    if (!profile || !profile.envelopes) return;

    const targetIndex = profile.envelopes.findIndex(e => (e.id || e.name) === envelopeId);
    if (targetIndex === -1) { alert("⚠️ Envelope not found!"); return; }

    const targetEnv = profile.envelopes[targetIndex];
    const envName = targetEnv.name || "Envelope";
    const envBalance = targetEnv.balance || 0;
    const envTarget = targetEnv.target || ENVELOPE_DEFAULTS.TARGET;
    const envMin = targetEnv.minThreshold || ENVELOPE_DEFAULTS.MIN_THRESHOLD;

    const choice = prompt(
        `✉️ SETTINGS FOR: "${envName}"\n` +
        `Current Balance: $${envBalance.toFixed(2)}\n` +
        `Monthly Target: $${envTarget} | Low-Balance Warning at: $${envMin}\n\n` +
        `Select an action:\n` +
        `[1] Edit Envelope Name\n` +
        `[2] Edit Monthly Target ($)\n` +
        `[3] Edit Low-Balance Alert Threshold ($)\n` +
        `[4] Delete Envelope\n\n` +
        `Type 1, 2, 3, or 4:`,
        "1"
    );

    // Collect the prompt answers first, then express the edit as a single data change.
    // Everything below looks the envelope up by id, never by index, so it applies cleanly
    // to the server's copy even if its envelope ordering differs.
    let change = null;

    if (choice === "1") {
        const newName = prompt("Enter new Envelope Name:", envName);
        if (!newName || !newName.trim()) return;
        const trimmed = newName.trim();
        change = env => { env.name = trimmed; };
    } else if (choice === "2") {
        const newTarget = prompt("Enter Monthly Target Amount ($):", envTarget);
        if (newTarget === null) return;
        const parsed = parseFloat(newTarget) || 0;
        change = env => { env.target = parsed; };
    } else if (choice === "3") {
        const newMin = prompt("Alert me when balance falls below ($):", envMin);
        if (newMin === null) return;
        const parsed = parseFloat(newMin) || 0;
        change = env => { env.minThreshold = parsed; };
    } else if (choice === "4") {
        if (!confirm(`⚠️ Delete "${envName}"?${envBalance > 0 ? `\n\nThe $${envBalance.toFixed(2)} still inside will be removed from your wallet total.` : ""}`)) return;
        change = "delete";
    } else {
        return;
    }

    saveProfileChange(profile.id, p => {
        const idx = (p.envelopes || []).findIndex(e => (e.id || e.name) === envelopeId);
        if (idx === -1) return;
        if (change === "delete") {
            // The wallet total is derived from the envelope list, so removing it is enough
            p.envelopes.splice(idx, 1);
        } else {
            change(p.envelopes[idx]);
        }
    });
};

function renderSummaryTables() {
    const profile = state.profiles[state.activePlayer];
    if (!profile) return;
    
    const walletFilter = document.getElementById("ledger-time-filter").value;
    const chronicleFilter = document.getElementById("chronicle-time-filter").value;
    
    const filterByTimeWindow = (list, type) => {
        const now = new Date();
        return list.filter(item => {
            if (type === "all") return true;
            // Prefer the numeric stamp. Older entries only have a locale-formatted date string,
            // which new Date() can't parse outside US format — keep those rather than hide them.
            const stamp = item.ts ? new Date(item.ts) : new Date(item.date);
            if (isNaN(stamp.getTime())) return true;
            const diffDays = (now - stamp) / (1000 * 60 * 60 * 24);
            return type === "week" ? diffDays <= 7 : diffDays <= 30;
        });
    };
    
    const cleanWalletList = filterByTimeWindow(profile.walletLedger, walletFilter);
    const cleanChronicleList = filterByTimeWindow(profile.questChronicle, chronicleFilter);
    
    const paginateArray = (arr, targetPage) => {
        const start = (targetPage - 1) * BALANCE.ROWS_PER_PAGE;
        return arr.slice(start, start + BALANCE.ROWS_PER_PAGE);
    };
    
    const viewWallet = paginateArray(cleanWalletList, state.ledgerPage);
    const viewChronicle = paginateArray(cleanChronicleList, state.chroniclePage);
    
    const walletBody = document.getElementById("wallet-ledger-body"); walletBody.innerHTML = "";
    if (viewWallet.length === 0) {
        walletBody.innerHTML = `<tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-dim);">No transactions logged.</td></tr>`;
    } else {
        viewWallet.forEach(w => {
            const tr = document.createElement("tr"); tr.style.borderBottom = "1px solid #27272a"; tr.style.cursor = "pointer";
            const rowAmount = Number(w.amount) || 0;
            // Transfers are net-zero on the wallet, so show the moved figure instead of "$0.00"
            const deltaLine = w.transferAmount
                ? `Transferred: $${Number(w.transferAmount).toFixed(2)}`
                : `Delta: $${rowAmount.toFixed(2)}`;
            tr.onclick = () => alert(`📒 Entry Log:\nEnvelope Context: ${w.envelope}\nDescription Details: "${w.memo}"\n${deltaLine}`);
            const colorStyle = rowAmount < 0 ? "color:var(--danger);" : "color:var(--success);";
            const amountCell = w.transferAmount
                ? `<span style="color:var(--text-dim);">↔ $${Number(w.transferAmount).toFixed(2)}</span>`
                : `${rowAmount < 0 ? "" : "+"}$${rowAmount.toFixed(2)}`;
            tr.innerHTML = `<td style="padding:10px;">${escapeHtml(w.date)}</td><td style="padding:10px;">${escapeHtml(w.envelope)}</td><td style="padding:10px; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(w.memo)}</td><td style="padding:10px; font-weight:bold; ${colorStyle}">${amountCell}</td>`;
            walletBody.appendChild(tr);
        });
    }

    const chronicleBody = document.getElementById("quest-chronicle-body"); chronicleBody.innerHTML = "";
    if (viewChronicle.length === 0) {
        chronicleBody.innerHTML = `<tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-dim);">No quest archives verified.</td></tr>`;
    } else {
        viewChronicle.forEach(c => {
            const tr = document.createElement("tr"); tr.style.borderBottom = "1px solid #27272a"; tr.style.cursor = "pointer";
            tr.onclick = () => alert(`🏆 Archive Context:\nObjective: ${c.name}\nClass Focus: ${c.category}\nBounty Payout: ${c.bounty}`);
            tr.innerHTML = `<td style="padding:10px;">${escapeHtml(c.date)}</td><td style="padding:10px; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(c.name)}</td><td style="padding:10px;"><span style="font-size:0.75rem; background:#27272a; padding:2px 6px; border-radius:4px;">${escapeHtml(String(c.category || "").split(" ")[0])}</span></td><td style="padding:10px; color:var(--gold); font-weight:bold;">${escapeHtml(c.bounty)}</td>`;
            chronicleBody.appendChild(tr);
        });
    }
    
    // Remember the page counts so the Prev/Next buttons can clamp against them
    state.ledgerTotalPages = Math.max(1, Math.ceil(cleanWalletList.length / BALANCE.ROWS_PER_PAGE));
    state.chronicleTotalPages = Math.max(1, Math.ceil(cleanChronicleList.length / BALANCE.ROWS_PER_PAGE));

    document.getElementById("ledger-page-num").innerText = `Page ${state.ledgerPage} / ${state.ledgerTotalPages}`;
    document.getElementById("chronicle-page-num").innerText = `Page ${state.chroniclePage} / ${state.chronicleTotalPages}`;

    // Totals follow the same time window as the table below them, otherwise the two disagree on screen
    const spentTotal = cleanWalletList.filter(l => Number(l.amount) < 0).reduce((sum, current) => sum + Number(current.amount), 0);
    const poolSum = profile.envelopes.reduce((sum, curr) => sum + curr.balance, 0);
    document.getElementById("sum-allocated").innerText = `$${poolSum.toFixed(2)}`;
    document.getElementById("sum-spent").innerText = `$${Math.abs(spentTotal).toFixed(2)}`;
}

function renderEnvelopesView() {
    const profile = state.profiles ? state.profiles[state.activePlayer] : null; 
    if (!profile) return;

    // 🎯 TARGET ONLY THE ENVELOPES CONTAINER
    const stack = document.getElementById("envelopes-stack");
    const transSelect = document.getElementById("trans-envelope");
    const trfFrom = document.getElementById("transfer-from-select");
    const trfTo = document.getElementById("transfer-to-select");

    // Remember what was picked — these selects get rebuilt from scratch below, and losing
    // the selection mid-flow silently retargets a transfer at the wrong envelope.
    const previousChoice = {
        trans: transSelect ? transSelect.value : "",
        from: trfFrom ? trfFrom.value : "",
        to: trfTo ? trfTo.value : ""
    };

    if (stack) stack.innerHTML = "";
    if (transSelect) transSelect.innerHTML = "";
    if (trfFrom) trfFrom.innerHTML = "";
    if (trfTo) trfTo.innerHTML = "";

    if (!profile.envelopes || !Array.isArray(profile.envelopes)) return;

    profile.envelopes.forEach(env => {
        const card = document.createElement("div"); 
        card.style.cssText = "background: #18181b; padding: 14px; border-radius: 10px; margin-bottom: 12px; border: 1px solid #27272a; display: flex; flex-direction: column; gap: 6px;";

        const targetVal = env.target || ENVELOPE_DEFAULTS.TARGET;
        const status = window.getEnvelopeStatus(env.balance, targetVal, env.minThreshold || ENVELOPE_DEFAULTS.MIN_THRESHOLD);

        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 style="margin:0; font-size:1.05rem; color:#ffffff; font-weight:600;">📁 ${escapeHtml(env.name)}</h3>
              <button onclick="window.openEditEnvelopeModal('${escapeHtml(env.id || env.name)}')" style="background:none; border:none; cursor:pointer; font-size:0.9rem; padding:0; opacity:0.8;" title="Edit or Delete">✏️</button>
            </div>
            <span style="font-size:1.15rem; font-weight:bold; color:${status.color};">$${parseFloat(env.balance || 0).toFixed(2)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; opacity:0.85; margin-top:2px;">
            <span style="color:${status.color};">${status.message}</span>
            <span style="color:#a1a1aa;">Goal: $${targetVal}</span>
          </div>
        `;

        if (stack) stack.appendChild(card);

        // Populate dropdown selectors
        const opt = `<option value="${escapeHtml(env.id || env.name)}">${escapeHtml(env.name)} ($${parseFloat(env.balance || 0).toFixed(2)})</option>`;
        if (transSelect) transSelect.innerHTML += opt;
        if (trfFrom) trfFrom.innerHTML += opt;
        if (trfTo) trfTo.innerHTML += opt;
    });

    // Put the user's picks back if those envelopes still exist
    const restoreChoice = (el, value) => {
        if (el && value && [...el.options].some(o => o.value === value)) el.value = value;
    };
    restoreChoice(transSelect, previousChoice.trans);
    restoreChoice(trfFrom, previousChoice.from);
    restoreChoice(trfTo, previousChoice.to);
} // <-- This correctly closes renderEnvelopesView!

// ==========================================
// ⚙️ INTERACTIVE ROUTING EVENTS CONTROL
// ==========================================
function setupEventHandlers() {
    window.switchTab = function(tabId) {
        state.activeTab = tabId;
        document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        const targetTab = document.getElementById(tabId);
        if (targetTab) targetTab.classList.add("active");
        const btnNode = Array.from(document.querySelectorAll(".tab-btn")).find(b => b.getAttribute("onclick")?.includes(tabId));
        if (btnNode) btnNode.classList.add("active");
    };

    window.switchPlayerProfile = function() {
        const sel = document.getElementById("global-player-select");
        if (!sel || !sel.value) return;

        // Only switch to a hero we actually hold data for — pointing activePlayer at a
        // profile that doesn't exist used to leave the whole view silently blank.
        if (!state.profiles[sel.value]) {
            console.warn("⚠️ No profile loaded for", sel.value, "- staying on", state.activePlayer);
            if (state.activePlayer) sel.value = state.activePlayer;
            return;
        }

        state.activePlayer = sel.value;
        localStorage.setItem("masterflow_active_player", state.activePlayer);
        state.ledgerPage = 1; state.chroniclePage = 1;
        if (typeof runStreakCalendarAudit === 'function') runStreakCalendarAudit();
        renderEntireViewport();
    };

    const questForm = document.getElementById("quest-form");
    if (questForm) {
        questForm.onsubmit = function(e) {
            e.preventDefault();
            const profile = state.profiles[state.activePlayer];
            if (!profile) return;

            const questName = document.getElementById("quest-name").value.trim();
            if (!questName) { alert("⚠️ Give the quest a name."); return; }
            // Built out here so the id is identical on both runs of the mutation
            const newQuest = {
                id: 'qst-' + Date.now(),
                name: questName,
                date: document.getElementById("quest-date").value,
                time: document.getElementById("quest-time").value,
                notes: document.getElementById("quest-notes").value,
                category: document.getElementById("quest-category").value,
                difficulty: document.getElementById("quest-difficulty").value
            };

            questForm.reset();
            saveProfileChange(profile.id, p => {
                if (!Array.isArray(p.activeQuests)) p.activeQuests = [];
                if (p.activeQuests.some(q => q.id === newQuest.id)) return; // never double-add
                p.activeQuests.push({ ...newQuest });
            });
        };
    }

    const transForm = document.getElementById("trans-form");
    if (transForm) {
        transForm.onsubmit = function(e) {
            e.preventDefault();
            const profile = state.profiles[state.activePlayer];
            const envId = document.getElementById("trans-envelope").value;
            const memo = document.getElementById("trans-memo").value;
            let amt = parseFloat(document.getElementById("trans-amount").value);
            if (isNaN(amt) || amt <= 0) return;
            
            const targetEnv = profile.envelopes.find(env => env.id === envId);
            if (!targetEnv) { alert("⚠️ Pick an envelope first."); return; }
            if (state.walletMode === 'spend') {
                amt = -amt;
                if (targetEnv.balance + amt < 0) { alert("Denied! Envelope allocation deficit protocol active."); return; }
            }

            const entry = { date: new Date().toLocaleDateString(), ts: Date.now(), envelope: targetEnv.name, memo: memo, amount: amt };
            const appliedAmount = amt;

            transForm.reset();
            saveProfileChange(profile.id, p => {
                const env = (p.envelopes || []).find(e => e.id === envId);
                if (!env) return;
                if (!Array.isArray(p.walletLedger)) p.walletLedger = [];
                // Bail BEFORE touching the balance, or a replay would debit twice
                if (p.walletLedger.some(l => l.ts === entry.ts && l.memo === entry.memo)) return;
                env.balance += appliedAmount;
                p.walletLedger.unshift({ ...entry });
            });
        };
    }

    // ➕ GLOBAL ENVELOPE CREATION FUNCTION (Matches index.html onclick)
    window.createNewEnvelope = function() {
        const profile = state.profiles ? state.profiles[state.activePlayer] : null;
        if (!profile) return;

        const nameInput = document.getElementById("new-envelope-name");
        const balInput = document.getElementById("new-envelope-balance");
        const targetInput = document.getElementById("new-envelope-target");
        const minInput = document.getElementById("new-envelope-min");

        const name = nameInput ? nameInput.value.trim() : "";
        const bal = balInput ? parseFloat(balInput.value) || 0 : 0;
        // These two used to be ignored entirely — whatever the user typed was thrown away.
        const target = targetInput && parseFloat(targetInput.value) > 0 ? parseFloat(targetInput.value) : 100;
        const minThreshold = minInput ? Math.max(0, parseFloat(minInput.value) || 0) : 0;

        if (!name) {
            alert("⚠️ Please enter an envelope name!");
            return;
        }

        if (bal < 0) {
            alert("⚠️ Starting balance can't be negative!");
            return;
        }

        // Built out here so both runs of the mutation share one id
        const newEnvelope = {
            id: 'env-' + Date.now(),
            name: name.includes("📂") ? name : `📂 ${name}`,
            balance: bal,
            target: target,
            minThreshold: minThreshold
        };

        if (nameInput) nameInput.value = "";
        if (balInput) balInput.value = "";
        if (targetInput) targetInput.value = "";
        if (minInput) minInput.value = "";

        saveProfileChange(profile.id, p => {
            if (!Array.isArray(p.envelopes)) p.envelopes = [];
            if (p.envelopes.some(e => e.id === newEnvelope.id)) return; // never double-add
            p.envelopes.push({ ...newEnvelope });
        });
    };

    const addEnvBtn = document.getElementById("btn-add-envelope");
    if (addEnvBtn) {
        addEnvBtn.onclick = window.createNewEnvelope;
    }

    window.executeEnvelopeTransfer = function() {
        const profile = state.profiles[state.activePlayer];
        const fromId = document.getElementById("transfer-from-select").value;
        const toId = document.getElementById("transfer-to-select").value;
        const amt = parseFloat(document.getElementById("transfer-amount-input").value);
        
        // Every rejection now says why instead of failing silently
        if (isNaN(amt) || amt <= 0) { alert("⚠️ Enter an amount greater than $0 to transfer."); return; }
        if (fromId === toId) { alert("⚠️ Pick two different envelopes to move money between."); return; }

        const sEnv = profile.envelopes.find(e => e.id === fromId);
        const tEnv = profile.envelopes.find(e => e.id === toId);
        if (!sEnv || !tEnv) { alert("⚠️ Envelope not found — try reloading."); return; }
        if (sEnv.balance < amt) { alert(`⚠️ "${sEnv.name}" only holds $${sEnv.balance.toFixed(2)}.`); return; }

        // amount stays 0 so transfers never count as spending, but the figure is kept for the audit trail
        const entry = {
            date: new Date().toLocaleDateString(),
            ts: Date.now(),
            envelope: `🔄 Transfer Hub`,
            memo: `Moved $${amt.toFixed(2)} from ${sEnv.name} to ${tEnv.name}`,
            amount: 0,
            transferAmount: amt
        };

        document.getElementById("transfer-amount-input").value = "";
        saveProfileChange(profile.id, p => {
            const from = (p.envelopes || []).find(e => e.id === fromId);
            const to = (p.envelopes || []).find(e => e.id === toId);
            if (!from || !to) return;
            if (!Array.isArray(p.walletLedger)) p.walletLedger = [];
            // Bail BEFORE moving money, or a replay would transfer twice
            if (p.walletLedger.some(l => l.ts === entry.ts && l.memo === entry.memo)) return;
            from.balance -= amt;
            to.balance += amt;
            p.walletLedger.unshift({ ...entry });
        });
    };

    window.setWalletMode = function(mode) {
        state.walletMode = mode;
        const sBtn = document.getElementById("toggle-spend"), dBtn = document.getElementById("toggle-deposit"), sub = document.getElementById("trans-submit-btn");
        if (mode === 'spend') { 
            if (sBtn) sBtn.classList.add("active"); 
            if (dBtn) dBtn.classList.remove("active"); 
            if (sub) { sub.innerText = "Process Deduction"; sub.style.backgroundColor = "var(--danger)"; }
        } else { 
            if (dBtn) dBtn.classList.add("active"); 
            if (sBtn) sBtn.classList.remove("active"); 
            if (sub) { sub.innerText = "Execute Allocation Deposit"; sub.style.backgroundColor = "var(--success)"; }
        }
    };

    const saveHeroBtn = document.getElementById("btn-save-hero-name");
    if (saveHeroBtn) {
        saveHeroBtn.onclick = function() {
            const inputVal = document.getElementById("hero-name-input").value.trim();
            if (!inputVal) return;
            saveProfileChange(state.activePlayer, p => { p.name = inputVal; });
        };
    }

    window.abandonQuest = function(id) {
        const profile = state.profiles[state.activePlayer];
        if (!profile) return;
        saveProfileChange(profile.id, p => {
            p.activeQuests = (p.activeQuests || []).filter(q => q.id !== id);
        });
    };

    window.updateCharacterGender = function() {
        const sel = document.getElementById("hero-gender-select");
        if (!sel) return;
        const gender = sel.value;
        saveProfileChange(state.activePlayer, p => { p.gender = gender; });
    };

    window.updateCharacterClass = function() {
        const sel = document.getElementById("hero-class-select");
        if (!sel) return;
        const rpgClass = sel.value;
        saveProfileChange(state.activePlayer, p => { p.rpgClass = rpgClass; });
    };

    window.changeLedgerPage = function(delta) {
        // Clamp both ends — walking past the last page used to show empty tables like "Page 8 / 3"
        const maxPage = state.ledgerTotalPages || 1;
        state.ledgerPage = Math.min(maxPage, Math.max(1, state.ledgerPage + delta));
        if (typeof renderSummaryTables === 'function') renderSummaryTables();
    };

    window.changeChroniclePage = function(delta) {
        const maxPage = state.chronicleTotalPages || 1;
        state.chroniclePage = Math.min(maxPage, Math.max(1, state.chroniclePage + delta));
        if (typeof renderSummaryTables === 'function') renderSummaryTables();
    };

    window.updateSummaryFilters = function() {
        state.ledgerPage = 1; state.chroniclePage = 1;
        if (typeof renderSummaryTables === 'function') renderSummaryTables();
    };

    window.triggerLevelUpBreakoutModal = function(levelNum) {
        const txt = document.getElementById("modal-level-text");
        const modal = document.getElementById("level-up-modal");
        if (txt) txt.innerText = `LEVEL ${levelNum}`;
        if (modal) modal.style.display = "flex";
    };

    window.closeLevelUpModal = function() {
        const modal = document.getElementById("level-up-modal");
        if (modal) modal.style.display = "none";
    };

    window.wipeEntireEngine = function() {
        if (!confirm("🚨 Hard reset this individual player identity block?")) return;

        const id = state.activePlayer;
        const existingName = state.profiles[id] && state.profiles[id].name;
        const blank = createBlankProfile(id, existingName || id);

        // A reset is deliberately absolute — it replaces the server copy outright rather
        // than merging into it, which is exactly what the user asked for.
        saveProfileChange(id, p => {
            Object.assign(p, JSON.parse(JSON.stringify(blank)));
            delete p.attributesBeforePenalty;
        });
    };

function renderEntireViewport() {
    if (typeof renderPlayerRoster === 'function') renderPlayerRoster();
    if (typeof renderCharacterPanel === 'function') renderCharacterPanel();
    if (typeof renderQuestsBoard === 'function') renderQuestsBoard();
    if (typeof renderEnvelopesView === 'function') renderEnvelopesView();
    if (typeof renderSummaryTables === 'function') renderSummaryTables();
}
