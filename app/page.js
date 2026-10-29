"use client";
import { useEffect, useState } from "react";
import DailyBrief from "../components/DailyBrief";
import MorningBoard from "../components/MorningBoard";
import HotScan from "../components/HotScan";
import Research from "../components/Research";
import DecisionGate from "../components/DecisionGate";
import Journal from "../components/Journal";
import Review from "../components/Review";
import MarketClock from "../components/MarketClock";
import { QuotaMeter } from "../components/ui";
import { load, save } from "../lib/store";

// 主导航：每天看的四个页面
const TABS = [
  ["brief", "今日简报", "开盘前和收盘后，一页看懂"],
  ["board", "Morning Board", "行情、Hyperliquid、新闻、日历"],
  ["scan", "Hot Scan", "今天值得研究什么"],
  ["research", "Research", "骨牌、五步、五关"],
];
// 交易工具：真的要下单时才用
const TOOLS = [
  ["gate", "Decision Gate"],
  ["review", "复盘"],
  ["journal", "Journal"],
];
const ALL = [...TABS.map((t) => t[0]), ...TOOLS.map((t) => t[0])];

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
  const [tab, setTab] = useState("brief");
  const [seed, setSeed] = useState(null);
  const [handoff, setHandoff] = useState(null);
  const [needPass, setNeedPass] = useState(false);

  useEffect(() => {
    const last = load("tab", "brief");
    if (ALL.includes(last)) setTab(last);
    const f = () => setNeedPass(true);
    window.addEventListener("sdp-auth", f);
    return () => window.removeEventListener("sdp-auth", f);
  }, []);

  const go = (k) => {
    setTab(k);
    save("tab", k);
    window.scrollTo({ top: 0 });
  };
  const toolOpen = TOOLS.some(([k]) => k === tab);

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand">
          <div className="logo" aria-hidden>
            <span />
            <span />
          </div>
          <div>
            <h1>Signal Desk</h1>
            <div className="brand-sub">JingLiang 的交易研究台</div>
          </div>
        </div>
        <MarketClock />
      </header>

      <nav className="nav" aria-label="页面">
        <div className="tabs">
          {TABS.map(([k, l, s]) => (
            <button key={k} className={`tab ${tab === k ? "on" : ""}`} aria-current={tab === k ? "page" : undefined} onClick={() => go(k)}>
              <b>{l}</b>
              <small>{s}</small>
            </button>
          ))}
        </div>
        <div className="toolbar">
          <span className="toolbar-label">交易工具</span>
          {TOOLS.map(([k, l]) => (
            <button key={k} className={`tool ${tab === k ? "on" : ""}`} aria-current={tab === k ? "page" : undefined} onClick={() => go(k)}>
              {l}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <QuotaMeter />
        </div>
      </nav>

      <main className={toolOpen ? "tools-mode" : ""}>
        <section style={{ display: tab === "brief" ? "block" : "none" }}>
          <DailyBrief
            onMap={(text) => {
              setSeed({ text, at: Date.now() });
              go("research");
            }}
          />
        </section>
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
        <section style={{ display: tab === "review" ? "block" : "none" }}>
          <Review />
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
