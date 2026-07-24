/* ============================================================
   SpamShield — Frontend Logic
   ============================================================ */

const API = '';  // same origin

// ── Tab Navigation ────────────────────────────────────────────
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Deactivate all
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

        // Activate clicked
        tab.classList.add('active');
        const sectionId = 'section' + capitalize(tab.dataset.tab);
        document.getElementById(sectionId).classList.add('active');

        // Refresh data on tab switch
        if (tab.dataset.tab === 'history') loadHistory();
        if (tab.dataset.tab === 'dashboard') loadDashboard();
    });
});

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Toast Notifications ──────────────────────────────────────
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ══════════════════════════════════════════════════════════════
// SECTION 1: Single Email Analysis
// ══════════════════════════════════════════════════════════════

async function analyzeSingle() {
    const input = document.getElementById('emailInput');
    const message = input.value.trim();
    if (!message) {
        showToast('Please enter an email message to analyze.', 'error');
        return;
    }

    const btn = document.getElementById('analyzeBtn');
    const spinner = document.getElementById('analyzeSpinner');
    btn.disabled = true;
    spinner.classList.add('visible');

    try {
        const res = await fetch(`${API}/api/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Prediction failed');
        }

        const data = await res.json();
        displaySingleResult(data, message);
        showToast(`Classified as ${data.prediction.toUpperCase()}`, data.prediction === 'spam' ? 'error' : 'success');

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        spinner.classList.remove('visible');
    }
}

function displaySingleResult(data, originalMessage) {
    const container = document.getElementById('singleResult');
    const isSpam = data.prediction === 'spam';
    const pct = (data.confidence * 100).toFixed(1);

    container.innerHTML = `
        <div class="result">
            <div class="result__badge result__badge--${isSpam ? 'spam' : 'ham'}">
                <span class="result__badge-icon">${isSpam ? '⚠️' : '✅'}</span>
                ${isSpam ? 'SPAM DETECTED' : 'SAFE MESSAGE'}
            </div>
            <div class="result__details">
                <div class="result__detail">
                    <div class="result__detail-label">Confidence</div>
                    <div class="result__detail-value">${pct}%</div>
                    <div class="confidence-bar">
                        <div class="confidence-bar__fill" style="width: 0%;"></div>
                    </div>
                </div>
                <div class="result__detail">
                    <div class="result__detail-label">Classification</div>
                    <div class="result__detail-value">${isSpam ? '🚫 Spam / Scam / Phishing' : '✉️ Legitimate Email'}</div>
                </div>
                <div class="result__detail" style="grid-column: 1 / -1;">
                    <div class="result__detail-label">Processed Text (after NLP cleaning)</div>
                    <div class="result__detail-value" style="font-size: 0.88rem; color: var(--text-secondary); word-break: break-word;">
                        ${escapeHtml(data.cleaned_text) || '<em style="opacity:0.5;">— empty after cleaning —</em>'}
                    </div>
                </div>
            </div>
        </div>
    `;

    container.style.display = 'block';

    // Animate confidence bar
    requestAnimationFrame(() => {
        setTimeout(() => {
            container.querySelector('.confidence-bar__fill').style.width = pct + '%';
        }, 50);
    });
}

function clearInput() {
    document.getElementById('emailInput').value = '';
    document.getElementById('singleResult').style.display = 'none';
}

function testExample(text) {
    document.getElementById('emailInput').value = text;
    analyzeSingle();
}

// ══════════════════════════════════════════════════════════════
// SECTION 2: Bulk CSV Upload
// ══════════════════════════════════════════════════════════════

const csvFileInput = document.getElementById('csvFileInput');
const uploadZone = document.getElementById('uploadZone');
let selectedFile = null;

csvFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        const nameEl = document.getElementById('uploadFilename');
        nameEl.textContent = `📄 ${selectedFile.name}`;
        nameEl.style.display = 'block';
        document.getElementById('bulkAnalyzeBtn').disabled = false;
    }
});

// Drag & drop styling
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
});
uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
});
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        selectedFile = e.dataTransfer.files[0];
        csvFileInput.files = e.dataTransfer.files;
        const nameEl = document.getElementById('uploadFilename');
        nameEl.textContent = `📄 ${selectedFile.name}`;
        nameEl.style.display = 'block';
        document.getElementById('bulkAnalyzeBtn').disabled = false;
    }
});

async function analyzeBulk() {
    if (!selectedFile) {
        showToast('Please select a CSV file first.', 'error');
        return;
    }

    const btn = document.getElementById('bulkAnalyzeBtn');
    const spinner = document.getElementById('bulkSpinner');
    btn.disabled = true;
    spinner.classList.add('visible');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        const res = await fetch(`${API}/api/predict/bulk`, {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Bulk prediction failed');
        }

        const data = await res.json();
        displayBulkResults(data);
        showToast(`Analyzed ${data.total} messages`, 'success');

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        spinner.classList.remove('visible');
    }
}

function displayBulkResults(data) {
    const container = document.getElementById('bulkResults');
    const spamCount = data.results.filter(r => r.prediction === 'spam').length;
    const hamCount = data.total - spamCount;

    let tableRows = data.results.map(r => `
        <tr>
            <td>${r.row}</td>
            <td title="${escapeHtml(r.original_message)}">${escapeHtml(r.original_message)}</td>
            <td><span class="badge badge--${r.prediction}">${r.prediction.toUpperCase()}</span></td>
            <td>${(r.confidence * 100).toFixed(1)}%</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div style="margin-top: 24px;">
            <div class="stats-grid" style="margin-bottom: 20px;">
                <div class="stat-card">
                    <div class="stat-card__label">Total Analyzed</div>
                    <div class="stat-card__value">${data.total}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card__label">Spam Found</div>
                    <div class="stat-card__value" style="background: linear-gradient(135deg, #ef4444, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${spamCount}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card__label">Safe Messages</div>
                    <div class="stat-card__value" style="background: linear-gradient(135deg, #22c55e, #00d9a6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${hamCount}</div>
                </div>
            </div>
            <div class="results-table-wrap">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Message</th>
                            <th>Result</th>
                            <th>Confidence</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
            <div style="margin-top: 16px; text-align: right;">
                <button class="btn btn--secondary btn--sm" onclick="downloadBulkCSV()">
                    📥 Download Results CSV
                </button>
            </div>
        </div>
    `;

    container.style.display = 'block';

    // Store results for download
    container._results = data.results;
}

function downloadBulkCSV() {
    const results = document.getElementById('bulkResults')._results;
    if (!results) return;

    let csv = 'Row,Message,Prediction,Confidence\n';
    results.forEach(r => {
        const msg = r.original_message.replace(/"/g, '""');
        csv += `${r.row},"${msg}",${r.prediction},${(r.confidence * 100).toFixed(1)}%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spam_detection_results.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV downloaded!', 'success');
}

// ══════════════════════════════════════════════════════════════
// SECTION 3: Prediction History
// ══════════════════════════════════════════════════════════════

async function loadHistory() {
    try {
        const res = await fetch(`${API}/api/history`);
        const data = await res.json();
        displayHistory(data);
    } catch (err) {
        showToast('Failed to load history.', 'error');
    }
}

function displayHistory(data) {
    const container = document.getElementById('historyContent');
    const countEl = document.getElementById('historyCount');
    countEl.textContent = `${data.total} prediction${data.total !== 1 ? 's' : ''}`;

    if (data.total === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-state__icon">📭</span>
                <p class="empty-state__text">No predictions yet. Analyze some emails to see them here!</p>
            </div>
        `;
        return;
    }

    const rows = data.history.map(h => `
        <tr>
            <td style="white-space: nowrap;">${h.timestamp}</td>
            <td title="${escapeHtml(h.original_message)}">${escapeHtml(h.original_message)}</td>
            <td><span class="badge badge--${h.prediction}">${h.prediction.toUpperCase()}</span></td>
            <td>${(h.confidence * 100).toFixed(1)}%</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="results-table-wrap">
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Message</th>
                        <th>Result</th>
                        <th>Confidence</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

async function clearHistory() {
    try {
        await fetch(`${API}/api/history`, { method: 'DELETE' });
        loadHistory();
        showToast('History cleared.', 'info');
    } catch (err) {
        showToast('Failed to clear history.', 'error');
    }
}

// ══════════════════════════════════════════════════════════════
// SECTION 4: Model Dashboard
// ══════════════════════════════════════════════════════════════

async function loadDashboard() {
    try {
        const res = await fetch(`${API}/api/stats`);
        const data = await res.json();
        renderDashboard(data);
    } catch (err) {
        showToast('Failed to load dashboard stats.', 'error');
    }
}

function renderDashboard(data) {
    // ── Stat cards (best model) ──
    const best = data.models[data.best_model] || {};
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-card__label">Accuracy</div>
            <div class="stat-card__value">${(best.accuracy * 100).toFixed(1)}%</div>
            <div class="stat-card__sub">${data.best_model}</div>
        </div>
        <div class="stat-card">
            <div class="stat-card__label">Precision</div>
            <div class="stat-card__value">${(best.precision * 100).toFixed(1)}%</div>
            <div class="stat-card__sub">Spam detection accuracy</div>
        </div>
        <div class="stat-card">
            <div class="stat-card__label">Recall</div>
            <div class="stat-card__value">${(best.recall * 100).toFixed(1)}%</div>
            <div class="stat-card__sub">Spam catch rate</div>
        </div>
        <div class="stat-card">
            <div class="stat-card__label">F1 Score</div>
            <div class="stat-card__value">${(best.f1 * 100).toFixed(1)}%</div>
            <div class="stat-card__sub">Harmonic mean</div>
        </div>
    `;

    // ── Confusion matrix ──
    // The Naive Bayes confusion matrix from the training output:
    // Actual HAM  predicted HAM = 902 (TN), predicted SPAM = 1 (FP)
    // Actual SPAM predicted HAM = 25  (FN), predicted SPAM = 106 (TP)
    const cm = document.getElementById('confusionMatrix');
    cm.innerHTML = `
        <div class="cm-corner cm-header"></div>
        <div class="cm-header">Pred: Ham</div>
        <div class="cm-header">Pred: Spam</div>

        <div class="cm-header" style="writing-mode: horizontal-tb;">Act: Ham</div>
        <div class="cm-cell cm-cell--tn">
            <span class="cm-cell__value">902</span>
            <span class="cm-cell__label">True Neg</span>
        </div>
        <div class="cm-cell cm-cell--fp">
            <span class="cm-cell__value">1</span>
            <span class="cm-cell__label">False Pos</span>
        </div>

        <div class="cm-header" style="writing-mode: horizontal-tb;">Act: Spam</div>
        <div class="cm-cell cm-cell--fn">
            <span class="cm-cell__value">25</span>
            <span class="cm-cell__label">False Neg</span>
        </div>
        <div class="cm-cell cm-cell--tp">
            <span class="cm-cell__value">106</span>
            <span class="cm-cell__label">True Pos</span>
        </div>
    `;

    // ── Dataset distribution ──
    const ds = data.dataset || {};
    if (ds.total_messages) {
        const hamPct = ((ds.ham_count / ds.total_messages) * 100).toFixed(1);
        const spamPct = ((ds.spam_count / ds.total_messages) * 100).toFixed(1);

        setTimeout(() => {
            document.getElementById('hamBar').style.width = hamPct + '%';
            document.getElementById('spamBar').style.width = spamPct + '%';
        }, 100);

        document.getElementById('datasetLegend').innerHTML = `
            <div class="dataset-legend__item">
                <span class="dataset-legend__dot dataset-legend__dot--ham"></span>
                Ham: ${ds.ham_count.toLocaleString()} (${hamPct}%)
            </div>
            <div class="dataset-legend__item">
                <span class="dataset-legend__dot dataset-legend__dot--spam"></span>
                Spam: ${ds.spam_count.toLocaleString()} (${spamPct}%)
            </div>
            <div class="dataset-legend__item" style="color: var(--text-muted);">
                Total: ${ds.total_messages.toLocaleString()} messages
            </div>
        `;
    }

    // ── Model comparison table ──
    const models = data.models;
    let rows = '';
    for (const [name, m] of Object.entries(models)) {
        const isBest = name === data.best_model;
        rows += `
            <tr${isBest ? ' style="background: rgba(0,217,166,0.04);"' : ''}>
                <td>
                    ${name}
                    ${isBest ? '<span class="badge badge--ham" style="margin-left: 8px; font-size: 0.68rem;">BEST</span>' : ''}
                </td>
                <td>${(m.accuracy * 100).toFixed(2)}%</td>
                <td>${(m.precision * 100).toFixed(2)}%</td>
                <td>${(m.recall * 100).toFixed(2)}%</td>
                <td>${(m.f1 * 100).toFixed(2)}%</td>
            </tr>
        `;
    }

    document.getElementById('modelCompareTable').innerHTML = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Model</th>
                    <th>Accuracy</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>F1 Score</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

// ── Utilities ─────────────────────────────────────────────────
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ── Keyboard shortcut ─────────────────────────────────────────
document.getElementById('emailInput').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        analyzeSingle();
    }
});

// ── Load dashboard on initial page load ───────────────────────
// Pre-fetch stats so dashboard is ready when user clicks
loadDashboard();
