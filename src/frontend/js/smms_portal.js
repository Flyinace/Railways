/**
 * Signal Maintenance Management System (SMMS) Portal Controller
 * Manages S&T disconnection demand submission, polling, and approvals.
 */

const API_BASE = "";

document.addEventListener("DOMContentLoaded", () => {
    loadSMMSDemands();
    setInterval(loadSMMSDemands, 5000);
});

function loadPresetSMMS(preset) {
    if (preset === "POINT_ALJN") {
        document.getElementById("smms-defect-cat").value = "Point Machine Sluggish Throw (>5.8s Pt-101A)";
        document.getElementById("smms-sec-from").value = "ALJN";
        document.getElementById("smms-sec-to").value = "TDL";
        document.getElementById("smms-line").value = "DN";
        document.getElementById("smms-asset-id").value = "Pt-101A (Crossover Turnout)";
        document.getElementById("smms-priority").value = "CRITICAL";
        document.getElementById("smms-gang").value = "Signal Gang B (4 Technicians - ALJN Division)";
        document.getElementById("smms-duration").value = "120";
        document.getElementById("smms-duration-lbl").innerText = "120 min (2.0h)";
        document.getElementById("smms-form-time").innerText = "120 Min Requested";
    } else if (preset === "CIRCUIT_TDL") {
        document.getElementById("smms-defect-cat").value = "Track Circuit Receiver Voltage Drop (<0.8V)";
        document.getElementById("smms-sec-from").value = "TDL";
        document.getElementById("smms-sec-to").value = "FZD";
        document.getElementById("smms-line").value = "UP";
        document.getElementById("smms-asset-id").value = "TC-TDL-04 (Mainline Track Circuit)";
        document.getElementById("smms-priority").value = "HIGH";
        document.getElementById("smms-gang").value = "Signal Gang A (4 Technicians - TDL Yard)";
        document.getElementById("smms-duration").value = "90";
        document.getElementById("smms-duration-lbl").innerText = "90 min (1.5h)";
        document.getElementById("smms-form-time").innerText = "90 Min Requested";
    }
}

async function submitSMMSDemand(e) {
    e.preventDefault();
    const btn = document.getElementById("btn-smms-submit");
    btn.disabled = true;
    btn.innerText = "Submitting to Central OCC...";

    const payload = {
        department: "SIGNAL_AND_TELECOM",
        defect_category: document.getElementById("smms-defect-cat").value,
        section_from: document.getElementById("smms-sec-from").value,
        section_to: document.getElementById("smms-sec-to").value,
        line: document.getElementById("smms-line").value,
        km_start: 135.0,
        km_end: 136.0,
        machine_required: document.getElementById("smms-machine").value,
        power_block_required: false,
        disconnection_required: true,
        gang_crew: document.getElementById("smms-gang").value,
        duration_requested_min: parseInt(document.getElementById("smms-duration").value) || 120,
        priority: document.getElementById("smms-priority").value,
        description: `${document.getElementById("smms-defect-cat").value} on ${document.getElementById("smms-asset-id").value}`
    };

    try {
        const res = await fetch(`${API_BASE}/api/demand/raise`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === "SUCCESS") {
            btn.innerText = "✓ S&T Demand Queued!";
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Submit S&T Disconnection Demand to Central OCC`;
            }, 2000);
            loadSMMSDemands();
        }
    } catch (err) {
        alert("Failed to submit S&T demand: " + err.message);
        btn.disabled = false;
        btn.innerText = "Submit S&T Disconnection Demand to Central OCC";
    }
}

async function loadSMMSDemands() {
    try {
        const res = await fetch(`${API_BASE}/api/demand/status/SIGNAL_AND_TELECOM`);
        const data = await res.json();
        renderSMMSDemandsTable(data.demands || []);
    } catch (err) {
        console.error("SMMS load error:", err);
    }
}

function renderSMMSDemandsTable(demands) {
    const tbody = document.getElementById("smms-demands-tbody");
    if (!tbody) return;

    if (!demands || demands.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; padding:30px; color:var(--text-muted);">
                    No active S&T requisitions. Raise a new disconnection demand using the form on the left.
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
            badgeText = "🟡 PENDING DSTE SANCTION";
        }

        const discHtml = isApproved 
            ? `<span style="display:inline-block; font-size:0.70rem; font-weight:700; color:#065f46; background:#d1fae5; border:1px solid #a7f3d0; padding:2px 6px; border-radius:3px;">✓ S&amp;T/T-351 MEMO ACCEPTED</span>`
            : `<span style="font-size:0.70rem; color:#92400e;">Notice Queued</span>`;

        const windowHtml = isApproved 
            ? `<strong style="color:#047857; font-family:var(--font-mono); font-size:0.78rem;">${d.sanctioned_window}</strong>`
            : `<span style="color:var(--text-muted); font-size:0.74rem;">Awaiting Controller Approval</span>`;

        const actionHtml = isApproved && d.sanction_memo_id
            ? `<button class="btn-portal-back" style="padding:3px 8px; font-size:0.72rem; color:#047857;" onclick="inspectMemo('${d.sanction_memo_id}')">📄 View Disconnection Memo</button>`
            : `<span style="color:var(--text-subtle); font-size:0.72rem;">Queued</span>`;

        rows += `
            <tr>
                <td style="font-family:var(--font-mono); font-weight:700; font-size:0.78rem;">${d.demand_id}</td>
                <td style="font-family:var(--font-mono);">${d.section_from} &ndash; ${d.section_to} (${d.line})</td>
                <td>
                    <span style="font-weight:600; font-size:0.78rem;">${d.defect_category}</span>
                    <span style="display:block; font-size:0.70rem; color:var(--text-muted);">${d.description}</span>
                </td>
                <td style="font-size:0.75rem;">
                    <strong>${d.gang_crew}</strong>
                </td>
                <td style="font-family:var(--font-mono); font-weight:600;">${d.duration_requested_min} min</td>
                <td>${discHtml}</td>
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
        document.getElementById("memo-modal-title").innerText = `Official BDMS S&T Disconnection Sanction Order: ${scheduleId}`;
        document.getElementById("memo-modal-text").innerText = data.memo_formatted_text;
        document.getElementById("memo-view-modal").style.display = "flex";
    } catch (err) {
        alert("Failed to load disconnection memo: " + err.message);
    }
}
