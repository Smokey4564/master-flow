/**
 * Master Flow v4.3.2 - Main Core Engine
 * Dev Sprint: Core Loop, Streak Debuffs, Pagination, and Expanded Archetypes
 */

// Global State Machine
let state = {
    activePlayer: 'angel',
    activeTab: 'quests',
    walletMode: 'spend',
    questPage: 1,
    ledgerPage: 1,
    chroniclePage: 1,
    rowsPerPage: 5,
    holdTimeout: null,
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

// Base Default Attributes
const BASE_ATTRIBUTES = {
    "Strength (STR)": 10,
    "Dexterity (DEX)": 10,
    "Intelligence (INT)": 10,
    "Constitution (CON)": 10,
    "Charisma (CHA)": 10,
    "Wisdom (WIS)": 10
};

// Category to Attribute Mapping
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

// Initialize App Lifecycle
document.addEventListener("DOMContentLoaded", () => {
    loadEngineState();
    setupEventHandlers();
    runStreakCalendarAudit();
    renderEntireViewport();
});

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

function loadEngineState() {
    const backupCache = localStorage.getItem("masterflow_local_cache");
    if (backupCache) {
        try {
            state.profiles = JSON.parse(backupCache);
        } catch (e) {
            console.error("Local data corrupted, spinning up default models.", e);
            buildInitialFallbackState();
        }
    } else {
        buildInitialFallbackState();
    }
    
    // Auto sync check for active element values
    const activeId = document.getElementById("global-player-select").value;
    state.activePlayer = state.profiles[activeId] ? activeId : Object.keys(state.profiles)[0];
    document.getElementById("global-player-select").value = state.activePlayer;
}

function buildInitialFallbackState() {
    state.profiles = {
        angel: createBlankProfile("angel", "Angel Anthony"),
        brianna: createBlankProfile("brianna", "Brianna")
    };
    saveEngineState();
}

function saveEngineState() {
    localStorage.setItem("masterflow_local_cache", JSON.stringify(state.profiles));
    document.getElementById("cloud-status").innerText = "🔄 Dynamic Local Cache Sync: " + new Date().toLocaleTimeString();
}

/**
 * 📆 CONFLICT & CALENDAR STREAK ENGINE (With Attribute Penalty Rules)
 */
function runStreakCalendarAudit() {
    const profile = state.profiles[state.activePlayer];
    const todayStr = new Date().toLocaleDateString();
    
    if (profile.lastCheckInDate === todayStr) return; // Already verified today
    
    if (profile.lastCheckInDate !== "") {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const lastCheck = new Date(profile.lastCheckInDate);
        lastCheck.setHours(0,0,0,0);
        
        const diffTime = Math.abs(today - lastCheck);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 1) {
            // Days have been missed without a logged victory completion
            if (profile.streakShields > 0) {
                profile.streakShields--;
                alert(`⚠️ Warning! You missed an active day on the board! Your Streak Shield intercepted the blow. (${profile.streakShields} left)`);
            } else {
                // STREAK SHATTERED - INFELICT SEVERE MODIFIER CONVERGENCE
                profile.streakCount = 0;
                profile.attributePenaltyActive = true;
                applyHeavyAttributePenalty(profile);
                alert("💔 STREAK SHATTERED! You skipped goals without a shield. Your active stats have degraded by 20% until your next quest victory!");
            }
        }
    }
    
    profile.lastCheckInDate = todayStr;
    saveEngineState();
}

function applyHeavyAttributePenalty(profile) {
    // Reduce stats to 80% capacity
    for (let key in profile.attributes) {
        profile.attributes[key] = Math.max(1, Math.floor((BASE_ATTRIBUTES[key] + (profile.level - 1)) * 0.8));
    }
}

function restoreAttributesFromVictory(profile) {
    if (!profile.attributePenaltyActive) return;
    profile.attributePenaltyActive = false;
    
    // Recover original values based on earned level adjustments
    for (let key in profile.attributes) {
        profile.attributes[key] = BASE_ATTRIBUTES[key] + (profile.level - 1);
    }
    alert("✨ Grace Restored! Your attribute scores have returned to optimal baseline capacity.");
}

/**
 * 🎮 CLASS MATRIX & DATA RENDERING VISUALS
 */
