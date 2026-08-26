"""
FastAPI Application Entry Point.
Serves REST API endpoints for:
- /api/schedule/optimal     : Optimal multi-department bundled block schedule
- /api/schedule/monthly     : 30-day strategic macro horizon plan
- /api/schedule/weekly      : 7-day tactical matrix plan
- /api/assets/health        : Asset inventory & risk breakdown with explainability
- /api/assets/explain/{id}  : SHAP feature attribution justification card
- /api/station/yard/{code}  : Station Yard Interlocking layout, S&T points & OHE mast status
- /api/simulate/delay       : Real-time train delay perturbation recovery
- /api/simulate/defect      : Emergency defect insertion & live resolution
- /api/memos/bdms/{id}      : Formatted Indian Railways Block Sanction Notice generator
- /api/upload/csv           : User custom maintenance CSV ingestion & re-optimization
Serves the interactive Control Office frontend dashboard.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from pydantic import BaseModel

# Ensure root directory is in python path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.append(ROOT_DIR)

from src.optimizer.ortools_scheduler import ORToolsBlockScheduler
from src.optimizer.multi_horizon import generate_monthly_strategic_plan, generate_weekly_tactical_plan
from src.simulator.disruption_engine import DisruptionSimulator
from src.ml_engine.predict import run_inference

app = FastAPI(
    title="Indian Railways AI Automatic Block Planning System",
    description="Intelligent Joint Block Scheduling & Multi-Department Maintenance Optimization (SIH 2024)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static frontend files
frontend_dir = os.path.join(ROOT_DIR, "src", "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

# Instantiate engines lazily
scheduler = ORToolsBlockScheduler()
simulator = DisruptionSimulator()
explainability_engine = None


def get_explainability_engine():
    global explainability_engine
    if explainability_engine is None:
        try:
            from src.ml_engine.explainability import ExplainabilityEngine
            explainability_engine = ExplainabilityEngine()
        except Exception as e:
            print(f"Explainability engine note: {e}")
    return explainability_engine


@app.get("/", response_class=HTMLResponse)
def serve_dashboard():
    index_file = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return HTMLResponse("<h1>Indian Railways AI Automatic Block Planner API is Running</h1>")


@app.get("/api/corridor/topology")
def get_corridor_topology():
    topo_path = os.path.join(ROOT_DIR, "data", "topology", "ndls_cnb_corridor.json")
    if os.path.exists(topo_path):
        with open(topo_path, "r") as f:
            return json.load(f)
    return {"error": "Topology not found"}


@app.get("/api/corridor/timetable")
def get_timetable():
    tt_path = os.path.join(ROOT_DIR, "data", "raw", "ndls_cnb_real_timetable.csv")
    if os.path.exists(tt_path):
        df_tt = pd.read_csv(tt_path)
        df_tt = df_tt.replace({np.nan: None})
        return df_tt.to_dict(orient="records")
    return {"error": "Timetable not found"}


@app.get("/api/schedule/optimal")
def get_optimal_schedule():
    sched_path = os.path.join(ROOT_DIR, "data", "processed", "optimized_schedule.json")
    if os.path.exists(sched_path):
        with open(sched_path, "r") as f:
            return json.load(f)
    return scheduler.solve_schedule()


@app.get("/api/schedule/monthly")
def get_monthly_plan():
    return generate_monthly_strategic_plan()


@app.get("/api/schedule/weekly")
def get_weekly_plan():
    return generate_weekly_tactical_plan()


@app.get("/api/assets/health")
def get_assets_health(department: str = None, limit: int = 100):
    preds_path = os.path.join(ROOT_DIR, "data", "processed", "ml_predictions.csv")
    if not os.path.exists(preds_path):
        run_inference()

    df_p = pd.read_csv(preds_path)
    if department and department != "ALL":
        df_p = df_p[df_p["department"] == department]

    critical_count = int((df_p["priority_tier"] == "CRITICAL").sum())
    high_count = int((df_p["priority_tier"] == "HIGH").sum())
    medium_count = int((df_p["priority_tier"] == "MEDIUM").sum())
    low_count = int((df_p["priority_tier"] == "LOW").sum())

    df_p = df_p.replace({np.nan: None})
    records = df_p.head(limit).to_dict(orient="records")

    return {
        "total_assets": len(df_p),
        "critical_count": critical_count,
        "high_count": high_count,
        "medium_count": medium_count,
        "low_count": low_count,
        "assets": records
    }


@app.get("/api/assets/explain/{asset_id}")
def explain_single_asset(asset_id: str):
    preds_path = os.path.join(ROOT_DIR, "data", "processed", "ml_predictions.csv")
    if not os.path.exists(preds_path):
        raise HTTPException(status_code=404, detail="Dataset not ready")

    df_p = pd.read_csv(preds_path)
    match = df_p[df_p["asset_id"] == asset_id]
    if match.empty:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")

    rec = match.iloc[0].to_dict()
    engine = get_explainability_engine()
    if engine:
        return engine.explain_asset(rec)
    return {
        "asset_id": asset_id,
        "priority_tier": rec.get("priority_tier", "MEDIUM"),
        "failure_probability_pct": rec.get("failure_percentage", 50.0),
        "primary_risk_drivers": ["Degraded asset condition index", "Overdue maintenance window"],
        "recommended_action": f"Schedule {rec.get('priority_tier', 'MEDIUM')} priority block"
    }


@app.get("/api/station/yard/{station_code}")
def get_station_yard(station_code: str):
    st_code = station_code.upper().strip()
    yard_path = os.path.join(ROOT_DIR, "data", "topology", "station_yards.json")
    if not os.path.exists(yard_path):
        raise HTTPException(status_code=404, detail="Station yards topology file not found")

    with open(yard_path, "r") as f:
        all_yards = json.load(f)

    st_yard = next((y for y in all_yards if y["station_code"] == st_code), None)
    if not st_yard:
        raise HTTPException(status_code=404, detail=f"Yard layout for {station_code} not found")

    preds_path = os.path.join(ROOT_DIR, "data", "processed", "ml_predictions.csv")
    st_assets = []
    if os.path.exists(preds_path):
        df_p = pd.read_csv(preds_path)
        sig_matches = df_p[(df_p["department"] == "SIGNAL_AND_TELECOM") & (df_p["station"] == st_code)].copy()
        sig_matches = sig_matches.replace({np.nan: None})
        st_assets = sig_matches.to_dict(orient="records")

    point_machines = [a for a in st_assets if str(a.get("asset_type")) == "POINT_MACHINE"]
    track_circuits = [a for a in st_assets if str(a.get("asset_type")) == "TRACK_CIRCUIT"]

    points_enriched = []
    for idx, pt in enumerate(st_yard.get("points", [])):
        pt_copy = dict(pt)
        if idx < len(point_machines):
            pm = point_machines[idx]
            pt_copy["asset_id"] = pm.get("asset_id")
            pt_copy["health_index"] = pm.get("health_index", 85.0)
            pt_copy["priority_tier"] = pm.get("priority_tier", "LOW")
            pt_copy["failure_probability_pct"] = pm.get("failure_percentage", 15.0)
            pt_copy["throw_time_sec"] = pm.get("point_throw_time_sec", 4.5)
            pt_copy["motor_current_amps"] = pm.get("motor_peak_current_amps", 2.0)
            pt_copy["insulation_mohm"] = pm.get("insulation_resistance_megohm", 10.0)
            pt_copy["predicted_rul_days"] = pm.get("predicted_rul_days", 180)
        else:
            pt_copy["asset_id"] = f"SIG-PT-{st_code}-{idx+1:02d}"
            pt_copy["health_index"] = 92.0
            pt_copy["priority_tier"] = "LOW"
            pt_copy["failure_probability_pct"] = 8.0
            pt_copy["throw_time_sec"] = 4.2
            pt_copy["motor_current_amps"] = 1.9
            pt_copy["insulation_mohm"] = 12.0
            pt_copy["predicted_rul_days"] = 300
        points_enriched.append(pt_copy)

    sched_path = os.path.join(ROOT_DIR, "data", "processed", "optimized_schedule.json")
    active_blocks = []
    if os.path.exists(sched_path):
        with open(sched_path, "r") as f:
            sched_data = json.load(f)
            for b in sched_data.get("scheduled_blocks", []):
                if st_code in b.get("section", ""):
                    active_blocks.append(b)

    return {
        "station_code": st_yard["station_code"],
        "station_name": st_yard["station_name"],
        "km": st_yard["km"],
        "division": st_yard["division"],
        "interlocking_type": st_yard["interlocking_type"],
        "layout_type": st_yard["layout_type"],
        "layout_source": st_yard["layout_source"],
        "platform_count": st_yard["platform_count"],
        "track_count": st_yard["track_count"],
        "speed_limit_kmph": st_yard["speed_limit_kmph"],
        "tracks": st_yard.get("tracks", []),
        "platforms": st_yard.get("platforms", []),
        "points": points_enriched,
        "signals": st_yard.get("signals", []),
        "ohe_masts": st_yard.get("ohe_masts", []),
        "total_signal_assets": len(st_assets),
        "point_machines_count": len(point_machines),
        "track_circuits_count": len(track_circuits),
        "active_blocks": active_blocks
    }


class DelayRequest(BaseModel):
    train_number: str
    delay_minutes: int


@app.post("/api/simulate/delay")
def simulate_delay(req: DelayRequest):
    return simulator.simulate_train_delay(req.train_number, req.delay_minutes)


class DefectRequest(BaseModel):
    section: str
    line: str
    km: float
    department: str = "ENGINEERING_TRACK"


@app.post("/api/simulate/defect")
def simulate_defect(req: DefectRequest):
    return simulator.simulate_emergency_defect(
        section=req.section,
        line=req.line,
        km=req.km,
        department=req.department
    )


@app.get("/api/memos/bdms/{schedule_id}")
def generate_bdms_memo(schedule_id: str):
    sched_path = os.path.join(ROOT_DIR, "data", "processed", "optimized_schedule.json")
    if not os.path.exists(sched_path):
        raise HTTPException(status_code=404, detail="Schedule not ready")

    with open(sched_path, "r") as f:
        sched_data = json.load(f)

    block = next((b for b in sched_data.get("scheduled_blocks", []) if b["schedule_id"] == schedule_id), None)
    if not block:
        raise HTTPException(status_code=404, detail=f"Block {schedule_id} not found")

    tasks_text = "\n".join([f"  {idx+1}. [{task_id}] {desc}" for idx, (task_id, desc) in enumerate(zip(block['tasks'], block['descriptions']))])
    depts = ", ".join(block["departments"])
    machines = ", ".join(block["machines"]) if block["machines"] else "Manual Gang Equipment"

    memo_text = f"""
