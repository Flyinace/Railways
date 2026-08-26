# CONTEXT.md — Long-Term Architecture & Memory

## 1. Project Vision
The **Indian Railways AI-Powered Automatic Block Planning System** is an intelligent scheduling and optimization platform developed for the Smart India Hackathon (SIH 2024). 

### Core Purpose
- **The Problem:** Indian Railways infrastructure maintenance across Civil (Engineering/TMS), Electrical (Traction Distribution/TDMS), and S&T (Signalling & Telecom/SMMS) is managed in departmental silos via manual Block Demand Management System (BDMS) requests. Independent maintenance blocks cause excessive track downtime, conflict with commercial train operations, and degrade line capacity.
- **The Solution:** An integrated AI system modeling the 440 KM New Delhi – Kanpur Central (NDLS–CNB) high-density trunk corridor. It extracts and unifies multi-department defect logs, applies Machine Learning (XGBoost + Random Forest) for asset criticality and duration estimation, uses Mathematical Optimization (Google OR-Tools CP-SAT) to generate conflict-free multi-department "Shadow Blocks", and serves a real-time Control Office dashboard (featuring Marey string diagrams, Gantt charts, Centralized Traffic Control [CTC] schematic track maps, Station Yard Electronic Interlocking drill-downs, and dynamic disruption recovery).

---

## 2. Tech Stack (100% Free & Open-Source)
- **Language & Runtime:** Python 3.13 / 3.10+ (`py -3.13`)
- **Backend Framework:** FastAPI (`fastapi>=0.110.0`), Uvicorn (`uvicorn>=0.28.0`), Pydantic (`pydantic>=2.6.0`)
- **Data Engineering:** pandas (`>=2.0.0`), numpy (`>=1.24.0`), scipy (`>=1.11.0`)
- **Machine Learning:** 
  - XGBoost (`xgboost>=2.0.0`) for Failure Risk Classification & Remaining Useful Life (RUL) Regression
  - Scikit-Learn (`scikit-learn>=1.3.0`) for Random Forest Block Duration Estimation & feature preprocessing
  - SHAP (`shap>=0.43.0`) for Explainable AI (XAI) feature attributions (lazy initialized)
  - Joblib (`joblib>=1.3.0`) for model weight serialization
- **Mathematical Optimization:** Google OR-Tools (`ortools>=9.8.0`) CP-SAT Constraint Programming Solver
- **Frontend Architecture:** Vanilla HTML5 + CSS3 + Modern JavaScript (ES6+), Plotly.js (`v2.35.2` via CDN), Programmatic SVG Schematics
- **Design System & Typography:** Inter, JetBrains Mono, Microsoft Fluent UI SVG icons (Zero gradients, Minimalist Modern Light Theme)

---

## 3. Folder Structure & Module Boundaries
```
SIH RAILWAY/
├── CONTEXT.md                         # Long-term architectural memory & constraints (this file)
├── PROGRESS.md                        # Active session scratchpad & status tracking
├── requirements.txt                   # Production Python package dependencies
├── run_system.py                      # Bootstrap script with automatic Python 3.13 delegation
├── data/
│   ├── topology/
│   │   ├── ndls_cnb_corridor.json     # 10 stations, chainages, speed limits, depot fleet
│   │   └── station_yards.json         # Authentic IRSEM standard yard interlocking layouts (all 10 stations)
│   ├── raw/
│   │   ├── ndls_cnb_real_timetable.csv # 29 real trains, 290 station-stops across 24 hours
│   │   └── temp_disrupted_timetable.csv# Ephemeral timetable for dynamic delay simulations
│   ├── processed/
│   │   ├── tms_track_defects.csv      # 850 Civil/Track assets (RDSO TGI, rail stress, USFD)
│   │   ├── tdms_ohe_defects.csv       # 550 Electrical/OHE assets (ACTM wire wear, ATD)
│   │   ├── smms_signal_defects.csv    # 450 S&T assets (IRSEM point machines, track circuits)
│   │   ├── unified_maintenance_backlog.csv # 1,850 merged multi-dept requisitions
│   │   ├── ml_predictions.csv         # ML risk scores, priority tiers, predicted RUL & durations
│   │   └── optimized_schedule.json    # OR-Tools CP-SAT solved optimal block schedule
│   └── uploads/                       # User-uploaded custom CSV maintenance logs
├── src/
│   ├── __init__.py
│   ├── api/
│   │   ├── __init__.py
│   │   └── main.py                    # FastAPI app, CORS, REST routes, static file serving
│   ├── frontend/
│   │   ├── index.html                 # Minimalist SPA layout with Microsoft Fluent icons & yard modal
│   │   ├── css/
│   │   │   └── style.css              # Minimalist light theme tokens, flat borders, responsive layout
│   │   └── js/
│   │       ├── app.js                 # App coordinator, API client, tab navigation, KPI binder
│   │       ├── marey_chart.js         # Light-theme time-distance string chart renderer (Plotly.js)
│   │       ├── gantt_chart.js         # Light-theme shadow bundling comparison renderer (Plotly.js)
│   │       ├── network_map.js         # CTC schematic track board with UP/DN parallel lines
│   │       ├── yard_schematic.js      # SVG station yard interlocking schematic & point inspector
│   │       └── simulator_ui.js        # What-If perturbation modal controller
│   ├── generator/
│   │   ├── __init__.py
│   │   ├── rdso_formulas.py           # Official RDSO/IRPWM/ACTM/IRSEM engineering equations
│   │   ├── timetable_builder.py       # COA corridor train timetable generator
│   │   ├── generate_tms_data.py       # Track Management System synthetic defect generator
│   │   ├── generate_tdms_data.py      # Traction Distribution synthetic defect generator
│   │   ├── generate_smms_data.py      # Signalling Maintenance synthetic defect generator
│   │   └── generate_all.py            # Master dataset synthesis pipeline
│   ├── ml_engine/
│   │   ├── __init__.py
│   │   ├── feature_pipeline.py        # 18-feature standardized extractor & standard scaler
│   │   ├── train_models.py            # Deterministic model training pipeline (Risk, RUL, Duration)
│   │   ├── explainability.py          # SHAP TreeExplainer & controller explanation cards
│   │   ├── predict.py                 # Batch inference pipeline
│   │   └── saved_models/              # Serialized `.joblib` model weights & scalers
│   ├── optimizer/
│   │   ├── __init__.py
│   │   ├── slot_finder.py             # Timetable headway scanner (>=45 min, 10 min safety buffer)
│   │   ├── bundling_engine.py         # Spatial partition clustering for multi-department shadow blocks
│   │   ├── ortools_scheduler.py       # Google OR-Tools CP-SAT mathematical optimization model
│   │   └── multi_horizon.py           # 30-Day Strategic & 7-Day Tactical matrix generators
│   └── simulator/
│       ├── __init__.py
│       └── disruption_engine.py       # Sub-second train delay & emergency defect rescheduler
└── tests/
    ├── test_data_generator.py         # Unit tests for RDSO formulas and data synthesizers
    └── test_system_integration.py     # End-to-end integration tests (ML, optimizer, speed, API, Yard)
```

