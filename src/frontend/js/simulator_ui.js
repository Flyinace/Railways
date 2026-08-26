/**
 * Dynamic What-If Disruption Simulator UI Controller.
 * Manages modal display, injection triggers, and dynamic recalculations.
 */

function openSimulatorModal() {
    const modal = document.getElementById("simulator-modal");
    if (modal) modal.style.display = "flex";
}

function closeSimulatorModal() {
    const modal = document.getElementById("simulator-modal");
    if (modal) modal.style.display = "none";
}

function switchSimMode(mode) {
    document.getElementById("sim-tab-train")?.classList.toggle("active", mode === "TRAIN");
    document.getElementById("sim-tab-defect")?.classList.toggle("active", mode === "DEFECT");

    document.getElementById("sim-controls-train").style.display = mode === "TRAIN" ? "block" : "none";
    document.getElementById("sim-controls-defect").style.display = mode === "DEFECT" ? "block" : "none";
    document.getElementById("sim-result-box").style.display = "none";
}

async function runTrainDelaySimulation() {
    const trainNo = document.getElementById("sim-train-select")?.value || "12424";
    const delayMin = parseInt(document.getElementById("sim-delay-range")?.value || "40");

    const resBox = document.getElementById("sim-result-box");
    resBox.style.display = "block";
    document.getElementById("sim-status-badge").innerText = "SOLVING WITH CP-SAT...";
    document.getElementById("sim-res-summary").innerText = `Injecting +${delayMin}m delay on Train ${trainNo}...`;

    try {
        const res = await fetch(`${API_BASE}/api/simulate/delay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ train_number: trainNo, delay_minutes: delayMin })
        });
        const data = await res.json();

        document.getElementById("sim-status-badge").innerText = `RESOLVED IN ${data.solver_time_seconds}s`;
        document.getElementById("sim-res-summary").innerText = data.resolution_summary;

        // Update active schedule in memory and re-render
        if (data.updated_schedule) {
            currentScheduleData = data.updated_schedule;
            updateKPICards(currentScheduleData.metrics);
            populateMemoDropdown(currentScheduleData.scheduled_blocks);
            if (typeof renderMareyChart === "function") renderMareyChart();
            if (typeof renderGanttChart === "function") renderGanttChart();
        }
    } catch (e) {
        document.getElementById("sim-status-badge").innerText = "ERROR";
        document.getElementById("sim-res-summary").innerText = `Simulation failed: ${e.message}`;
    }
}

async function runDefectSimulation() {
    const sec = document.getElementById("sim-defect-sec")?.value || "GZB - DER";
    const line = document.getElementById("sim-defect-line")?.value || "UP";
    const dept = document.getElementById("sim-defect-dept")?.value || "ENGINEERING_TRACK";

    const resBox = document.getElementById("sim-result-box");
    resBox.style.display = "block";
    document.getElementById("sim-status-badge").innerText = "SOLVING WITH CP-SAT...";
    document.getElementById("sim-res-summary").innerText = `Inserting emergency safety block on ${sec}...`;

    try {
        const res = await fetch(`${API_BASE}/api/simulate/defect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ section: sec, line: line, km: 35.0, department: dept })
        });
        const data = await res.json();

        document.getElementById("sim-status-badge").innerText = `RESOLVED IN ${data.solver_time_seconds}s`;
        document.getElementById("sim-res-summary").innerText = data.resolution_summary;

        if (data.updated_schedule) {
            currentScheduleData = data.updated_schedule;
            updateKPICards(currentScheduleData.metrics);
            populateMemoDropdown(currentScheduleData.scheduled_blocks);
            if (typeof renderMareyChart === "function") renderMareyChart();
            if (typeof renderGanttChart === "function") renderGanttChart();
        }
    } catch (e) {
        document.getElementById("sim-status-badge").innerText = "ERROR";
        document.getElementById("sim-res-summary").innerText = `Simulation failed: ${e.message}`;
    }
}
