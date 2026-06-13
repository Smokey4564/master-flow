import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Configure Firebase so profiles can sync with the shared Firestore project.
const firebaseConfig = {
  apiKey: "AIzaSyDD4FGcNxHJT7wDh3hPMqudUYzEmDz8lbw",
  authDomain: "master-flow-d9d4b.firebaseapp.com",
  projectId: "master-flow-d9d4b",
  storageBucket: "master-flow-d9d4b.firebasestorage.app",
  messagingSenderId: "716546159295",
  appId: "1:716546159295:web:ae13d55413b31debd2cc0a",
  measurementId: "G-YHC9KZNQ2N"
};

// Start the Firebase client and create the Firestore connection.
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Return a complete default profile so older or missing data stays renderable.
const createBlankProfile = () => ({ 
    heroName: '', 
    activeIdentity: 'masc', 
    selectedClass: 'warrior', 
    household_id: 'OYfoVvk62io4l9lZxm0g', 
    quests: [], 
    envelopes: [], 
    history: [], 
    gold: 0, 
    xp: 0, 
    isLocked: false, 
    hobbyStats: {}, 
    journalLog: [], 
    campaign: null 
});

// Keep the active profile and player identity available to every UI handler.
window.state = createBlankProfile();
let activePlayerId = localStorage.getItem('masterflow_current_player_id') || 'angel';

// Define the base RPG stats and title for each selectable hero class.
const dynamicClassMatrix = {
    warrior: { hp: 120, mp: 30, atk: 18, def: 15, title: "🛡️ Guardian Knight" },
    mage: { hp: 70, mp: 120, atk: 25, def: 6, title: "🔮 Grand Archmage" },
    rogue: { hp: 90, mp: 50, atk: 16, def: 9, title: "⚡ Shadow Assassin" }
};

// Track the current hold gesture and live Firestore subscription.
let holdTimer;
let activeCard = null;
let activeSubListener = null;

// Format a local date as YYYY-MM-DD so quest dates compare without timezone shifts.
function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Save locally first for resilience, render immediately, and then sync to Firestore.
window.saveState = async function() {
    // Cache the profile before network work and refresh the visible app immediately.
    localStorage.setItem(`masterflow_cache_${activePlayerId}`, JSON.stringify(window.state));
    window.renderAllEngineSectors();
    
    // Report cloud progress while Firestore accepts or rejects the save.
    const statusEl = document.getElementById('cloud-status');
    if(statusEl) statusEl.textContent = "⚡ Syncing to Cloud...";
    try {
        await setDoc(doc(db, "households", "OYfoVvk62io4l9lZxm0g", "profiles", activePlayerId), window.state);
        if(statusEl) statusEl.textContent = "✅ Profile Saved";
    } catch (err) {
        console.warn("Network busy, state safely backed up locally:", err);
        if(statusEl) statusEl.textContent = "⚠️ Saved Locally (Offline)";
    }
};

// Restore cached data and subscribe to cloud changes for the active player.
function establishLiveSyncStream() {
    const statusEl = document.getElementById('cloud-status');
    // Stop the prior player's listener before opening a new subscription.
    if (activeSubListener) activeSubListener(); 

    // Use local cache data immediately so the app still works offline.
    const cached = localStorage.getItem(`masterflow_cache_${activePlayerId}`);
    if(cached) {
        // Safely merge cached fields over defaults and ignore malformed cache data.
        try {
            window.state = { ...createBlankProfile(), ...JSON.parse(cached) };
            window.renderAllEngineSectors();
            if(statusEl) statusEl.textContent = "✅ Running on Cache";
        } catch(e) { 
            console.error("Cache read fail:", e); 
        }
    }

    // Merge cloud data over defaults so newly added fields always exist.
    try {
        activeSubListener = onSnapshot(
            doc(db, "households", "OYfoVvk62io4l9lZxm0g", "profiles", activePlayerId), 
            (docSnap) => {
                if (docSnap.exists()) {
                    window.state = { ...createBlankProfile(), ...docSnap.data() };
                    localStorage.setItem(`masterflow_cache_${activePlayerId}`, JSON.stringify(window.state));
                    window.renderAllEngineSectors();
                    if(statusEl) statusEl.textContent = "🟢 Live Cloud Sync Active";
                } else {
                    if(statusEl) statusEl.textContent = "🆕 New Profile Ready";
                }
            }, 
            (streamError) => {
                console.warn("Stream blocked or offline:", streamError);
                if(statusEl) statusEl.textContent = "⚠️ Stream Error (Offline)";
            }
        );
    } catch(e) {
        console.error("Failed to establish snapshot pipeline:", e);
    }
}

