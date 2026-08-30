# Indian Railways AI Automatic Block Planning System
## Comprehensive Developer & Technical Architecture Handbook

> **Target Audience:** Software engineers, machine learning practitioners, operations research specialists, and railway systems engineers intending to understand, maintain, extend, or deploy this platform.

---

## Table of Contents
1. [Executive Summary & Domain Primer](#1-executive-summary--domain-primer)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Repository Directory Blueprint](#3-repository-directory-blueprint)
4. [Deep-Dive Module & File-by-File Breakdown](#4-deep-dive-module--file-by-file-breakdown)
   - [4.1 Synthetic Data & RDSO Generator Engine (`src/generator/`)](#41-synthetic-data--rdso-generator-engine-srcgenerator)
   - [4.2 Predictive Machine Learning & XAI Engine (`src/ml_engine/`)](#42-predictive-machine-learning--xai-engine-srcml_engine)
   - [4.3 Mathematical Optimization & Scheduling Engine (`src/optimizer/`)](#43-mathematical-optimization--scheduling-engine-srcoptimizer)
   - [4.4 Dynamic Disruption & Resilience Simulator (`src/simulator/`)](#44-dynamic-disruption--resilience-simulator-srcsimulator)
   - [4.5 Asynchronous REST API Layer (`src/api/`)](#45-asynchronous-rest-api-layer-srcapi)
   - [4.6 Operations Control Center (OCC) Frontend (`src/frontend/`)](#46-operations-control-center-occ-frontend-srcfrontend)
   - [4.7 Automated Test Suite (`tests/`)](#47-automated-test-suite-tests)
   - [4.8 Bootstrap & Runtime Harness (`run_system.py`)](#48-bootstrap--runtime-harness-run_systempy)
5. [Mathematical Formulations & Algorithmic Details](#5-mathematical-formulations--algorithmic-details)
6. [API Route Specifications & Data Contracts](#6-api-route-specifications--data-contracts)
7. [Frontend Architecture & SVG Yard Mathematics](#7-frontend-architecture--svg-yard-mathematics)
8. [Developer Extensibility Guide & Recipes](#8-developer-extensibility-guide--recipes)
9. [Operational Runbook & Troubleshooting](#9-operational-runbook--troubleshooting)

---

## 1. Executive Summary & Domain Primer

### 1.1 The Operational Problem
Indian Railways (IR) operates one of the densest railway networks in the world. High-density corridors (HDNs)—such as the **440 KM New Delhi to Kanpur Central (NDLS–CNB)** trunk route—operate at **94.2% line capacity utilization**, running high-priority passenger trains (Rajdhani, Vande Bharat, Shatabdi, Superfast), suburban trains, and heavy freight rakes.

Infrastructure maintenance across Indian Railways is historically divided into three major departmental silos:
1. **Civil Engineering (Track / TMS):** Track renewals, deep screening by Ballast Cleaning Machines (BCM), mechanized tamping by Continuous Action Tamping Machines (CSM), rail grinding, and Ultrasonic Flaw Detection (USFD).
2. **Electrical Traction (TRD / TDMS):** 25 kV AC Overhead Equipment (OHE) contact wire wear monitoring, neutral section overhauls, Auto Tension Device (ATD) adjustments, and isolator maintenance.
3. **Signalling & Telecommunication (S&T / SMMS):** Electronic Interlocking (EI), Point Machine throw-time and motor current diagnostics, track circuit health, and axle counter synchronization.

Historically, each department independently requests corridor shutdown windows through the **Block Demand Management System (BDMS)**. This causes:
- **Excessive Track Downtime:** Multiple isolated closures for adjacent assets on the same track.
- **Compounding Traffic Delays:** Fragmented closures break train headways, causing cascaded signal stops.
- **Coordination Friction:** Manual inter-departmental negotiation leads to rejected block demands and deferred maintenance, elevating derailment risks.

### 1.2 The AI Solution
This system replaces fragmented manual requests with an automated, data-driven optimization pipeline:
- **Digital Twin Ingestion:** Models corridor topology (10 stations, track chainages, gradient/curvature, speed limits, depot machinery).
- **Machine Learning Asset Scoring:** Uses gradient-boosted decision trees (XGBoost) to evaluate asset failure probability ($P_{\text{fail}}$) and predict Remaining Useful Life (RUL) with Explainable AI (SHAP).
- **Google OR-Tools CP-SAT Optimization:** Mathematical constraint programming clusters multi-department tasks geographically and assigns them into natural headway gaps between scheduled trains ("Shadow Blocks").
- **Real-Time Control Office Visualization:** Renders 24-hour Marey time-distance string charts, Gantt shadow bundling timelines, Centralized Traffic Control (CTC) track maps, and authentic IRSEM-compliant Electronic Interlocking (EI) station yard schematics.
- **Dynamic Disruption Resilience:** Re-optimizes corridor maintenance schedules in under 0.40 seconds when commercial trains run late or emergency rail fractures occur.

---

## 2. High-Level System Architecture

The software architecture is strictly modular and decoupled into five distinct layers:

```
+----------------------------------------------------------------------------------------------------+
|                                      DATA & SYNTHESIS LAYER                                        |
|  - RDSO Standards Formulas (rdso_formulas.py)                                                      |
|  - Corridor Timetable Engine (timetable_builder.py -> 29 trains, 290 stops)                       |
|  - Synthetic Telemetry Synthesizers (generate_tms_data.py, generate_tdms_data.py, generate_smms_data.py)|
|  - Static Master Topologies (ndls_cnb_corridor.json, station_yards.json)                           |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                    PREDICTIVE & XAI ML ENGINE                                      |
|  - 18-Feature Standardized Pipeline (feature_pipeline.py)                                          |
|  - XGBoost Failure Classifier (ROC-AUC: 0.9751, Accuracy: 91.4%)                                    |
|  - XGBoost RUL Regressor (RMSE: 67.6 Days)                                                         |
|  - Random Forest Duration Estimator (RMSE: 12.25 Min)                                              |
|  - SHAP TreeExplainer & Natural Language Justification Generator (explainability.py)              |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                               MATHEMATICAL OPTIMIZATION ENGINE                                     |
|  - Headway Gap Scanner (slot_finder.py -> Scans 24h timetable for slots >= 45 min + 10 min buffer)|
|  - Spatial Partition Clustering (bundling_engine.py -> Merges TMS+TDMS+SMMS into candidate bundles)|
|  - Google OR-Tools CP-SAT Mixed-Integer Model (ortools_scheduler.py -> Maximize utility & bundles) |
|  - Multi-Horizon Schedulers (multi_horizon.py -> 30-Day Strategic & 7-Day Tactical Gang Matrices)   |
|  - Real-Time Disruption Solver (disruption_engine.py -> Sub-second delay absorption)               |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                      RESTFUL API LAYER (FASTAPI)                                   |
|  - FastAPI Stateless Application (src/api/main.py)                                                 |
|  - JSON API Endpoints (Corridor, Timetable, Schedule, Assets, XAI, Simulation, Yards, Memos)       |
|  - Lazy Explainability Engine Loading (Zero startup delay)                                         |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                OPERATIONS CONTROL CENTER (OCC) UI                                  |
|  - Microsoft Fluent Design System (index.html, style.css -> Tabular Numerals, SVG Icons)          |
|  - Interactive Marey String Diagram (marey_chart.js -> Plotly.js Time-Distance Chart with Scrubber)|
|  - Multi-Dept Gantt Bundling Diagram (gantt_chart.js -> Plotly.js Task Stacking & Savings Metrics) |
|  - Centralized Traffic Control Track Map (network_map.js -> UP/DN Parallel Lines & Active Blocks)  |
|  - Station Yard Interlocking SVG Renderer (yard_schematic.js -> Option C Turnout Simulation)       |
|  - What-If Disruption Simulator (simulator_ui.js -> 1-Click Judge Crisis Presets)                 |
|  - BDMS Formal Notice Printer & Client-Side Asset Search Engine (app.js)                           |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Repository Directory Blueprint

```
SIH RAILWAY/
├── .gitignore                         # Excludes Python bytecode, virtual environments, editor caches
├── CONTEXT.md                         # Long-term architectural invariants & non-negotiable coding rules
├── DOCUMENTATION.md                   # Comprehensive technical handbook (this file)
├── LICENSE                            # MIT Open-Source License
├── PROGRESS.md                        # Active session scratchpad & verification tracker
├── README.md                          # Production GitHub landing documentation with visual walkthrough
├── requirements.txt                   # Frozen Python library dependencies
├── run_system.py                      # Master orchestration bootstrap script with auto-delegation
│
├── data/                              # Persistent and generated data stores
│   ├── topology/
│   │   ├── ndls_cnb_corridor.json     # 10 stations, chainages, speed limits, depot machinery
│   │   └── station_yards.json         # Authentic IRSEM standard yard interlocking layouts (10 stations)
│   ├── raw/
│   │   ├── ndls_cnb_real_timetable.csv # 29 real passenger/freight trains across 24 hours
│   │   └── temp_disrupted_timetable.csv# Ephemeral timetable for dynamic disruption simulation
│   ├── processed/
│   │   ├── tms_track_defects.csv      # 850 synthetic Civil/Track defect records
│   │   ├── tdms_ohe_defects.csv       # 550 synthetic Electrical/OHE defect records
│   │   ├── smms_signal_defects.csv    # 450 synthetic S&T defect records
│   │   ├── unified_maintenance_backlog.csv # 1,850 unified multi-department defect requisitions
│   │   ├── ml_predictions.csv         # Inferred failure risks, priority tiers, RUL, and durations
│   │   └── optimized_schedule.json    # Master optimal CP-SAT solved corridor schedule
│   └── uploads/                       # Directory for user-uploaded custom CSV maintenance logs
│
├── docs/                              # Project documentation assets
│   └── assets/                        # High-resolution architectural screenshots for GitHub README
│       ├── marey_diagram.png
│       ├── gantt_bundling.png
│       ├── ctc_topology_map.png
│       ├── yard_interlocking.png
│       ├── xai_waterfall.png
│       └── whatif_simulator.png
│
├── src/                               # Application source code
│   ├── __init__.py
│   ├── api/
│   │   ├── __init__.py
│   │   └── main.py                    # FastAPI application, route handlers, and static file mounting
│   ├── frontend/
│   │   ├── index.html                 # Single Page Application HTML markup with Microsoft Fluent icons
│   │   ├── css/
│   │   │   └── style.css              # Minimalist light theme tokens, tabular numerals, layout styles
│   │   └── js/
│   │       ├── app.js                 # App state coordinator, API client, search filter, XAI renderer
│   │       ├── marey_chart.js         # Interactive Marey time-distance string diagram (Plotly.js)
│   │       ├── gantt_chart.js         # Multi-department shadow bundling Gantt chart (Plotly.js)
│   │       ├── network_map.js         # CTC corridor track map with UP/DN parallel lines
│   │       ├── yard_schematic.js      # Programmatic SVG station yard interlocking schematic
│   │       └── simulator_ui.js        # What-If perturbation modal controller with 1-click presets
│   ├── generator/
│   │   ├── __init__.py
│   │   ├── rdso_formulas.py           # RDSO, ACTM, and IRSEM official engineering formulas
│   │   ├── timetable_builder.py       # Corridor train timetable generator with realistic headway
│   │   ├── generate_tms_data.py       # TMS (Track) defect generator with physics-based degradation
│   │   ├── generate_tdms_data.py      # TDMS (OHE) defect generator with contact wire wear formulas
│   │   ├── generate_smms_data.py      # SMMS (Signals) defect generator with point machine telemetry
│   │   └── generate_all.py            # Master script coordinating full dataset generation
│   ├── ml_engine/
│   │   ├── __init__.py
│   │   ├── feature_pipeline.py        # 18-feature standardized extractor and StandardScaler
│   │   ├── train_models.py            # Model training pipeline (Classifier, RUL Regressor, Duration)
│   │   ├── explainability.py          # SHAP TreeExplainer and natural language justification cards
│   │   ├── predict.py                 # Batch inference pipeline mapping raw defects to predictions
│   │   └── saved_models/              # Serialized `.joblib` model weights and scalers
│   │       ├── risk_classifier_xgb.joblib
│   │       ├── rul_regressor_xgb.joblib
│   │       ├── duration_regressor_rf.joblib
│   │       └── feature_scaler.joblib
│   ├── optimizer/
│   │   ├── __init__.py
│   │   ├── slot_finder.py             # Timetable headway scanner for available maintenance gaps
│   │   ├── bundling_engine.py         # Spatial partition clustering for multi-department bundling
│   │   ├── ortools_scheduler.py       # Google OR-Tools CP-SAT mixed-integer optimizer
│   │   └── multi_horizon.py           # 30-Day Strategic Macro and 7-Day Tactical Matrix planners
│   └── simulator/
│       ├── __init__.py
│       └── disruption_engine.py       # Sub-second delay and emergency defect rescheduling engine
│
└── tests/                             # Test suite
    ├── test_data_generator.py         # Unit tests for RDSO formulas and data synthesizers
    └── test_system_integration.py     # End-to-end integration tests (ML, Optimizer, Yard API, Rescheduler)
```

---

## 4. Deep-Dive Module & File-by-File Breakdown

---

### 4.1 Synthetic Data & RDSO Generator Engine (`src/generator/`)

#### [`rdso_formulas.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/generator/rdso_formulas.py)
Implements authentic mathematical equations mandated by Indian Railways engineering manuals:
- `calculate_tgi(ui, ti, gi, al)`: Implements the **Track Geometry Index (TGI)** standard defined by RDSO Lucknow:
  $$\text{TGI} = \frac{2 \cdot \text{UI} + \text{TI} + \text{GI} + 6 \cdot \text{AL}}{10}$$
  Categorizes track health into `GOOD` ($\ge 80$), `AVERAGE` ($50-79$), or `POOR` ($< 50$).
- `calculate_contact_wire_wear(diameter_mm)`: Implements the **AC Traction Manual (ACTM)** condemning wear equation for $107\,\text{mm}^2$ copper wire:
  $$\text{Wear \%} = \frac{12.24 - \text{diameter}}{12.24 - 8.25} \times 100$$
  Classifies wire into `NORMAL` ($< 40\%$), `WORN` ($40-64\%$), `CRITICAL` ($65-84\%$), or `CONDEMN_RENEW` ($\ge 85\%$).
- `calculate_point_machine_health(throw_time, motor_current, insulation_mohm)`: Implements the **Indian Railways Signal Engineering Manual (IRSEM)** penalty model for $110\text{V DC}$ point machines:
  - Normal throw time: $4.0 - 5.0\text{ s}$ (sluggish $> 5.5\text{ s}$).
  - Normal motor current: $1.8 - 2.2\text{ A}$ (friction spike $> 3.0\text{ A}$).
  - Normal cable insulation: $\ge 10\,\text{M}\Omega$ (condemning $< 2.0\,\text{M}\Omega$).
- `calculate_composite_criticality(failure_prob, rul_days, route_weight, compounding_factor, tsr_active)`: Combines multi-factor risk into a normalized score between $0.0$ and $100.0$.

#### [`timetable_builder.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/generator/timetable_builder.py)
Generates the master corridor timetable representing real Indian Railways train operations:
- Synthesizes 29 distinct trains across 24 hours (12 DN trains from NDLS to CNB, 12 UP trains from CNB to NDLS, and 5 freight trains).
- Incorporates real train numbers and names:
  - **Premium Priority 1:** `12424 Dibrugarh Rajdhani`, `12302 Howrah Rajdhani`, `22436 Vande Bharat Express`, `12004 Lucknow Shatabdi`.
  - **Superfast Priority 2:** `12566 Bihar Sampark Kranti`, `12802 Purushottam Express`, `12398 Mahabodhi Express`.
  - **Mail / Express Priority 3:** `14218 Unchahar Express`, `14164 Sangam Express`.
  - **Freight Priority 4:** `CONT_DN_01 Container Goods`, `COAL_UP_02 Coal Rake`.
- Outputs `data/raw/ndls_cnb_real_timetable.csv` with 290 station-arrival records, scheduled halts, and minute-of-day offsets.

#### [`generate_tms_data.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/generator/generate_tms_data.py)
Synthesizes 850 Civil/Track defect records (`data/processed/tms_track_defects.csv`):
- Assigns Track Geometry Index parameters, rail wear in millimeters, cumulative gross million tonnes (GMT), sleeper age, ballast deficiency, and USFD flaw categories (`IMMEDIATE_REMOVAL_OBSOLETE`, `DEFECTIVE_WELD`, `NORMAL`).
- Requires heavy machinery flags: `CSM_TAMPING` (Continuous Action Tamping Machine), `BCM` (Ballast Cleaning Machine), `UNIMAT`, or `MANUAL_GANG`.
- Enforces mandatory power blocks if track work occurs within $2.75\text{ m}$ of live 25 kV overhead equipment.

#### [`generate_tdms_data.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/generator/generate_tdms_data.py)
Synthesizes 550 Electrical/OHE defect records (`data/processed/tdms_ohe_defects.csv`):
- Simulates contact wire thickness, height and stagger deviations, Auto Tension Device (ATD) compensation positions, cantilever insulator flashover risks, and jumper hot-spots.
- Assigns machinery requirement: `TOWER_WAGON` or `LADDER_TROLLEY`.
- Flags `power_block_required = True` across all TRD maintenance actions.

#### [`generate_smms_data.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/generator/generate_smms_data.py)
Synthesizes 450 Signalling & Telecom defect records (`data/processed/smms_signal_defects.csv`):
- Models S&T assets across stations and block sections: Point Machines, Audio Frequency Track Circuits (AFTC), Multi-Aspect Colour Light Signals (MACLS), and Axle Counters.
- Records throw time, motor peak current, operating cycles, and insulation resistance.
- Flags `disconnection_required = True` (mandates S&T disconnection notice to Station Master).

#### [`generate_all.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/generator/generate_all.py)
Master batch orchestrator executing the full generation sequence with deterministic random seeds (`np.random.seed(42)`):
- Ingests topology, builds the timetable, generates TMS, TDMS, and SMMS defects, unifies them into `data/processed/unified_maintenance_backlog.csv` (1,850 records), and triggers ML training and inference.

---

### 4.2 Predictive Machine Learning & XAI Engine (`src/ml_engine/`)

#### [`feature_pipeline.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/ml_engine/feature_pipeline.py)
Extracts and normalizes a 18-dimensional feature vector for each maintenance requisition:
- **Numerical Features (12):** `km_start`, `km_end`, `section_length_km`, `track_tgi`, `ohe_wire_wear_pct`, `point_throw_time_sec`, `insulation_mohm`, `speed_limit_kmph`, `cumulative_gmt`, `operating_cycles`, `last_maintained_days_ago`, `ambient_temperature_c`.
- **Categorical Features (6, One-Hot Encoded):** `department_ENGINEERING_TRACK`, `department_TRACTION_DISTRIBUTION_OHE`, `department_SIGNAL_AND_TELECOM`, `line_UP`, `line_DN`, `power_block_required`.
- Employs a serialized `StandardScaler` (`saved_models/feature_scaler.joblib`) to normalize inputs for inference.

#### [`train_models.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/ml_engine/train_models.py)
Trains and validates three deterministic supervised learning models:
1. **Failure Risk Classifier (`risk_classifier_xgb.joblib`):**
   - Algorithm: `XGBClassifier(n_estimators=150, max_depth=5, learning_rate=0.08, eval_metric='logloss')`
   - Target: Binary high-risk failure within 30 days.
   - Validation Performance: **$0.9751$ ROC-AUC**, $91.4\%$ Test Accuracy.
2. **Remaining Useful Life Regressor (`rul_regressor_xgb.joblib`):**
   - Algorithm: `XGBRegressor(n_estimators=120, max_depth=4, learning_rate=0.05)`
   - Target: Continuous remaining life in days ($1 - 365\text{ days}$).
   - Validation Performance: **$67.6\text{ Days}$ RMSE**.
3. **Task Duration Estimator (`duration_regressor_rf.joblib`):**
   - Algorithm: `RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)`
   - Target: Required possession duration in minutes ($30 - 300\text{ min}$).
   - Validation Performance: **$12.25\text{ Min}$ RMSE**.

#### [`explainability.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/ml_engine/explainability.py)
Implements Explainable AI (XAI) using SHAP (SHapley Additive exPlanations):
- Uses `shap.TreeExplainer` on the trained XGBoost model to quantify the exact contribution of each telemetry feature toward failure risk.
- Generates natural language controller justification cards (e.g. *"Point machine throw time exceeds IRSEM threshold by +1.4s, contributing +34% to failure risk. Immediate lubrication and clutch adjustment recommended during night window."*).
- Employs a **Lazy Initialization Pattern** (`get_explainability_engine()` in `src/api/main.py`) to prevent server startup lag.

#### [`predict.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/ml_engine/predict.py)
Batch inference script: Ingests `data/processed/unified_maintenance_backlog.csv`, extracts features, executes models, and outputs `data/processed/ml_predictions.csv` with failure probabilities, priority tiers, predicted RUL, and estimated durations.

---

### 4.3 Mathematical Optimization & Scheduling Engine (`src/optimizer/`)

#### [`slot_finder.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/optimizer/slot_finder.py)
Scans the 24-hour commercial timetable to discover feasible maintenance windows:
- Evaluates train arrivals and departures per section across both UP and DN tracks.
- Filters gaps where $\text{Headway} \ge 45\text{ minutes}$.
- Enforces a **10-minute safety buffer** before and after train movements ($\text{SlotStart} = \text{TrainPass} + 10\text{m}$, $\text{SlotEnd} = \text{NextTrain} - 10\text{m}$).
- Identifies **87 distinct feasible slots** across the 10-station corridor.

#### [`bundling_engine.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/optimizer/bundling_engine.py)
Executes multi-department spatial clustering:
- Partitions the maintenance backlog into geographic buckets by `(section_from, section_to, line)`.
- Combines co-located Civil Track, TRD OHE, and S&T Signal tasks into unified **Candidate Bundles**.
- Calculates the bundled duration using concurrent execution rules:
  $$\text{BundledDuration} = \max(\text{TrackDuration}, \text{OHEDuration}, \text{SignalDuration}) + 15\text{ min}$$
  (includes 15 min buffer for joint safety handovers and traction power isolation).
- Merges power block and disconnection flags across participating tasks.

#### [`ortools_scheduler.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/optimizer/ortools_scheduler.py)
The core mathematical optimization solver formulated as a Mixed-Integer Constraint Programming (CP-SAT) problem:
- **Decision Variables:** Binary variables $x_{b, s} \in \{0, 1\}$ representing whether candidate bundle $b$ is assigned to timetable slot $s$.
- **Objective Function:**
  $$\max \sum_{b, s} \left( \text{Criticality}_b + 500 \cdot \mathbb{I}_{\text{multi\_dept}}(b) + 300 \cdot \mathbb{I}_{\text{night}}(s) - 2 \cdot \text{Duration}_b \right) x_{b, s}$$
- **Constraints:**
  1. *Slot Uniqueness:* At most one bundle per slot ($\sum_b x_{b, s} \le 1$).
  2. *Bundle Uniqueness:* At most one slot per bundle ($\sum_s x_{b, s} \le 1$).
  3. *Duration & Line Feasibility:* $x_{b, s} = 0$ if duration exceeds slot or if track lines differ.
  4. *Machinery Fleet Capacity:* Simultaneous machine usage cannot exceed corridor fleet limits (Tamping Machines $\le 2$, Tower Wagons $\le 3$, BCM $\le 1$).
- **Benchmark Performance:** Solves globally optimal schedules in **$0.12\text{ seconds}$**, achieving **$78.7\%$ corridor downtime reduction** ($78.0\text{ hours}$ saved) and **$100\%$ multi-department bundling rate**.

#### [`multi_horizon.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/optimizer/multi_horizon.py)
Generates multi-scale operational plans:
- `generate_monthly_strategic_plan()`: Distributes major track renewal projects across a 30-day macro timeline, balancing weekly machinery hours.
- `generate_weekly_tactical_matrix()`: Produces a 7-day gang deployment roster (Monday through Sunday) allocating specialized depot teams (`Gang A`, `Gang B`, etc.) to specific day and night windows.

---

### 4.4 Dynamic Disruption & Resilience Simulator (`src/simulator/`)

#### [`disruption_engine.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/simulator/disruption_engine.py)
Provides sub-second real-time rescheduling when corridor perturbations occur:
- `simulate_train_delay(train_number, delay_minutes)`: Injects a delay on a commercial train (e.g. $+45\text{ min}$ on Train 12424 Dibrugarh Rajdhani), shifts downstream timetable arrivals, re-runs the slot finder and CP-SAT scheduler, and returns an updated conflict-free schedule in **$0.40\text{ seconds}$**.
- `simulate_emergency_defect(section, line, km, department)`: Injects an immediate emergency track fracture or OHE break, creates an emergency high-priority bundle ($5,000$ priority points), recalculates the schedule, and assigns an immediate possession slot while preserving passenger train punctuality.

---

### 4.5 Asynchronous REST API Layer (`src/api/`)

#### [`main.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/api/main.py)
Production FastAPI application exposing stateless REST endpoints and serving the 4-portal operations network:
- `GET /`: Serves the Central OCC Master Desk dashboard (`src/frontend/index.html`).
- `GET /tms`: Serves the Track Management System portal (`src/frontend/tms.html`).
- `GET /tdms`: Serves the Traction Distribution Management System portal (`src/frontend/tdms.html`).
- `GET /smms`: Serves the Signal Maintenance Management System portal (`src/frontend/smms.html`).
- `POST /api/demand/raise`: Ingests an ad-hoc or emergency maintenance demand from any department portal. Auto-enforces 25 kV AC power cuts and S&T/T-351 disconnection notices.
- `GET /api/demand/pending`: Returns all pending (unsanctioned) demands and total unbundled hours for the Central OCC live queue.
- `GET /api/demand/status/{department}`: Returns demand statuses filtered by department (`ENGINEERING_TRACK`, `TRACTION_DISTRIBUTION_OHE`, `SIGNAL_AND_TELECOM`, or `ALL`).
- `POST /api/demand/bundle_and_sanction`: Invokes Google OR-Tools CP-SAT on the pending demand queue, clusters co-located demands into shadow blocks, updates statuses to `APPROVED_SHADOW_BLOCK`, and assigns official sanction windows.
- `GET /api/demand/history`: Returns full demand audit history.
- `POST /api/demand/clear`: Resets the live demand queue for fresh presentation demos.
- `GET /api/corridor/topology`: Returns the 10-station corridor definition, chainages, and depot machine fleets.
- `GET /api/corridor/timetable`: Returns the 29-train timetable for Marey chart rendering.
- `GET /api/schedule/optimal`: Returns the CP-SAT optimal daily schedule and summary metrics.
- `GET /api/schedule/weekly`: Returns the 7-day tactical matrix and gang coordination KPIs.
- `GET /api/schedule/monthly`: Returns the 30-day strategic macro plan.
- `GET /api/assets/health`: Returns asset risk predictions with optional department filters and search limits.
- `GET /api/assets/explain/{asset_id}`: Evaluates SHAP feature attributions on demand and returns the controller justification card.
- `POST /api/simulate/delay`: Executes the train delay disruption simulation.
- `POST /api/simulate/defect`: Executes emergency defect block insertion and re-optimization.
- `GET /api/station/yard/{station_code}`: Returns authentic IRSEM yard interlocking layouts, tracks, platforms, point machine health beacons, signals, and OHE masts for a specific station.
- `GET /api/memos/bdms/{schedule_id}`: Generates a formatted Indian Railways Block Sanction Memorandum.
- `POST /api/upload/csv`: Ingests a custom user-uploaded CSV backlog, retrains/re-scores models, and outputs a new schedule.

---

### 4.6 Operations Control Center (OCC) & Department Portals (`src/frontend/`)

#### [`index.html`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/frontend/index.html) & [`app.js`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/frontend/js/app.js)
Single-page application layout for the Central OCC Chief Section Controller:
- Top bar with direct navigation pills to the 3 field portals (`TMS Portal`, `TDMS Portal`, `SMMS Portal`) and compact backup simulator icon button.
- **Live Departmental Demand Queue Section:** Live feed displaying incoming field requisitions with department badges, unbundled track possession hours, 1-click Quick Demo injection, and the prominent **`Auto-Bundle & Sanction Shadow Block`** action button.
- 4 KPI summary cards with mini sparkline progress bars.
- 6 primary navigation tabs with badge counters and keyboard shortcuts (`[1]` to `[6]`).
- Station Yard Interlocking SVG modal dialog (Option C).
- Auto-polls `/api/demand/pending` every 5 seconds for zero-lag queue synchronization.

#### [`tms.html`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/frontend/tms.html) & [`tms_portal.js`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/frontend/js/tms_portal.js)
Dedicated Track Management System (IRCEP Civil Engineering Desk) portal:
- Steel Blue (`#1e40af`) branding.
- Defect category selectors (USFD rail flaw, TGI deterioration, ballast deficiency, joint welding, sleeper renewal).
- Heavy track machinery assignment (`CSM_TAMPING`, `BCM`, `USFD_TROLLEY`, `MANUAL_GANG`).
- Live requisitions table with auto-polling (5s), status badges, and BDMS memo preview.

#### [`tdms.html`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/frontend/tdms.html) & [`tdms_portal.js`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/frontend/js/tdms_portal.js)
Dedicated Traction Distribution Management System (RailSaver TRD Desk) portal:
- High-Voltage Amber (`#b45309`) branding.
- OHE defect category selectors (Contact wire wear $<8.9\text{mm}$, dropper/cantilever, ATD, neutral section).
- **Auto-Enforced Safety:** `25 kV AC Traction Power Isolation: MANDATORY`.
- Live requisitions table showing **`⚡ 25kV ISOLATION PERMIT GRANTED`** and permit inspection.

#### [`smms.html`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/frontend/smms.html) & [`smms_portal.js`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/frontend/js/smms_portal.js)
Dedicated Signal Maintenance Management System (SMMS IR S&T Desk) portal:
- Forest Emerald (`#047857`) branding.
- S&T defect selectors (Point machine sluggish throw $>5.8\text{s}$, track circuit drop $<0.8\text{V}$, axle counter sync).
- **Auto-Enforced Safety:** `S&T Disconnection Notice (Form S&T/T-351): MANDATORY`.
- Live requisitions table showing **`✓ S&T/T-351 MEMO ACCEPTED`** and disconnection order inspection.

#### [`style.css`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/frontend/css/style.css)
Minimalist modern light theme CSS architecture:
- Multi-layer surface tokens: `#f8fafc` base canvas, `#ffffff` card surfaces, `#f1f5f9` sub-panels, `#e2e8f0` hairline borders.
- Typography engine with tabular numerals: `font-feature-settings: "tnum", "cv02", "cv03", "cv04", "cv11"` to prevent numeric layout jitter.
- Departmental color signatures: Steel Blue (`#1e40af`) for Track, Amber (`#b45309`) for OHE, Forest Emerald (`#047857`) for Signals, Unified Purple (`#6366f1`) for Bundles.
- Shared 2-column portal layouts (`.portal-grid`, `.portal-card`, `.portal-header`).

#### [`marey_chart.js`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/frontend/js/marey_chart.js)
Interactive 24-hour time-distance string chart renderer:
- Visualizes 29 train paths using Plotly.js line traces with train-type color coding (Crimson for Rajdhani, Indigo for Vande Bharat, Emerald for Shatabdi, Slate for Freight).
- Renders shaded rectangular maintenance blocks with schedule badges.
- Displays a vertical red dashed cursor marking the live current time (IST).
- Provides 1-click filter chips (`All Trains`, `Rajdhani / Vande Bharat`, `Superfast / Express`).

#### [`gantt_chart.js`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/frontend/js/gantt_chart.js)
Multi-department joint maintenance Gantt chart renderer:
- Displays primary AI bundled possession bars and stacked sub-department tasks.
- Populates an efficiency summary card comparing unbundled requests ($99.0\text{ hours}$) against bundled execution ($21.0\text{ hours}$), proving $78.0\text{ hours}$ ($78.7\%$) recovered track time.

#### [`network_map.js`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/frontend/js/network_map.js)
Centralized Traffic Control (CTC) corridor track map renderer:
- Renders double-track lines (DN Line to Kanpur, UP Line to New Delhi) with intermediate station nodes.
- Highlights active maintenance blocks with pulsing crimson badges.
- Includes an interactive Station Inspector drawer with an "Inspect Yard Interlocking" trigger button.

#### [`yard_schematic.js`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/frontend/js/yard_schematic.js)
Programmatic SVG station yard interlocking schematic renderer (Option C):
- Renders tracks with visible 3.5px mainline strokes, platform slabs, point turnouts with IRSEM badges (`Pt-101A`), signal aspect heads, and 25 kV OHE masts.
- Features **Layer Visibility Toggles** (Points, Signals, OHE Masts).
- Features **Interactive Route Switch Simulation**: Clicking a turnout toggles between Normal route (straight) and Reverse route (diverging loop).

---

### 4.7 Automated Test Suite (`tests/`)

#### [`test_system_integration.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/tests/test_system_integration.py)
End-to-end integration tests validating all 19 system invariants in 2.5s:
1. `test_feature_pipeline`: Validates 18-dimension feature vector extraction.
2. `test_safe_criticality_calculation`: Validates composite criticality scoring with NaN handling and TSR penalties.
3. `test_slot_finder`: Validates headway detection ($\ge 45\text{ min} + 10\text{ min}$).
4. `test_bundling_engine`: Validates spatial clustering and concurrent duration logic.
5. `test_ortools_optimizer`: Validates CP-SAT optimal schedule generation and downtime reduction ($78.7\%$).
6. `test_multi_horizon_plans`: Validates 30-Day strategic and 7-Day tactical matrix generation.
7. `test_disruption_simulator_speed`: Validates sub-second train delay recovery ($< 1.0\text{s}$).
8. `test_fastapi_endpoints`: Validates core REST API response codes and payloads.
9. `test_station_yard_topology`: Validates IRSEM yard definitions for all 10 corridor stations.
10. `test_station_yard_api`: Validates station yard interlocking API.
11. `test_demand_safety_rule_enforcement`: Validates mandatory 25 kV power block and S&T disconnection enforcement.
12. `test_demand_lifecycle_and_shadow_bundling`: Validates multi-department raise, pending queue accumulation, and 1-click CP-SAT shadow bundling.
13. `test_department_portal_pages`: Validates HTTP 200 HTML responses for `/tms`, `/tdms`, `/smms`.
14. `test_demand_history_and_clear`: Validates demand audit history and queue clearing.

- Provides SVG Pan and Zoom controls (`+`, `-`, `Reset`).

#### [`simulator_ui.js`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/src/frontend/js/simulator_ui.js)
Controller for the What-If Disruption Simulator:
- Manages mode switching between Train Delay Injection and Emergency Defect Insertion.
- Includes **1-Click Judge Demo Presets**:
  - `FOG_RAJDHANI`: $+45\text{ min}$ delay on 12424 Rajdhani Express.
  - `RAIL_FRACTURE`: Emergency rail fracture at Tundla (KM 215).
  - `OHE_SNAG`: Morning OHE pantograph trip at Ghaziabad.

---

### 4.7 Automated Test Suite (`tests/`)

#### [`test_data_generator.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/tests/test_data_generator.py)
Unit tests for engineering formulas and dataset generators:
- `test_tgi_formula()`: Validates RDSO TGI calculations against boundary conditions.
- `test_contact_wire_wear_formula()`: Validates ACTM wire wear percentages.
- `test_point_machine_health_formula()`: Validates IRSEM point machine penalty functions.
- `test_timetable_generation()`: Verifies 29 trains across 24 hours with valid chronological arrival sequences.
- `test_unified_dataset_generation()`: Verifies data integrity across all 1,850 generated defect rows.

#### [`test_system_integration.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/tests/test_system_integration.py)
End-to-end integration and API tests:
- `test_ml_feature_pipeline()`: Verifies feature extraction dimensions.
- `test_ml_model_predictions()`: Checks inference accuracy and RUL bounds.
- `test_slot_finder()`: Checks headway gap identification.
- `test_bundling_engine()`: Tests spatial partitioning and multi-department clustering.
- `test_ortools_optimizer()`: Verifies CP-SAT solver convergence, zero headway conflict, and downtime reduction $\ge 70\%$.
- `test_disruption_simulator_speed()`: Asserts sub-second solver re-optimization ($< 2.0\text{ seconds}$).
- `test_fastapi_endpoints()`: Validates REST API responses using `fastapi.testclient.TestClient`.
- `test_station_yard_topology()`: Verifies yard layout JSON schemas for all 10 corridor stations.
- `test_station_yard_api()`: Verifies `/api/station/yard/{code}` endpoints.

---

### 4.8 Bootstrap & Runtime Harness (`run_system.py`)

#### [`run_system.py`](file:///c:/Users/jefin/OneDrive/Desktop/SIH%20RAILWAY/run_system.py)
Automated single-command launcher:
- Detects the active Python environment and auto-delegates to `py -3.13` if running on an incompatible interpreter.
- Verifies package dependencies (`fastapi`, `uvicorn`, `ortools`, `xgboost`, `shap`, `pandas`).
- Checks if synthetic datasets and ML model binaries exist (triggers automated synthesis and training if absent).
- Executes unit and integration test suites.
- Starts the Uvicorn ASGI server on `http://127.0.0.1:8000`.

---

## 5. Mathematical Formulations & Algorithmic Details

### 5.1 Track Geometry Index (RDSO Standard)
$$\text{TGI} = \frac{2 \cdot \text{UI} + \text{TI} + \text{GI} + 6 \cdot \text{AL}}{10}$$

### 5.2 Contact Wire Wear (ACTM Standard)
$$\text{Wear Percentage} = \left( \frac{12.24 - \text{Measured Diameter (mm)}}{12.24 - 8.25} \right) \times 100$$

### 5.3 Point Machine Health Index (IRSEM Standard)
$$\text{Health Index} = 100 - \left( \max(0, t_{\text{throw}} - 4.5) \cdot 18 + \max(0, I_{\text{motor}} - 2.2) \cdot 25 + \max(0, 10.0 - R_{\text{insul}}) \cdot 3.5 \right)$$

### 5.4 Composite Asset Criticality Score
$$\text{Score} = 35 \cdot P_{\text{fail}} + 25 \cdot \left( \frac{365 - \text{RUL}}{365} \right) + 20 \cdot W_{\text{route}} + 20 \cdot (\text{Compounding} - 1.0) + \text{TSR}_{\text{penalty}}$$

### 5.5 Google OR-Tools CP-SAT Mixed-Integer Formulation
- **Decision Variable:**
  $$x_{b, s} \in \{0, 1\} \quad \forall b \in B, \, \forall s \in S$$
- **Objective Function:**
  $$\max \sum_{b \in B} \sum_{s \in S} \left( \text{Criticality}_b + 500 \cdot \mathbb{I}_{\text{multi\_dept}}(b) + 300 \cdot \mathbb{I}_{\text{night}}(s) - 2 \cdot \text{Duration}_b \right) x_{b, s}$$
- **Subject To:**
  $$\sum_{s \in S} x_{b, s} \le 1 \quad \forall b \in B \quad \text{(At most one slot per bundle)}$$
  $$\sum_{b \in B} x_{b, s} \le 1 \quad \forall s \in S \quad \text{(At most one bundle per slot)}$$
  $$\sum_{b \in B_m} x_{b, s} \le \text{Capacity}(m) \quad \forall m \in M, \, \forall s \in S \quad \text{(Machine fleet limits)}$$
  $$x_{b, s} = 0 \quad \text{if } \text{Section}(b) \neq \text{Section}(s) \lor \text{Line}(b) \neq \text{Line}(s) \lor \text{Duration}(b) > \text{Duration}(s)$$

---

## 6. API Route Specifications & Data Contracts

| Method | Endpoint | Description | Key Response Fields |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/corridor/topology` | 10 corridor stations & infrastructure | `corridor_name`, `total_length_km`, `stations[]`, `machine_fleet{}` |
| `GET` | `/api/corridor/timetable` | Master 24h train timetable (29 trains) | `[{ train_number, train_name, train_type, direction, arrival_time, km_location }]` |
| `GET` | `/api/schedule/optimal` | CP-SAT optimal daily schedule | `status`, `metrics{ downtime_reduction_pct, downtime_saved_hours }`, `scheduled_blocks[]` |
| `GET` | `/api/schedule/weekly` | 7-day tactical gang deployment matrix | `horizon`, `schedule_matrix{ Monday: [...], ... }`, `coordination_kpi{}` |
| `GET` | `/api/schedule/monthly` | 30-day strategic macro renewal plan | `horizon`, `weekly_allocations{ week_1: [...], ... }` |
| `GET` | `/api/assets/health` | ML risk predictions & RUL for assets | `total_count`, `assets[{ asset_id, priority_tier, failure_percentage, predicted_rul_days }]` |
| `GET` | `/api/assets/explain/{id}`| SHAP feature risk attribution card | `asset_id`, `priority_tier`, `failure_probability_pct`, `primary_risk_drivers[]`, `recommended_action` |
| `POST`| `/api/simulate/delay` | Re-optimizes schedule for delayed train | Body: `{ train_number, delay_minutes }` &rarr; `solver_time_seconds`, `resolution_summary`, `updated_schedule` |
| `POST`| `/api/simulate/defect` | Injects emergency defect block | Body: `{ section, line, km, department }` &rarr; `solver_time_seconds`, `resolution_summary`, `updated_schedule` |
| `GET` | `/api/station/yard/{code}`| Authentic IRSEM yard interlocking layout| `station_code`, `tracks[]`, `platforms[]`, `points[]`, `signals[]`, `ohe_masts[]`, `active_blocks[]` |
| `GET` | `/api/memos/bdms/{id}` | Official BDMS sanction notice | `schedule_id`, `memo_formatted_text` |
| `POST`| `/api/upload/csv` | Ingests custom CSV defect backlog | Form-Data: `file` &rarr; `status`, `message`, `records_processed` |

---

## 7. Frontend Architecture & SVG Yard Mathematics

### 7.1 Reactive Minimalist Architecture
The frontend is constructed with **Vanilla JavaScript (ES6+) and CSS3** without heavy client-side frameworks:
- **Zero Build Overhead:** No Webpack/Vite bundlers or npm dependencies.
- **Instant Rendering:** Instant DOM updates with zero Virtual DOM reconciliation latency.
- **Plotly.js Canvas:** GPU-accelerated canvas/SVG rendering for the 24-hour Marey string chart and Gantt bundling timelines.

### 7.2 Programmatic SVG Yard Coordinate Mapping (`yard_schematic.js`)
- ViewBox Dimensions: Width $1060\text{ px}$, dynamic Height $\max(Y) + 65\text{ px}$.
- Mainline Track Lines: Solid `#0f2b5c`, stroke width `3.5px`.
- Platform Loop Lines: Solid `#2563eb`, stroke width `2.5px`.
- Sidings & Branches: Dashed `#475569`, stroke width `2.0px`.
- Point Turnout Crossovers: Diagonal SVG line from $(x_1, y_1)$ to $(x_2, y_2)$ with interactive route position state (`NORMAL` vs `REVERSE`).
- Dynamic Point Beacons: Color-coded by priority tier:
  - 🟢 Safe ($\ge 75\%$ health): `#059669`
  - 🟡 Warning ($35 - 74\%$ health): `#d97706`
  - 🔴 Sluggish ($< 35\%$ health / $> 5.5\text{s}$ throw): `#dc2626`

---

## 8. Developer Extensibility Guide & Recipes

### 8.1 Recipe: Adding a New Corridor Station
1. Edit `data/topology/ndls_cnb_corridor.json`:
   ```json
   {
     "code": "XYZ",
     "name": "New Station",
     "km": 175.5,
     "division": "PRAYAGRAJ",
     "platforms": 4,
     "speed_limit_kmph": 130,
     "depots": ["Track Depot", "Signal Depot"]
   }
   ```
2. Add the station yard interlocking layout to `data/topology/station_yards.json` defining tracks, platforms, points, and signals.
3. Re-run `py -3.13 src/generator/generate_all.py` to regenerate synthetic defects and train timetable stops.

### 8.2 Recipe: Adding a New Machine Fleet Constraint
1. Open `src/optimizer/ortools_scheduler.py`.
2. Add your new machine key to the `machine_fleet` dictionary:
   ```python
   machine_fleet = {
       "CSM_TAMPING": 2,
       "BCM": 1,
       "TOWER_WAGON": 3,
       "UNIMAT_TURNOUT_TAMPER": 1  # New machine fleet limit
   }
   ```
3. The solver will automatically enforce $\sum_{b \in \text{Requiring}(m)} x_{b, s} \le \text{Capacity}(m)$ for all slots.

### 8.3 Recipe: Retraining Machine Learning Models
Execute the training pipeline script:
```powershell
py -3.13 src/ml_engine/train_models.py
```
This regenerates and serializes:
- `src/ml_engine/saved_models/risk_classifier_xgb.joblib`
- `src/ml_engine/saved_models/rul_regressor_xgb.joblib`
- `src/ml_engine/saved_models/duration_regressor_rf.joblib`
- `src/ml_engine/saved_models/feature_scaler.joblib`

---

## 9. Operational Runbook & Troubleshooting

### 9.1 Verification Commands
Run the complete automated test suite (15 tests):
```powershell
py -3.13 -m unittest discover tests/
```
*Expected Output:*
```
Ran 15 tests in ~1.3s -> OK
```

### 9.2 Launching the Development & Production Server
```powershell
py -3.13 run_system.py
```
Access the Operations Control Center dashboard at `http://127.0.0.1:8000`.

### 9.3 Common Issues & Resolutions

| Issue / Symptom | Root Cause | Resolution |
| :--- | :--- | :--- |
| `No module named uvicorn` or `No module named ortools` | Command executed with default Python 3.14 which lacks packages in PATH. | Execute commands with `py -3.13 <command>` or launch via `run_system.py`. |
| Server startup delayed by 5+ seconds | SHAP TreeExplainer initializing synchronously. | Fixed via Lazy Initialization in `get_explainability_engine()`. Do not call SHAP during module import. |
| Plotly charts overlapping or improperly sized on tab switch | Container was hidden when initial Plotly paint occurred. | Call `Plotly.Plots.resize()` or trigger `setTimeout(renderMareyChart, 50)` inside `switchTab()`. |
| KPI cards showing `undefined` | Field name mismatch between API response and frontend JavaScript. | Ensure fields in `app.js` match `downtime_reduction_pct`, `downtime_saved_hours`, `multi_department_bundling_rate_pct`, and `total_tasks_completed`. |
| Weekly Matrix `.forEach is not a function` error | `schedule_matrix` is an object keyed by day (`{"Monday": [...]}`). | Iterate using `for (const [day, tasks] of Object.entries(data.schedule_matrix))`. |

---

<div align="center">

**Indian Railways AI Automatic Block Planning System** &bull; Production Architecture Handbook  
Maintained under the MIT Open-Source License &bull; Remote Repository: [Flyinace/Railways](https://github.com/Flyinace/Railways)

</div>