function renderCharacterPanel() {
    const profile = state.profiles[state.activePlayer];
    
    // Find current dynamic evolution layout rank title
    const evolutionTier = profile.level >= 10 ? "evolved" : "base";
    const classData = CLASS_MATRIX[profile.rpgClass];
    const identityTitle = classData[profile.gender][evolutionTier];
    
    document.getElementById("render-hero-title").innerText = `${profile.name} - ${identityTitle}`;
    document.getElementById("render-hero-level").innerText = `LVL ${profile.level}`;
    document.getElementById("streak-counter-display").innerHTML = `🔥 Streak: ${profile.streakCount} Days | 🛡️ Shields: ${profile.streakShields}`;
    
    // Sync the HTML Input panel variables
    document.getElementById("hero-name-input").value = profile.name;
    document.getElementById("hero-gender-select").value = profile.gender;
    document.getElementById("hero-class-select").value = profile.rpgClass;
    
    // Calculate level bar values
    const xpNeeded = 100; 
    const xpPercent = Math.min(100, (profile.xp / xpNeeded) * 100);
    document.getElementById("render-xp-bar").style.width = `${xpPercent}%`;
    document.getElementById("render-xp-text").innerText = `${profile.xp} / ${xpNeeded} XP`;
    
    // Base Core Resource calculations modified by profile choices
    document.getElementById("stat-hp").innerText = classData.stats.hp + (profile.level * 10);
    document.getElementById("stat-mp").innerText = classData.stats.mp + (profile.level * 5);
    document.getElementById("stat-atk").innerText = classData.stats.atk + profile.level;
    document.getElementById("stat-def").innerText = classData.stats.def + profile.level;
    
    // Render the RPG Attributes panel text rows with interactive visual progress bars
    let attrHtml = "";
    for (let [key, val] of Object.entries(profile.attributes)) {
        const textStyle = profile.attributePenaltyActive ? "color: #ef4444;" : "color: #a1a1aa;";
        const barColor = profile.attributePenaltyActive ? "#ef4444" : "var(--purple, #8a2be2)";
        
        // Calculate a visual fill percentage based on stat progression milestone limit max (e.g. max 50 for layout caps)
        const visualFill = Math.min(100, (val / 50) * 100); 
        
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
    
    // Top HUD syncing
    document.getElementById("top-wallet").innerText = `💰 $${profile.walletBalance.toFixed(2)}`;
    document.getElementById("top-gold").innerText = `🪙 ${profile.gold} Gold`;
}

/**
 * 📋 QUEST BOARD RENDERING WITH CRITERIA FILTERS
 */
function renderQuestsBoard() {
    const profile = state.profiles[state.activePlayer];
    const board = document.getElementById("quests-board");
    const selectedFilter = document.getElementById("quest-board-filter").value;
    
    board.innerHTML = "";
    
    // Filter active cards list based on attribute criteria selection
    const targetedQuests = profile.activeQuests.filter(q => {
        if (selectedFilter === "all") return true;
        return q.category === selectedFilter;
    });
    
    if (targetedQuests.length === 0) {
        board.innerHTML = `<div class="empty-notice" style="text-align:center; padding:20px; color:var(--text-dim);">The Notice Board is clear. No active quests in this tracking filter field.</div>`;
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
                <div class="hold-progress-bar" id="progress-${quest.id}" style="position:absolute; left:0; top:0; height:100%; width:0%; background:rgba(34, 197, 94, 0.2); transition: width 0.1s linear;"></div>
                <span style="z-index:2; font-size:0.85rem; font-weight:bold; pointer-events:none;">⚔️ HOLD TO COMPLETE QUEST</span>
            </div>
            <button onclick="window.abandonQuest('${quest.id}')" style="position:absolute; top:10px; right:10px; background:none; border:none; color:var(--danger); cursor:pointer; font-size:0.9rem;">✖</button>
        `;
        
        // Setup holding action listeners to bind mouse and touch paths safely
        const holdZone = card.querySelector(".hold-container");
        bindHoldActionEvents(holdZone, quest.id);
        
        board.appendChild(card);
    });
}

function bindHoldActionEvents(element, questId) {
    let trackingInterval = null;
    let heldMs = 0;
    const targetRequired = 1000; // 1 whole second calculation boundary
    
    const startTrigger = (e) => {
        e.preventDefault();
        heldMs = 0;
        element.classList.add("completed-burst");
        
        trackingInterval = setInterval(() => {
            heldMs += 100;
            const progressPct = Math.min(100, (heldMs / targetRequired) * 100);
            const progressBar = document.getElementById(`progress-${questId}`);
            if (progressBar) progressBar.style.width = `${progressPct}%`;
            
            if (heldMs >= targetRequired) {
                clearInterval(trackingInterval);
                executeQuestResolution(questId, e);
            }
        }, 100);
    };
    
    const cancelTrigger = () => {
        clearInterval(trackingInterval);
        element.classList.remove("completed-burst");
        const progressBar = document.getElementById(`progress-${questId}`);
        if (progressBar) progressBar.style.width = "0%";
    };
    
    element.addEventListener("mousedown", startTrigger);
    element.addEventListener("mouseup", cancelTrigger);
    element.addEventListener("mouseleave", cancelTrigger);
    
    element.addEventListener("touchstart", startTrigger, { passive: false });
    element.addEventListener("touchend", cancelTrigger);
    element.addEventListener("touchcancel", cancelTrigger);
}

function executeQuestResolution(questId, event) {
    const profile = state.profiles[state.activePlayer];
    const matchIndex = profile.activeQuests.findIndex(q => q.id === questId);
    if (matchIndex === -1) return;
    
    const quest = profile.activeQuests[matchIndex];
    profile.activeQuests.splice(matchIndex, 1);
    
    // Reward Payout Configurations
    let xpGain = 25, goldGain = 10;
    if (quest.difficulty === 'rare') { xpGain = 60; goldGain = 25; }
    if (quest.difficulty === 'epic') { xpGain = 120; goldGain = 50; }
    
    // Class multiplier pass-throughs
    if (profile.rpgClass === "mage") xpGain = Math.floor(xpGain * 1.2);
    if (profile.rpgClass === "rogue") goldGain = Math.floor(goldGain * 1.2);
    if (profile.rpgClass === "ranger") xpGain = Math.floor(xpGain * 1.15); // Ranger balancing pass
    if (profile.rpgClass === "warrior") { xpGain = Math.floor(xpGain * 1.1); goldGain = Math.floor(goldGain * 1.1); }
    
    // Update internal state structures
    profile.xp += xpGain;
    profile.gold += goldGain;
    profile.streakCount++;
    if (profile.streakCount > profile.maxStreak) profile.maxStreak = profile.streakCount;
    
    // Earn a shield back dynamically at intervals
    if (profile.streakCount % 7 === 0) {
        profile.streakShields++;
    }
    
    // Clear debuff rules safely upon successful objective match completion
    restoreAttributesFromVictory(profile);
    
    // Add entry into history array log
    profile.questChronicle.unshift({
        date: new Date().toLocaleDateString(),
        name: quest.name,
        category: quest.category,
        bounty: `+${xpGain}XP / +${goldGain}G`
    });
    
    // Level Up validation logic
    if (profile.xp >= 100) {
        profile.level++;
        profile.xp -= 100;
        // Increase structural base values safely
        for (let key in BASE_ATTRIBUTES) { BASE_ATTRIBUTES[key]++; }
        restoreAttributesFromVictory(profile);
        triggerLevelUpBreakoutModal(profile.level);
    }
    
    // Fire Dopamine Splash Popup elements onto viewport
    createHardwarePopupText(`✨ +${xpGain} XP\n🪙 +${goldGain} Gold`, event);
    
    saveEngineState();
    renderEntireViewport();
}

/**
 * 💥 DOPAMINE LAYER HARDWARE-ACCELERATED POPUPS
 */
function createHardwarePopupText(message, event) {
    let clientX = window.innerWidth / 2;
    let clientY = window.innerHeight / 2;
    
    if (event) {
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else if (event.clientX) {
            clientX = event.clientX;
            clientY = event.clientY;
        }
    }
    
    const node = document.createElement("span");
    node.className = "floating-grind-text";
    node.innerText = message;
    node.style.left = `${clientX - 30}px`;
    node.style.top = `${clientY - 20}px`;
    
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 1200);
}

/**
 * 📊 SUMMARY LEDGER SYSTEM: PAGINATION & TIME-WINDOW FILTER LOGIC
 */
function renderSummaryTables() {
    const profile = state.profiles[state.activePlayer];
    
    const walletFilter = document.getElementById("ledger-time-filter").value;
    const chronicleFilter = document.getElementById("chronicle-time-filter").value;
    
    // Filter Arrays by explicit Unix timestamps
    const filterByTimeWindow = (list, type) => {
        const now = new Date();
        return list.filter(item => {
            if (type === "all") return true;
            const targetDate = new Date(item.date);
            const diffDays = (now - targetDate) / (1000 * 60 * 60 * 24);
            if (type === "week") return diffDays <= 7;
            if (type === "month") return diffDays <= 30;
            return true;
        });
    };
    
    const cleanWalletList = filterByTimeWindow(profile.walletLedger, walletFilter);
    const cleanChronicleList = filterByTimeWindow(profile.questChronicle, chronicleFilter);
    
    // Execute Pagination Slicing Loops
    const paginateArray = (arr, targetPage) => {
        const start = (targetPage - 1) * state.rowsPerPage;
        return arr.slice(start, start + state.rowsPerPage);
    };
    
    const viewWallet = paginateArray(cleanWalletList, state.ledgerPage);
    const viewChronicle = paginateArray(cleanChronicleList, state.chroniclePage);
    
    // Render Wallet Ledger rows dynamically with interactive drop down nodes
    const walletBody = document.getElementById("wallet-ledger-body");
    walletBody.innerHTML = "";
    
    if (viewWallet.length === 0) {
        walletBody.innerHTML = `<tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-dim);">No transactions found.</td></tr>`;
    } else {
        viewWallet.forEach((w, idx) => {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid #27272a";
            tr.style.cursor = "pointer";
            tr.onclick = () => alert(`📒 Entry Context:\nTimestamp Logged: ${w.date}\nEnvelope Target: ${w.envelope}\nDescription Details: "${w.memo}"\nDelta: $${w.amount.toFixed(2)}`);
            
            const colorClass = w.amount < 0 ? "color:var(--danger);" : "color:var(--success);";
            tr.innerHTML = `
                <td style="padding:10px;">${w.date}</td>
                <td style="padding:10px;">${w.envelope}</td>
                <td style="padding:10px; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${w.memo}</td>
                <td style="padding:10px; font-weight:bold; ${colorClass}">${w.amount < 0 ? "" : "+"}$${w.amount.toFixed(2)}</td>
            `;
            walletBody.appendChild(tr);
        });
    }
    
    // Render Quest Victory Chronicle rows dynamically with interactive drop down nodes
    const chronicleBody = document.getElementById("quest-chronicle-body");
    chronicleBody.innerHTML = "";
    
    if (viewChronicle.length === 0) {
        chronicleBody.innerHTML = `<tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-dim);">No completed milestones found.</td></tr>`;
    } else {
        viewChronicle.forEach((c, idx) => {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid #27272a";
            tr.style.cursor = "pointer";
            tr.onclick = () => alert(`🏆 Quest Victory Archive:\nCompleted on: ${c.date}\nTask Goal: ${c.name}\nFocus Classification: ${c.category}\nBounty Retained: ${c.bounty}`);
            
            tr.innerHTML = `
                <td style="padding:10px;">${c.date}</td>
                <td style="padding:10px; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.name}</td>
                <td style="padding:10px;"><span style="font-size:0.75rem; background:#27272a; padding:2px 6px; border-radius:4px;">${c.category.split(" ")[0]}</span></td>
                <td style="padding:10px; color:var(--gold); font-weight:bold;">${c.bounty}</td>
            `;
            chronicleBody.appendChild(tr);
        });
    }
    
    // Synchronize Pagination visual tracking headers numbers
    const totalLedgerPages = Math.max(1, Math.ceil(cleanWalletList.length / state.rowsPerPage));
    const totalChroniclePages = Math.max(1, Math.ceil(cleanChronicleList.length / state.rowsPerPage));
    
    document.getElementById("ledger-page-num").innerText = `Page ${state.ledgerPage} / ${totalLedgerPages}`;
    document.getElementById("chronicle-page-num").innerText = `Page ${state.chroniclePage} / ${totalChroniclePages}`;
    
    // Calculate Summary Totals
    const spentTotal = profile.walletLedger.filter(l => l.amount < 0).reduce((sum, current) => sum + current.amount, 0);
    const poolSum = profile.envelopes.reduce((sum, curr) => sum + curr.balance, 0);
    
    document.getElementById("sum-allocated").innerText = `$${poolSum.toFixed(2)}`;
    document.getElementById("sum-spent").innerText = `$${Math.abs(spentTotal).toFixed(2)}`;
}