// Persist a class selection so stats and reward modifiers remain consistent.
window.updateCharacterClass = function() {
    const classSelect = document.getElementById('hero-class-select');
    if (classSelect) {
        // Store the selected class and persist its effect on the profile.
        window.state.selectedClass = classSelect.value;
        window.saveState();
    }
};

// Reset transient state and load the selected player's local and cloud profile.
window.switchPlayerProfile = function() {
    const sel = document.getElementById('global-player-select');
    if(sel) {
        // Remember the selected player and clear old state before loading the new profile.
        activePlayerId = sel.value;
        localStorage.setItem('masterflow_current_player_id', activePlayerId);
        window.state = createBlankProfile();
        window.renderAllEngineSectors();
        establishLiveSyncStream();
    }
};

// Register form and button handlers after all required controls exist in the document.
document.addEventListener('DOMContentLoaded', () => {
    // Create quests from the quest form and save them through the shared persistence path.
    const qForm = document.getElementById('quest-form');
    if(qForm) {
        qForm.addEventListener('submit', function(e) {
            // Read the quest fields and normalize optional values before storing them.
            e.preventDefault();
            const name = document.getElementById('quest-name').value;
            const date = document.getElementById('quest-date').value;
            const time = document.getElementById('quest-time').value || ''; 
            const notes = document.getElementById('quest-notes').value || ''; 
            const category = document.getElementById('quest-category').value;
            const difficulty = document.getElementById('quest-difficulty').value;

            // Add the quest, clear the form, and persist the changed profile.
            window.state.quests.push({ name, date, time, notes, category, difficulty, expanded: false });
            this.reset();
            window.saveState();
        });
    }

    // Deduct submitted spending from its envelope and record a negative wallet journal entry.
    const tForm = document.getElementById('trans-form');
    if(tForm) {
        tForm.addEventListener('submit', function(e) { 
            // Read and normalize spending form values before applying a deduction.
            e.preventDefault(); 
            const idx = parseInt(document.getElementById('trans-envelope').value); 
            const amount = parseFloat(document.getElementById('trans-amount').value) || 0; 
            const memo = document.getElementById('trans-memo').value.trim() || "Uncategorized Spend";
            
            if (!isNaN(idx) && window.state.envelopes && window.state.envelopes[idx]) {
                // Deduct from the selected envelope and ensure the shared ledger exists.
                const env = window.state.envelopes[idx];
                env.balance = parseFloat(env.balance) - amount; 
                if(!window.state.journalLog) window.state.journalLog = [];
                
                // Record spending as a negative wallet entry for history and summary totals.
                window.state.journalLog.unshift({
                    date: new Date().toLocaleDateString(),
                    category: `📬 Wallet (${env.name})`,
                    name: memo,
                    notes: `-$${amount.toFixed(2)}`
                });

                // Clear the completed form and persist the updated wallet.
                this.reset(); 
                window.saveState(); 
            }
        });
    }

    // Create an envelope only when both its name and starting balance are valid.
    const addEnvelopeButton = document.getElementById('btn-add-envelope');
    if (addEnvelopeButton) {
        addEnvelopeButton.addEventListener('click', () => {
            const nameInput = document.getElementById('new-envelope-name');
            const balanceInput = document.getElementById('new-envelope-balance');
            const name = nameInput.value.trim();
            const balance = balanceInput.value;

            // Keep incomplete input available so the user can correct it.
            if (!name || balance === '' || Number.isNaN(parseFloat(balance))) return;

            // Add, persist, re-render, and clear the completed envelope form.
            window.state.envelopes.push({ id: Date.now().toString(), name, balance: parseFloat(balance) });
            window.saveState();
            nameInput.value = '';
            balanceInput.value = '';
        });
    }

    // Save a custom hero name and refresh all profile-driven UI.
    const saveHeroNameButton = document.getElementById('btn-save-hero-name');
    if (saveHeroNameButton) {
        saveHeroNameButton.addEventListener('click', () => {
            const heroNameInput = document.getElementById('hero-name-input');
            window.state.heroName = heroNameInput.value.trim();
            window.saveState();
        });
    }

    // Populate the hero name control from profile data available during initial load.
    const heroNameInput = document.getElementById('hero-name-input');
    if (heroNameInput && window.state.heroName) heroNameInput.value = window.state.heroName;
});

