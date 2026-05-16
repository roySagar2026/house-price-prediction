import React from "react";
import "./Header.css";

const TABS = [
  { id: "predict", icon: "◈", label: "Predict Price" },
  { id: "market",  icon: "◎", label: "Market Compare" },
  { id: "hpi",     icon: "▲", label: "RBI HPI" },
];

export default function Header({ tab, setTab }) {
  return (
    <header className="hdr">
      <div className="hdr-inner">
        <div className="logo">
          <div className="logo-emblem">
            <span className="logo-ashoka">🏛</span>
          </div>
          <div>
            <p className="logo-name">PropSense <span className="logo-india">India</span></p>
            <p className="logo-tagline">AI Real Estate Intelligence · 10 Cities</p>
          </div>
        </div>

        <nav className="nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`nav-btn ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span className="nav-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="hdr-pill">
          <span className="live-dot" />
          <span>XGBoost · R²=0.94</span>
        </div>
      </div>
    </header>
  );
}
