"""
Master System Startup Script.
Executes end-to-end pipeline:
1. Checks / Synthesizes RDSO Railway Datasets (TMS, TDMS, SMMS, COA Timetable)
2. Trains Multi-Department ML Risk & Duration Models (XGBoost + Random Forest)
3. Executes ML Inference & Urgency Prioritization Pipeline
4. Executes Google OR-Tools CP-SAT Shadow Block Optimizer
5. Starts FastAPI Backend & Serves Interactive Control Office Web Dashboard
"""

import os
import sys
import subprocess

# Auto-detect if current Python environment lacks dependencies (e.g. default Python 3.14 vs Python 3.13)
try:
    import uvicorn
    import fastapi
    import pandas
    import xgboost
    import ortools
except ImportError:
    # Auto re-spawn using py -3.13 where all project dependencies are installed
    try:
        res = subprocess.run(["py", "-3.13", __file__] + sys.argv[1:])
        sys.exit(res.returncode)
    except Exception:
        print("\n[ERROR] Missing required dependencies in current Python interpreter.")
        print(f"Current Python: {sys.executable} ({sys.version.split()[0]})")
        print("\nPlease run the system using Python 3.13:")
        print("  py -3.13 run_system.py\n")
        sys.exit(1)

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
sys.path.append(ROOT_DIR)

from src.generator.generate_all import generate_all_datasets
from src.ml_engine.train_models import train_all_models
from src.ml_engine.predict import run_inference
from src.optimizer.ortools_scheduler import ORToolsBlockScheduler


def main():
    print("\n" + "=" * 80)
    print("  INDIAN RAILWAYS AI-POWERED AUTOMATIC BLOCK PLANNING & SCHEDULING SYSTEM")
    print("  Smart India Hackathon (SIH 2024) - Autonomous Multi-Department Optimization")
    print("=" * 80 + "\n")

    # Step 1: Datasets Check
    proc_dir = os.path.join(ROOT_DIR, "data", "processed")
    backlog_csv = os.path.join(proc_dir, "unified_maintenance_backlog.csv")
    if not os.path.exists(backlog_csv):
        print("[STEP 1/4] Synthesizing RDSO-Compliant Railway Datasets...")
        generate_all_datasets()
    else:
        print("[STEP 1/4] Railway datasets verified: OK.")

    # Step 2: ML Models Check
    models_dir = os.path.join(ROOT_DIR, "src", "ml_engine", "saved_models")
    clf_path = os.path.join(models_dir, "risk_classifier.joblib")
    if not os.path.exists(clf_path):
        print("[STEP 2/4] Training Multi-Department ML Models (XGBoost + Random Forest)...")
        train_all_models()
    else:
        print("[STEP 2/4] Trained ML model weights verified: OK.")

    # Step 3: Inference & Prioritization
    preds_csv = os.path.join(proc_dir, "ml_predictions.csv")
    if not os.path.exists(preds_csv):
        print("[STEP 3/4] Running ML Inference & Urgency Scoring...")
        run_inference()
    else:
        print("[STEP 3/4] ML Predictions & Risk queue verified: OK.")

    # Step 4: Run Google OR-Tools Optimization
    print("[STEP 4/4] Executing Google OR-Tools CP-SAT Shadow Block Optimizer...")
    scheduler = ORToolsBlockScheduler()
    sched_res = scheduler.solve_schedule()

    # Step 5: Start FastAPI Server
    print("\n" + "-" * 80)
    print("  All engines initialized successfully!")
    print("  Starting Control Office Dashboard on: http://127.0.0.1:8000")
    print("  Press Ctrl+C to stop the server.")
    print("-" * 80 + "\n")

    uvicorn.run("src.api.main:app", host="127.0.0.1", port=8000, reload=False)


if __name__ == "__main__":
    main()
