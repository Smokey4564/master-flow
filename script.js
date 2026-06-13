import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDD4FGcNxHJT7wDh3hPMqudUYzEmDz8lbw",
  authDomain: "master-flow-d9d4b.firebaseapp.com",
  projectId: "master-flow-d9d4b",
  storageBucket: "master-flow-d9d4b.firebasestorage.app",
  messagingSenderId: "716546159295",
  appId: "1:716546159295:web:ae13d55413b31debd2cc0a",
  measurementId: "G-YHC9KZNQ2N"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

window.state = createBlankProfile();
let activePlayerId = localStorage.getItem('masterflow_current_player_id') || 'angel';
let currentWalletMode = 'spend'; // State management variable tracking spend vs deposit

const dynamicClassMatrix = {
    warrior: { hp: 120, mp: 30, atk: 18, def: 15, title: "🛡️ Guardian Knight" },
    mage: { hp: 70, mp: 120, atk: 25, def: 6, title: "🔮 Grand Archmage" },
    rogue: { hp: 90, mp: 50, atk: 16, def: 9, title: "⚡ Shadow Assassin" }
};

let holdTimer;
let activeCard = null;
let activeSubListener = null;

window.saveState = async function() {
    localStorage.setItem(`masterflow_cache_${activePlayerId}`, JSON.stringify(window.state));
    window.renderAllEngineSectors();
    
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

function establishLiveSyncStream() {
    const statusEl = document.getElementById('cloud-status');
    if (activeSubListener) activeSubListener(); 

    const cached = localStorage.getItem(`masterflow_cache_${activePlayerId}`);
    if(cached) {
        try {
            window.state = { ...createBlankProfile(), ...JSON.parse(cached) };
            window.renderAllEngineSectors();
            if(statusEl) statusEl.textContent = "✅ Running on Cache";
        } catch(e) { 
            console.error("Cache read fail:", e); 
        }
    }

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

window.updateCharacterClass = function() {
    const classSelect = document.getElementById('hero-class-select');
    if (classSelect) {
        window.state.selectedClass = classSelect.value;
        window.saveState();
    }
};

window.switchPlayerProfile = function() {
    const sel = document.getElementById('global-player-select');
    if(sel) {
        activePlayerId = sel.value;
        localStorage.setItem('masterflow_current_player_id', activePlayerId);
        window.state = createBlankProfile();
        window.renderAllEngineSectors();
        establishLiveSyncStream();
    }
};

// WALLET SYSTEM TOGGLES
window.setWalletMode = function(mode) {
    currentWalletMode = mode;
    const btn = document.getElementById('trans-submit-btn');
    const toggleSpend = document.getElementById('toggle-spend');
    const toggleDeposit = document.getElementById('toggle-deposit');

    if(mode === 'spend') {
        toggleSpend.classList.add('active');
        toggleDeposit.classList.remove('active');
        if(btn) {
            btn.textContent = "Process Deduction";
            btn.style.background = "var(--danger)";
        }
    } else {
        toggleDeposit.classList.add('active');
        toggleSpend.classList.remove('active');
        if(btn) {
            btn.textContent = "Inject Deposits/Funds";
            btn.style.background = "var(--success)";
        }
    }
};

// TRANSACTION & EVENT WIREFRAMES
document.addEventListener('DOMContentLoaded', () => {
    const qForm = document.getElementById('quest-form');
    if(qForm) {
        qForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('quest-name').value;
            const date = document.getElementById('quest-date').value;
            const time = document.getElementById('quest-time').value || ''; 
            const notes = document.getElementById('quest-notes').value || ''; 
            const category = document.getElementById('quest-category').value;
            const difficulty = document.getElementById('quest-difficulty').value;

            window.state.quests.push({ name, date, time, notes, category, difficulty, expanded: false });
            this.reset();
            window.saveState();
        });
    }

    const tForm = document.getElementById('trans-form');
    if(tForm) {
        tForm.addEventListener('submit', function(e) { 
            e.preventDefault(); 
            const idx = parseInt(document.getElementById('trans-envelope').value); 
            const amount = parseFloat(document.getElementById('trans-amount').value) || 0; 
            const memo = document.getElementById('trans-memo').value.trim() || "Uncategorized Item";
            
            if (!isNaN(idx) && window.state.envelopes && window.state.envelopes[idx]) {
                const env = window.state.envelopes[idx];
                
                if(!window.state.journalLog) window.state.journalLog = [];
                
                if (currentWalletMode === 'spend') {
                    env.balance = parseFloat(env.balance) - amount;
                    window.state.journalLog.unshift({
                        date: new Date().toLocaleDateString(),
                        category: `📬 Wallet (${env.name})`,
                        name: memo,
                        notes: `-$${amount.toFixed(2)}`
                    });
                } else {
                    env.balance = parseFloat(env.balance) + amount;
                    window.state.journalLog.unshift({
                        date: new Date().toLocaleDateString(),
                        category: `📬 Wallet (${env.name})`,
                        name: memo,
                        notes: `+$${amount.toFixed(2)}`
                    });
                }

                this.reset(); 
                window.saveState(); 
            }
        });
    }

    // ESLAM'S ENVELOPE CREATION CAPTURE LISTENER
    const btnAddEnv = document.getElementById('btn-add-envelope');
    if(btnAddEnv) {
        btnAddEnv.addEventListener('click', () => {
            const nameInput = document.getElementById('new-envelope-name');
            const balInput = document.getElementById('new-envelope-balance');
            const name = nameInput.value.trim();
            const bal = parseFloat(balInput.value) || 0;

            if(name) {
                if(!window.state.envelopes) window.state.envelopes = [];
                window.state.envelopes.push({ name, balance: bal, expanded: false });
                nameInput.value = '';
                balInput.value = '';
                window.saveState();
            }
        });
    }

    // ESLAM'S HERO NAME SAVE CAPTURE LISTENER
    const btnSaveHero = document.getElementById('btn-save-hero-name');
    if(btnSaveHero) {
        btnSaveHero.addEventListener('click', () => {
            const nameInput = document.getElementById('hero-name-input');
            if(nameInput) {
                window.state.heroName = nameInput.value.trim();
                window.saveState();
            }
        });
    }
});

