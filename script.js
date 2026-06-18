/**
 * Master Flow v4.3.2 - Air-Tight Cloud Core Engine
 * Core Systems: Real-Time Firebase Sync, Haptic Feedbacks, Fixed Rewards & Dynamic UI Bars
 */

// import modules dynamically from the CDN network pipeline
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================================
// 🔐 FIREBASE CLOUD CONFIGURATION INTERFACE
// ==========================================
// PASTE YOUR WEBPAGE APP CREDENTIALS FROM FIREBASE CONSOLE HERE:
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDD4FGcNxHJT7wDh3hPMqudUYzEmDz8lbw",
  authDomain: "master-flow-d9d4b.firebaseapp.com",
  projectId: "master-flow-d9d4b",
  storageBucket: "master-flow-d9d4b.firebasestorage.app",
  messagingSenderId: "716546159295",
  appId: "1:716546159295:web:ae13d55413b31debd2cc0a",
  measurementId: "G-YHC9KZNQ2N"
};

// Initialize Firebase Core Engines
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global App State Machine
let state = {
  activePlayer: 'angel',
  currentHouseholdId: 'OYfoVvk62io4l9lZxm0g', // 👈 Add this line right here!
  activeTab: 'quests',
  walletMode: 'spend',
  questPage: 1,
  ledgerPage: 1,
  chroniclePage: 1,
  rowsPerPage: 5,
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
    initializeCloudSync();
});

// ==========================================
// ⚡ COMPREHENSIVE CLOUD DATA PIPELINE
// ==========================================
// 🌐 MULTI-HOUSEHOLD LIVE STREAM SYNCHRONIZATION PIPELINE
function initializeCloudSync() {
  const statusEl = document.getElementById("cloud-status");
  
  // Reads our dynamic tracking variable from the top of the file
  const targetHousehold = state.currentHouseholdId || 'OYfoVvk62io4l9lZxm0g';
  
  if (statusEl) statusEl.innerText = `⏳ Connecting...`;

  // 🔗 Dynamic live data stream connection
  onSnapshot(doc(db, "households", targetHousehold), (snapshot) => {
    if (snapshot.exists()) {
      const incomingCloudData = snapshot.data();
      const id = state.activePlayer;
      
      // Route data cleanly to whoever is playing right now
      if (incomingCloudData && incomingCloudData[id]) {
        state.profiles[id] = incomingCloudData[id];
        
        // 💾 YOUR LOCAL BACKUP ENGINE FEATURE: Saves a hard copy to the browser local memory
        localStorage.setItem(`masterflow_backup_${id}`, JSON.stringify(state.profiles[id]));
        
        // ⚡ STREAK AUDIT ENGINE: Runs your streak updates on fresh data tick
        if (typeof runStreakCalendarAudit === 'function') {
          runStreakCalendarAudit();
        }
      } else {
        // Safe Fallback for New Testers
        state.profiles[id] = createBlankProfile();
      }
      if (statusEl) statusEl.innerText = "🟢 Cloud Sync Active";
    } else {
      // Automatic New House Setup
      state.profiles[state.activePlayer] = createBlankProfile();
      if (statusEl) statusEl.innerText = "🟡 New House Created";
    }
    
    // Draw visual changes on screen instantly
    if (typeof renderEntireViewport === 'function') {
      renderEntireViewport();
    }
  }, (error) => {
    console.error("Pipeline link failure: ", error);
    if (statusEl) statusEl.innerText = "🔴 Sync Disconnected";
  });
}
// 2. The Dropdown Selection Switcher Block (Keep this separate right below!)
function handlePlayerChange() {
    state.activePlayer = document.getElementById("global-player-select").value || 'angel';
    initializeCloudSync();
    renderEntireViewport();
}

