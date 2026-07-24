"""
app.py — FastAPI backend for Email Spam Detection Web App
----------------------------------------------------------
Loads the trained model + vectorizer and exposes REST API endpoints
for predictions, bulk upload, history, and model statistics.

Start with:  python -m uvicorn app:app --reload
"""

import io
import csv
from datetime import datetime

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle

# Reuse the clean_text function from the training script
from spam_classifier import clean_text

# ── Load trained model artifacts ──────────────────────────────
with open("outputs/spam_model.pkl", "rb") as f:
    model = pickle.load(f)

with open("outputs/vectorizer.pkl", "rb") as f:
    vectorizer = pickle.load(f)

# ── Load model stats from saved CSV ──────────────────────────
model_stats = {}
try:
    stats_df = pd.read_csv("outputs/model_comparison.csv")
    for _, row in stats_df.iterrows():
        model_stats[row["model"]] = {
            "accuracy": round(row["accuracy"], 4),
            "precision": round(row["precision"], 4),
            "recall": round(row["recall"], 4),
            "f1": round(row["f1"], 4),
        }
except Exception:
    model_stats = {}

# ── Load dataset stats ────────────────────────────────────────
dataset_stats = {}
try:
    df = pd.read_csv("data/spam.csv", encoding="latin-1")
    df = df[["label", "message"]]
    df.drop_duplicates(inplace=True)
    df.dropna(inplace=True)
    counts = df["label"].value_counts().to_dict()
    dataset_stats = {
        "total_messages": int(len(df)),
        "ham_count": int(counts.get("ham", 0)),
        "spam_count": int(counts.get("spam", 0)),
        "spam_ratio": round(counts.get("spam", 0) / len(df) * 100, 1),
    }
except Exception:
    dataset_stats = {}

# ── In-memory prediction history ──────────────────────────────
prediction_history: list[dict] = []

# ── FastAPI app ───────────────────────────────────────────────
app = FastAPI(title="Email Spam Detection API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ──────────────────────────────────────────
class PredictionRequest(BaseModel):
    message: str


class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    cleaned_text: str
    timestamp: str


# ── Helper ────────────────────────────────────────────────────
def classify_message(message: str) -> dict:
    """Clean, vectorize, and predict a single message."""
    cleaned = clean_text(message)
    vec = vectorizer.transform([cleaned])
    prediction = model.predict(vec)[0]
    probability = model.predict_proba(vec)[0]
    confidence = round(float(max(probability)), 4)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    result = {
        "prediction": prediction,
        "confidence": confidence,
        "cleaned_text": cleaned,
        "timestamp": timestamp,
        "original_message": message[:200],  # truncate for history
    }

    # Store in history
    prediction_history.insert(0, result)

    return result


# ── API Routes ────────────────────────────────────────────────

@app.post("/api/predict", response_model=PredictionResponse)
async def predict_single(req: PredictionRequest):
    """Classify a single email/message as spam or ham."""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    result = classify_message(req.message)
    return result


@app.post("/api/predict/bulk")
async def predict_bulk(file: UploadFile = File(...)):
    """Upload a CSV file with a 'message' column and get predictions for all rows."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")

    contents = await file.read()
    try:
        text = contents.decode("utf-8")
    except UnicodeDecodeError:
        text = contents.decode("latin-1")

    # Parse CSV
    reader = csv.DictReader(io.StringIO(text))
    fieldnames = reader.fieldnames or []

    # Find the message column (case-insensitive)
    msg_col = None
    for col in fieldnames:
        if col.strip().lower() in ("message", "text", "email", "content", "body", "sms"):
            msg_col = col
            break

    if msg_col is None:
        raise HTTPException(
            status_code=400,
            detail=f"CSV must have a column named 'message', 'text', 'email', 'content', 'body', or 'sms'. Found columns: {fieldnames}",
        )

    results = []
    for i, row in enumerate(reader):
        msg = row.get(msg_col, "").strip()
        if msg:
            res = classify_message(msg)
            res["row"] = i + 1
            results.append(res)

    return {"total": len(results), "results": results}


@app.get("/api/history")
async def get_history():
    """Return all predictions made in this session."""
    return {"total": len(prediction_history), "history": prediction_history}


@app.delete("/api/history")
async def clear_history():
    """Clear all prediction history."""
    prediction_history.clear()
    return {"message": "History cleared."}


@app.get("/api/stats")
async def get_stats():
    """Return model performance metrics and dataset statistics."""
    return {
        "models": model_stats,
        "dataset": dataset_stats,
        "best_model": "Naive Bayes",  # from training results
    }


# ── Serve static frontend ────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def serve_frontend():
    return FileResponse("static/index.html")