// Attach mouse and touch gestures for deliberate hold-to-complete behavior.
function attachQuestTouchEvents(cardElement, idx) {
  // Start the one-second completion timer and its visual progress indicator.
  function pressStart(e) {
    if (activeCard) return; 
    if (e.target.closest(`.quest-details-pane`)) return;
    activeCard = cardElement;
    const progressBar = cardElement.querySelector('.hold-progress-bar');
    if (progressBar) {
      progressBar.style.transition = "width 1s linear"; 
      progressBar.style.width = "100%";
    }
    holdTimer = setTimeout(() => { triggerQuestSuccess(cardElement, idx); }, 1000); 
  }
  // Cancel an unfinished hold and reset its progress indicator.
  function pressCancel() {
    if (activeCard !== cardElement) return;
    clearTimeout(holdTimer);
    const progressBar = cardElement.querySelector('.hold-progress-bar');
    if (progressBar) {
      progressBar.style.transition = "width 0.15s ease-out"; 
      progressBar.style.width = "0%";
    }
    activeCard = null;
  }
  // Register equivalent desktop and touch interactions.
  cardElement.addEventListener('mousedown', pressStart);
  cardElement.addEventListener('mouseup', pressCancel);
  cardElement.addEventListener('mouseleave', pressCancel);
  cardElement.addEventListener('touchstart', pressStart, { passive: true });
  cardElement.addEventListener('touchend', pressCancel);
}

// Play the success animation before awarding rewards and removing the quest.
function triggerQuestSuccess(card, idx) {
  clearTimeout(holdTimer);
  card.classList.add('completed-burst');
  setTimeout(() => {
    activeCard = null;
    window.completeQuest(idx);
  }, 400);
}