async function pushProfileToCloud(id) {
    try {
        await setDoc(doc(db, "profiles", id), state.profiles[id]);
        localStorage.setItem(`masterflow_backup_${id}`, JSON.stringify(state.profiles[id]));
        document.getElementById("cloud-status").innerText = "☁️ Cloud Matrix Synchronized Securely";
    } catch (err) {
        console.error("Cloud push failed, falling back safely to local drive storage: ", err);
        document.getElementById("cloud-status").innerText = "📴 Operating via Local Safety Backup Drive";
    }
}

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
        envelopes: [
            { id: "env-general", name: "🍔 General Expenses", balance: 0.00 },
            { id: "env-savings", name: "🏦 Iron Bank Savings", balance: 0.00 }
        ],
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
    
    if (profile.lastCheckInDate !== "") {
        const today = new Date(); today.setHours(0,0,0,0);
        const lastCheck = new Date(profile.lastCheckInDate); lastCheck.setHours(0,0,0,0);
        const diffDays = Math.ceil(Math.abs(today - lastCheck) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 1) {
            if (profile.streakShields > 0) {
                profile.streakShields--;
                alert(`⚠️ Warning! A day slipped past, but your Streak Shield absorbed the penalty! (${profile.streakShields} remaining)`);
            } else {
                profile.streakCount = 0;
                profile.attributePenaltyActive = true;
                applyHeavyAttributePenalty(profile);
                alert("💔 STREAK SHATTERED! You skipped active goals without a shield. Stats reduced by 20% until your next quest victory!");
            }
        }
    }
    profile.lastCheckInDate = todayStr;
    pushProfileToCloud(profile.id);
}

function applyHeavyAttributePenalty(profile) {
    for (let key in profile.attributes) {
        profile.attributes[key] = Math.max(1, Math.floor((BASE_ATTRIBUTES[key] + (profile.level - 1)) * 0.8));
    }
}

function restoreAttributesFromVictory(profile) {
    if (!profile.attributePenaltyActive) return;
    profile.attributePenaltyActive = false;
    for (let key in profile.attributes) {
        profile.attributes[key] = BASE_ATTRIBUTES[key] + (profile.level - 1);
    }
    alert("✨ Grace Restored! Your core attributes have returned to optimal values.");
}

// ==========================================
// ⚔️ RPG ENGINE CORE & RENDERING VISUALS
// ==========================================
function renderCharacterPanel() {
    const profile = state.profiles[state.activePlayer];
    if (!profile) return;
    
    const evolutionTier = profile.level >= 10 ? "evolved" : "base";
    const classData = CLASS_MATRIX[profile.rpgClass];
    const identityTitle = classData[profile.gender][evolutionTier];
    
    document.getElementById("render-hero-title").innerText = `${profile.name} - ${identityTitle}`;
    document.getElementById("render-hero-level").innerText = `LVL ${profile.level}`;
    document.getElementById("streak-counter-display").innerHTML = `🔥 Streak: ${profile.streakCount} Days | 🛡️ Shields: ${profile.streakShields}`;
    
    document.getElementById("hero-name-input").value = profile.name;
    document.getElementById("hero-gender-select").value = profile.gender;
    document.getElementById("hero-class-select").value = profile.rpgClass;
    
    const xpPercent = Math.min(100, (profile.xp / 100) * 100);
    document.getElementById("render-xp-bar").style.width = `${xpPercent}%`;
    document.getElementById("render-xp-text").innerText = `${profile.xp} / 100 XP`;
    
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
    
    document.getElementById("top-wallet").innerText = `💰 $${profile.walletBalance.toFixed(2)}`;
    document.getElementById("top-gold").innerText = `🪙 ${profile.gold} Gold`;
}

