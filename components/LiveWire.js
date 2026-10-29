"use client";
// Live Wire — 此刻全网大头条 + 各大媒体头版 + 按时间滚动的新闻流。每 2 分钟自动更新，免费，不耗 AI 额度。
import { useEffect, useRef, useState } from "react";
import { GROUPS } from "../lib/wire";
import { usePersist } from "../lib/store";
import { Spinner } from "./ui";

function ago(t, now) {
  if (!t) return "";
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.round(h / 24)} 天前`;
}
const hhmm = (t) => (t ? new Date(t).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--");

export default function LiveWire() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [group, setGroup] = usePersist("wireGroup", "all");
  const [fresh, setFresh] = useState(new Set());
  const [now, setNow] = useState(Date.now());
  const known = useRef(null);

  async function pull() {
    if (document.hidden) return;
    setBusy(true);
    try {
      const r = await fetch("/api/wire");
      const j = await r.json();
      // 这次比上次多出来的新闻标成「新」
      const links = new Set([...j.outlets, ...j.top].flatMap((f) => f.items.map((i) => i.link)));
      if (known.current) setFresh(new Set([...links].filter((l) => !known.current.has(l))));
      known.current = links;
      setD(j);
      setErr("");
    } catch (e) {
      setErr("新闻源暂时读不到，2 分钟后会自动再试。");
    }
    setBusy(false);
  }

  useEffect(() => {
    pull();
    const t = setInterval(pull, 120000);
    const c = setInterval(() => setNow(Date.now()), 30000);
    const v = () => !document.hidden && pull();
    document.addEventListener("visibilitychange", v);
    return () => {
      clearInterval(t);
      clearInterval(c);
      document.removeEventListener("visibilitychange", v);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!d) return err ? <div className="card empty">{err}</div> : <Spinner text="正在抓各大媒体的头条" />;

  const au = d.top[0]?.items || [];
  const world = d.top[1]?.items || [];
  const lead = au[0];
  const outlets = d.outlets.filter((o) => group === "all" || o.group === group);
  const stream = outlets
    .flatMap((o) => o.items.map((i) => ({ ...i, outlet: o.name })))
    .filter((i) => i.at)
    .sort((a, b) => b.at - a.at)
    .filter((i, k, arr) => arr.findIndex((x) => x.title === i.title) === k)
    .slice(0, 60);
  const down = d.outlets.filter((o) => o.error);

  return (
    <div className="stack">
      <section className="wire-top">
        <div className="wire-lead">
          <div className="wire-kicker">
            <i className="lamp on" aria-hidden />
            此刻澳洲大头条
          </div>
          {lead ? (
            <a className="wire-lead-title" href={lead.link} target="_blank" rel="noreferrer">
              {lead.title}
            </a>
          ) : (
            <div className="dim">暂时读不到头条</div>
          )}
          {lead && (
            <div className="dim small">
              {lead.source}
              {lead.at ? `，${ago(lead.at, now)}` : ""}
            </div>
          )}
          <ol className="wire-rest">
            {au.slice(1, 6).map((i) => (
              <li key={i.link}>
                <a href={i.link} target="_blank" rel="noreferrer">
                  {i.title}
                </a>
                <span className="dim small">{i.source}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="wire-world">
          <h3>全球头条</h3>
          <ol className="wire-rest">
            {world.slice(0, 7).map((i) => (
              <li key={i.link}>
                <a href={i.link} target="_blank" rel="noreferrer">
                  {i.title}
                </a>
                <span className="dim small">{i.source}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="page-bar">
        <div className="pills" role="tablist" aria-label="新闻分类">
          {GROUPS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={group === k} className={`pill ${group === k ? "on" : ""}`} onClick={() => setGroup(k)}>
              {l}
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <span className="dim small">
          {busy ? "更新中" : `每 2 分钟自动更新，上次 ${hhmm(d.at)}`}
          {fresh.size > 0 && `，新增 ${fresh.size} 条`}
        </span>
        <button className="mini" onClick={pull} disabled={busy}>
          现在更新
        </button>
      </div>

      <div className="wire-grid">
        <section className="card wire-stream" aria-live="polite">
          <div className="card-head">
            <h3>Live Wire</h3>
            <span className="dim">所有媒体按时间排，最新的在最上面</span>
          </div>
          <ol className="stream">
            {stream.map((i) => (
              <li key={i.link} className={fresh.has(i.link) ? "is-new" : ""}>
                <time className="num" dateTime={new Date(i.at).toISOString()} title={ago(i.at, now)}>
                  {hhmm(i.at)}
                </time>
                <div>
                  <a href={i.link} target="_blank" rel="noreferrer">
                    {i.title}
                  </a>
                  <div className="stream-meta">
                    <span>{i.outlet}</span>
                    <span>{ago(i.at, now)}</span>
                    {fresh.has(i.link) && <b className="new-flag">新</b>}
                  </div>
                </div>
              </li>
            ))}
            {!stream.length && <li className="dim">这个分类暂时没有新闻。</li>}
          </ol>
        </section>

        <div className="fronts">
          {outlets.map((o) => (
            <section className="card front" key={o.id}>
              <div className="front-head">
                <h3>{o.name}</h3>
                <a className="small" href={o.home} target="_blank" rel="noreferrer">
                  打开网站
                </a>
              </div>
              {o.error ? (
                <div className="dim small">暂时读不到（{o.error}）</div>
              ) : (
                <ol className="front-list">
                  {o.items.slice(0, 5).map((i, k) => (
                    <li key={i.link} className={k === 0 ? "front-lead" : ""}>
                      <a href={i.link} target="_blank" rel="noreferrer">
                        {i.title}
                      </a>
                      {i.at && <span className="dim small">{ago(i.at, now)}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      </div>
      {down.length > 0 && <p className="dim small">暂时读不到：{down.map((o) => o.name).join("、")}。通常是对方网站临时挡了，过几分钟会恢复。</p>}
      <p className="dim small">标题来自各家媒体公开的 RSS，点开会去原网站阅读；部分网站（FT、AFR、Bloomberg）需要订阅才能看全文。</p>
    </div>
  );
}