function attachQuestTouchEvents(cardElement, idx) {
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
  cardElement.addEventListener('mousedown', pressStart);
  cardElement.addEventListener('mouseup', pressCancel);
  cardElement.addEventListener('mouseleave', pressCancel);
  cardElement.addEventListener('touchstart', pressStart, { passive: true });
  cardElement.addEventListener('touchend', pressCancel);
}

function triggerQuestSuccess(card, idx) {
  clearTimeout(holdTimer);
  card.classList.add('completed-burst');
  setTimeout(() => {
    activeCard = null;
    window.completeQuest(idx);
  }, 400);
}

window.renderAllEngineSectors = function() {
    const classSelect = document.getElementById('hero-class-select');
    if (classSelect && window.state.selectedClass) { 
        classSelect.value = window.state.selectedClass; 
    }
    
    // Sync text input back up with data values
    const heroInput = document.getElementById('hero-name-input');
    if(heroInput && window.state.heroName) {
        heroInput.placeholder = window.state.heroName;
    }

    const currentXp = window.state.xp || 0;
    const currentLevel = Math.floor(currentXp / 100) + 1;
    const levelXpRemainder = currentXp % 100;
    
    const selectedClass = window.state.selectedClass || 'warrior';
    const classMetrics = dynamicClassMatrix[selectedClass] || dynamicClassMatrix.warrior;
    const heroCustomName = window.state.heroName || (activePlayerId.charAt(0).toUpperCase() + activePlayerId.slice(1));

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

    let walletTotal = 0;
    if(window.state.envelopes) {
        window.state.envelopes.forEach(e => walletTotal += parseFloat(e.balance || 0));
    }
    document.getElementById('top-wallet').textContent = `💰 $${walletTotal.toFixed(2)}`;
    document.getElementById('top-gold').textContent = `🪙 ${window.state.gold || 0} Gold`;

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
                        <span style="color:${l.notes.includes('-') ? 'var(--danger)' : 'var(--success)'}; font-weight:bold;">${l.notes}</span>
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

    const board = document.getElementById('quests-board');
    if(board) {
        board.innerHTML = '';
        if(window.state.quests) {
            window.state.quests.forEach((q, idx) => {
                const item = document.createElement('div');
                const safeDifficulty = q.difficulty || 'common';
                
                // ESLAM'S DYNAMIC OVERDUE DATE EVALUATOR CACHE PIPELINE
                let isOverdue = false;
                if(q.date) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    if(q.date < todayStr) isOverdue = true;
                }
                
                item.className = `master-card tier-${safeDifficulty} ${isOverdue ? 'overdue' : ''}`;
                item.style.marginBottom = '10px';
                const timeDisplay = q.time ? ` ⏰ ${q.time}` : '';
                const overdueTag = isOverdue ? `<span class="overdue-badge">⚠️ OVERDUE</span>` : '';
                const timeBadge = `<span class="time-badge">📅 ${q.date}${timeDisplay}</span>${overdueTag}`;

                item.innerHTML = `
                    <div class="hold-progress-bar"></div>
                    <div class="master-card-content" style="flex-direction: column; align-items: flex-start; background:var(--card-bg); padding:12px; border-radius:8px; border:1px solid var(--border); position:relative; overflow:hidden;">
                        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;" onclick="window.toggleQuestDetails(${idx})">
                            <span class="tier-tag ${safeDifficulty}" style="font-size:0.7rem; font-weight:bold; text-transform:uppercase;">${safeDifficulty}</span>
                            <span style="font-size:1rem;">${(q.category || '🎯').split(' ')[0]}</span>
                        </div>
                        <h3 style="margin:8px 0 4px 0; font-size:1.1rem; color:var(--text-main);">${q.name || 'Unnamed Quest'}</h3>
                        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-top:8px;">
                            ${timeBadge}
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

    // 📊 REORGANIZED SEPARATE TABLES REDIRECT PIPELINE
    const walletBody = document.getElementById('wallet-ledger-body');
    const questBody = document.getElementById('quest-chronicle-body');
    
    if(walletBody) walletBody.innerHTML = '';
    if(questBody) questBody.innerHTML = '';

    if(window.state.journalLog) {
        window.state.journalLog.forEach(l => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid var(--border)";

            if(l.category.includes('📬 Wallet')) {
                // Route directly to Wallet Table
                tr.innerHTML = `
                    <td style="padding:8px;">${l.date}</td>
                    <td style="padding:8px; color:var(--purple); font-weight:bold;">${l.category.replace('📬 Wallet ', '')}</td>
                    <td style="padding:8px;">${l.name}</td>
                    <td style="padding:8px; font-weight:bold; color:${l.notes.includes('-') ? 'var(--danger)' : 'var(--success)'}">${l.notes}</td>
                `;
                if(walletBody) walletBody.appendChild(tr);
            } else {
                // Route directly to Quest Chronicle Table
                tr.innerHTML = `
                    <td style="padding:8px;">${l.date}</td>
                    <td style="padding:8px; color:var(--gold); font-weight:bold;">${l.category}</td>
                    <td style="padding:8px;">${l.name}</td>
                    <td style="padding:8px; color:var(--success); font-weight:bold;">${l.notes}</td>
                `;
                if(questBody) questBody.appendChild(tr);
            }
        });
    }

    updateFinancialSummary();
};

window.toggleQuestDetails = function(idx) {
    if(window.state.quests[idx]) {
        window.state.quests[idx].expanded = !window.state.quests[idx].expanded;
        window.renderAllEngineSectors();
    }
};

window.toggleEnvelopeDetails = function(idx) {
    if(window.state.envelopes[idx]) {
        window.state.envelopes[idx].expanded = !window.state.envelopes[idx].expanded;
        window.renderAllEngineSectors();
    }
};

window.completeQuest = function(idx) {
    const q = window.state.quests[idx];
    const diff = q.difficulty || 'common';
    let xpReward = diff === 'epic' ? 120 : (diff === 'rare' ? 60 : 25);
    let goldReward = diff === 'epic' ? 50 : (diff === 'rare' ? 25 : 10);
    
    const heroClass = window.state.selectedClass || 'warrior';
    if (heroClass === 'mage') xpReward = Math.floor(xpReward * 1.25);    
    else if (heroClass === 'rogue') goldReward = Math.floor(goldReward * 1.30); 
    else if (heroClass === 'warrior') {
        xpReward = Math.floor(xpReward * 1.10);    
        goldReward = Math.floor(goldReward * 1.10);
    }
    
    window.state.xp = (window.state.xp || 0) + xpReward;
    window.state.gold = (window.state.gold || 0) + goldReward;
    
    if(!window.state.journalLog) window.state.journalLog = [];
    window.state.journalLog.unshift({ date: new Date().toLocaleDateString(), category: q.category, name: q.name, notes: `+${xpReward}XP / +${goldReward}🪙` });
    window.state.quests.splice(idx, 1); 
    window.saveState();
};

window.deleteQuest = function(idx) { window.state.quests.splice(idx, 1); window.saveState(); };
window.deleteEnvelope = function(idx) { window.state.envelopes.splice(idx, 1); window.saveState(); };

window.switchTab = function(tabId) { 
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); 
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); 
    const target = document.getElementById(tabId); 
    if(target) target.classList.add('active'); 
    const clickedBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabId));
    if(clickedBtn) clickedBtn.classList.add('active');
};

window.wipeEntireEngine = function() { if(confirm("Wipe this specific profile's records?")) { window.state = createBlankProfile(); window.saveState(); } };

function updateFinancialSummary() { 
    let allocated = 0; 
    if(window.state.envelopes) { 
        window.state.envelopes.forEach(e => allocated += parseFloat(e.balance || 0)); 
    } 
    
    // Scan journal logs to calculate an absolute spent tally
    let totalSpentCalculated = 0;
    if(window.state.journalLog) {
        window.state.journalLog.forEach(l => {
            if(l.notes.includes('-$')) {
                const numericalVal = parseFloat(l.notes.replace('-$', ''));
                totalSpentCalculated += numericalVal;
            }
        });
    }

    const allocEl = document.getElementById('sum-allocated');
    if(allocEl) allocEl.textContent = `$${allocated.toFixed(2)}`; 
    
    const spentEl = document.getElementById('sum-spent');
    if(spentEl) spentEl.textContent = `$${totalSpentCalculated.toFixed(2)}`;
}

establishLiveSyncStream();