window.changeLedgerPage = function(delta) {
    const profile = state.profiles[state.activePlayer];
    const walletFilter = document.getElementById("ledger-time-filter").value;
    
    const now = new Date();
    const cleanList = profile.walletLedger.filter(item => {
        if (walletFilter === "all") return true;
        const targetDate = new Date(item.date);
        const diffDays = (now - targetDate) / (1000 * 60 * 60 * 24);
        return walletFilter === "week" ? diffDays <= 7 : diffDays <= 30;
    });
    
    const maxPage = Math.max(1, Math.ceil(cleanList.length / state.rowsPerPage));
    state.ledgerPage = Math.max(1, Math.min(maxPage, state.ledgerPage + delta));
    renderSummaryTables();
};

window.changeChroniclePage = function(delta) {
    const profile = state.profiles[state.activePlayer];
    const chronicleFilter = document.getElementById("chronicle-time-filter").value;
    
    const now = new Date();
    const cleanList = profile.questChronicle.filter(item => {
        if (chronicleFilter === "all") return true;
        const targetDate = new Date(item.date);
        const diffDays = (now - targetDate) / (1000 * 60 * 60 * 24);
        return chronicleFilter === "week" ? diffDays <= 7 : diffDays <= 30;
    });
    
    const maxPage = Math.max(1, Math.ceil(cleanList.length / state.rowsPerPage));
    state.chroniclePage = Math.max(1, Math.min(maxPage, state.chroniclePage + delta));
    renderSummaryTables();
};