---

## 4. Data Models & Schema Overview

### 4.1 Topology (`data/topology/ndls_cnb_corridor.json`)
- **Stations (10):** `NDLS` (0.0k), `GZB` (25.0k), `DER` (37.0k), `KRJ` (83.0k), `ALJN` (131.0k), `TDL` (209.0k), `FZD` (226.0k), `ETW` (301.0k), `PHD` (357.0k), `CNB` (440.0k).
- **Line Config:** Double Broad Gauge (UP, DN), 25kV 50Hz AC Electrification, Automatic Block Signalling (ABS), Electronic Interlocking (EI).
- **Machine Fleet:** 2 Tamping Machines, 1 Ballast Cleaning Machine (BCM), 3 Tower Wagons, 4 USFD Trolleys, 5 Signal Gangs.

### 4.2 Station Yard Interlocking Layouts (`data/topology/station_yards.json`)
- **Schema:**
  - `station_code`, `station_name`, `km`, `division`, `interlocking_type`, `layout_type`, `layout_source`, `platform_count`, `track_count`, `speed_limit_kmph`.
  - `tracks`: Array of `{ id, label, type (mainline|platform|loop|branch|siding), y, is_main }`.
  - `platforms`: Array of `{ number, y, x_start, x_end, side }`.
  - `points`: Array of `{ id (e.g. Pt-101A), name, from_track, to_track, x1, y1, x2, y2, type (turnout|crossover|trailing) }`.
  - `signals`: Array of `{ id, type (HOME|STARTER|ADV_STARTER), x, y, direction (UP|DN), label }`.
  - `ohe_masts`: Array of `{ id, km, x, y, wear_pct, status }`.

### 4.3 Timetable (`data/raw/ndls_cnb_real_timetable.csv`)
- **Columns:** `train_number`, `train_name`, `train_type`, `priority_class`, `delay_penalty_weight`, `direction`, `station`, `km_location`, `arrival_time`, `departure_time`, `arrival_min_of_day`, `departure_min_of_day`, `is_halt`.

### 4.4 Unified Backlog & ML Predictions (`data/processed/ml_predictions.csv`)
- **Core Standard Columns:** `task_id`, `asset_id`, `department` (`ENGINEERING_TRACK` | `TRACTION_DISTRIBUTION_OHE` | `SIGNAL_AND_TELECOM`), `section_from`, `section_to`, `km_start`, `km_end`, `line`, `machine_required`, `power_block_required`, `disconnection_required`, `description`.
- **ML Target & Output Columns:**
  - `failure_probability` (0.0 to 1.0) & `failure_percentage`
  - `priority_tier` (`CRITICAL` [>=75%], `HIGH` [50–74%], `MEDIUM` [25–49%], `LOW` [<25%])
  - `predicted_rul_days` (1 to 365 days)
  - `predicted_duration_min` (30 to 300 minutes)
  - `composite_criticality_score` (0.0 to 100.0)

