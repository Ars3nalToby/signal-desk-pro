"use client";
// ② Hot Scan — 来自 Domino Desk。每次扫描用 1 次搜索额度。
import { useState } from "react";
import { runTask } from "../lib/ai";
import { usePersist } from "../lib/store";
import { Priced, Sources, Err, Spinner } from "./ui";

export default function HotScan({ onMap }) {
  const [focus, setFocus] = useState("");
  const [last, setLast] = usePersist("hotscan", null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function scan() {
    setBusy(true);
    setErr("");
    try {
      const r = await runTask("hotscan", { focus });
      setLast({ ...r, at: new Date().toISOString(), focus });
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  const items = last?.data?.items || [];
  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <h3>全球热点扫描</h3>
          <span className="dim">抓取 Google News 过去 48 小时，AI 按「二阶效应潜力」排序，不是按热度</span>
        </div>
        <div className="row">
          <input placeholder="方向（可选）：如 AI 数据中心、锂、利率、医疗…" value={focus} onChange={(e) => setFocus(e.target.value)} style={{ flex: 1 }} />
          <button className="btn primary" onClick={scan} disabled={busy}>
            {busy ? "扫描中…" : "扫描 (1 次 AI)"}
          </button>
        </div>
        {busy && <Spinner text="抓新闻 → Gemini 分析中…（10–40 秒）" />}
        <Err msg={err} />
      </div>

      {last && (
        <div className="dim small">
          上次扫描：{new Date(last.at).toLocaleString("en-AU")} {last.focus ? `· 方向：${last.focus}` : ""}
        </div>
      )}

      {items.map((it, i) => (
        <div className="card scan-item" key={i}>
          <div className="heat">
            <span className="mono">HEAT</span>
            <b>{it.heat}</b>
          </div>
          <div style={{ flex: 1 }}>
            <h4>{it.titleZh || it.title}</h4>
            {it.titleZh && <div className="dim small">{it.title}</div>}
            <p>{it.what}</p>
            <p>
              <span className="label">二阶潜力</span> {it.why}
            </p>
            <p>
              <span className="label">ASX 角度</span> {it.asxAngle}
            </p>
            <div className="row">
              <Priced v={it.priced} />
              <span style={{ flex: 1 }} />
              <button className="btn" onClick={() => onMap(it.titleZh || it.title)}>
                推演骨牌 →
              </button>
            </div>
          </div>
        </div>
      ))}
      {last && <Sources list={last.sources} model={last.model} />}
    </div>
  );
}
