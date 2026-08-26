/**
 * Main Application State and Coordinator (Minimalist Light Theme).
 * Manages tab switching, API calls, and KPI dashboard updates.
 */

const API_BASE = "";
let currentScheduleData = null;
let currentTimetableData = null;
let currentTopologyData = null;

document.addEventListener("DOMContentLoaded", () => {
    initClock();
    loadCorridorTopology();
    loadOptimalSchedule();
    loadAssetsTable();
    showHorizon("WEEKLY");
});

function initClock() {
    function update() {
        const now = new Date();
        const str = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }) + " IST";
        const el = document.getElementById("live-clock");
        if (el) el.innerText = str;
    }
    update();
    setInterval(update, 1000);
}

function switchTab(tabId) {
    document.querySelectorAll(".tab-pane").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));

    const targetPane = document.getElementById(tabId);
    if (targetPane) targetPane.classList.add("active");

    const clickedBtn = Array.from(document.querySelectorAll(".tab-btn")).find(b => b.getAttribute("onclick").includes(tabId));
    if (clickedBtn) clickedBtn.classList.add("active");

    // Trigger Plotly relayout on tab switch to ensure responsive canvas sizing
    if (tabId === "marey-tab" && typeof renderMareyChart === "function") {
        setTimeout(renderMareyChart, 50);
    } else if (tabId === "gantt-tab" && typeof renderGanttChart === "function") {
        setTimeout(renderGanttChart, 50);
    }
}

async function loadCorridorTopology() {
    try {
        const res = await fetch(`${API_BASE}/api/corridor/topology`);
        currentTopologyData = await res.json();
        if (typeof renderNetworkTrackDiagram === "function") {
            renderNetworkTrackDiagram(currentTopologyData);
        }
    } catch (e) {
        console.error("Failed to load topology:", e);
    }
}

async function loadOptimalSchedule() {
    try {
        const [schedRes, ttRes] = await Promise.all([
            fetch(`${API_BASE}/api/schedule/optimal`),
            fetch(`${API_BASE}/api/corridor/timetable`)
        ]);

        currentScheduleData = await schedRes.json();
        currentTimetableData = await ttRes.json();

        updateKPICards(currentScheduleData.metrics);
        populateMemoDropdown(currentScheduleData.scheduled_blocks);

        if (typeof renderMareyChart === "function") {
            renderMareyChart();
        }
        if (typeof renderGanttChart === "function") {
            renderGanttChart();
        }
        if (typeof renderNetworkTrackDiagram === "function" && currentTopologyData) {
            renderNetworkTrackDiagram(currentTopologyData);
        }
    } catch (e) {
        console.error("Failed to load schedule:", e);
    }
}

function updateKPICards(metrics) {
    if (!metrics) return;
    document.getElementById("kpi-downtime-saved").innerText = `${metrics.downtime_reduction_pct}%`;
    const subEl = document.getElementById("kpi-downtime-sub");
    if (subEl) subEl.innerText = `Saved ${metrics.downtime_saved_hours} Hrs`;

    document.getElementById("kpi-bundling-rate").innerText = `${metrics.multi_department_bundling_rate_pct}%`;
    document.getElementById("kpi-punctuality").innerText = `100%`;
    document.getElementById("kpi-critical-solved").innerText = `${metrics.total_tasks_completed} Tasks`;
}

