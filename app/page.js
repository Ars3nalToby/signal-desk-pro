"use client";
import { useEffect, useState } from "react";
import MorningBoard from "../components/MorningBoard";
import HotScan from "../components/HotScan";
import Research from "../components/Research";
import DecisionGate from "../components/DecisionGate";
import Journal from "../components/Journal";
import { QuotaMeter } from "../components/ui";
import { load, save } from "../lib/store";

const TABS = [
  ["board", "①", "Morning Board", "早上扫一眼"],
  ["scan", "②", "Hot Scan", "今天研究什么"],
  ["research", "③", "Research", "骨牌 · 五步 · 五关"],
  ["gate", "④", "Decision Gate", "先写论文再下注"],
  ["journal", "⑤", "Journal", "记录与复盘"],
];

function PassPrompt({ onDone }) {
  const [v, setV] = useState("");
  return (
    <div className="modal">
      <div className="card">
        <h3>输入密码</h3>
        <p className="dim small">这个网站设置了密码锁，防止别人用你的免费 AI 额度。密码只存在这个浏览器。</p>
        <div className="row">
          <input type="password" value={v} onChange={(e) => setV(e.target.value)} autoFocus />
          <button
            className="btn primary"
            onClick={() => {
              save("pass", v);
              onDone();
            }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState("board");
  const [seed, setSeed] = useState(null);
  const [handoff, setHandoff] = useState(null);
  const [needPass, setNeedPass] = useState(false);

  useEffect(() => {
    const t = load("tab", "board");
    if (TABS.some(([k]) => k === t)) setTab(t);
    const f = () => setNeedPass(true);
    window.addEventListener("sdp-auth", f);
    return () => window.removeEventListener("sdp-auth", f);
  }, []);

  const go = (k) => {
    setTab(k);
    save("tab", k);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="logo">
            <span />
            <span />
          </div>
          <div>
            <h1>SIGNAL DESK PRO</h1>
            <div className="dim small">发现 → 研究 → 决定 → 复盘</div>
          </div>
        </div>
        <QuotaMeter />
      </header>

      <nav className="tabs">
        {TABS.map(([k, n, l, s]) => (
          <button key={k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => go(k)}>
            <span className="mono">{n}</span>
            <b>{l}</b>
            <small>{s}</small>
          </button>
        ))}
      </nav>

      <main>
        <section style={{ display: tab === "board" ? "block" : "none" }}>
          <MorningBoard />
        </section>
        <section style={{ display: tab === "scan" ? "block" : "none" }}>
          <HotScan
            onMap={(text) => {
              setSeed({ text, at: Date.now() });
              go("research");
            }}
          />
        </section>
        <section style={{ display: tab === "research" ? "block" : "none" }}>
          <Research
            seed={seed}
            onDecide={(h) => {
              setHandoff({ ...h, at: Date.now() });
              go("gate");
            }}
          />
        </section>
        <section style={{ display: tab === "gate" ? "block" : "none" }}>
          <DecisionGate handoff={handoff} onRecorded={() => go("journal")} />
        </section>
        <section style={{ display: tab === "journal" ? "block" : "none" }}>
          <Journal />
        </section>
      </main>

      <footer className="dim small">研究框架，不是投资建议。AI 会出错，所有数字自己核对原始来源。</footer>
      {needPass && <PassPrompt onDone={() => setNeedPass(false)} />}
    </div>
  );
}
