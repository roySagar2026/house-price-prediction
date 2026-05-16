import React, { useState, useEffect } from "react";
import { api } from "../api";
import "./HPI.css";

const CITY_COLORS = {
  India:"#ff9f1c", Mumbai:"#4f8ef7", Delhi:"#f76f6f", Bangalore:"#2dd4bf",
  Hyderabad:"#a78bfa", Pune:"#f59e0b", Chennai:"#34d399", Kolkata:"#fb7185",
  Ahmedabad:"#38bdf8", Jaipur:"#e879f9", Kochi:"#4ade80",
};

function LineChart({ history, selected }) {
  const W = 760, H = 280, PL = 55, PR = 20, PT = 20, PB = 40;
  const iW = W - PL - PR;
  const iH = H - PT - PB;

  const quarters = history.quarters;
  const nQ = quarters.length;

  const allVals = selected.flatMap(c => history[c] || []);
  const minV = Math.min(...allVals) - 2;
  const maxV = Math.max(...allVals) + 2;
  const rangeV = maxV - minV;

  const xPos = (i) => PL + (i / (nQ - 1)) * iW;
  const yPos = (v) => PT + iH - ((v - minV) / rangeV) * iH;

  const makePath = (vals) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"} ${xPos(i).toFixed(1)} ${yPos(v).toFixed(1)}`).join(" ");

  // Tick labels — show every 3rd quarter
  const tickQ = quarters.filter((_, i) => i % 3 === 0 || i === quarters.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="line-chart-svg" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0,0.25,0.5,0.75,1].map(t => {
        const y = PT + iH * t;
        const v = (maxV - rangeV * t).toFixed(1);
        return (
          <g key={t}>
            <line x1={PL} y1={y} x2={W-PR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={PL-6} y={y+4} fill="#454f66" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono, monospace">{v}</text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {quarters.map((q, i) => {
        if (i % 3 !== 0 && i !== quarters.length - 1) return null;
        return (
          <text key={q} x={xPos(i)} y={H - 8} fill="#454f66" fontSize="9"
            textAnchor="middle" fontFamily="JetBrains Mono, monospace">{q}</text>
        );
      })}

      {/* Lines */}
      {selected.map(city => {
        const vals = history[city];
        if (!vals || !vals.length) return null;
        const color = CITY_COLORS[city] || "#888";
        return (
          <g key={city}>
            <path d={makePath(vals)} fill="none" stroke={color} strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
            {vals.map((v, i) => (
              <circle key={i} cx={xPos(i)} cy={yPos(v)} r="3" fill={color} opacity="0.7" />
            ))}
            {/* Last value label */}
            <text x={xPos(vals.length-1)+6} y={yPos(vals[vals.length-1])+4}
              fill={color} fontSize="10" fontFamily="JetBrains Mono, monospace">{vals[vals.length-1]}</text>
          </g>
        );
      })}

      {/* Base year line */}
      <line x1={PL} y1={yPos(100)} x2={W-PR} y2={yPos(100)}
        stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />
      <text x={PL-6} y={yPos(100)+4} fill="rgba(255,255,255,0.3)" fontSize="9"
        textAnchor="end" fontFamily="JetBrains Mono, monospace">Base</text>
    </svg>
  );
}

export default function HPI() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]       = useState(null);
  const [selected, setSelected] = useState(["India", "Mumbai", "Delhi", "Bangalore"]);

  useEffect(() => {
    api.rbiHpiAll()
      .then(setData)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (city) => {
    setSelected(s =>
      s.includes(city) ? s.filter(c => c !== city) : [...s, city]
    );
  };

  const fmt = (n, d=1) => typeof n === "number" ? n.toFixed(d) : "—";

  return (
    <div className="hpi-layout">
      <div className="hpi-header">
        <div>
          <p className="eyebrow">Official Government Data</p>
          <h2 className="hpi-title">RBI House Price Index</h2>
          <p className="hpi-sub">
            Quarterly HPI compiled by the Reserve Bank of India from transaction-level
            data received from state registration authorities. Base year: 2022-23 = 100.
          </p>
        </div>
        <div className="hpi-source-badge">
          <span className="src-dot"/>
          <div>
            <p style={{fontWeight:600}}>Source: RBI DBIE</p>
            <p style={{fontSize:"0.72rem", color:"var(--text-2)"}}>Press Release 2025-2026/1573</p>
          </div>
        </div>
      </div>

      {err && <div className="err">{err}</div>}

      {loading ? (
        <div className="mkt-loading"><div className="mkt-ring"/><p>Fetching RBI data…</p></div>
      ) : data && (
        <>
          {/* Current values grid */}
          <div className="hpi-cards">
            {Object.entries(data.data).map(([city, vals]) => (
              <div key={city} className={`hpi-card card fu ${selected.includes(city)?"hpi-card-sel":""}`}
                onClick={() => toggle(city)}
                style={{"--city-color": CITY_COLORS[city] || "#888"}}>
                <div className="hpi-card-top">
                  <span className="hpi-city-name">{city}</span>
                  <span className={`badge ${vals.yoy_pct > 5 ? "badge-green" : vals.yoy_pct > 2 ? "badge-saffron" : "badge-red"}`}>
                    {vals.yoy_pct > 0 ? "+" : ""}{vals.yoy_pct}% YoY
                  </span>
                </div>
                <p className="hpi-cur">{fmt(vals.current)}</p>
                <div className="hpi-detail-row">
                  <span>QoQ: <b style={{color: vals.qoq_pct >= 0 ? "var(--teal)" : "var(--red)"}}>
                    {vals.qoq_pct >= 0 ? "+" : ""}{fmt(vals.qoq_pct)}%
                  </b></span>
                  <span>{vals.quarter}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Line chart */}
          <div className="card hpi-chart-card">
            <div className="hpi-chart-header">
              <div>
                <p className="eyebrow">Historical Trend</p>
                <p className="chart-title" style={{marginBottom:0}}>HPI Over Time (Q1:2022-23 → Q2:2025-26) · Click cities above to toggle</p>
              </div>
              <div className="chart-legend">
                {selected.map(c => (
                  <span key={c} className="legend-item">
                    <span className="legend-dot" style={{background: CITY_COLORS[c]||"#888"}}/>
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <LineChart history={data.history} selected={selected} />
          </div>

          {/* Insights */}
          <div className="hpi-insights g3">
            <div className="card fu">
              <p className="eyebrow">Fastest Rising</p>
              <p className="insight-val" style={{color:"var(--teal)"}}>
                {Object.entries(data.data).filter(([c])=>c!=="India").sort((a,b)=>b[1].yoy_pct-a[1].yoy_pct)[0]?.[0]}
              </p>
              <p className="insight-sub">
                +{Object.entries(data.data).filter(([c])=>c!=="India").sort((a,b)=>b[1].yoy_pct-a[1].yoy_pct)[0]?.[1].yoy_pct}% YoY
              </p>
            </div>
            <div className="card fu" style={{animationDelay:"0.05s"}}>
              <p className="eyebrow">All-India Growth</p>
              <p className="insight-val" style={{color:"var(--saffron)"}}>
                +{data.data.India?.yoy_pct}%
              </p>
              <p className="insight-sub">Annual YoY in {data.data.India?.quarter}</p>
            </div>
            <div className="card fu" style={{animationDelay:"0.1s"}}>
              <p className="eyebrow">Cities Covered</p>
              <p className="insight-val" style={{color:"var(--blue)"}}>18</p>
              <p className="insight-sub">In RBI official series (10 in this app)</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
