/**
 * Track Management System (TMS) Portal Controller
 * Manages Track defect demand submission, polling, and BDMS memo inspection.
 */

const API_BASE = "";

document.addEventListener("DOMContentLoaded", () => {
    loadTMSDemands();
    setInterval(loadTMSDemands, 5000);
});

function handleMachineChange() {
    const machine = document.getElementById("tms-machine")?.value;
    const pwrCheckbox = document.getElementById("tms-power-block");
    if (machine === "BCM" || machine === "CSM_TAMPING") {
        if (pwrCheckbox) {
            pwrCheckbox.checked = true;
        }
    }
}

function loadPresetTMS(preset) {
    if (preset === "USFD_ALJN") {
        document.getElementById("tms-defect-cat").value = "Rail Flaw (USFD Immediate)";
        document.getElementById("tms-sec-from").value = "ALJN";
        document.getElementById("tms-sec-to").value = "TDL";
        document.getElementById("tms-line").value = "DN";
        document.getElementById("tms-km").value = "135.5";
        document.getElementById("tms-machine").value = "CSM_TAMPING";
        document.getElementById("tms-priority").value = "CRITICAL";
        document.getElementById("tms-gang").value = "Track Gang B (14 Trackmen - ALJN Depot)";
        document.getElementById("tms-duration").value = "210";
        document.getElementById("tms-duration-lbl").innerText = "210 min (3.5h)";
        document.getElementById("tms-form-time").innerText = "210 Min Requested";
        document.getElementById("tms-power-block").checked = true;
    } else if (preset === "TAMPING_TDL") {
        document.getElementById("tms-defect-cat").value = "TGI Track Geometry Deterioration";
        document.getElementById("tms-sec-from").value = "TDL";
        document.getElementById("tms-sec-to").value = "FZD";
        document.getElementById("tms-line").value = "UP";
        document.getElementById("tms-km").value = "215.0";
        document.getElementById("tms-machine").value = "CSM_TAMPING";
        document.getElementById("tms-priority").value = "HIGH";
        document.getElementById("tms-gang").value = "Track Gang A (12 Trackmen - TDL Base)";
        document.getElementById("tms-duration").value = "180";
        document.getElementById("tms-duration-lbl").innerText = "180 min (3.0h)";
        document.getElementById("tms-form-time").innerText = "180 Min Requested";
        document.getElementById("tms-power-block").checked = true;
    }
}

async function submitTMSDemand(e) {
    e.preventDefault();
    const btn = document.getElementById("btn-tms-submit");
    btn.disabled = true;
    btn.innerText = "Submitting to Central OCC...";

    const payload = {
        department: "ENGINEERING_TRACK",
        defect_category: document.getElementById("tms-defect-cat").value,
        section_from: document.getElementById("tms-sec-from").value,
        section_to: document.getElementById("tms-sec-to").value,
        line: document.getElementById("tms-line").value,
        km_start: parseFloat(document.getElementById("tms-km").value) || 0.0,
        km_end: (parseFloat(document.getElementById("tms-km").value) || 0.0) + 1.0,
        machine_required: document.getElementById("tms-machine").value,
        power_block_required: document.getElementById("tms-power-block").checked,
        disconnection_required: false,
        gang_crew: document.getElementById("tms-gang").value,
        duration_requested_min: parseInt(document.getElementById("tms-duration").value) || 180,
        priority: document.getElementById("tms-priority").value,
        description: `${document.getElementById("tms-defect-cat").value} at KM ${document.getElementById("tms-km").value}`
    };

    try {
        const res = await fetch(`${API_BASE}/api/demand/raise`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === "SUCCESS") {
            btn.innerText = "✓ Demand Queued!";
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Submit Track Block Demand to Central OCC`;
            }, 2000);
            loadTMSDemands();
        }
    } catch (err) {
        alert("Failed to submit demand: " + err.message);
        btn.disabled = false;
        btn.innerText = "Submit Track Block Demand to Central OCC";
    }
}

async function loadTMSDemands() {
    try {
        const res = await fetch(`${API_BASE}/api/demand/status/ENGINEERING_TRACK`);
        const data = await res.json();
        renderTMSDemandsTable(data.demands || []);
    } catch (err) {
        console.error("TMS load error:", err);
    }
}

function renderTMSDemandsTable(demands) {
    const tbody = document.getElementById("tms-demands-tbody");
    if (!tbody) return;

    if (!demands || demands.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">
                    No active track requisitions. Raise a new block demand using the form on the left.
                </td>
            </tr>
        `;
        return;
    }

    let rows = "";
    demands.forEach(d => {
        const isApproved = d.status === "APPROVED_SHADOW_BLOCK";
        const isPending = d.status === "PENDING_SANCTION";

        let badgeClass = "status-deferred";
        let badgeText = d.status;
        if (isApproved) {
            badgeClass = "status-approved";
            badgeText = "🟢 APPROVED SHADOW BLOCK";
        } else if (isPending) {
            badgeClass = "status-pending";
            badgeText = "🟡 PENDING OCC SANCTION";
        }

        const windowHtml = isApproved 
            ? `<strong style="color:var(--color-blue); font-family:var(--font-mono); font-size:0.78rem;">${d.sanctioned_window}</strong>`
            : `<span style="color:var(--text-muted); font-size:0.74rem;">Awaiting Controller Approval</span>`;

        const actionHtml = isApproved && d.sanction_memo_id
            ? `<button class="btn-portal-back" style="padding:3px 8px; font-size:0.72rem; color:var(--color-blue);" onclick="inspectMemo('${d.sanction_memo_id}')">📄 View Sanction Memo</button>`
            : `<span style="color:var(--text-subtle); font-size:0.72rem;">Queued</span>`;

        rows += `
            <tr>
                <td style="font-family:var(--font-mono); font-weight:700; font-size:0.78rem;">${d.demand_id}</td>
                <td style="font-family:var(--font-mono);">${d.section_from} &ndash; ${d.section_to} (${d.line})</td>
                <td>
                    <span style="font-weight:600; font-size:0.78rem;">${d.defect_category}</span>
                    <span style="display:block; font-size:0.70rem; color:var(--text-muted);">KM ${d.km_start} &bull; ${d.priority}</span>
                </td>
                <td style="font-size:0.75rem;">
                    <strong>${d.machine_required}</strong>
                    <span style="display:block; font-size:0.70rem; color:var(--text-muted);">${d.gang_crew}</span>
                </td>
                <td style="font-family:var(--font-mono); font-weight:600;">${d.duration_requested_min} min</td>
                <td><span class="status-badge ${badgeClass}">${badgeText}</span></td>
                <td>${windowHtml}</td>
                <td>${actionHtml}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rows;
}

async function inspectMemo(scheduleId) {
    try {
        const res = await fetch(`${API_BASE}/api/memos/bdms/${scheduleId}`);
        const data = await res.json();
        document.getElementById("memo-modal-title").innerText = `Official BDMS Sanction Order: ${scheduleId}`;
        document.getElementById("memo-modal-text").innerText = data.memo_formatted_text;
        document.getElementById("memo-view-modal").style.display = "flex";
    } catch (err) {
        alert("Failed to load memo: " + err.message);
    }
}