// Render every profile-driven section from the latest in-memory state.
window.renderAllEngineSectors = function() {
    // Keep settings controls aligned with the current profile.
    const classSelect = document.getElementById('hero-class-select');
    if (classSelect && window.state.selectedClass) { 
        classSelect.value = window.state.selectedClass; 
    }
    const heroNameInput = document.getElementById('hero-name-input');
    if (heroNameInput && document.activeElement !== heroNameInput) heroNameInput.value = window.state.heroName || '';

    // Calculate character progression and class-specific display metrics.
    const currentXp = window.state.xp || 0;
    const currentLevel = Math.floor(currentXp / 100) + 1;
    const levelXpRemainder = currentXp % 100;
    
    const selectedClass = window.state.selectedClass || 'warrior';
    const classMetrics = dynamicClassMatrix[selectedClass] || dynamicClassMatrix.warrior;
    const heroCustomName = window.state.heroName || (activePlayerId.charAt(0).toUpperCase() + activePlayerId.slice(1));

    // Update the character title, level, experience bar, and visible stats.
    const titleEl = document.getElementById('render-hero-title');
    if(titleEl) titleEl.textContent = `${classMetrics.title} (${heroCustomName})`;
    
    const lvlEl = document.getElementById('render-hero-level');
    if(lvlEl) lvlEl.textContent = `LVL ${currentLevel}`;
    
    const barEl = document.getElementById('render-xp-bar');
    if(barEl) barEl.style.width = `${levelXpRemainder}%`;
    
    const txtEl = document.getElementById('render-xp-text');
    if(txtEl) txtEl.textContent = `${levelXpRemainder} / 100 XP`;

    const hpEl = document.getElementById('stat-hp'); if(hpEl) hpEl.textContent = classMetrics.hp + (currentLevel * 5);
    const mpEl = document.getElementById('stat-mp'); if(mpEl) mpEl.textContent = classMetrics.mp + (currentLevel * 3);
    const atkEl = document.getElementById('stat-atk'); if(atkEl) atkEl.textContent = classMetrics.atk + currentLevel;
    const defEl = document.getElementById('stat-def'); if(defEl) defEl.textContent = classMetrics.def + currentLevel;

    // Show the combined envelope balance and earned gold in the header.
    let walletTotal = 0;
    if(window.state.envelopes) {
        window.state.envelopes.forEach(e => walletTotal += parseFloat(e.balance || 0));
    }
    document.getElementById('top-wallet').textContent = `💰 $${walletTotal.toFixed(2)}`;
    document.getElementById('top-gold').textContent = `🪙 ${window.state.gold || 0} Gold`;

    // Rebuild the spending form's envelope options from current budget data.
    const qEnvSelect = document.getElementById('trans-envelope');
    if(qEnvSelect) {
        qEnvSelect.innerHTML = '';
        if(window.state.envelopes) {
            window.state.envelopes.forEach((e, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = `${e.name} ($${parseFloat(e.balance).toFixed(2)})`;
                qEnvSelect.appendChild(opt);
            });
        }
    }

    // Render each envelope with an expandable transaction history.
    const envStack = document.getElementById('envelopes-stack');
    if(envStack) {
        envStack.innerHTML = '';
        if(window.state.envelopes) {
            window.state.envelopes.forEach((e, idx) => {
                if (e.expanded === undefined) e.expanded = false;
                const envelopeLogs = (window.state.journalLog || []).filter(l => l.category.includes(`Wallet (${e.name})`));
                let historyHtml = envelopeLogs.map(l => `
                    <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
                        <span style="color:var(--text-main);">${l.name}</span>
                        <span style="color:var(--danger); font-weight:bold;">${l.notes}</span>
                    </div>
                `).join('');
                if (envelopeLogs.length === 0) {
                    historyHtml = `<p style="margin:0; color:var(--text-dim); font-style:italic;">No transactions logged yet.</p>`;
                }

                const div = document.createElement('div');
                div.className = 'master-card pool-envelope';
                div.innerHTML = `
                    <div class="master-card-content" style="display:flex; flex-direction:column; background:var(--navy); padding:12px; margin-bottom:8px; border-radius:6px; border:1px solid var(--border); cursor:pointer;" onclick="window.toggleEnvelopeDetails(${idx})">
                        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                            <div><strong style="color:var(--purple); font-size:1.05rem;">${e.name}</strong></div>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <span class="card-balance" style="font-weight:bold;">$${parseFloat(e.balance).toFixed(2)}</span>
                                <button class="delete-btn" style="background:transparent; border:none; cursor:pointer;" onclick="event.stopPropagation(); window.deleteEnvelope(${idx})">🗑️</button>
                            </div>
                        </div>
                        <div class="envelope-details-pane" style="display: ${e.expanded ? 'block' : 'none'}; width:100%; margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.08); font-size:0.85rem;">
                            <h4 style="margin:0 0 8px 0; color:var(--purple); text-transform:uppercase; font-size:0.75rem;">Transaction History</h4>
                            <div style="max-height:150px; overflow-y:auto;">${historyHtml}</div>
                        </div>
                    </div>
                `;
                envStack.appendChild(div);
            });
        }
    }

    // Render quest cards with tier styling, dates, and hold-to-complete behavior.
    const board = document.getElementById('quests-board');
    if(board) {
        board.innerHTML = '';
        if(window.state.quests) {
            window.state.quests.forEach((q, idx) => {
                const item = document.createElement('div');
                const safeDifficulty = q.difficulty || 'common';
                const today = getLocalDateKey();
                const isOverdue = Boolean(q.date && q.date < today);
                item.className = `master-card tier-${safeDifficulty}${isOverdue ? ' overdue' : ''}`;
                item.style.marginBottom = '10px';
                const timeDisplay = q.time ? ` ⏰ ${q.time}` : '';
                const timeBadge = `<span class="time-badge">📅 ${q.date}${timeDisplay}</span>`;

                item.innerHTML = `
                    <div class="hold-progress-bar"></div>
                    <div class="master-card-content" style="flex-direction: column; align-items: flex-start; background:var(--card-bg); padding:12px; border-radius:8px; border:1px solid var(--border); position:relative; overflow:hidden;">
                        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;" onclick="window.toggleQuestDetails(${idx})">
                            <span class="tier-tag ${safeDifficulty}" style="font-size:0.7rem; font-weight:bold; text-transform:uppercase;">${safeDifficulty}</span>
                            <span style="font-size:1rem;">${(q.category || '🎯').split(' ')[0]}</span>
                        </div>
                        <h3 style="margin:8px 0 4px 0; font-size:1.1rem; color:var(--text-main);">${q.name || 'Unnamed Quest'}</h3>
                        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-top:8px;">
                            <span>${timeBadge}${isOverdue ? '<span class="overdue-badge">⚠️ OVERDUE</span>' : ''}</span>
                            <span style="font-size:0.8rem; color:var(--gold); font-weight:bold;">HOLD CARD TO CLAIM ⚔️</span>
                        </div>
                        <div class="quest-details-pane" id="quest-details-${idx}" style="display: ${q.expanded ? 'block' : 'none'}; width:100%; margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.05); font-size:0.85rem; color:var(--text-dim);">
                            <p style="margin:0 0 8px 0; line-height:1.4; white-space:pre-wrap;"><strong>Details:</strong> ${q.notes || 'No description provided.'}</p>
                            <button class="btn-submit" style="background:var(--danger); color:white; border:none; padding:6px; font-size:0.75rem; border-radius:4px; cursor:pointer;" onclick="event.stopPropagation(); window.deleteQuest(${idx})">Abandon Quest</button>
                        </div>
                    </div>
                `;
                attachQuestTouchEvents(item, idx);
                board.appendChild(item);
            });
        }
    }

    // Rebuild the shared ledger from quest completions and wallet spending.
    const tbody = document.getElementById('journal-table-body');
    if(tbody) {
        tbody.innerHTML = '';
        if(window.state.journalLog) {
            window.state.journalLog.forEach(l => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = "1px solid var(--border)";
                tr.innerHTML = `<td style="padding:8px;">${l.date}</td><td style="padding:8px;">${l.category}</td><td style="padding:8px;">${l.name}</td><td style="padding:8px; font-weight:bold; color:${l.notes.includes('-') ? 'var(--danger)' : 'var(--success)'}">${l.notes}</td>`;
                tbody.appendChild(tr);
            });
        }
    }

    // Recalculate financial totals after all profile data has rendered.
    updateFinancialSummary();
};

