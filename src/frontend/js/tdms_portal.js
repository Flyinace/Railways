/**
 * Traction Distribution Management System (TDMS) Portal Controller
 * Manages 25 kV AC OHE power block demand submission, polling, and permits.
 */

const API_BASE = "";

document.addEventListener("DOMContentLoaded", () => {
    loadTDMSDemands();
    setInterval(loadTDMSDemands, 5000);
});

function loadPresetTDMS(preset) {
    if (preset === "WIRE_ALJN") {
        document.getElementById("tdms-defect-cat").value = "Contact Wire Wear (Condemning 8.8mm)";
        document.getElementById("tdms-sec-from").value = "ALJN";
        document.getElementById("tdms-sec-to").value = "TDL";
        document.getElementById("tdms-line").value = "DN";
        document.getElementById("tdms-km").value = "136.2";
        document.getElementById("tdms-machine").value = "TOWER_WAGON";
        document.getElementById("tdms-priority").value = "CRITICAL";
        document.getElementById("tdms-gang").value = "TRD Linemen Gang B (6 Linemen - ALJN OHE Depot)";
        document.getElementById("tdms-duration").value = "180";
        document.getElementById("tdms-duration-lbl").innerText = "180 min (3.0h)";
        document.getElementById("tdms-form-time").innerText = "180 Min Requested";
    } else if (preset === "DROPPER_GZB") {
        document.getElementById("tdms-defect-cat").value = "Dropper & Cantilever Assembly Adjustment";
        document.getElementById("tdms-sec-from").value = "GZB";
        document.getElementById("tdms-sec-to").value = "DER";
        document.getElementById("tdms-line").value = "UP";
        document.getElementById("tdms-km").value = "28.4";
        document.getElementById("tdms-machine").value = "TOWER_WAGON";
        document.getElementById("tdms-priority").value = "HIGH";
        document.getElementById("tdms-gang").value = "TRD Linemen Gang A (6 Linemen - GZB Base)";
        document.getElementById("tdms-duration").value = "150";
        document.getElementById("tdms-duration-lbl").innerText = "150 min (2.5h)";
        document.getElementById("tdms-form-time").innerText = "150 Min Requested";
    }
}

async function submitTDMSDemand(e) {
    e.preventDefault();
    const btn = document.getElementById("btn-tdms-submit");
    btn.disabled = true;
    btn.innerText = "Submitting to Central OCC...";

    const payload = {
        department: "TRACTION_DISTRIBUTION_OHE",
        defect_category: document.getElementById("tdms-defect-cat").value,
        section_from: document.getElementById("tdms-sec-from").value,
        section_to: document.getElementById("tdms-sec-to").value,
        line: document.getElementById("tdms-line").value,
        km_start: parseFloat(document.getElementById("tdms-km").value) || 0.0,
        km_end: (parseFloat(document.getElementById("tdms-km").value) || 0.0) + 1.0,
        machine_required: document.getElementById("tdms-machine").value,
        power_block_required: true,
        disconnection_required: false,
        gang_crew: document.getElementById("tdms-gang").value,
        duration_requested_min: parseInt(document.getElementById("tdms-duration").value) || 180,
        priority: document.getElementById("tdms-priority").value,
        description: `${document.getElementById("tdms-defect-cat").value} at KM ${document.getElementById("tdms-km").value}`
    };

    try {
        const res = await fetch(`${API_BASE}/api/demand/raise`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === "SUCCESS") {
            btn.innerText = "✓ OHE Demand Queued!";
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Submit 25 kV OHE Demand to Central OCC`;
            }, 2000);
            loadTDMSDemands();
        }
    } catch (err) {
        alert("Failed to submit OHE demand: " + err.message);
        btn.disabled = false;
        btn.innerText = "Submit 25 kV OHE Demand to Central OCC";
    }
}

async function loadTDMSDemands() {
    try {
        const res = await fetch(`${API_BASE}/api/demand/status/TRACTION_DISTRIBUTION_OHE`);
        const data = await res.json();
        renderTDMSDemandsTable(data.demands || []);
    } catch (err) {
        console.error("TDMS load error:", err);
    }
}

function renderTDMSDemandsTable(demands) {
    const tbody = document.getElementById("tdms-demands-tbody");
    if (!tbody) return;

    if (!demands || demands.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; padding:30px; color:var(--text-muted);">
                    No active OHE requisitions. Raise a new 25 kV power block demand on the left.
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
            badgeText = "🟡 PENDING TPC SANCTION";
        }

        const permitHtml = isApproved 
            ? `<span style="display:inline-block; font-size:0.70rem; font-weight:700; color:#065f46; background:#d1fae5; border:1px solid #a7f3d0; padding:2px 6px; border-radius:3px;">⚡ 25kV ISOLATION PERMIT GRANTED</span>`
            : `<span style="font-size:0.70rem; color:#92400e;">⚡ Isolation Queued</span>`;

        const windowHtml = isApproved 
            ? `<strong style="color:#b45309; font-family:var(--font-mono); font-size:0.78rem;">${d.sanctioned_window}</strong>`
            : `<span style="color:var(--text-muted); font-size:0.74rem;">Awaiting Controller Approval</span>`;

        const actionHtml = isApproved && d.sanction_memo_id
            ? `<button class="btn-portal-back" style="padding:3px 8px; font-size:0.72rem; color:#b45309;" onclick="inspectMemo('${d.sanction_memo_id}')">📄 View Power Permit</button>`
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
                <td>${permitHtml}</td>
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
        document.getElementById("memo-modal-title").innerText = `Official BDMS 25 kV Power Block Sanction Order: ${scheduleId}`;
        document.getElementById("memo-modal-text").innerText = data.memo_formatted_text;
        document.getElementById("memo-view-modal").style.display = "flex";
    } catch (err) {
        alert("Failed to load power permit: " + err.message);
    }
}
