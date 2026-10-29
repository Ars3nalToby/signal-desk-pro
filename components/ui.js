"use client";
import { useEffect, useState } from "react";
import { DAILY_LIMITS, FLASH_KEYS, LITE_KEYS } from "../lib/models";
import { getUsage } from "../lib/ai";

export function Priced({ v }) {
  if (!v) return null;
  const map = { fresh: ["还没被定价", "tag-fresh"], partly: ["部分定价", "tag-partly"], crowded: ["已经拥挤", "tag-crowded"] };
  const [t, c] = map[v] || [v, ""];
  return <span className={`tag ${c}`}>{t}</span>;
}

export function Dir({ v }) {
  return v === "bear" ? <span className="tag tag-bear">▼ 利空</span> : <span className="tag tag-bull">▲ 利好</span>;
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
  const flashUsed = FLASH_KEYS.reduce((a, k) => a + (u.counts[k] || 0), 0);
  const liteUsed = LITE_KEYS.reduce((a, k) => a + (u.counts[k] || 0), 0);
  const pct = (a, b) => Math.min(100, Math.round((a / b) * 100));
  return (
    <button className="quota" onClick={() => setOpen(!open)} title="今天剩下的 AI 额度，点击看明细" aria-expanded={open}>
      <div className="q-row">
        <span>AI 额度 Flash</span>
        <div className="bar">
          <b style={{ width: 100 - pct(flashUsed, 80) + "%" }} />
        </div>
        <span className="mono">{80 - flashUsed}/80</span>
      </div>
      <div className="q-row">
        <span>Lite</span>
        <div className="bar">
          <b style={{ width: 100 - pct(liteUsed, 1000) + "%" }} />
        </div>
        <span className="mono">{1000 - liteUsed}/1000</span>
      </div>
      {open && (
        <div className="q-detail">
          {Object.entries(DAILY_LIMITS).map(([k, lim]) => (
            <div key={k} className="mono">
              {k}: {u.counts[k] || 0}/{lim}
            </div>
          ))}
          <div className="dim">主力分析用 Flash（4 个模型各 20 次/天），用完自动降到 Flash-Lite（各 500 次/天）。新闻来自 Google News，不耗额度。额度在布里斯班时间约下午 5 点重置（太平洋时间午夜）。这里只统计这台设备的用量。</div>
        </div>
      )}
    </button>
  );
}