window.updateSummaryFilters = function() {
    state.ledgerPage = 1;
    state.chroniclePage = 1;
    renderSummaryTables();
};

/**
 * 📬 BUDGET & ENVELOPE CONTROLS
 */
function renderEnvelopesView() {
    const profile = state.profiles[state.activePlayer];
    const stack = document.getElementById("envelopes-stack");
    const transSelect = document.getElementById("trans-envelope");
    const trfFrom = document.getElementById("transfer-from-select");
    const trfTo = document.getElementById("transfer-to-select");
    
    stack.innerHTML = "";
    transSelect.innerHTML = "";
    trfFrom.innerHTML = "";
    trfTo.innerHTML = "";
    
    profile.envelopes.forEach(env => {
        // Render current stack layouts
        const card = document.createElement("div");
        card.className = "envelope-card panel";
        card.style.borderLeft = "4px solid #2196F3";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size:1rem;">${env.name}</h3>
                <span style="font-size:1.1rem; font-weight:bold; color:#2196F3;">$${env.balance.toFixed(2)}</span>
            </div>
        `;
        stack.appendChild(card);
        
        // Add options to transactional drop down selectors dynamically
        const opt = `<option value="${env.id}">${env.name} ($${env.balance.toFixed(2)})</option>`;
        transSelect.innerHTML += opt;
        trfFrom.innerHTML += opt;
        trfTo.innerHTML += opt;
    });
}

window.executeEnvelopeTransfer = function() {
    const profile = state.profiles[state.activePlayer];
    const fromId = document.getElementById("transfer-from-select").value;
    const toId = document.getElementById("transfer-to-select").value;
    const amt = parseFloat(document.getElementById("transfer-amount-input").value);
    
    if (isNaN(amt) || amt <= 0) { alert("Please enter a valid monetary value."); return; }
    if (fromId === toId) { alert("Source and destination envelopes must be different."); return; }
    
    const sourceEnv = profile.envelopes.find(e => e.id === fromId);
    const targetEnv = profile.envelopes.find(e => e.id === toId);
    
    if (sourceEnv.balance < amt) { alert("Insufficient assets inside source envelope pool."); return; }
    
    sourceEnv.balance -= amt;
    targetEnv.balance += amt;
    
    profile.walletLedger.unshift({
        date: new Date().toLocaleDateString(),
        envelope: `🔄 Transfer Hub`,
        memo: `Shifted from ${sourceEnv.name.split(" ")[1]} to ${targetEnv.name.split(" ")[1]}`,
        amount: 0 // Net change is neutral across whole asset pool
    });
    
    document.getElementById("transfer-amount-input").value = "";
    saveEngineState();
    renderEntireViewport();
};

window.setWalletMode = function(mode) {
    state.walletMode = mode;
    const spendBtn = document.getElementById("toggle-spend");
    const depBtn = document.getElementById("toggle-deposit");
    const subBtn = document.getElementById("trans-submit-btn");
    
    if (mode === 'spend') {
        spendBtn.classList.add("active");
        depBtn.classList.remove("active");
        subBtn.innerText = "Process Deduction";
        subBtn.style.backgroundColor = "var(--danger)";
    } else {
        depBtn.classList.add("active");
        spendBtn.classList.remove("active");
        subBtn.innerText = "Execute Allocation Deposit";
        subBtn.style.backgroundColor = "var(--success)";
    }
};

/**
 * 🛠️ UTILITY GLOBAL CORE PIPELINES
 */
function setupEventHandlers() {
    // Tab switching routing engine logic
    window.switchTab = function(tabId) {
        state.activeTab = tabId;
        document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        
        document.getElementById(tabId).classList.add("active");
        // Select tab button dynamically
        const btnNode = Array.from(document.querySelectorAll(".tab-btn")).find(b => b.getAttribute("onclick").includes(tabId));
        if (btnNode) btnNode.classList.add("active");
    };

    // User Profile Profile identity switcher logic
    window.switchPlayerProfile = function() {
        state.activePlayer = document.getElementById("global-player-select").value;
        state.questPage = 1;
        state.ledgerPage = 1;
        state.chroniclePage = 1;
        runStreakCalendarAudit();
        renderEntireViewport();
    };

    // Form Submissions Interceptors
    document.getElementById("quest-form").onsubmit = function(e) {
        e.preventDefault();
        const profile = state.profiles[state.activePlayer];
        
        const name = document.getElementById("quest-name").value;
        const category = document.getElementById("quest-category").value;
        
        // Auto boost attributes based on category selection fields mappings
        const linkedAttribute = ATTR_MAP[category];
        if (linkedAttribute && profile.attributes[linkedAttribute] !== undefined) {
            profile.attributes[linkedAttribute] += 1; 
        }
        
        profile.activeQuests.push({
            id: 'qst-' + Date.now(),
            name: name,
            date: document.getElementById("quest-date").value,
            time: document.getElementById("quest-time").value,
            notes: document.getElementById("quest-notes").value,
            category: category,
            difficulty: document.getElementById("quest-difficulty").value
        });
        
        document.getElementById("quest-form").reset();
        saveEngineState();
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
            if (targetEnv.balance + amt < 0) { alert("Denied! Envelope budget deficit protection active."); return; }
        }
        
        targetEnv.balance += amt;
        profile.walletBalance += amt;
        
        profile.walletLedger.unshift({
            date: new Date().toLocaleDateString(),
            envelope: targetEnv.name,
            memo: memo,
            amount: amt
        });
        
        document.getElementById("trans-form").reset();
        saveEngineState();
        renderEntireViewport();
    };

    document.getElementById("btn-add-envelope").onclick = function() {
        const profile = state.profiles[state.activePlayer];
        const name = document.getElementById("new-envelope-name").value;
        const bal = parseFloat(document.getElementById("new-envelope-balance").value) || 0;
        
        if (!name) { alert("Envelope requires a layout descriptor name."); return; }
        
        profile.envelopes.push({
            id: 'env-' + Date.now(),
            name: "📂 " + name,
            balance: bal
        });
        profile.walletBalance += bal;
        
        document.getElementById("new-envelope-name").value = "";
        document.getElementById("new-envelope-balance").value = "";
        
        saveEngineState();
        renderEntireViewport();
    };

    document.getElementById("btn-save-hero-name").onclick = function() {
        const inputVal = document.getElementById("hero-name-input").value;
        if (!inputVal) return;
        state.profiles[state.activePlayer].name = inputVal;
        saveEngineState();
        renderEntireViewport();
    };

    window.abandonQuest = function(id) {
        const profile = state.profiles[state.activePlayer];
        profile.activeQuests = profile.activeQuests.filter(q => q.id !== id);
        saveEngineState();
        renderEntireViewport();
    };

    window.updateCharacterGender = function() {
        state.profiles[state.activePlayer].gender = document.getElementById("hero-gender-select").value;
        saveEngineState();
        renderEntireViewport();
    };

    window.updateCharacterClass = function() {
        state.profiles[state.activePlayer].rpgClass = document.getElementById("hero-class-select").value;
        saveEngineState();
        renderEntireViewport();
    };

    window.triggerLevelUpBreakoutModal = function(levelNum) {
        document.getElementById("modal-level-text").innerText = `LEVEL ${levelNum}`;
        document.getElementById("level-up-modal").style.display = "flex";
    };

    window.closeLevelUpModal = function() {
        document.getElementById("level-up-modal").style.display = "none";
    };

    window.wipeEntireEngine = function() {
        if (confirm("🚨 Warning! This hard wipes all data for this identity profile from local storage. Continue?")) {
            state.profiles[state.activePlayer] = createBlankProfile(state.activePlayer, state.activePlayer === 'angel' ? "Angel Anthony" : "Brianna");
            saveEngineState();
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
