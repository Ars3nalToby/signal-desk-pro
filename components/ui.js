"use client";
import { useEffect, useState } from "react";
import { DAILY_LIMITS, SEARCH_DAILY_TOTAL } from "../lib/models";
import { getUsage } from "../lib/ai";

export function Priced({ v }) {
  if (!v) return null;
  const map = { fresh: ["FRESH 未定价", "tag-fresh"], partly: ["PARTLY 部分定价", "tag-partly"], crowded: ["CROWDED 拥挤", "tag-crowded"] };
  const [t, c] = map[v] || [v, ""];
  return <span className={`tag ${c}`}>{t}</span>;
}

export function Dir({ v }) {
  return v === "bear" ? <span className="tag tag-bear">▼ BEAR</span> : <span className="tag tag-bull">▲ BULL</span>;
}

export function Gates({ g }) {
  if (!g) return null;
  const names = [
    ["chokepoint", "卡位"],
    ["orderBook", "订单拐点"],
    ["scarcity", "产能稀缺"],
    ["leverage", "经营杠杆"],
    ["discovery", "发现缺口"],
  ];
  const n = names.filter(([k]) => g[k]).length;
  return (
    <div className="gates">
      {names.map(([k, zh]) => (
        <span key={k} className={`gate ${g[k] ? "on" : ""}`}>
          {g[k] ? "✓" : "✗"} {zh}
        </span>
      ))}
      <span className="gate-score">{n}/5</span>
    </div>
  );
}

export function Sources({ list, model }) {
  if (!list?.length && !model) return null;
  return (
    <div className="sources">
      {model && <span className="model-chip">{model}</span>}
      {list?.map((s, i) => (
        <a key={i} href={s.uri} target="_blank" rel="noreferrer">
          {s.title}
        </a>
      ))}
    </div>
  );
}

export function Err({ msg }) {
  if (!msg) return null;
  return <div className="err">⚠ {msg}</div>;
}

export function Spinner({ text }) {
  return (
    <div className="spinner">
      <span className="dots">
        <i />
        <i />
        <i />
      </span>
      {text}
    </div>
  );
}

// 顶部的「今日 AI 额度」仪表
export function QuotaMeter() {
  const [u, setU] = useState({ counts: {} });
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const f = () => setU(getUsage());
    f();
    window.addEventListener("sdp-usage", f);
    const t = setInterval(f, 60000);
    return () => {
      window.removeEventListener("sdp-usage", f);
      clearInterval(t);
    };
  }, []);
  const searchUsed = (u.counts["gemini-2.5-flash"] || 0) + (u.counts["gemini-2.5-flash-lite"] || 0);
  const flashKeys = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3-flash"];
  const flashUsed = flashKeys.reduce((a, k) => a + (u.counts[k] || 0), 0);
  const pct = (a, b) => Math.min(100, Math.round((a / b) * 100));
  return (
    <div className="quota" onClick={() => setOpen(!open)} title="点击看明细">
      <div className="q-row">
        <span>搜索</span>
        <div className="bar">
          <b style={{ width: pct(searchUsed, SEARCH_DAILY_TOTAL) + "%" }} />
        </div>
        <span className="mono">
          {SEARCH_DAILY_TOTAL - searchUsed}/{SEARCH_DAILY_TOTAL}
        </span>
      </div>
      <div className="q-row">
        <span>推理</span>
        <div className="bar">
          <b style={{ width: pct(flashUsed, 80) + "%" }} />
        </div>
        <span className="mono">{80 - flashUsed}/80</span>
      </div>
      {open && (
        <div className="q-detail">
          {Object.entries(DAILY_LIMITS).map(([k, lim]) => (
            <div key={k} className="mono">
              {k}: {u.counts[k] || 0}/{lim}
            </div>
          ))}
          <div className="dim">推理用完会自动降到 Flash-Lite（每天 500 次）。额度在布里斯班时间约下午 5 点重置（太平洋时间午夜）。这里只统计这台设备的用量。</div>
        </div>
      )}
    </div>
  );
}
