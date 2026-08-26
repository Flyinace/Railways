/**
 * Multi-Department Maintenance Gantt Chart (Minimalist Light Theme).
 * Visualizes scheduled blocks, department coordination, and downtime reduction.
 */

function renderGanttChart() {
    const container = document.getElementById("gantt-plot-container");
    if (!container || !currentScheduleData || !currentScheduleData.scheduled_blocks) return;

    const blocks = currentScheduleData.scheduled_blocks;
    const yLabels = [];

    // Helper to map time string "HH:MM" to float hour
    function timeStrToFloat(tStr) {
        const [h, m] = tStr.split(":").map(Number);
        return h + m / 60.0;
    }

    const unbundledBars = {
        x: [],
        y: [],
        base: [],
        text: [],
        name: "Unbundled Independent Tasks",
        type: "bar",
        orientation: "h",
        marker: {
            color: "#e2e8f0",
            line: { color: "#94a3b8", width: 1 }
        }
    };

    const bundledBars = {
        x: [],
        y: [],
        base: [],
        text: [],
        name: "AI Coordinated Shadow Block",
        type: "bar",
        orientation: "h",
        marker: {
            color: "#4f46e5",
            line: { color: "#3730a3", width: 1 }
        }
    };

    blocks.forEach(b => {
        const label = `${b.schedule_id}: ${b.section} (${b.line})`;
        yLabels.push(label);

        const startH = timeStrToFloat(b.start_time);
        const durH = b.duration_min / 60.0;
        const unbundledDurH = b.unbundled_duration_min / 60.0;

        // Bundled bar
        bundledBars.y.push(label);
        bundledBars.base.push(startH);
        bundledBars.x.push(durH);
        bundledBars.text.push(`Approved Block: ${b.duration_min}m<br>Depts: ${b.departments.join(", ")}<br>Tasks: ${b.task_count}`);

        // Unbundled comparison bar
        unbundledBars.y.push(label);
        unbundledBars.base.push(startH);
        unbundledBars.x.push(unbundledDurH);
        unbundledBars.text.push(`Without AI: ${b.unbundled_duration_min}m independent possession`);
    });

    const layout = {
        title: {
            text: "<b>Joint Maintenance Shadow Block Timeline vs. Unbundled Baseline</b>",
            font: { color: "#0f2b5c", size: 14, family: "Inter, sans-serif" }
        },
        paper_bgcolor: "#ffffff",
        plot_bgcolor: "#f8fafc",
        margin: { l: 200, r: 35, t: 45, b: 45 },
        barmode: "overlay",
        xaxis: {
            title: "Corridor Time Window (24 Hours)",
            titlefont: { size: 11, color: "#475569" },
            range: [0, 24],
            dtick: 2,
            tickmode: "array",
            tickvals: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24],
            ticktext: ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "24:00"],
            color: "#475569",
            gridcolor: "#e2e8f0"
        },
        yaxis: {
            title: "Scheduled Maintenance Corridor Blocks",
            titlefont: { size: 11, color: "#475569" },
            color: "#0f172a",
            autorange: "reversed"
        },
        legend: {
            x: 0.65,
            y: 1.15,
            orientation: "h",
            font: { color: "#0f172a", family: "Inter, sans-serif" }
        }
    };

    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot("gantt-plot-container", [unbundledBars, bundledBars], layout, config);

    // Update Comparison Summary Table with clean flat cards
    const compCard = document.getElementById("gantt-comparison-card");
    if (compCard) {
        const metrics = currentScheduleData.metrics;
        compCard.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; text-align: center;">
                <div style="padding: 12px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Independent Unbundled Possession</span>
                    <h3 style="color: var(--text-secondary); font-family: var(--font-mono); font-size: 1.25rem; margin-top: 4px;">${metrics.unbundled_baseline_hours} Hours</h3>
                </div>
                <div style="padding: 12px; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: var(--radius-sm);">
                    <span style="font-size: 0.75rem; color: var(--color-indigo); font-weight: 600; text-transform: uppercase;">AI Coordinated Bundled Possession</span>
                    <h3 style="color: var(--color-indigo); font-family: var(--font-mono); font-size: 1.25rem; margin-top: 4px;">${metrics.total_possession_hours} Hours</h3>
                </div>
                <div style="padding: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: var(--radius-sm);">
                    <span style="font-size: 0.75rem; color: var(--color-emerald); font-weight: 600; text-transform: uppercase;">Track Availability Preserved</span>
                    <h3 style="color: var(--color-emerald); font-family: var(--font-mono); font-size: 1.25rem; margin-top: 4px;">+${metrics.downtime_saved_hours} Hours (${metrics.downtime_reduction_pct}%)</h3>
                </div>
            </div>
        `;
    }
}
