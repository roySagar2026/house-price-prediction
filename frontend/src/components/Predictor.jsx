import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";
import "./Predictor.css";

const CITY_FLAGS = {
  Mumbai:"🏙️", Delhi:"🏛️", Bangalore:"🌿", Hyderabad:"💎",
  Pune:"🎓", Chennai:"🌊", Kolkata:"📚", Ahmedabad:"🏺",
  Jaipur:"🏯", Kochi:"⛵"
};

function SearchSelect({ label, value, options, onChange, placeholder }) {
  const [q, setQ]         = useState("");
  const [open, setOpen]   = useState(false);
  const ref               = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(q.toLowerCase())).slice(0, 10);
  const display  = open ? q : (value || "");

  return (
    <div className="fg" ref={ref}>
      <label>{label}</label>
      <div className="dd-wrap">
        <input
          className="fc"
          placeholder={placeholder || `Search ${label}…`}
          value={display}
          onFocus={() => { setOpen(true); setQ(""); }}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
        />
        {open && filtered.length > 0 && (
          <div className="dd-list">
            {filtered.map(o => (
              <div key={o} className="dd-item" onMouseDown={() => { onChange(o); setOpen(false); setQ(""); }}>
                {CITY_FLAGS[o] && <span style={{marginRight:"0.4rem"}}>{CITY_FLAGS[o]}</span>}
                {o}
              </div>
            ))}
          </div>
        )}
        {open && filtered.length === 0 && (
          <div className="dd-list"><div className="dd-item dd-none">No matches</div></div>
        )}
      </div>
    </div>
  );
}

function Stepper({ label, value, onChange, min=1, max=10 }) {
  return (
    <div className="fg">
      <label>{label}</label>
      <div className="stepper">
        <button className="sp-btn" type="button" onClick={() => onChange(Math.max(min, value-1))}>−</button>
        <span className="sp-val">{value}</span>
        <button className="sp-btn" type="button" onClick={() => onChange(Math.min(max, value+1))}>+</button>
      </div>
    </div>
  );
}

