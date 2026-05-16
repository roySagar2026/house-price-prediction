import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Predictor from "./components/Predictor";
import Market from "./components/Market";
import HPI from "./components/HPI";
import "./App.css";

export default function App() {
  const [tab, setTab] = useState("predict");
  return (
    <div className="app">
      <Header tab={tab} setTab={setTab} />
      <main className="main">
        {tab === "predict" && <Predictor />}
        {tab === "market"  && <Market />}
        {tab === "hpi"     && <HPI />}
      </main>
    </div>
  );
}