// Toggle a quest's details without changing its core quest data.
window.toggleQuestDetails = function(idx) {
    if(window.state.quests[idx]) {
        window.state.quests[idx].expanded = !window.state.quests[idx].expanded;
        window.renderAllEngineSectors();
    }
};

// Toggle an envelope's transaction history without changing its budget.
window.toggleEnvelopeDetails = function(idx) {
    if(window.state.envelopes[idx]) {
        window.state.envelopes[idx].expanded = !window.state.envelopes[idx].expanded;
        window.renderAllEngineSectors();
    }
};

// Apply class-adjusted rewards, journal the result, and remove a completed quest.
window.completeQuest = function(idx) {
    const q = window.state.quests[idx];
    const diff = q.difficulty || 'common';
    let xpReward = diff === 'epic' ? 120 : (diff === 'rare' ? 60 : 25);
    let goldReward = diff === 'epic' ? 50 : (diff === 'rare' ? 25 : 10);
    
    // Apply each class's reward specialty before adding the final totals.
    const heroClass = window.state.selectedClass || 'warrior';
    if (heroClass === 'mage') xpReward = Math.floor(xpReward * 1.25);    
    else if (heroClass === 'rogue') goldReward = Math.floor(goldReward * 1.30); 
    else if (heroClass === 'warrior') {
        xpReward = Math.floor(xpReward * 1.10);    
        goldReward = Math.floor(goldReward * 1.10);
    }
    
    // Add rewards to the profile and record the completed quest in the ledger.
    window.state.xp = (window.state.xp || 0) + xpReward;
    window.state.gold = (window.state.gold || 0) + goldReward;
    
    if(!window.state.journalLog) window.state.journalLog = [];
    window.state.journalLog.unshift({ date: new Date().toLocaleDateString(), category: q.category, name: q.name, notes: `+${xpReward}XP / +${goldReward}🪙` });
    window.state.quests.splice(idx, 1); 
    window.saveState();
};

// Remove selected records and persist the updated profile.
window.deleteQuest = function(idx) { window.state.quests.splice(idx, 1); window.saveState(); };
window.deleteEnvelope = function(idx) { window.state.envelopes.splice(idx, 1); window.saveState(); };

// Show the requested tab and mark its navigation button active.
window.switchTab = function(tabId) { 
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); 
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); 
    const target = document.getElementById(tabId); 
    if(target) target.classList.add('active'); 
    const clickedBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabId));
    if(clickedBtn) clickedBtn.classList.add('active');
};

// Reset only the current profile after explicit confirmation.
window.wipeEntireEngine = function() { if(confirm("Wipe this specific profile's records?")) { window.state = createBlankProfile(); window.saveState(); } };

// Calculate current allocated balances and all negative wallet journal spending.
function updateFinancialSummary() { 
    let allocated = 0; 
    if(window.state.envelopes) { 
        window.state.envelopes.forEach(e => allocated += parseFloat(e.balance || 0)); 
    } 
    // Parse negative wallet notes and add their absolute values to the spent total.
    const spent = (window.state.journalLog || []).reduce((total, entry) => {
        if (!entry.category?.includes('Wallet') || !entry.notes?.trim().startsWith('-')) return total;
        const amount = parseFloat(entry.notes.replace(/[^0-9.-]/g, ''));
        return Number.isNaN(amount) ? total : total + Math.abs(amount);
    }, 0);

    // Write formatted totals into their summary cards.
    const allocEl = document.getElementById('sum-allocated');
    if(allocEl) allocEl.innerHTML = `$${allocated.toFixed(2)}`;
    const remainingEl = document.getElementById('sum-remaining');
    if(remainingEl) {
        remainingEl.innerHTML = `$${spent.toFixed(2)}`;
        remainingEl.style.color = "var(--danger)";
    }
}

// Begin loading and synchronizing the last active profile.
establishLiveSyncStream();