function ResultCard({ r }) {
  const hpi  = r.market_context;
  const fmt  = n => new Intl.NumberFormat("en-IN").format(n);
  const trend_color = hpi.trend.startsWith("↑") ? "var(--teal)" :
                      hpi.trend.startsWith("↓") ? "var(--red)"  : "var(--saffron)";
  return (
    <div className="result-card fu card">
      <div className="rc-top">
        <div>
          <p className="eyebrow">Estimated Value</p>
          <div className="rc-price">
            ₹<span className="rc-num">{r.predicted_price.toFixed(2)}</span>
            <span className="rc-unit">Lakhs</span>
          </div>
          <p className="rc-ppsqft">₹{fmt(r.price_per_sqft)} per sq.ft · {r.city}</p>
        </div>
        <div className="rc-badges">
          <span className="badge badge-saffron">{r.property_type}</span>
          <span className="badge badge-green">XGBoost R²=0.94</span>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="rc-range">
        <div className="rc-range-row">
          <span>₹{r.confidence_range.low}L</span>
          <span className="rc-range-mid">Confidence Range ±15%</span>
          <span>₹{r.confidence_range.high}L</span>
        </div>
        <div className="rc-bar-track"><div className="rc-bar-fill" /></div>
      </div>

      <hr className="hr" />

      {/* RBI HPI context */}
      <div className="rc-hpi-row">
        <div className="rc-hpi-item">
          <p className="rc-hpi-label">RBI HPI ({hpi.hpi_quarter})</p>
          <p className="rc-hpi-val">{hpi.city_hpi}</p>
        </div>
        <div className="rc-hpi-item">
          <p className="rc-hpi-label">YoY Growth</p>
          <p className="rc-hpi-val" style={{color: trend_color}}>{hpi.hpi_yoy > 0 ? "+" : ""}{hpi.hpi_yoy}%</p>
        </div>
        <div className="rc-hpi-item">
          <p className="rc-hpi-label">Market Trend</p>
          <p className="rc-hpi-val" style={{color: trend_color}}>{hpi.trend}</p>
        </div>
        <div className="rc-hpi-item">
          <p className="rc-hpi-label">Data Source</p>
          <p className="rc-hpi-val" style={{fontSize:"0.75rem"}}>RBI DBIE</p>
        </div>
      </div>

      <hr className="hr" />
      <p className="rc-summary">{r.summary}</p>

      <div className="rc-meta">
        {[["Location", `${r.locality}, ${r.city}`], ["Type", r.property_type],
          ["Model", "XGBoost 500 trees"], ["Coverage", "10 Indian Cities"]].map(([k,v]) => (
          <div key={k} className="rc-meta-item">
            <span className="rc-meta-label">{k}</span>
            <span className="rc-meta-val">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Predictor() {
  const [meta, setMeta]         = useState(null);
  const [localities, setLocs]   = useState([]);
  const [form, setForm]         = useState({
    city:"Mumbai", locality:"Bandra", property_type:"Apartment",
    total_sqft:1000, bhk:2, bath:2, balcony:1, floor:5,
    age_years:2, furnishing:"Semi-Furnished", facing:"East",
  });
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [metaErr, setMetaErr]   = useState(false);

  useEffect(() => {
    api.meta().then(setMeta).catch(() => setMetaErr(true));
  }, []);

  useEffect(() => {
    if (!form.city) return;
    api.localities(form.city)
      .then(d => {
        setLocs(d.localities);
        setForm(f => ({ ...f, locality: d.localities[0] || "" }));
      })
      .catch(() => {});
  }, [form.city]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePredict = async () => {
    setLoading(true); setError(null);
    try {
      const data = await api.predict(form);
      setResult(data);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (metaErr) return (
    <div style={{padding:"3rem", textAlign:"center"}}>
      <p className="err">Cannot reach API at localhost:8000. Start the backend first.</p>
    </div>
  );

  return (
    <div className="pred-layout">
      {/* ── LEFT FORM ── */}
      <div className="pred-form card">
        <p className="eyebrow">India-Wide Valuation</p>
        <h2 className="pred-title">Property Price Estimator</h2>
        <p className="pred-sub">AI-powered price prediction across 10 major Indian cities using XGBoost + RBI HPI market data.</p>
        <hr className="hr" />

        <div className="pred-fields">
          {/* City */}
          <SearchSelect
            label="City"
            value={form.city}
            options={meta?.cities || []}
            onChange={v => set("city", v)}
          />

          {/* Locality */}
          <SearchSelect
            label="Locality / Area"
            value={form.locality}
            options={localities}
            onChange={v => set("locality", v)}
          />

          {/* Property Type */}
          <div className="fg">
            <label>Property Type</label>
            <select className="fc" value={form.property_type} onChange={e => set("property_type", e.target.value)}>
              {(meta?.property_types || []).map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Furnishing */}
          <div className="fg">
            <label>Furnishing</label>
            <select className="fc" value={form.furnishing} onChange={e => set("furnishing", e.target.value)}>
              {(meta?.furnishing_opts || []).map(f => <option key={f}>{f}</option>)}
            </select>
          </div>

          {/* Facing */}
          <div className="fg">
            <label>Facing Direction</label>
            <select className="fc" value={form.facing} onChange={e => set("facing", e.target.value)}>
              {(meta?.facings || []).map(f => <option key={f}>{f}</option>)}
            </select>
          </div>

          {/* Sqft */}
          <div className="fg" style={{gridColumn:"1/-1"}}>
            <label>Total Area (sq.ft) — {form.total_sqft}</label>
            <input type="range" min={200} max={10000} step={50} value={form.total_sqft}
              className="rng" onChange={e => set("total_sqft", Number(e.target.value))} />
            <div className="rng-ends">
              <span>200</span><span className="rng-cur">{form.total_sqft} sqft</span><span>10,000</span>
            </div>
          </div>

          {/* Floor */}
          <div className="fg" style={{gridColumn:"1/-1"}}>
            <label>Floor Number — {form.floor}</label>
            <input type="range" min={0} max={50} step={1} value={form.floor}
              className="rng" onChange={e => set("floor", Number(e.target.value))} />
            <div className="rng-ends">
              <span>Ground</span><span className="rng-cur">Floor {form.floor}</span><span>50+</span>
            </div>
          </div>

          <Stepper label="BHK"       value={form.bhk}       min={1} max={9}  onChange={v=>set("bhk",v)} />
          <Stepper label="Bathrooms" value={form.bath}      min={1} max={10} onChange={v=>set("bath",v)} />
          <Stepper label="Balconies" value={form.balcony}   min={0} max={4}  onChange={v=>set("balcony",v)} />
          <Stepper label="Property Age (yrs)" value={form.age_years} min={0} max={50} onChange={v=>set("age_years",v)} />
        </div>

        <hr className="hr" />
        {error && <div className="err" style={{marginBottom:"1rem"}}>{error}</div>}

        <button className="btn btn-primary" onClick={handlePredict} disabled={loading || !form.city || !form.locality}>
          {loading ? <><span className="spin"/> Analysing…</> : <>◈ Estimate Price</>}
        </button>
      </div>

      {/* ── RIGHT RESULT ── */}
      <div className="pred-result">
        {result ? <ResultCard r={result} /> : (
          <div className="pred-empty card">
            <div className="empty-map">
              {Object.entries(CITY_FLAGS).map(([c, f]) => (
                <button key={c} className={`city-chip ${form.city===c?"active":""}`}
                  onClick={() => set("city",c)}>
                  {f} {c}
                </button>
              ))}
            </div>
            <div className="empty-body">
              <p className="empty-title">Select a City & Estimate</p>
              <p className="empty-sub">Fill in property details to get an instant AI valuation backed by RBI House Price Index data.</p>
              <div className="empty-stats">
                {[["10","Cities Covered"],["135+","Localities"],["13K+","Training Records"],["0.94","Model R²"]].map(([v,l])=>(
                  <div key={l} className="estat">
                    <span className="estat-val">{v}</span>
                    <span className="estat-label">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
