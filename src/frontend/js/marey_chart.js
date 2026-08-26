/**
 * Interactive Marey Time-Distance String Chart (Minimalist Light Theme).
 * Standard Indian Railways Control Office diagram.
 * Shows train trajectories across 24h alongside shaded maintenance blocks.
 */

function renderMareyChart() {
    const container = document.getElementById("marey-plot-container");
    if (!container || !currentTimetableData) return;

    const dirFilter = document.getElementById("marey-dir-select")?.value || "ALL";

    const stationKms = {
        "NDLS": 0.0,
        "GZB": 25.0,
        "DER": 37.0,
        "KRJ": 83.0,
        "ALJN": 131.0,
        "TDL": 209.0,
        "FZD": 226.0,
        "ETW": 301.0,
        "PHD": 357.0,
        "CNB": 440.0
    };

    const traces = [];

    // 1. Group timetable by train and create line traces
    const trains = {};
    currentTimetableData.forEach(row => {
        if (dirFilter !== "ALL" && row.direction !== dirFilter) return;
        if (!trains[row.train_number]) {
            trains[row.train_number] = {
                number: row.train_number,
                name: row.train_name,
                type: row.train_type,
                dir: row.direction,
                stops: []
            };
        }
        trains[row.train_number].stops.push(row);
    });

    for (const [tNo, tData] of Object.entries(trains)) {
        // Sort stops chronologically by arrival time of day so train progression moves forward in time
        tData.stops.sort((a, b) => a.arrival_min_of_day - b.arrival_min_of_day);

        const timesHours = [];
        const distancesKm = [];
        const hoverTexts = [];

        tData.stops.forEach(st => {
            const h = st.arrival_min_of_day / 60.0;
            timesHours.push(h);
            distancesKm.push(st.km_location);
            hoverTexts.push(`<b>${tData.name} (${tNo})</b><br>Station: ${st.station} (KM ${st.km_location})<br>Scheduled Time: ${st.arrival_time}<br>Line: ${tData.dir} Direction`);
        });

        // Clean, distinct solid colors by train type (No gradients)
        let color = "#2563eb"; // default royal blue
        let width = 2;
        if (tData.type === "VANDE_BHARAT") {
            color = "#dc2626"; // Crimson Red
            width = 3.0;
        } else if (tData.type === "RAJDHANI" || tData.type === "SHATABDI") {
            color = "#7c3aed"; // Violet / Purple
            width = 2.5;
        } else if (tData.type === "SUPERFAST") {
            color = "#0284c7"; // Sky Blue
            width = 2.0;
        } else if (tData.type === "FREIGHT") {
            color = "#059669"; // Forest Green
            width = 1.5;
        }

        traces.push({
            x: timesHours,
            y: distancesKm,
            mode: "lines+markers",
            name: `${tData.number} ${tData.name}`,
            line: {
                color: color,
                width: width,
                dash: tData.type === "FREIGHT" ? "dot" : "solid"
            },
            marker: { size: 3.5, color: color },
            hoverinfo: "text",
            text: hoverTexts,
            showlegend: false
        });
    }

    // 2. Add Shaded Maintenance Blocks as shapes
    const shapes = [];
    const annotations = [];

    if (currentScheduleData && currentScheduleData.scheduled_blocks) {
        currentScheduleData.scheduled_blocks.forEach(b => {
            if (dirFilter !== "ALL" && b.line !== dirFilter) return;

            const secParts = b.section.split("-");
            const fromSt = secParts[0].trim();
            const toSt = secParts[1].trim();

            const y0 = Math.min(stationKms[fromSt] || 0, stationKms[toSt] || 440);
            const y1 = Math.max(stationKms[fromSt] || 0, stationKms[toSt] || 440);

            const [sh, sm] = b.start_time.split(":").map(Number);
            const [eh, em] = b.end_time.split(":").map(Number);

            const x0 = sh + sm / 60.0;
            let x1 = eh + em / 60.0;
            if (x1 < x0) x1 += 24.0;

            // Clean light theme fill
            shapes.push({
                type: "rect",
                xref: "x",
                yref: "y",
                x0: x0,
                x1: x1,
                y0: y0,
                y1: y1,
                fillcolor: b.is_multi_department ? "rgba(79, 70, 229, 0.16)" : "rgba(37, 99, 235, 0.12)",
                line: {
                    color: b.is_multi_department ? "#4f46e5" : "#2563eb",
                    width: 1.5,
                    dash: "solid"
                }
            });

            annotations.push({
                x: (x0 + x1) / 2.0,
                y: (y0 + y1) / 2.0,
                xref: "x",
                yref: "y",
                text: `<b>${b.schedule_id}</b><br>${b.is_multi_department ? 'SHADOW BUNDLED' : 'BLOCK'} (${b.duration_min}m)`,
                showarrow: false,
                font: { size: 9, color: "#0f172a", family: "Inter, sans-serif" },
                bgcolor: "#ffffff",
                bordercolor: b.is_multi_department ? "#4f46e5" : "#2563eb",
                borderwidth: 1,
                borderpad: 4
            });
        });
    }

    const layout = {
        title: {
            text: `<b>Marey Time-Distance Diagram</b> (${dirFilter === 'ALL' ? 'UP & DN Trains' : dirFilter + ' Line'}) &mdash; Shaded Boxes = Optimal Maintenance Blocks`,
            font: { color: "#0f2b5c", size: 14, family: "Inter, sans-serif" }
        },
        paper_bgcolor: "#ffffff",
        plot_bgcolor: "#f8fafc",
        margin: { l: 75, r: 35, t: 45, b: 45 },
        xaxis: {
            title: "Time of Day (24-Hour Timeline)",
            titlefont: { size: 11, color: "#475569" },
            range: [0, 24],
            dtick: 2,
            tickmode: "array",
            tickvals: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24],
            ticktext: ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "24:00"],
            color: "#475569",
            gridcolor: "#e2e8f0",
            zeroline: false
        },
        yaxis: {
            title: "Corridor Distance from New Delhi (KM)",
            titlefont: { size: 11, color: "#475569" },
            range: [0, 450],
            tickmode: "array",
            tickvals: Object.values(stationKms),
            ticktext: Object.keys(stationKms).map(k => `${k} (${stationKms[k]}k)`),
            color: "#475569",
            gridcolor: "#e2e8f0",
            zeroline: false
        },
        shapes: shapes,
        annotations: annotations,
        hovermode: "closest"
    };

    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot("marey-plot-container", traces, layout, config);
}
