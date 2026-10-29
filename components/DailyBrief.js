"use client";
// ⓪ 今日简报 — 每天自动生成两次（布里斯班约 6:30am 开盘前、4:45pm 收盘后）。
import { useEffect, useState } from "react";
import { load, save, usePersist, uid } from "../lib/store";
import { Priced, Err, Spinner } from "./ui";

const MOOD = {
  "risk-on": ["Risk-on 偏乐观"],
  "risk-off": ["Risk-off 偏谨慎"],
  mixed: ["Mixed 分歧"],
};
const STATUS = {
  upcoming: ["即将上市", "tag-partly"],
  "this-week": ["本周上市", "tag-fresh"],
  debuted: ["刚上市", "tag-bull"],
  overseas: ["海外 IPO", ""],
};

function Src({ ids, news }) {
  if (!ids?.length || !news?.length) return null;
  return (
    <span className="src-links">
      {ids.map((i) => {
        const n = news[i - 1];
        return n ? (
          <a key={i} href={n.link} target="_blank" rel="noreferrer" title={`${n.source}：${n.title}`}>
            [{i}]
          </a>
        ) : null;
      })}
    </span>
  );
}

async function fetchBrief(refresh) {
  const r = await fetch(`/api/brief${refresh ? "?refresh=1" : ""}`, { headers: { "x-app-pass": load("pass", "") } });
  let j = {};
  try {
    j = await r.json();
  } catch {
    throw new Error(r.status === 504 ? "生成超时（超过 60 秒），请再按一次" : `服务器错误 ${r.status}`);
  }
  if (!r.ok) {
    if (j.auth) window.dispatchEvent(new Event("sdp-auth"));
    throw new Error(j.error || `错误 ${r.status}`);
  }
  return j;
}

function addCatalyst(title, when) {
  const list = load("catalysts", []);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(when) ? when : new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  save("catalysts", [...list, { id: uid(), title, date, note: "来自每日简报" }]);
  window.dispatchEvent(new CustomEvent("sdp-store", { detail: "catalysts" }));
}

