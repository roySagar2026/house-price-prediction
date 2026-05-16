# 🏛 PropSense India
### AI-Powered Real Estate Intelligence — 10 Indian Cities

[![Model](https://img.shields.io/badge/Model-XGBoost%20R²%3D0.94-orange)](/)
[![Cities](https://img.shields.io/badge/Cities-10%20Major%20Indian-blue)](/)
[![Data](https://img.shields.io/badge/RBI%20HPI-Official%20Govt%20Data-green)](/)
[![Stack](https://img.shields.io/badge/Stack-FastAPI%20%2B%20React%20%2B%20Vite-purple)](/)

---

## What Is This?

**PropSense India** is a full-stack machine learning web application that predicts residential property prices across 10 major Indian cities. It combines a trained XGBoost regression model with live government data from the Reserve Bank of India's House Price Index (RBI HPI) to give users AI valuations with real market context.

This is **not** a wrapper around any third-party real estate API — it is a complete end-to-end ML system:

```
User Input (city, locality, sqft, BHK…)
        ↓
   React Frontend  (Vite · Space Grotesk design)
        ↓  HTTP POST /api/predict
  FastAPI Backend  (Python 3.10+)
        ↓
  XGBoost Model    (R² = 0.94, RMSE ≈ ₹44L, trained on 13,800 rows)
        ↓
  RBI HPI Overlay  (official quarterly govt data, base 2022-23 = 100)
        ↓
  Price + Confidence Range + Market Context
```

---

## Cities Covered

| City | State | Localities | Avg ₹/sqft Range |
|------|-------|-----------|-----------------|
| 🏙️ Mumbai | Maharashtra | 15 | ₹8,000–₹45,000 |
| 🏛️ Delhi / NCR | Delhi | 14 | ₹4,500–₹25,000 |
| 🌿 Bangalore | Karnataka | 14 | ₹4,500–₹18,000 |
| 💎 Hyderabad | Telangana | 14 | ₹3,800–₹14,000 |
| 🎓 Pune | Maharashtra | 14 | ₹4,000–₹14,000 |
| 🌊 Chennai | Tamil Nadu | 14 | ₹4,000–₹15,000 |
| 📚 Kolkata | West Bengal | 14 | ₹3,000–₹12,000 |
| 🏺 Ahmedabad | Gujarat | 14 | ₹2,800–₹9,000 |
| 🏯 Jaipur | Rajasthan | 10 | ₹2,500–₹8,000 |
| ⛵ Kochi | Kerala | 9 | ₹3,500–₹12,000 |

**Total: 10 cities · 135 localities · 13,800 training records**

---

## Project Structure

```
india_project/
│
├── ml/                              ← Trained model artifacts
│   ├── india_model.pkl              ← XGBoost Regressor (500 estimators)
│   ├── le_city.pkl                  ← LabelEncoder for cities
│   ├── le_locality.pkl              ← LabelEncoder for localities
│   ├── le_proptype.pkl              ← LabelEncoder for property types
│   ├── le_facing.pkl                ← LabelEncoder for facing direction
│   └── model_meta.json             ← Feature list, city→locality map, city stats
│
├── backend/
│   ├── main.py                      ← FastAPI application (9 endpoints)
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx                 ← React entry point
│       ├── index.css                ← Global dark saffron theme
│       ├── App.jsx / App.css        ← Tab router (Predict / Market / HPI)
│       ├── api.js                   ← Centralized API service layer
│       └── components/
│           ├── Header.jsx/css       ← Sticky nav with model badge
│           ├── Predictor.jsx/css    ← Main price estimator UI
│           ├── Market.jsx/css       ← 10-city comparison + charts
│           └── HPI.jsx/css          ← RBI HPI with interactive line chart
│
├── india_housing.csv                ← Training dataset (13,800 rows)
├── start.sh                         ← One-command startup (Mac/Linux)
├── start.bat                        ← One-command startup (Windows)
└── README.md
```

---

## Quick Start

### Prerequisites

| Requirement | Version |
|------------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |

### Option A — One Command (Mac/Linux)

```bash
chmod +x start.sh && ./start.sh
```

### Option B — Manual (all platforms)

**Terminal 1 — Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
# API running at http://localhost:8000
# Swagger UI at http://localhost:8000/docs
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
# App running at http://localhost:5173
```

### Option C — Windows

```cmd
start.bat
```

---

## API Reference

### Base URL: `http://localhost:8000`

| Method | Endpoint | Description | Example |
|--------|----------|-------------|---------|
| GET | `/health` | Model status, city count | — |
| GET | `/api/meta` | All cities, property types, furnishing options | — |
| GET | `/api/localities?city=Mumbai` | Localities for a city | `?city=Bangalore` |
| POST | `/api/predict` | ML price prediction | See below |
| GET | `/api/market/city/{city}` | Stats for one city | `/api/market/city/Delhi` |
| GET | `/api/market/compare` | All 10 cities ranked | — |
| GET | `/api/market/trends/{city}` | Locality price trends | `/api/market/trends/Pune` |
| GET | `/api/rbi/hpi` | Full RBI HPI dataset + history | — |
| GET | `/api/rbi/hpi/{city}` | City-specific HPI + quarterly history | `/api/rbi/hpi/Mumbai` |

### POST `/api/predict`

**Request:**
```json
{
  "city":          "Mumbai",
  "locality":      "Bandra",
  "property_type": "Apartment",
  "total_sqft":    1000,
  "bhk":           2,
  "bath":          2,
  "balcony":       1,
  "floor":         5,
  "age_years":     2,
  "furnishing":    "Semi-Furnished",
  "facing":        "East"
}
```

**Response:**
```json
{
  "predicted_price":   208.61,
  "price_per_sqft":    20861.0,
  "confidence_range":  { "low": 177.32, "high": 239.90 },
  "city":              "Mumbai",
  "locality":          "Bandra",
  "property_type":     "Apartment",
  "summary":           "A 2 BHK Apartment in Bandra, Mumbai (1000 sqft, Semi-Furnished) is estimated at ₹208.61L (₹20,861/sqft).",
  "market_context": {
    "city_hpi":    118.4,
    "hpi_yoy":     5.1,
    "hpi_quarter": "Q2:2025-26",
    "trend":       "→ Stable"
  }
}
```

---

## Machine Learning Details

### Feature Engineering

| Feature | Description | Technique |
|---------|-------------|-----------|
| `city_enc` | City name → integer | LabelEncoder |
| `locality_enc` | Locality → integer | LabelEncoder |
| `proptype_enc` | Property type → integer | LabelEncoder |
| `facing_enc` | Facing direction → integer | LabelEncoder |
| `total_sqft` | Raw area | Direct |
| `log_sqft` | Log(1 + sqft) | Log transform — reduces skew |
| `sqft_per_bhk` | Area ÷ BHK | Ratio — efficiency signal |
| `bath_per_bhk` | Bathrooms ÷ BHK | Ratio — luxury signal |
| `bhk` | Bedroom count | Direct |
| `bath` | Bathroom count | Direct |
| `balcony` | Balcony count | Direct |
| `floor` | Floor number | Direct |
| `age_years` | Property age | Direct |
| `is_new` | age_years == 0 → 1 | Binary flag |
| `is_furnished` | Fully Furnished → 1 | Binary flag |
| `is_semifurn` | Semi-Furnished → 1 | Binary flag |

**Total: 16 features**

### Model Configuration

```python
XGBRegressor(
    n_estimators     = 500,
    max_depth        = 6,
    learning_rate    = 0.05,
    subsample        = 0.8,
    colsample_bytree = 0.8,
    reg_alpha        = 0.1,    # L1 regularisation
    reg_lambda       = 2.0,    # L2 regularisation
    min_child_weight = 3,
    random_state     = 42,
)
```

### Model Performance

| Metric | Value | Meaning |
|--------|-------|---------|
| **R²** | 0.9444 | 94.4% of price variance explained |
| **RMSE** | ₹44.31 Lakhs | Avg prediction error |
| **MAPE** | 14.87% | Avg % error per prediction |
| **Train/Test split** | 80/20 | 11,040 train / 2,760 test rows |

### RBI HPI Data

The RBI HPI (House Price Index) is compiled quarterly from transaction-level stamp duty data received from state registration authorities across India. It is the **only official, government-sourced residential property price index** in India.

- **Base year:** 2022-23 = 100
- **Source:** RBI DBIE portal (data.rbi.org.in)
- **Release:** RBI Press Release 2025-2026/1573 (November 2025)
- **Cities in official series:** 18 (10 included in this app)
- **This app uses:** Pre-loaded official values for Q1:2022-23 → Q2:2025-26

---

## Frontend Pages

### ◈ Price Estimator (`/`)
- City selector with 10 cities and emoji flags
- Searchable locality dropdown (auto-updates by city)
- Property type, furnishing, facing selectors
- sqft range slider (200–10,000)
- Floor number slider (0–50)
- BHK / Bath / Balcony / Age steppers
- Result card with:
  - Predicted price in Lakhs
  - ₹/sqft rate
  - ±15% confidence range bar
  - RBI HPI context (current index, YoY%, trend)
  - Market summary sentence

### ◎ Market Compare (`/market`)
- City selector tabs with flags
- Per-city stat cards: median, avg, ₹/sqft, listings, price range, HPI
- Locality bar chart for selected city
- Cross-city bar charts: median price ranking + ₹/sqft + RBI YoY%
- Sortable comparison table (click row to change city focus)

### ▲ RBI HPI (`/hpi`)
- Clickable HPI cards for each city (India + 10 cities)
- Interactive SVG line chart — toggle cities on/off
- Historical trend: Q1:2022-23 → Q2:2025-26 (14 quarters)
- Insights: fastest rising city, all-India growth, coverage
- Source attribution to RBI official press release

---

## Tech Stack

### Backend
| Package | Version | Role |
|---------|---------|------|
| FastAPI | 0.115.0 | REST API framework |
| Uvicorn | 0.30.0 | ASGI server |
| XGBoost | 2.1.1 | ML model |
| scikit-learn | 1.5.1 | Encoders, metrics |
| pandas | 2.2.2 | Data manipulation |
| numpy | 1.26.4 | Numerical ops |
| joblib | 1.4.2 | Model serialisation |
| httpx | 0.27.0 | Async HTTP (for future live API calls) |
| pydantic | 2.8.0 | Request/response validation |

### Frontend
| Package | Version | Role |
|---------|---------|------|
| React | 18.3.1 | UI framework |
| Vite | 5.4.0 | Build tool / dev server |
| Space Grotesk | Google Fonts | Primary typeface |
| Playfair Display | Google Fonts | Display headings |
| JetBrains Mono | Google Fonts | Monospace / data |
| Pure CSS | — | No component library |
| Native SVG | — | Hand-coded line chart |

---

## Roadmap — Future Updates

This section documents the planned evolution of PropSense India. The project is designed with extensibility in mind at every layer.

---

### 🟡 Phase 2 — Data & Coverage (Next 1–3 months)

**Expand to 30+ cities**
- Add Tier-2 cities: Lucknow, Bhopal, Nagpur, Surat, Coimbatore, Indore, Vadodara, Patna, Chandigarh, Vizag
- These cities have active real estate markets but are underserved by ML tools
- Implementation: extend `city_profiles` dict in dataset generator → retrain model

**Real listing data integration**
- Integrate Apify scrapers for 99acres / MagicBricks (free tier: 100 calls/month)
- Store listings in PostgreSQL with SQLAlchemy
- Model retraining pipeline triggered weekly via cron job
- Impact: replace synthetic training data with real transactions

**RBI HPI live fetch**
- Currently uses pre-loaded official values
- RBI DBIE API (`data.rbi.org.in`) publishes machine-readable JSON
- Add background task in FastAPI that fetches fresh HPI on startup + every 24h
- Cache in Redis with 6-hour TTL

---

### 🟠 Phase 3 — Model Upgrades (1–6 months)

**Per-city specialised models**
- Train a separate XGBoost model for each of the top 5 cities (Mumbai, Delhi, Bangalore, Hyderabad, Pune)
- City-specific models outperform a single global model because pricing factors are different (e.g., sea view premium in Mumbai doesn't apply in Jaipur)
- Smart router: `predict(city, …)` selects the right model file

**Automated retraining pipeline**
```
New listings (weekly scrape)
        ↓
Data cleaning + feature engineering
        ↓
Walk-forward backtest (no future leakage)
        ↓
Compare new model R² vs. deployed model
        ↓
Auto-deploy if improvement > 0.5%
```

**Add gradient boosting ensemble**
- Blend XGBoost + LightGBM + CatBoost predictions
- Weighted average based on per-city validation scores
- Expected MAPE improvement: 14.87% → ~10%

**Log(price) target transformation**
- Training on log(price) instead of raw price reduces RMSE on high-value properties
- Inverse transform at prediction time
- Especially important for Mumbai (₹1Cr+ properties skew RMSE)

**SHAP explanations**
- Integrate `shap` library to explain each prediction
- Show which features pushed the price up/down
- Example: "Floor premium +₹8L | Furnishing +₹12L | Location -₹5L"

---

### 🔴 Phase 4 — Product Features (3–9 months)

**User accounts + saved searches**
- FastAPI + JWT authentication (python-jose)
- PostgreSQL user table
- Save predictions, compare properties, track price changes over time

**Price trend alerts**
- User subscribes to locality + BHK type
- Email/WhatsApp alert when median price changes by >3%
- Stack: Celery + Redis + SendGrid

**Comparable properties**
- For each prediction, show 5 similar properties from the database
- Nearest-neighbour search on feature vector (sklearn NearestNeighbors)

**Interactive India map**
- Replace bar charts with a choropleth map of India
- City bubbles sized by listing count, coloured by HPI growth
- Library: Leaflet.js + GeoJSON state boundaries (free, no API key)

**Mobile app**
- React Native app using the same FastAPI backend
- Offline mode: cache last 7 days of predictions in SQLite
- Push notifications for price alerts

---

### 🟣 Phase 5 — Enterprise / ML-Ops (6–12 months)

**MLflow experiment tracking**
```python
import mlflow
mlflow.xgboost.autolog()
# Tracks: params, metrics, model artifact, feature importance
# UI at http://localhost:5000
```

**Docker + CI/CD**
```yaml
# docker-compose.yml
services:
  backend:   build: ./backend   ports: ["8000:8000"]
  frontend:  build: ./frontend  ports: ["5173:80"]
  postgres:  image: postgres:16
  redis:     image: redis:7
  mlflow:    image: ghcr.io/mlflow/mlflow
```

**Model drift monitoring**
- Track prediction distribution weekly using Evidently AI
- Alert if input feature distribution shifts (e.g., sudden spike in 4BHK requests)
- Trigger retraining if PSI (Population Stability Index) > 0.2

**Cloud deployment**
| Component | Service | Cost |
|-----------|---------|------|
| Backend | Railway / Render | Free–$5/mo |
| Frontend | Vercel | Free |
| Database | Supabase (PostgreSQL) | Free tier |
| Model store | HuggingFace Hub | Free |
| CI/CD | GitHub Actions | Free |

**Real estate investment scoring**
- Score each locality 1–10 on: price momentum, HPI growth, supply/demand ratio
- Powered by weighted combination of model predictions + RBI data
- Useful for investors comparing neighbourhoods

---

### What Won't Change

Some design decisions are intentional and will remain:

- **No third-party paid API dependency** — the system works entirely offline with the trained model + RBI govt data
- **FastAPI backend** — Python's async performance is sufficient for this use case; no need to switch to Go/Rust
- **Single-file React components** — no Redux, no complex state management; the app is intentionally simple to read and extend
- **Transparent model** — XGBoost is interpretable via feature importance and SHAP; no black-box neural nets

---

## Known Limitations (Current Version)

| Limitation | Impact | Fix in Phase |
|-----------|--------|-------------|
| Training data is synthetic (based on real benchmarks, not scraped listings) | Predictions are calibrated but not from actual transactions | Phase 2 |
| Model is global (one model for all cities) | City-specific nuances slightly underfit | Phase 3 |
| RBI HPI is pre-loaded, not live-fetched | Quarterly data may be 1–3 months stale | Phase 2 |
| No user accounts | Can't save or compare predictions | Phase 4 |
| 10 cities only | Tier-2 cities missing | Phase 2 |
| Confidence range is fixed ±15% | Not calibrated per-city or per-property-type | Phase 3 |

---

## Data Sources & Credits

| Source | What | License |
|--------|------|---------|
| Reserve Bank of India (DBIE) | Quarterly House Price Index, 18 cities | Public domain (govt.) |
| Knight Frank India Report 2024-25 | City-level ₹/sqft benchmarks used for dataset calibration | Cited |
| NoBroker Market Report 2024 | Locality-level pricing reference | Cited |
| Original BHP dataset (Bangalore) | Historical reference for Bangalore locality list | MIT |

---

## License

MIT License — free to use, modify, and distribute.

---

## Live
`Backend` - https://house-price-api-gmqr.onrender.com/docs
`Frontend` - https://house-price-prediction-tksi-b9ogdxe0f.vercel.app/

## Author

Built by **Roy** (Sagar) — B.Tech CSE · HFT & ML Systems  
*As part of a portfolio project demonstrating end-to-end ML system design.*

> "The goal was to build something real — not a toy notebook, but a deployable system with a proper API, a proper frontend, and real government data baked in."
