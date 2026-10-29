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
      <section className="scan-hero">
        <h2>今天全世界发生的事里，哪一件最可能传导到你的股票？</h2>
        <p className="dim">抓 Google News 过去 48 小时的新闻，按「二阶效应潜力」排序，而不是按热度。热度高的通常已经被定价了。</p>
        <div className="row">
          <input placeholder="想聚焦某个方向可以写在这里，例如 AI 数据中心、锂、利率、医疗" value={focus} onChange={(e) => setFocus(e.target.value)} style={{ flex: 1 }} />
          <button className="btn primary" onClick={scan} disabled={busy}>
            {busy ? "正在扫描" : "开始扫描"}
          </button>
        </div>
        <div className="dim small">每次扫描用 1 次 AI 额度，大约 10–40 秒。</div>
        {busy && <Spinner text="正在抓新闻并分析" />}
        <Err msg={err} />
      </section>

      {last && (
        <div className="dim small">
          上次扫描 {new Date(last.at).toLocaleString("en-AU")}
          {last.focus ? `，方向：${last.focus}` : ""}
        </div>
      )}

      {!last && !busy && <div className="card empty">还没有扫描结果。按「开始扫描」看看今天的热点。</div>}

      <ol className="scan-list">
        {items.map((it, i) => (
          <li className="scan-item" key={i}>
            <div className="rank" aria-label={`第 ${i + 1} 名`}>
              {i + 1}
            </div>
            <div className="scan-body">
              <div className="row wrap">
                <h4>{it.titleZh || it.title}</h4>
                <Priced v={it.priced} />
              </div>
              {it.titleZh && <div className="dim small">{it.title}</div>}
              <p>{it.what}</p>
              <p>
                <span className="k">二阶潜力</span> {it.why}
              </p>
              <p>
                <span className="k">ASX 角度</span> {it.asxAngle}
              </p>
              <div className="row">
                <div className="heat-bar" title={`热度 ${it.heat}/10`}>
                  <span>热度</span>
                  <i>
                    <b style={{ width: `${Math.min(10, +it.heat || 0) * 10}%` }} />
                  </i>
                  <span className="num">{it.heat}/10</span>
                </div>
                <span style={{ flex: 1 }} />
                <button className="btn" onClick={() => onMap(it.titleZh || it.title)}>
                  推演骨牌
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {last && <Sources list={last.sources} model={last.model} />}
    </div>
  );
}