function renderQuestsBoard() {
    const profile = state.profiles[state.activePlayer];
    const board = document.getElementById("quests-board");
    const selectedFilter = document.getElementById("quest-board-filter").value;
    if (!profile) return;
    
    board.innerHTML = "";
    
    const targetedQuests = profile.activeQuests.filter(q => {
        return selectedFilter === "all" ? true : q.category === selectedFilter;
    });
    
    if (targetedQuests.length === 0) {
        board.innerHTML = `<div class="empty-notice" style="text-align:center; padding:20px; color:var(--text-dim);">The Notice Board is clear. No active quests found.</div>`;
        return;
    }
    
    targetedQuests.forEach(quest => {
        const card = document.createElement("div");
        card.className = "quest-card panel";
        card.style.position = "relative";
        card.style.borderLeft = `5px solid ${quest.difficulty === 'epic' ? '#a855f7' : quest.difficulty === 'rare' ? '#3b82f6' : '#22c55e'}`;
        
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                <div>
                    <h3 style="margin:0; font-size:1.1rem;">${quest.name}</h3>
                    <span style="font-size:0.75rem; background:#18181b; padding:2px 6px; border-radius:4px; color:var(--text-dim); display:inline-block; margin-top:4px;">${quest.category}</span>
                </div>
                <span style="text-transform:uppercase; font-size:0.7rem; font-weight:bold; color:var(--gold);">${quest.difficulty}</span>
            </div>
            <p style="font-size:0.85rem; color:var(--text-dim); margin:5px 0;">📅 Deadline: ${quest.date} ${quest.time || ""}</p>
            ${quest.notes ? `<p style="font-size:0.8rem; padding:6px; background:#18181b; border-radius:4px; color:var(--text-main); margin-bottom:12px;">📝 ${quest.notes}</p>` : ''}
            
            <div class="hold-container" style="background:#27272a; height:40px; border-radius:6px; position:relative; overflow:hidden; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                <div class="hold-progress-bar" id="progress-${quest.id}" style="position:absolute; left:0; top:0; height:100%; width:0%; background:linear-gradient(90deg, #ffd700, #4caf50); opacity: 0.4; transition: width 0.1s linear;"></div>
                <span style="z-index:2; font-size:0.85rem; font-weight:bold; pointer-events:none; color: #fff;">⚔️ HOLD TO COMPLETE QUEST</span>
            </div>
            <button onclick="window.abandonQuest('${quest.id}')" style="position:absolute; top:10px; right:10px; background:none; border:none; color:var(--danger); cursor:pointer; font-size:0.9rem;">✖</button>
        `;
        
        bindHoldActionEvents(card.querySelector(".hold-container"), quest.id);
        board.appendChild(card);
    });
}

function bindHoldActionEvents(element, questId) {
    let trackingInterval = null;
    let heldMs = 0;
    const targetRequired = 1000;
    
    const startTrigger = (e) => {
        e.preventDefault();
        heldMs = 0;
        SoundEngine.init();
        
        trackingInterval = setInterval(() => {
            heldMs += 100;
            const progressPct = Math.min(100, (heldMs / targetRequired) * 100);
            const progressBar = document.getElementById(`progress-${questId}`);
            if (progressBar) progressBar.style.width = `${progressPct}%`;
            
            // Native Phone Haptic Charging Pulse
            if (navigator.vibrate) navigator.vibrate(25);
            
            if (heldMs >= targetRequired) {
                clearInterval(trackingInterval);
                executeQuestResolution(questId, e);
            }
        }, 100);
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

function executeQuestResolution(questId, event) {
    const profile = state.profiles[state.activePlayer];
    const matchIndex = profile.activeQuests.findIndex(q => q.id === questId);
    if (matchIndex === -1) return;
    
    const quest = profile.activeQuests[matchIndex];
    profile.activeQuests.splice(matchIndex, 1);
    
    let xpGain = 25, goldGain = 10;
    if (quest.difficulty === 'rare') { xpGain = 60; goldGain = 25; }
    if (quest.difficulty === 'epic') { xpGain = 120; goldGain = 50; }
    
    if (profile.rpgClass === "mage") xpGain = Math.floor(xpGain * 1.2);
    if (profile.rpgClass === "rogue") goldGain = Math.floor(goldGain * 1.2);
    if (profile.rpgClass === "ranger") xpGain = Math.floor(xpGain * 1.15);
    if (profile.rpgClass === "warrior") { xpGain = Math.floor(xpGain * 1.1); goldGain = Math.floor(goldGain * 1.1); }
    
    // ⭐ CRITICAL FIX: Attributes are assigned strictly at quest resolution completion here
    const linkedAttribute = ATTR_MAP[quest.category];
    if (linkedAttribute && profile.attributes[linkedAttribute] !== undefined) {
        profile.attributes[linkedAttribute] += 1;
    }
    
    profile.xp += xpGain;
    profile.gold += goldGain;
    profile.streakCount++;
    if (profile.streakCount > profile.maxStreak) profile.maxStreak = profile.streakCount;
    if (profile.streakCount % 7 === 0) profile.streakShields++;
    
    restoreAttributesFromVictory(profile);
    SoundEngine.coin();
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Heavy Double Complete Pulse
    
    profile.questChronicle.unshift({
        date: new Date().toLocaleDateString(),
        name: quest.name,
        category: quest.category,
        bounty: `+${xpGain}XP / +${goldGain}G`
    });
    
    if (profile.xp >= 100) {
        profile.level++;
        profile.xp -= 100;
        SoundEngine.levelUp();
        triggerLevelUpBreakoutModal(profile.level);
    }
    
    createHardwarePopupText(`✨ +${xpGain} XP\n🪙 +${goldGain} Gold`, event);
    pushProfileToCloud(profile.id);
    renderEntireViewport();
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
function renderSummaryTables() {
    const profile = state.profiles[state.activePlayer];
    if (!profile) return;
    
    const walletFilter = document.getElementById("ledger-time-filter").value;
    const chronicleFilter = document.getElementById("chronicle-time-filter").value;
    
    const filterByTimeWindow = (list, type) => {
        const now = new Date();
        return list.filter(item => {
            if (type === "all") return true;
            const diffDays = (now - new Date(item.date)) / (1000 * 60 * 60 * 24);
            return type === "week" ? diffDays <= 7 : diffDays <= 30;
        });
    };
    
    const cleanWalletList = filterByTimeWindow(profile.walletLedger, walletFilter);
    const cleanChronicleList = filterByTimeWindow(profile.questChronicle, chronicleFilter);
    
    const paginateArray = (arr, targetPage) => {
        const start = (targetPage - 1) * state.rowsPerPage;
        return arr.slice(start, start + state.rowsPerPage);
    };
    
    const viewWallet = paginateArray(cleanWalletList, state.ledgerPage);
    const viewChronicle = paginateArray(cleanChronicleList, state.chroniclePage);
    
    const walletBody = document.getElementById("wallet-ledger-body"); walletBody.innerHTML = "";
    if (viewWallet.length === 0) {
        walletBody.innerHTML = `<tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-dim);">No transactions logged.</td></tr>`;
    } else {
        viewWallet.forEach(w => {
            const tr = document.createElement("tr"); tr.style.borderBottom = "1px solid #27272a"; tr.style.cursor = "pointer";
            tr.onclick = () => alert(`📒 Entry Log:\nEnvelope Context: ${w.envelope}\nDescription Details: "${w.memo}"\nDelta: $${w.amount.toFixed(2)}`);
            const colorStyle = w.amount < 0 ? "color:var(--danger);" : "color:var(--success);";
            tr.innerHTML = `<td style="padding:10px;">${w.date}</td><td style="padding:10px;">${w.envelope}</td><td style="padding:10px; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${w.memo}</td><td style="padding:10px; font-weight:bold; ${colorStyle}">${w.amount < 0 ? "" : "+"}$${w.amount.toFixed(2)}</td>`;
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
            tr.innerHTML = `<td style="padding:10px;">${c.date}</td><td style="padding:10px; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.name}</td><td style="padding:10px;"><span style="font-size:0.75rem; background:#27272a; padding:2px 6px; border-radius:4px;">${c.category.split(" ")[0]}</span></td><td style="padding:10px; color:var(--gold); font-weight:bold;">${c.bounty}</td>`;
            chronicleBody.appendChild(tr);
        });
    }
    
    document.getElementById("ledger-page-num").innerText = `Page ${state.ledgerPage} / ${Math.max(1, Math.ceil(cleanWalletList.length / state.rowsPerPage))}`;
    document.getElementById("chronicle-page-num").innerText = `Page ${state.chroniclePage} / ${Math.max(1, Math.ceil(cleanChronicleList.length / state.rowsPerPage))}`;
    
    const spentTotal = profile.walletLedger.filter(l => l.amount < 0).reduce((sum, current) => sum + current.amount, 0);
    const poolSum = profile.envelopes.reduce((sum, curr) => sum + curr.balance, 0);
    document.getElementById("sum-allocated").innerText = `$${poolSum.toFixed(2)}`;
    document.getElementById("sum-spent").innerText = `$${Math.abs(spentTotal).toFixed(2)}`;
}

function renderEnvelopesView() {
    const profile = state.profiles[state.activePlayer]; if (!profile) return;
    const stack = document.getElementById("envelopes-stack");
    const transSelect = document.getElementById("trans-envelope");
    const trfFrom = document.getElementById("transfer-from-select");
    const trfTo = document.getElementById("transfer-to-select");
    
    stack.innerHTML = ""; transSelect.innerHTML = ""; trfFrom.innerHTML = ""; trfTo.innerHTML = "";
    
    profile.envelopes.forEach(env => {
        const card = document.createElement("div"); card.className = "envelope-card panel"; card.style.borderLeft = "4px solid #2196F3";
        card.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><h3 style="margin:0; font-size:1rem;">${env.name}</h3><span style="font-size:1.1rem; font-weight:bold; color:#2196F3;">$${env.balance.toFixed(2)}</span></div>`;
        stack.appendChild(card);
        
        const opt = `<option value="${env.id}">${env.name} ($${env.balance.toFixed(2)})</option>`;
        transSelect.innerHTML += opt; trfFrom.innerHTML += opt; trfTo.innerHTML += opt;
    });
}

// ==========================================
// ⚙️ INTERACTIVE ROUTING EVENTS CONTROL
// ==========================================
function setupEventHandlers() {
    window.switchTab = function(tabId) {
        state.activeTab = tabId;
        document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.getElementById(tabId).classList.add("active");
        const btnNode = Array.from(document.querySelectorAll(".tab-btn")).find(b => b.getAttribute("onclick").includes(tabId));
        if (btnNode) btnNode.classList.add("active");
    };

    window.switchPlayerProfile = function() {
        state.activePlayer = document.getElementById("global-player-select").value;
        state.questPage = 1; state.ledgerPage = 1; state.chroniclePage = 1;
        runStreakCalendarAudit();
        renderEntireViewport();
    };

    document.getElementById("quest-form").onsubmit = function(e) {
        e.preventDefault();
        const profile = state.profiles[state.activePlayer];
        
        // Adds quest safely to the active array without checking out unearned attribute bonuses early
        profile.activeQuests.push({
            id: 'qst-' + Date.now(),
            name: document.getElementById("quest-name").value,
            date: document.getElementById("quest-date").value,
            time: document.getElementById("quest-time").value,
            notes: document.getElementById("quest-notes").value,
            category: document.getElementById("quest-category").value,
            difficulty: document.getElementById("quest-difficulty").value
        });
        
        document.getElementById("quest-form").reset();
        pushProfileToCloud(profile.id);
        renderEntireViewport();
    };

    document.getElementById("trans-form").onsubmit = function(e) {
        e.preventDefault();
        const profile = state.profiles[state.activePlayer];
        const envId = document.getElementById("trans-envelope").value;
        const memo = document.getElementById("trans-memo").value;
        let amt = parseFloat(document.getElementById("trans-amount").value);
        if (isNaN(amt) || amt <= 0) return;
        
        const targetEnv = profile.envelopes.find(env => env.id === envId);
        if (state.walletMode === 'spend') {
            amt = -amt;
            if (targetEnv.balance + amt < 0) { alert("Denied! Envelope allocation deficit protocol active."); return; }
        }
        
        targetEnv.balance += amt;
        profile.walletBalance += amt;
        profile.walletLedger.unshift({ date: new Date().toLocaleDateString(), envelope: targetEnv.name, memo: memo, amount: amt });
        
        document.getElementById("trans-form").reset();
        pushProfileToCloud(profile.id);
        renderEntireViewport();
    };

    document.getElementById("btn-add-envelope").onclick = function() {
        const profile = state.profiles[state.activePlayer];
        const name = document.getElementById("new-envelope-name").value;
        const bal = parseFloat(document.getElementById("new-envelope-balance").value) || 0;
        if (!name) return;
        
        profile.envelopes.push({ id: 'env-' + Date.now(), name: "📂 " + name, balance: bal });
        profile.walletBalance += bal;
        
        document.getElementById("new-envelope-name").value = "";
        document.getElementById("new-envelope-balance").value = "";
        pushProfileToCloud(profile.id);
        renderEntireViewport();
    };

    window.executeEnvelopeTransfer = function() {
        const profile = state.profiles[state.activePlayer];
        const fromId = document.getElementById("transfer-from-select").value;
        const toId = document.getElementById("transfer-to-select").value;
        const amt = parseFloat(document.getElementById("transfer-amount-input").value);
        
        if (isNaN(amt) || amt <= 0 || fromId === toId) return;
        const sEnv = profile.envelopes.find(e => e.id === fromId);
        const tEnv = profile.envelopes.find(e => e.id === toId);
        if (sEnv.balance < amt) return;
        
        sEnv.balance -= amt; tEnv.balance += amt;
        profile.walletLedger.unshift({ date: new Date().toLocaleDateString(), envelope: `🔄 Transfer Hub`, memo: `Moved from ${sEnv.name.split(" ")[1]} to ${tEnv.name.split(" ")[1]}`, amount: 0 });
        
        document.getElementById("transfer-amount-input").value = "";
        pushProfileToCloud(profile.id);
        renderEntireViewport();
    };

    window.setWalletMode = function(mode) {
        state.walletMode = mode;
        const sBtn = document.getElementById("toggle-spend"), dBtn = document.getElementById("toggle-deposit"), sub = document.getElementById("trans-submit-btn");
        if (mode === 'spend') { sBtn.classList.add("active"); dBtn.classList.remove("active"); sub.innerText = "Process Deduction"; sub.style.backgroundColor = "var(--danger)"; }
        else { dBtn.classList.add("active"); sBtn.classList.remove("active"); sub.innerText = "Execute Allocation Deposit"; sub.style.backgroundColor = "var(--success)"; }
    };

    document.getElementById("btn-save-hero-name").onclick = function() {
        const inputVal = document.getElementById("hero-name-input").value;
        if (!inputVal) return;
        state.profiles[state.activePlayer].name = inputVal;
        pushProfileToCloud(state.activePlayer);
        renderEntireViewport();
    };

    window.abandonQuest = function(id) {
        const profile = state.profiles[state.activePlayer];
        profile.activeQuests = profile.activeQuests.filter(q => q.id !== id);
        pushProfileToCloud(profile.id);
        renderEntireViewport();
    };

    window.updateCharacterGender = function() {
        state.profiles[state.activePlayer].gender = document.getElementById("hero-gender-select").value;
        pushProfileToCloud(state.activePlayer);
        renderEntireViewport();
    };

    window.updateCharacterClass = function() {
        state.profiles[state.activePlayer].rpgClass = document.getElementById("hero-class-select").value;
        pushProfileToCloud(state.activePlayer);
        renderEntireViewport();
    };

    window.changeLedgerPage = function(delta) {
        state.ledgerPage = Math.max(1, state.ledgerPage + delta);
        renderSummaryTables();
    };

    window.changeChroniclePage = function(delta) {
        state.chroniclePage = Math.max(1, state.chroniclePage + delta);
        renderSummaryTables();
    };

    window.updateSummaryFilters = function() {
        state.ledgerPage = 1; state.chroniclePage = 1;
        renderSummaryTables();
    };

    window.triggerLevelUpBreakoutModal = function(levelNum) {
        document.getElementById("modal-level-text").innerText = `LEVEL ${levelNum}`;
        document.getElementById("level-up-modal").style.display = "flex";
    };

    window.closeLevelUpModal = function() {
        document.getElementById("level-up-modal").style.display = "none";
    };

    window.wipeEntireEngine = function() {
        if (confirm("🚨 Hard reset this individual player identity block?")) {
            const id = state.activePlayer;
            state.profiles[id] = createBlankProfile(id, id.charAt(0).toUpperCase() + id.slice(1));
            pushProfileToCloud(id);
            renderEntireViewport();
        }
    };
}

function renderEntireViewport() {
    renderCharacterPanel();
    renderQuestsBoard();
    renderEnvelopesView();
    renderSummaryTables();
}