### 4.5 Optimized Block Schedule (`data/processed/optimized_schedule.json`)
- **Top-level:** `status` (`OPTIMAL` | `FEASIBLE`), `solver`, `corridor`, `metrics`, `scheduled_blocks`, `deferred_blocks_count`.
- **Block Item:** `schedule_id`, `bundle_id`, `section`, `line`, `km_range`, `start_time`, `end_time`, `duration_min`, `unbundled_duration_min`, `downtime_saved_min`, `departments`, `is_multi_department`, `task_count`, `tasks`, `descriptions`, `power_block_required`, `disconnection_required`, `machines`, `criticality_score`, `is_night_window`.

---

## 5. Engineering Standards & Mathematical Formulations

### 5.1 Track Geometry Index (TGI) — RDSO Lucknow Standard
$$\text{TGI} = \frac{2 \times \text{UI} + \text{TI} + \text{GI} + 6 \times \text{AL}}{10}$$
- $\ge 80$: GOOD | $50 - 79$: AVERAGE | $< 50$: POOR (Mandates maintenance / TSR)

### 5.2 Contact Wire Wear — ACTM Standard
$$\text{Wear \%} = \frac{12.24 - \text{Measured Diameter (mm)}}{12.24 - 8.25} \times 100$$
- $\ge 85\%$: CONDEMN_RENEW | $\ge 65\%$: CRITICAL | $\ge 40\%$: WORN | $< 40\%$: GOOD

### 5.3 Point Machine Health Index — IRSEM Standard
- Weighted penalty across throw time (normal 4.0–5.0s, critical >5.8s), motor current (normal 1.8–2.2A, critical >3.2A), and insulation resistance (normal $\ge 10\,\text{M}\Omega$, condemning $<1.0\,\text{M}\Omega$).

### 5.4 Composite Asset Criticality Score
$$\text{Score} = 35 \times P_{\text{fail}} + 25 \times \left(\frac{365 - \text{RUL}}{365}\right) + 20 \times W_{\text{route}} + 20 \times (\text{Compounding} - 1.0) + \text{TSR}_{\text{penalty}}$$

### 5.5 Google OR-Tools CP-SAT Formulation
- **Decision Variable:** $X_{b, s} \in \{0, 1\}$ (Assign candidate bundle $b$ to timetable slot $s$).
- **Objective:**
  $$\max \sum_{b, s} \left( \text{Criticality}_b + 500 \cdot \mathbb{I}_{\text{multi\_dept}} + 300 \cdot \mathbb{I}_{\text{night}} - 2 \cdot \text{Duration}_b \right) X_{b, s}$$
- **Hard Constraints:**
  1. At most one slot per bundle: $\sum_s X_{b,s} \le 1$
  2. At most one bundle per slot: $\sum_b X_{b,s} \le 1$
  3. Geographic matching: $X_{b,s} = 0$ if section or line differs, or if slot duration < bundle duration
  4. Machine fleet limits: Tamping machines $\le 2$, Tower Wagons $\le 3$ per simultaneous slot window
  5. 10-minute headway clearance buffer before commercial train traffic resumes

---

## 6. Coding Guardrails & Non-Negotiable Rules

1. **Zero External Paid Dependencies:** Never introduce proprietary solvers (Gurobi, CPLEX) or paid APIs. Everything must run locally on standard Python libraries.
2. **Python Environment Rule:** On this system, Python 3.14 lacks pip in PATH; always execute commands with Python 3.13 via `py -3.13 <script>` (or `python run_system.py` which auto-delegates).
3. **Decoupled REST API Architecture:** The FastAPI backend (`src/api/main.py`) must remain completely decoupled from the frontend. Keep endpoints stateless and return clean JSON (replace all `np.nan` with `None` before serialization).
4. **Spatial Partitioning in Bundling:** Never perform $O(N^2)$ comparisons across the entire backlog. Always partition tasks by `(section_from, line)` to guarantee sub-second clustering.
5. **Deterministic Random Seeds:** Any script that synthesizes data or trains ML models must set explicit seeds (`np.random.seed(42)`, `random.seed(42)`) to ensure 100% reproducibility.
6. **Safety Precedence Guardrail:** In 25kV electrified territory, any heavy track machine (BCM, CSM, Tamping) or track renewal within 2.75m of live OHE must enforce `power_block_required = True`.
7. **Frontend Design Aesthetic:** Maintain the clean, minimalist modern light theme (`#f8fafc` canvas, `#ffffff` card surfaces, `1px solid #e2e8f0` flat borders, zero gradients, Microsoft Fluent UI SVG icons, high-contrast typography, and Plotly light mode templates). Never use default browser alerts for production flows.
8. **Station Yard Schematics (Option C Standard):** Render track lines with clear, prominent visual stroke widths (3.5px solid Navy for mainlines, 2.5px for loops). Use authentic IRSEM standard point numbering (`Pt-101A`, `Pt-301A`) with dynamic health beacons (🟢 Safe, 🟡 Warning, 🔴 Sluggish). Always transparently attribute yard layouts as *Standard IRSEM Reference Layouts based on Official Station Infrastructure Data*.