async function loadAssetsTable() {
    const dept = document.getElementById("asset-dept-select")?.value || "ALL";
    const tbody = document.getElementById("assets-tbody");
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">Loading assets...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/api/assets/health?department=${dept}&limit=50`);
        const data = await res.json();

        if (!data.assets || data.assets.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center">No assets found</td></tr>`;
            return;
        }

        tbody.innerHTML = data.assets.map(a => {
            const tier = a.priority_tier || "LOW";
            const tierClass = `tier-${tier.toLowerCase()}`;
            return `
                <tr>
                    <td><strong>${a.asset_id}</strong></td>
                    <td><span class="text-secondary">${formatDept(a.department)}</span></td>
                    <td>${a.section_from} - ${a.section_to}</td>
                    <td><span class="tier-badge ${tierClass}">${tier}</span></td>
                    <td><strong>${a.failure_percentage}%</strong></td>
                    <td>${a.predicted_rul_days} d</td>
                    <td>
                        <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="explainAsset('${a.asset_id}')">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                            Explain
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to load assets: ${e.message}</td></tr>`;
    }
}

function formatDept(d) {
    if (!d) return "-";
    if (d.includes("TRACK")) return "Track / Civil";
    if (d.includes("OHE")) return "OHE / TRD";
    if (d.includes("SIGNAL")) return "S&T Signal";
    return d;
}

async function explainAsset(assetId) {
    const cardPane = document.getElementById("xai-detail-card");
    cardPane.innerHTML = `<div class="empty-state-card"><p>Computing SHAP attributions for ${assetId}...</p></div>`;

    try {
        const res = await fetch(`${API_BASE}/api/assets/explain/${assetId}`);
        const exp = await res.json();

        const driversHtml = exp.primary_risk_drivers.map(d => `<li style="margin-bottom: 6px; display: flex; align-items: flex-start; gap: 6px;"><span style="color: var(--color-amber);">&#9888;</span> <span>${d}</span></li>`).join("");

        cardPane.innerHTML = `
            <div style="animation: fadeIn 0.2s ease;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 16px;">
                    <div>
                        <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--color-primary);">${exp.asset_id}</h3>
                        <span class="text-secondary" style="font-size: 0.8rem;">${formatDept(exp.department)}</span>
                    </div>
                    <span class="tier-badge tier-${exp.priority_tier.toLowerCase()}" style="font-size: 0.8rem; padding: 4px 10px;">${exp.priority_tier}</span>
                </div>
                
                <div style="background: var(--bg-surface-subtle); border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 14px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
                        <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Predicted Failure Risk:</span>
                        <strong style="color: ${exp.failure_probability_pct > 70 ? 'var(--color-crimson)' : 'var(--color-amber)'}; font-family: var(--font-mono); font-size: 0.95rem;">${exp.failure_probability_pct}%</strong>
                    </div>
                    <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${exp.failure_probability_pct}%; height: 100%; background: ${exp.failure_probability_pct > 70 ? 'var(--color-crimson)' : 'var(--color-amber)'};"></div>
                    </div>
                </div>

                <div style="margin-bottom: 16px;">
                    <h4 style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.3px;">Risk Drivers (XGBoost / SHAP):</h4>
                    <ul style="list-style: none; font-size: 0.82rem; color: var(--text-secondary); padding-left: 0;">
                        ${driversHtml}
                    </ul>
                </div>

                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 12px;">
                    <strong style="font-size: 0.78rem; color: var(--color-blue); display:block; margin-bottom: 4px; text-transform: uppercase;">AI Controller Action:</strong>
                    <span style="font-size: 0.82rem; color: var(--text-primary);">${exp.recommended_action} &mdash; Co-located shadow bundling active.</span>
                </div>
            </div>
        `;
    } catch (e) {
        cardPane.innerHTML = `<div class="empty-state-card"><p class="text-danger">Failed to generate explanation: ${e.message}</p></div>`;
    }
}

async function showHorizon(type) {
    document.getElementById("btn-weekly-toggle")?.classList.toggle("active", type === "WEEKLY");
    document.getElementById("btn-monthly-toggle")?.classList.toggle("active", type === "MONTHLY");

    const container = document.getElementById("horizon-content-box");
    container.innerHTML = `<p class="text-muted">Loading ${type} horizon plan...</p>`;

    try {
        const url = type === "WEEKLY" ? `${API_BASE}/api/schedule/weekly` : `${API_BASE}/api/schedule/monthly`;
        const res = await fetch(url);
        const data = await res.json();

        if (type === "WEEKLY") {
            let daysHtml = "";
            for (const [day, tasks] of Object.entries(data.schedule_matrix)) {
                daysHtml += `
                    <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; margin-bottom: 12px; box-shadow: var(--shadow-card);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
                            <strong style="color: var(--color-primary); font-size: 0.95rem;">${day}</strong>
                            <span class="badge-accent">${tasks.length} Assigned Blocks</span>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px;">
                            ${tasks.slice(0, 3).map(t => `
                                <div style="background: var(--bg-surface-subtle); border: 1px solid var(--border-color); padding: 10px 12px; border-radius: var(--radius-sm); font-size: 0.8rem;">
                                    <strong>${t.asset_id}</strong> &bull; <span class="text-secondary">${t.section} (${t.line})</span><br>
                                    <span style="color: var(--color-amber); font-weight: 600;">${t.shift}</span><br>
                                    <span class="text-muted" style="font-size: 0.75rem;">${t.assigned_gang}</span>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                `;
            }
            container.innerHTML = `
                <div style="margin-bottom: 14px;">
                    <h3 style="font-size: 1.05rem; color: var(--color-primary); font-weight: 700;">7-Day Rolling Tactical Matrix &amp; Gang Rostering</h3>
                    <p class="text-muted" style="font-size: 0.8rem;">Coordinated machine gang assignments on NDLS-CNB trunk corridor &bull; Night Shifts: <strong>${data.coordination_kpi.night_shift_percentage}%</strong> &bull; Gang Utilization: <strong>${data.coordination_kpi.gang_utilization_rate_pct}%</strong></p>
                </div>
                ${daysHtml}
            `;
        } else {
            let weeksHtml = "";
            for (const [week, projects] of Object.entries(data.weekly_allocations)) {
                weeksHtml += `
                    <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; margin-bottom: 12px; box-shadow: var(--shadow-card);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <strong style="color: var(--color-indigo); font-size: 0.95rem;">${week.replace("_", " ")}</strong>
                            <span class="badge-accent">${projects.length} Major Renewal Projects</span>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px;">
                            ${projects.slice(0, 4).map(p => `
                                <div style="background: var(--bg-surface-subtle); border: 1px solid var(--border-color); padding: 10px 12px; border-radius: var(--radius-sm); font-size: 0.8rem;">
                                    <strong>${p.asset_id}</strong> &bull; ${p.work_type}<br>
                                    <span class="text-secondary">${p.section} (${p.line}) &bull; Target: <strong>${p.target_window}</strong></span>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                `;
            }
            container.innerHTML = `
                <div style="margin-bottom: 14px;">
                    <h3 style="font-size: 1.05rem; color: var(--color-primary); font-weight: 700;">30-Day Strategic Macro Plan &amp; Heavy Renewal Projects</h3>
                    <p class="text-muted" style="font-size: 0.8rem;">Long-term corridor possession projections for Track CSM/BCM and OHE wiring.</p>
                </div>
                ${weeksHtml}
            `;
        }
    } catch (e) {
        container.innerHTML = `<p class="text-danger">Failed to load horizon plan: ${e.message}</p>`;
    }
}

function populateMemoDropdown(blocks) {
    const sel = document.getElementById("memo-block-select");
    if (!sel || !blocks) return;

    sel.innerHTML = blocks.map(b => `
        <option value="${b.schedule_id}">${b.schedule_id}: ${b.section} (${b.line} Line) &mdash; ${b.start_time} to ${b.end_time}</option>
    `).join("");

    if (blocks.length > 0) {
        loadSelectedMemo();
    }
}

async function loadSelectedMemo() {
    const sel = document.getElementById("memo-block-select");
    if (!sel || !sel.value) return;

    const pre = document.getElementById("memo-pre-text");
    pre.innerText = "Generating official BDMS notice...";

    try {
        const res = await fetch(`${API_BASE}/api/memos/bdms/${sel.value}`);
        const data = await res.json();
        pre.innerText = data.memo_formatted_text;
    } catch (e) {
        pre.innerText = `Failed to fetch memo: ${e.message}`;
    }
}

function printMemo() {
    const text = document.getElementById("memo-pre-text")?.innerText;
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>BDMS Official Memo</title></head><body style="font-family: monospace; padding: 20px; white-space: pre-wrap;">${text}</body></html>`);
    w.document.close();
    w.print();
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    alert(`Uploading and optimizing ${file.name}...`);
    try {
        const res = await fetch(`${API_BASE}/api/upload/csv`, {
            method: "POST",
            body: formData
        });
        const result = await res.json();
        alert(`Success: ${result.message}`);
        loadOptimalSchedule();
        loadAssetsTable();
    } catch (e) {
        alert(`Upload error: ${e.message}`);
    }
}
