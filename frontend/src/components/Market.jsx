import React, { useState, useEffect } from "react";
import { api } from "../api";
import "./Market.css";

const CITY_FLAGS = {
  Mumbai:"🏙️", Delhi:"🏛️", Bangalore:"🌿", Hyderabad:"💎",
  Pune:"🎓", Chennai:"🌊", Kolkata:"📚", Ahmedabad:"🏺",
  Jaipur:"🏯", Kochi:"⛵"
};

function BarRow({ label, value, max, color, suffix="", flag="" }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="bar-row">
      <span className="bar-lbl">{flag && <span style={{marginRight:"0.3rem"}}>{flag}</span>}{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="bar-val">{suffix}{typeof value === "number" ? value.toLocaleString("en-IN") : value}</span>
    </div>
  );
}

function LocalityChart({ city }) {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.cityTrends(city)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [city]);

  if (loading) return <div className="chart-loading">Loading locality data…</div>;
  if (!data)   return <div className="chart-loading err">Could not load data.</div>;

  const maxVal = Math.max(...data.median);

  return (
    <div>
      <p className="chart-title">Top Localities in {city} — Median Price (₹L)</p>
      <div className="bar-chart">
        {data.labels.map((loc, i) => (
          <BarRow key={loc} label={loc} value={data.median[i]} max={maxVal}
            color="var(--saffron)" suffix="₹" />
        ))}
      </div>
    </div>
  );
}

export default function Market() {
  const [compare, setCompare]   = useState(null);
  const [selCity, setSelCity]   = useState("Mumbai");
  const [cityData, setCityData] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState(null);

  useEffect(() => {
    api.compareAll()
      .then(d => { setCompare(d.cities); setLoading(false); })
      .catch(e => { setErr(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    api.cityMarket(selCity).then(setCityData).catch(() => {});
  }, [selCity]);

  const fmt    = n => new Intl.NumberFormat("en-IN", {maximumFractionDigits:0}).format(n);
  const maxMed = compare ? Math.max(...compare.map(c => c.median_price)) : 1;
  const maxPPS = compare ? Math.max(...compare.map(c => c.avg_ppsqft))   : 1;

  return (
    <div className="mkt-layout">
      <div className="mkt-header">
        <div>
          <p className="eyebrow">10-City Comparison</p>
          <h2 className="mkt-title">India Real Estate Market</h2>
        </div>
        <div className="city-tabs">
          {compare && compare.map(c => (
            <button key={c.city}
              className={`city-tab ${selCity===c.city?"active":""}`}
              onClick={() => setSelCity(c.city)}>
              {CITY_FLAGS[c.city]} {c.city}
            </button>
          ))}
        </div>
      </div>

      {err && <div className="err">{err}</div>}

      {loading ? (
        <div className="mkt-loading"><div className="mkt-ring"/><p>Loading market data…</p></div>
      ) : (
        <>
          {/* City detail cards */}
          {cityData && (
            <div className="city-detail fu">
              <div className="cd-hero card">
                <p className="eyebrow">{selCity} · {cityData.state}</p>
                <div className="cd-stats">
                  {[
                    ["Median Price",   `₹${cityData.median_price}L`,  "var(--saffron)"],
                    ["Avg Price",      `₹${cityData.avg_price}L`,     "var(--text-0)"],
                    ["Avg ₹/sqft",     `₹${fmt(cityData.avg_ppsqft)}`, "var(--teal)"],
                    ["Listings",       fmt(cityData.total_listings),   "var(--blue)"],
                    ["Price Range",    `₹${cityData.min_price}L–₹${cityData.max_price}L`, "var(--text-0)"],
                    ["HPI (Q2'25-26)", cityData.hpi?.current || "—",   cityData.hpi?.yoy_pct > 5 ? "var(--teal)" : "var(--text-1)"],
                  ].map(([label,val,color]) => (
                    <div key={label} className="cd-stat">
                      <p className="cd-stat-label">{label}</p>
                      <p className="cd-stat-val" style={{color}}>{val}</p>
                    </div>
                  ))}
                </div>
                {cityData.hpi && (
                  <div className="hpi-badge">
                    <span>RBI HPI YoY:</span>
                    <span style={{color: cityData.hpi.yoy_pct > 5 ? "var(--teal)" : "var(--saffron)"}}>
                      {cityData.hpi.yoy_pct > 0 ? "+" : ""}{cityData.hpi.yoy_pct}% · {cityData.hpi.quarter}
                    </span>
                  </div>
                )}
              </div>
              <div className="cd-chart card">
                <LocalityChart city={selCity} />
              </div>
            </div>
          )}

          {/* Cross-city comparison charts */}
          {compare && (
            <div className="cmp-grid">
              <div className="card">
                <p className="eyebrow">City Ranking</p>
                <p className="chart-title">Median Property Price (₹ Lakhs)</p>
                <div className="bar-chart">
                  {compare.map(c => (
                    <BarRow key={c.city} label={c.city} flag={CITY_FLAGS[c.city]}
                      value={c.median_price} max={maxMed} color="var(--saffron)" suffix="₹" />
                  ))}
                </div>
              </div>

              <div className="card">
                <p className="eyebrow">Price Density</p>
                <p className="chart-title">Avg Price per Sq.ft (₹)</p>
                <div className="bar-chart">
                  {[...compare].sort((a,b) => b.avg_ppsqft - a.avg_ppsqft).map(c => (
                    <BarRow key={c.city} label={c.city} flag={CITY_FLAGS[c.city]}
                      value={c.avg_ppsqft} max={maxPPS} color="var(--teal)" suffix="₹" />
                  ))}
                </div>
              </div>

              <div className="card">
                <p className="eyebrow">RBI Official Data</p>
                <p className="chart-title">House Price Index YoY Growth % (Q2:2025-26)</p>
                <div className="bar-chart">
                  {[...compare].sort((a,b) => b.hpi_yoy - a.hpi_yoy).map(c => (
                    <BarRow key={c.city} label={c.city} flag={CITY_FLAGS[c.city]}
                      value={c.hpi_yoy} max={Math.max(...compare.map(x=>x.hpi_yoy))}
                      color={c.hpi_yoy > 5 ? "var(--teal)" : c.hpi_yoy > 2 ? "var(--saffron)" : "var(--red)"}
                      suffix="+" />
                  ))}
                </div>
              </div>

              {/* Summary table */}
              <div className="card cmp-table-wrap">
                <p className="eyebrow">Full Comparison</p>
                <p className="chart-title">All Cities at a Glance</p>
                <table className="cmp-table">
                  <thead>
                    <tr>
                      <th>City</th><th>State</th><th>Median Price</th>
                      <th>₹/sqft</th><th>HPI</th><th>YoY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compare.map(c => (
                      <tr key={c.city} className={selCity===c.city ? "active-row":""} onClick={()=>setSelCity(c.city)}>
                        <td>{CITY_FLAGS[c.city]} {c.city}</td>
                        <td>{c.state}</td>
                        <td>₹{c.median_price}L</td>
                        <td>₹{fmt(c.avg_ppsqft)}</td>
                        <td>{c.hpi_current}</td>
                        <td style={{color: c.hpi_yoy>5?"var(--teal)":c.hpi_yoy>2?"var(--saffron)":"var(--red)"}}>
                          {c.hpi_yoy > 0 ? "+" : ""}{c.hpi_yoy}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
