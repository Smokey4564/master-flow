<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Master Flow v4.3.2</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

<div class="container">
    <header>
        <div>
            <h1 style="margin:0; font-size: 1.4rem;">Master Flow <span style="font-size:0.8rem; color:var(--purple); font-weight:normal;">v4.3.2</span></h1>
            <div id="cloud-status" style="font-size:0.7rem; color:var(--text-dim); margin-top:2px;">Engine Standby...</div>
        </div>
        <div class="rpg-badge-bar">
            <span id="top-wallet">💰 $0.00</span>
            <span style="opacity:0.2; padding:0 2px;">|</span>
            <span id="top-gold">🪙 0 Gold</span>
        </div>
    </header>

    <div class="nav-bar">
        <button class="tab-btn active" onclick="window.switchTab('quests')">⚔️ Quests</button>
        <button class="tab-btn" onclick="window.switchTab('wallet')">📬 Wallet</button>
        <button class="tab-btn" onclick="window.switchTab('summary')">📊 Summary</button>
        <button class="tab-btn" onclick="window.switchTab('manage')">⚙️ Settings</button>
    </div>

    <div class="panel" style="padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; background: var(--navy);">
        <label for="global-player-select" style="font-size: 0.85rem; color: var(--text-dim); font-weight: bold;">Active Profile Focus:</label>
        <select id="global-player-select" onchange="window.changePlayer(this.value)" style="background: var(--card-bg); color: white; border: 1px solid var(--border); padding: 6px 12px; border-radius: 6px; font-weight: bold;">
            <option value="angel">Angel Anthony</option>
            <option value="brianna">Brianna</option>
        </select>
    </div>

    <div id="quests" class="page active">
        <div class="panel">
            <h2>⚔️ Dynamic Quest Board</h2>
            <div id="quests-list-container">
                <p style="color:var(--text-dim); text-align:center;">No active quest objectives currently on your board.</p>
            </div>
        </div>
    </div>

    <div id="wallet" class="page">
        <div class="panel">
            <h2>📬 Budget Cash Envelopes</h2>
            <div id="envelopes-list-container">
                <p style="color:var(--text-dim); text-align:center;">No active budget storage vectors found.</p>
            </div>
        </div>
    </div>

    <div id="summary" class="page">
        <div class="panel">
            <h2>📊 Real-time Financial Audit</h2>
            <div class="summary-grid">
                <div class="summary-box">
                    <h4>Total Allocated</h4>
                    <p id="sum-allocated" style="color:var(--primary);">$0.00</p>
                </div>
                <div class="summary-box">
                    <h4>Total Safe Balance</h4>
                    <p id="sum-remaining" style="color:var(--success);">$0.00</p>
                </div>
            </div>
        </div>

        <div class="panel">
            <h2>📜 Historical Ledger Log</h2>
            <div class="journal-table-wrapper">
                <table class="journal-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Objective</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody id=\"journal-table-body\">
                        </tbody>
                </table>
            </div>
        </div>
    </div>

    <div id="manage" class="page">
        <div class="panel">
            <h2>Global Engine Diagnostics</h2>
            <div style="margin-bottom:15px;">
                <label for="hero-name-input" style="display:block; margin-bottom:6px; font-size:0.8rem; color:var(--text-dim); font-weight:bold;">Identity Profile Moniker</label>
                <input type="text" id="hero-name-input" placeholder="Set identity nickname..." style="width:100%; padding:10px; margin-bottom:10px; background:#27272a; color:white; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;">
                <button id="btn-save-hero-name" type="button" class="btn-submit">Update Identity Name</button>
            </div>
            <button class="btn-submit" style="background:var(--danger);" onclick="window.wipeEntireEngine()">Wipe Current Profile (Reset)</button>
        </div>
    </div>
</div>

<script type="module" src="script.js"></script>
</body>
</html>
