# ml-engine/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from sentence_transformers import SentenceTransformer, util
from sklearn.ensemble import IsolationForest
import pandas as pd
import numpy as np
import warnings

# Suppress sklearn warnings
warnings.filterwarnings('ignore')

app = FastAPI(title="Matrix AI - NLP & Analytics Engine", description="NLP BERT models & Predictive Anomaly Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("")
print("="*60)
print("🧠 Matrix AI ML Engine Starting...")
print("-> Initializing Semantic NLP Model (Using CPU/GPU)...")
try:
    nlp_model = SentenceTransformer('all-MiniLM-L6-v2')
    print("-> ✅ NLP Model Loaded (MiniLM-L6-v2 Sentence Transformer).")
except Exception as e:
    print(f"-> ❌ Error loading NLP Model: {e}")
    nlp_model = None
print("="*60)
print("")

# Input schemas
class MLAnalysisRequest(BaseModel):
    user_id: str
    logged_tasks: List[str]
    assigned_responsibilities: List[str]
    hours_worked: float
    total_entries_last_7_days: int

class MLInsightsResponse(BaseModel):
    alignment_score: float
    alignment_details: str
    burnout_risk: str
    burnout_score: float
    anomaly_detected: bool

@app.get("/")
def check_status():
    return {"status": "Matrix ML Engine is Online", "nlp_loaded": nlp_model is not None}

@app.post("/analyze", response_model=MLInsightsResponse)
def run_predictive_analytics(req: MLAnalysisRequest):
    if not nlp_model:
        raise HTTPException(status_code=500, detail="NLP model failed to load. Check PyTorch/Transformers installation.")

    # -------------------------------------------------------------
    # 1. NLP SEMANTIC ALIGNMENT (Sentence Transformers | BERT Base)
    # Measures how semantically close the user's daily logged Timesheet "tasks"
    # are to the "Responsibilities" officially assigned in the Role Matrix.
    # -------------------------------------------------------------
    alignment_score = 0.85 # default fallback
    align_detail = "Waiting for valid daily tasks..."

    if req.logged_tasks and req.assigned_responsibilities:
        try:
            # Generate Neural Embeddings
            task_embeddings = nlp_model.encode(req.logged_tasks, convert_to_tensor=True)
            role_embeddings = nlp_model.encode(req.assigned_responsibilities, convert_to_tensor=True)
            
            # Compute Cosine Similarity array using dot product geometry
            cosine_scores = util.cos_sim(task_embeddings, role_embeddings)
            
            # Find the best responsibility match for each task
            best_matches = cosine_scores.max(dim=1).values
            alignment_score = float(best_matches.mean().item())
        except Exception as e:
            print("NLP calculation error:", e)
    
    # Process Score insight
    alignment_percent = round(alignment_score * 100, 1)
    if alignment_percent > 85:
        align_detail = f"High structural alignment ({alignment_percent}%). NLP indicates tasks closely mirror defined responsibilities."
    elif alignment_percent > 65:
        align_detail = f"Moderate alignment ({alignment_percent}%). Model detects tasks deviating slightly from assigned matrix objectives."
    else:
        align_detail = f"Low alignment ({alignment_percent}%). NLP warns user is frequently logging tasks outside their defined matrix scope."


    # -------------------------------------------------------------
    # 2. UNSUPERVISED PREDICTIVE ANALYTICS (Scikit-Learn Isolation Forest)
    # Learns statistical baselines of workforce behaviour and outputs anomaly markers.
    # -------------------------------------------------------------
    try:
        # Create a small organizational baseline matrix of typical working behavior
        # In a full-production environment, this queries from Prisma DB.
        baseline_data = pd.DataFrame({
            'hours': [8, 8.5, 7.5, 9, 8, 7.8, 8.2, 7.9, 8],
            'entries': [5, 6, 5, 7, 5, 5, 6, 5, 5]
        })
        user_df = pd.DataFrame({
            'hours': [req.hours_worked],
            'entries': [req.total_entries_last_7_days]
        })
        
        # Combine baseline + target user
        combined_df = pd.concat([baseline_data, user_df])
        
        # Initialize an Isolation Forest unsupervised model
        clf = IsolationForest(contamination=0.15, random_state=42)
        clf.fit(combined_df[['hours', 'entries']])
        
        # Predict anomaly (-1 = Anomaly / Outlier, 1 = Normal Inlier)
        is_anomaly = clf.predict(user_df[['hours', 'entries']])[0] == -1
        
        # Calculate algorithmic burnout momentum metrics
        burnout_metric = (req.hours_worked / 8.0) * (req.total_entries_last_7_days / 5.0)
        burnout_str = "Optimal"
        
        if is_anomaly and req.hours_worked > 10:
            burnout_str = "Critical Risk"
        elif req.hours_worked > 9 or req.total_entries_last_7_days > 6:
            burnout_str = "Elevated Risk"
            
    except Exception as e:
        print("Scikit-learn isolation error:", e)
        is_anomaly = False
        burnout_metric = 0.5
        burnout_str = "Unknown"

    return MLInsightsResponse(
        alignment_score=alignment_percent,
        alignment_details=align_detail,
        burnout_risk=burnout_str,
        burnout_score=round(float(burnout_metric), 2),
        anomaly_detected=bool(is_anomaly)
    )

if __name__ == "__main__":
    import uvicorn
    # Launch self-hosted Python Uvicorn ASGI Server
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