export default function DailyBrief({ onMap }) {
  const [history, setHistory] = usePersist("briefs", []);
  const [viewKey, setViewKey] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [added, setAdded] = useState({});

  function keep(b) {
    setHistory((prev) => {
      const others = prev.filter((x) => x.key !== b.key);
      const old = prev.find((x) => x.key === b.key);
      const newer = !old || new Date(b.generatedAt) >= new Date(old.generatedAt) ? b : old;
      return [newer, ...others].sort((a, c) => c.key.localeCompare(a.key)).slice(0, 20);
    });
    setViewKey(b.key);
  }

  async function get(refresh) {
    setBusy(refresh ? "正在重新生成，大约 20–40 秒" : "正在读取今日简报；如果还没生成，需要 20–40 秒");
    setErr("");
    try {
      keep(await fetchBrief(refresh));
    } catch (e) {
      setErr(e.message);
    }
    setBusy("");
  }

  useEffect(() => {
    get(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const b = history.find((x) => x.key === viewKey) || history[0];
  const mood = MOOD[b?.mood];

  return (
    <div className="stack">
      <div className="page-bar">
        {history.length > 0 && (
          <select value={b?.key || ""} onChange={(e) => setViewKey(e.target.value)} aria-label="选择哪一份简报">
            {history.map((h) => (
              <option key={h.key} value={h.key}>
                {h.date} {h.slot === "am" ? "开盘前" : "收盘后"}
              </option>
            ))}
          </select>
        )}
        <span className="dim small">每天自动生成两次：约 6:30am 开盘前、4:45pm 收盘后</span>
        <span style={{ flex: 1 }} />
        <button className="btn" disabled={!!busy} onClick={() => get(true)}>
          重新生成
        </button>
      </div>
      {busy && <Spinner text={busy} />}
      <Err msg={err} />
      {!b && !busy && !err && <div className="card empty">还没有简报。按「重新生成」做今天的第一份，大约需要 30 秒。</div>}

      {b && (
        <>
          <article className={`hero mood-${b.mood || "mixed"}`}>
            <div className="hero-meta">
              <span>
                {b.date} {b.slot === "am" ? "开盘前" : "收盘后"}，{new Date(b.generatedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })} 生成
              </span>
              {mood && <span className={`mood-pill`}>{mood[0]}</span>}
            </div>
            <h2 className="hero-headline">{b.headline}</h2>
            <p className="hero-wrap">{b.marketWrap}</p>
          </article>

          <div className="brief-grid">
            <div className="stack">
              <section className="card">
                <div className="card-head">
                  <h3>ASX 异动</h3>
                  <span className="dim">只列新闻里写明原因的</span>
                </div>
                <div className="movers">
                  {(b.movers || []).map((m, i) => (
                    <div className={`mover-row ${m.dir === "down" ? "down" : "up"}`} key={i}>
                      <span className="arrow" aria-label={m.dir === "down" ? "下跌" : "上涨"}>
                        {m.dir === "down" ? "▼" : "▲"}
                      </span>
                      <div>
                        <div className="row">
                          <span className="ticker">{m.ticker}</span>
                          <span className="dim small">{m.name}</span>
                        </div>
                        <div className="small">
                          {m.reason} <Src ids={m.src} news={b.news} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {!b.movers?.length && <div className="dim">新闻里没有明确的异动原因。</div>}
                {b.volume?.length > 0 && (
                  <>
                    <h4 className="sec">放量 / 成交最多</h4>
                    {b.volume.map((v, i) => (
                      <div className="row vol-row" key={i}>
                        <span className="ticker">{v.ticker}</span>
                        <span className="small" style={{ flex: 1 }}>
                          {v.note} <Src ids={v.src} news={b.news} />
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </section>

              <section className="card">
                <div className="card-head">
                  <h3>IPO 雷达</h3>
                  <span className="dim">代码和日期以 ASX 官方名单为准</span>
                </div>
                {(b.ipos || []).map((x, i) => {
                  const days = x.date ? Math.round((new Date(x.date + "T00:00:00") - new Date(b.date + "T00:00:00")) / 864e5) : null;
                  return (
                    <div className="ipo" key={i}>
                      <div className="ipo-date">
                        {x.date ? (
                          <>
                            <b>{x.date.slice(8, 10)}</b>
                            <span>{new Date(x.date + "T00:00:00").toLocaleDateString("en-AU", { month: "short" })}</span>
                          </>
                        ) : (
                          <span>待定</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row wrap">
                          <span className="ticker">{x.code || "—"}</span>
                          <b>{x.name}</b>
                          {STATUS[x.status] && <span className={`tag ${STATUS[x.status][1]}`}>{STATUS[x.status][0]}</span>}
                          {days != null && days > 0 && <span className="dim small">{days} 天后</span>}
                        </div>
                        <div className="small">{x.detail}</div>
                        {x.watch && (
                          <div className="small dim">
                            留意：{x.watch} <Src ids={x.src} news={b.news} />
                          </div>
                        )}
                        {x.date && x.status !== "debuted" && (
                          <button
                            className="mini ghost"
                            disabled={added[`ipo${i}`]}
                            onClick={() => {
                              addCatalyst(`${x.code || x.name} 上市`, x.date);
                              setAdded({ ...added, [`ipo${i}`]: 1 });
                            }}
                          >
                            {added[`ipo${i}`] ? "已加入 Catalyst 日历" : "加入 Catalyst 日历"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!b.ipos?.length && <div className="dim">今天没有 IPO 相关消息。</div>}
                {b.floats?.length > 0 && (
                  <details>
                    <summary className="dim small">ASX 官方完整名单（{b.floats.length} 家）</summary>
                    <table className="ftable">
                      <tbody>
                        {b.floats.map((f, i) => (
                          <tr key={i}>
                            <td className="ticker">{f.code}</td>
                            <td>{f.name}</td>
                            <td className="num small">{f.listingDate}</td>
                            <td className="small dim">{[f.raise, f.price, f.sector].filter(Boolean).join("，")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <a className="small" href="https://www.asx.com.au/listings/upcoming-floats-and-listings" target="_blank" rel="noreferrer">
                      打开 ASX 官方页面
                    </a>
                  </details>
                )}
                {b.floatsError && <div className="dim small">ASX 官方名单这次没读到（{b.floatsError}），IPO 只来自新闻。</div>}
              </section>
            </div>

            <div className="stack">
              {b.geo?.length > 0 && (
                <section className="card">
                  <div className="card-head">
                    <h3>政治与战争</h3>
                    <span className="dim">只列会影响价格的</span>
                  </div>
                  {b.geo.map((g, i) => (
                    <div className={`geo risk-${g.risk || "low"}`} key={i}>
                      <div className="row wrap">
                        <b>{g.title}</b>
                        <span className="risk-pill">{g.risk === "high" ? "高风险" : g.risk === "medium" ? "中风险" : "低风险"}</span>
                      </div>
                      <div className="small">{g.what}</div>
                      <div className="small">
                        <span className="k">影响</span>
                        {g.impact}
                      </div>
                      <div className="small">
                        <span className="k">ASX</span>
                        {g.asxAngle} <Src ids={g.src} news={b.news} />
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {b.crypto?.length > 0 && (
                <section className="card crypto-card">
                  <div className="card-head">
                    <h3>Crypto 与 Hyperliquid</h3>
                  </div>
                  {b.crypto.map((c, i) => (
                    <div className="effect" key={i}>
                      <div className="row">
                        <span className="ticker">{c.asset}</span>
                      </div>
                      <div className="small">{c.what}</div>
                      <div className="small dim">
                        {c.why} <Src ids={c.src} news={b.news} />
                      </div>
                    </div>
                  ))}
                </section>
              )}

              <section className="card">
                <div className="card-head">
                  <h3>热点：二阶效应潜力</h3>
                </div>
                {(b.hot || []).map((h, i) => (
                  <div className="effect" key={i}>
                    <div className="row wrap">
                      <b>{h.title}</b>
                      <Priced v={h.priced} />
                    </div>
                    <div className="small">
                      <span className="k">二阶</span>
                      {h.why}
                    </div>
                    <div className="small">
                      <span className="k">ASX</span>
                      {h.asxAngle} <Src ids={h.src} news={b.news} />
                    </div>
                    <button className="mini" onClick={() => onMap(h.title)}>
                      推演骨牌
                    </button>
                  </div>
                ))}
              </section>

              {b.watchNext?.length > 0 && (
                <section className="card">
                  <div className="card-head">
                    <h3>接下来要盯</h3>
                  </div>
                  <ol className="timeline">
                    {b.watchNext.map((w, i) => (
                      <li key={i}>
                        <span className="when">{w.when}</span>
                        <span style={{ flex: 1 }}>{w.what}</span>
                        <button
                          className="mini ghost"
                          disabled={added[`w${i}`]}
                          onClick={() => {
                            addCatalyst(w.what, w.when);
                            setAdded({ ...added, [`w${i}`]: 1 });
                          }}
                        >
                          {added[`w${i}`] ? "已加入" : "加入日历"}
                        </button>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
          </div>

          {b.news?.length > 0 && (
            <details className="card">
              <summary className="dim small">新闻来源（{b.news.length} 条，编号对应上面的 [n]）</summary>
              <ol className="src-list">
                {b.news.map((n, i) => (
                  <li key={i}>
                    <a href={n.link} target="_blank" rel="noreferrer">
                      {n.title}
                    </a>{" "}
                    <span className="dim small">{n.source}</span>
                  </li>
                ))}
              </ol>
            </details>
          )}
          <p className="dim small">AI 只看得到新闻标题，数字以原文为准。由 {b.model} 生成，不是投资建议。</p>
        </>
      )}
    </div>
  );
}