========================================================================================
             GOVERNMENT OF INDIA &bull; MINISTRY OF RAILWAYS (RAILWAY BOARD)
       NORTHERN & NORTH CENTRAL RAILWAYS &bull; OPERATING (CONTROL) DEPARTMENT
========================================================================================
BLOCK SANCTION MEMORANDUM &bull; JOINT SHADOW MAINTENANCE ORDER
Memo Ref No: NR/NCR/BDMS/OPT/{block['schedule_id']}                      Date: TODAY
To: Station Masters (SM / SS): {block['section'].split('-')[0].strip()} & {block['section'].split('-')[1].strip()}
Copy to: Section Controller (SCR), Chief Controller (CHC), Dy.CEE (TRD), Dy.CE (Track), Dy.CSTE

1. PERMISSION DETAILS:
   - Schedule ID          : {block['schedule_id']} (AI Optimized Multi-Dept Shadow Block)
   - Corridor Section     : {block['section']} ({block['line']} Line)
   - Kilometer Chainage   : KM {block['km_range']}
   - Sanctioned Window    : {block['start_time']} hrs to {block['end_time']} hrs IST
   - Total Net Duration   : {block['duration_min']} Minutes (0 secondary delay to Rajdhani/Vande Bharat)

2. CO-LOCATED REQUISITIONS (SHADOW BUNDLED):
{tasks_text}

3. DEPARTMENTS INVOLVED   : {depts}
4. POWER BLOCK (OHE)      : {'MANDATORY 25 kV AC Isolation Granted (TRD Staff on Site)' if block['power_block_required'] else 'Not Required'}
5. S&T DISCONNECTION      : {'Disconnection memo accepted by Station Master' if block['disconnection_required'] else 'Not Required'}
6. ROLLING ASSETS / GANG  : {machines}

7. SPECIAL CAUTION INSTRUCTIONS:
   - Ensure 10-minute headway clearance buffer before commercial train path opens.
   - All work to cease 15 min prior to block expiry; track fit certificate to be issued.

                                                      By Order &ndash; CHIEF CONTROLLER (CHC)
========================================================================================
    """
    return {
        "schedule_id": schedule_id,
        "memo_formatted_text": memo_text.strip(),
        "block_details": block
    }


@app.post("/api/upload/csv")
async def upload_custom_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files supported")

    upload_dir = os.path.join(ROOT_DIR, "data", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    try:
        run_inference(input_csv=file_path)
        scheduler.solve_schedule()
        return {"status": "SUCCESS", "message": f"Uploaded {file.filename}, ML risk scored & block schedule updated!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
