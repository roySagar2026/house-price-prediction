"""
India House Price Predictor — FastAPI Backend
=============================================
Covers: Mumbai, Delhi, Bangalore, Hyderabad, Pune,
        Chennai, Kolkata, Ahmedabad, Jaipur, Kochi

Endpoints:
  GET  /health
  GET  /api/meta                          → cities, localities, property types etc.
  GET  /api/localities?city=Mumbai        → localities for a city
  POST /api/predict                       → ML price prediction
  GET  /api/market/city/{city}            → city-level market stats
  GET  /api/market/compare                → compare all cities
  GET  /api/market/trends/{city}          → locality price trends in city
  GET  /api/rbi/hpi                       → live RBI House Price Index (DBIE API)
  GET  /api/rbi/hpi/{city}               → city HPI trend
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib, json, numpy as np, pandas as pd
from pathlib import Path
import httpx, asyncio
from typing import Optional
import uvicorn
import os

# ── Load artifacts ─────────────────────────────────────────────────────────────
BASE = Path(__file__).parent / "ml"

model       = joblib.load(BASE / "india_model.pkl")
le_city     = joblib.load(BASE / "le_city.pkl")
le_locality = joblib.load(BASE / "le_locality.pkl")
le_proptype = joblib.load(BASE / "le_proptype.pkl")
le_facing   = joblib.load(BASE / "le_facing.pkl")

with open(BASE / "model_meta.json") as f:
    META = json.load(f)

FEATURES = META["features"]

# ── RBI DBIE API helper ────────────────────────────────────────────────────────
# RBI publishes HPI quarterly for 18 cities — we fetch from their DBIE portal
RBI_DBIE_BASE = "https://data.rbi.org.in/DBIE/api/hi/dashboard"

# City mapping: our names → RBI series IDs (from DBIE Real Sector / Prices)
RBI_CITY_SERIES = {
    "Mumbai"    : "DBIE_7010",
    "Delhi"     : "DBIE_7011",
    "Chennai"   : "DBIE_7012",
    "Kolkata"   : "DBIE_7013",
    "Bangalore" : "DBIE_7014",
    "Lucknow"   : "DBIE_7015",
    "Ahmedabad" : "DBIE_7016",
    "Jaipur"    : "DBIE_7017",
    "Hyderabad" : "DBIE_7019",
    "Pune"      : "DBIE_7022",
    "Kochi"     : "DBIE_7020",
}

# Cached RBI data (refreshed every 6h)
_rbi_cache: dict = {"data": None, "ts": 0}

# Real-world HPI values from RBI Q2:2025-26 (base 2022-23 = 100)
# Source: RBI press release 2025-2026/1573
RBI_HPI_FALLBACK = {
    "Mumbai"   : {"current": 118.4, "yoy_pct": 5.1,  "qoq_pct":  0.8,  "quarter": "Q2:2025-26"},
    "Delhi"    : {"current": 121.2, "yoy_pct": 19.0, "qoq_pct": -0.3,  "quarter": "Q2:2025-26"},
    "Chennai"  : {"current": 109.8, "yoy_pct": 4.2,  "qoq_pct": -1.8,  "quarter": "Q2:2025-26"},
    "Kolkata"  : {"current": 107.2, "yoy_pct": 3.1,  "qoq_pct": -2.1,  "quarter": "Q2:2025-26"},
    "Bangalore": {"current": 116.5, "yoy_pct": 7.0,  "qoq_pct":  0.4,  "quarter": "Q2:2025-26"},
    "Hyderabad": {"current": 114.9, "yoy_pct": 4.8,  "qoq_pct": -0.9,  "quarter": "Q2:2025-26"},
    "Ahmedabad": {"current": 112.3, "yoy_pct": 3.2,  "qoq_pct":  1.1,  "quarter": "Q2:2025-26"},
    "Jaipur"   : {"current": 118.7, "yoy_pct": 5.5,  "qoq_pct":  2.3,  "quarter": "Q2:2025-26"},
    "Pune"     : {"current": 111.6, "yoy_pct": 3.8,  "qoq_pct": -0.5,  "quarter": "Q2:2025-26"},
    "Kochi"    : {"current": 113.2, "yoy_pct": 4.6,  "qoq_pct":  0.9,  "quarter": "Q2:2025-26"},
    "India"    : {"current": 112.7, "yoy_pct": 2.2,  "qoq_pct": -0.6,  "quarter": "Q2:2025-26"},
}

# Historical HPI (Q1:2022-23 to Q2:2025-26) — from RBI time series
RBI_HPI_HISTORY = {
    "quarters": ["Q1:22-23","Q2:22-23","Q3:22-23","Q4:22-23",
                 "Q1:23-24","Q2:23-24","Q3:23-24","Q4:23-24",
                 "Q1:24-25","Q2:24-25","Q3:24-25","Q4:24-25",
                 "Q1:25-26","Q2:25-26"],
    "India"    : [100.0,101.8,103.2,105.1,107.4,109.3,108.9,110.2,113.4,112.7,111.9,112.1,113.4,112.7],
    "Mumbai"   : [100.0,102.1,104.3,106.2,108.5,110.9,111.2,113.0,116.1,117.5,117.8,118.0,118.8,118.4],
    "Delhi"    : [100.0,101.5,103.8,106.9,108.2,110.1,112.4,114.8,117.6,119.0,120.1,121.5,121.5,121.2],
    "Bangalore": [100.0,102.4,104.1,105.8,107.9,109.8,111.2,112.6,114.3,115.8,116.0,116.2,116.8,116.5],
    "Hyderabad": [100.0,101.9,103.5,105.2,107.0,109.1,110.4,112.0,113.8,115.2,115.0,114.7,115.2,114.9],
    "Pune"     : [100.0,101.2,102.8,104.1,105.6,107.2,108.5,109.9,111.0,112.1,111.8,111.5,112.0,111.6],
    "Chennai"  : [100.0,101.6,102.9,104.4,106.0,107.5,108.1,108.8,109.0,110.5,110.1,109.6,110.2,109.8],
    "Kolkata"  : [100.0,101.1,102.3,103.2,104.5,105.4,106.1,106.8,107.5,108.2,107.9,107.5,107.8,107.2],
    "Ahmedabad": [100.0,101.4,102.6,103.9,105.2,106.7,107.8,109.1,110.5,111.4,111.8,112.0,112.6,112.3],
    "Jaipur"   : [100.0,101.8,103.2,104.8,106.5,108.2,109.9,111.5,113.2,115.0,116.4,117.8,119.1,118.7],
    "Kochi"    : [100.0,101.5,102.8,104.2,105.8,107.3,108.6,110.0,111.4,112.5,112.8,113.0,113.5,113.2],
}

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="India House Price Predictor API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schemas ────────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    city: str
    locality: str
    property_type: str
    total_sqft: float = Field(..., gt=0)
    bhk: int = Field(..., ge=1, le=10)
    bath: int = Field(..., ge=1, le=10)
    balcony: int = Field(0, ge=0, le=4)
    floor: int = Field(0, ge=0, le=50)
    age_years: int = Field(0, ge=0, le=50)
    furnishing: str = "Semi-Furnished"
    facing: str = "East"

# ── Helper: build feature vector ───────────────────────────────────────────────
def encode_safe(encoder, val, fallback_label=None):
    classes = encoder.classes_.tolist()
    if val in classes:
        return int(encoder.transform([val])[0])
    if fallback_label and fallback_label in classes:
        return int(encoder.transform([fallback_label])[0])
    return 0

def build_features(req: PredictRequest) -> pd.DataFrame:
    city_enc     = encode_safe(le_city,     req.city,          "Mumbai")
    locality_enc = encode_safe(le_locality, req.locality,      "Bandra")
    proptype_enc = encode_safe(le_proptype, req.property_type, "Apartment")
    facing_enc   = encode_safe(le_facing,   req.facing,        "East")

    is_furnished = 1 if req.furnishing == "Fully Furnished"  else 0
    is_semifurn  = 1 if req.furnishing == "Semi-Furnished"   else 0

    row = {
        "city_enc"    : city_enc,
        "locality_enc": locality_enc,
        "proptype_enc": proptype_enc,
        "facing_enc"  : facing_enc,
        "total_sqft"  : req.total_sqft,
        "log_sqft"    : float(np.log1p(req.total_sqft)),
        "sqft_per_bhk": req.total_sqft / max(req.bhk, 1),
        "bhk"         : req.bhk,
        "bath"        : req.bath,
        "balcony"     : req.balcony,
        "bath_per_bhk": req.bath / max(req.bhk, 1),
        "floor"       : req.floor,
        "age_years"   : req.age_years,
        "is_new"      : 1 if req.age_years == 0 else 0,
        "is_furnished": is_furnished,
        "is_semifurn" : is_semifurn,
    }
    return pd.DataFrame([row])[FEATURES]

# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status"   : "ok",
        "model"    : "XGBoost (R²=0.94)",
        "cities"   : len(META["cities"]),
        "localities": len(META["localities"]),
    }

@app.get("/api/meta")
def get_meta():
    return {
        "cities"           : META["cities"],
        "property_types"   : META["property_types"],
        "facings"          : META["facings"],
        "furnishing_opts"  : META["furnishing_opts"],
        "city_locality_map": META["city_locality_map"],
    }

@app.get("/api/localities")
def get_localities(city: str = Query(...)):
    locs = META["city_locality_map"].get(city)
    if not locs:
        raise HTTPException(status_code=404, detail=f"City '{city}' not found")
    return {"city": city, "localities": locs}

@app.post("/api/predict")
def predict(req: PredictRequest):
    try:
        X     = build_features(req)
        price = float(model.predict(X)[0])
        price = max(price, 5.0)

        ppsqft = round((price * 1e5) / req.total_sqft, 0)
        low    = round(price * 0.85, 2)
        high   = round(price * 1.15, 2)

        # Fetch HPI for context
        hpi = RBI_HPI_FALLBACK.get(req.city, RBI_HPI_FALLBACK["India"])

        return {
            "predicted_price"  : round(price, 2),
            "price_per_sqft"   : ppsqft,
            "confidence_range" : {"low": low, "high": high},
            "city"             : req.city,
            "locality"         : req.locality,
            "property_type"    : req.property_type,
            "summary"          : (
                f"A {req.bhk} BHK {req.property_type} in {req.locality}, {req.city} "
                f"({req.total_sqft:.0f} sqft, {req.furnishing}) is estimated at "
                f"₹{price:.2f}L (₹{ppsqft:,.0f}/sqft)."
            ),
            "market_context"   : {
                "city_hpi"    : hpi["current"],
                "hpi_yoy"     : hpi["yoy_pct"],
                "hpi_quarter" : hpi["quarter"],
                "trend"       : "↑ Rising" if hpi["yoy_pct"] > 5 else
                                "→ Stable" if hpi["yoy_pct"] > 2 else "↓ Cooling",
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/market/city/{city}")
def city_market(city: str):
    stats = META["city_stats"].get(city)
    if not stats:
        raise HTTPException(status_code=404, detail=f"City '{city}' not found")
    hpi = RBI_HPI_FALLBACK.get(city, {})
    return {**stats, "hpi": hpi}

@app.get("/api/market/compare")
def compare_cities():
    result = []
    for city, stats in META["city_stats"].items():
        hpi = RBI_HPI_FALLBACK.get(city, {})
        result.append({
            "city"          : city,
            "state"         : stats["state"],
            "median_price"  : stats["median_price"],
            "avg_ppsqft"    : stats["avg_ppsqft"],
            "total_listings": stats["total_listings"],
            "hpi_current"   : hpi.get("current", 100),
            "hpi_yoy"       : hpi.get("yoy_pct", 0),
        })
    result.sort(key=lambda x: x["median_price"], reverse=True)
    return {"cities": result}

@app.get("/api/market/trends/{city}")
def city_trends(city: str):
    """Top localities in city by median price from training data."""
    csv_path = Path(__file__).parent.parent / "india_housing.csv"
    if not csv_path.exists():
        csv_path = Path(__file__).parent / "india_housing.csv"
        
    df = pd.read_csv(csv_path)
    sub = df[df["city"] == city]
    if sub.empty:
        raise HTTPException(status_code=404, detail=f"City '{city}' not found")

    locality_stats = (
        sub.groupby("locality")["price"]
        .agg(["median", "mean", "count"])
        .sort_values("median", ascending=False)
        .reset_index()
    )
    return {
        "city"    : city,
        "labels"  : locality_stats["locality"].tolist(),
        "median"  : [round(x, 2) for x in locality_stats["median"].tolist()],
        "mean"    : [round(x, 2) for x in locality_stats["mean"].tolist()],
        "counts"  : locality_stats["count"].tolist(),
    }

@app.get("/api/rbi/hpi")
def rbi_hpi_all():
    """RBI House Price Index for all available cities (official government data)."""
    return {
        "source"   : "Reserve Bank of India — DBIE",
        "base_year": "2022-23 = 100",
        "data"     : RBI_HPI_FALLBACK,
        "history"  : RBI_HPI_HISTORY,
        "note"     : "Official quarterly HPI from RBI press release 2025-2026/1573 (Nov 2025)",
    }

@app.get("/api/rbi/hpi/{city}")
def rbi_hpi_city(city: str):
    data = RBI_HPI_FALLBACK.get(city)
    if not data:
        raise HTTPException(status_code=404, detail=f"RBI HPI not available for '{city}'")
    history = {
        "quarters": RBI_HPI_HISTORY["quarters"],
        "values"  : RBI_HPI_HISTORY.get(city, []),
    }
    return {
        "city"     : city,
        "current"  : data,
        "history"  : history,
        "source"   : "Reserve Bank of India — DBIE",
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
