"use client";
// Jensen Huang Tracker — NVIDIA 官方新闻稿 + Jensen 的新闻 + 官方快速链接。免费，不耗 AI 额度，每 30 分钟更新。
import { useEffect, useState } from "react";

// 只放核实过存在的 NVIDIA 官方页面
const LINKS = [
  ["Investor Relations", "https://investor.nvidia.com/"],
  ["Newsroom", "https://nvidianews.nvidia.com/"],
  ["GTC keynote", "https://www.nvidia.com/gtc/keynote/"],
  ["Keynote 回放", "https://www.nvidia.com/en-us/on-demand/keynote/"],
  ["GTC 活动日程", "https://www.nvidia.com/gtc/events/"],
];

function ago(t) {
  if (!t) return "";
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 60) return m < 1 ? "刚刚" : `${m} 分钟前`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} 天前` : new Date(t).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function Feed({ title, note, feed, fallback }) {
  return (
    <div className="nv-feed">
      <div className="nv-feed-head">
        <h4>{title}</h4>
        <span className="dim small">{note}</span>
      </div>
      {!feed ? (
        <div className="dim small">载入中</div>
      ) : feed.error && !feed.items?.length ? (
        <div className="nv-empty">
          这个来源暂时读不到（{feed.error}），过一阵会自动再试。
          {fallback && (
            <a href={fallback} target="_blank" rel="noreferrer">
              直接打开官方页面
            </a>
          )}
        </div>
      ) : (
        <ol className="nv-list">
          {feed.items.slice(0, 7).map((i) => (
            <li key={i.link}>
              <a href={i.link} target="_blank" rel="noreferrer">
                {i.title}
              </a>
              <span className="nv-meta">
                {i.source && <span>{i.source}</span>}
                {i.at && <span>{ago(i.at)}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function JensenTracker() {
  const [d, setD] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const pull = () =>
      fetch("/api/nvidia")
        .then((r) => r.json())
        .then((j) => {
          if (alive) {
            setD(j);
            setFailed(false);
          }
        })
        .catch(() => alive && setFailed(true));
    pull();
    const t = setInterval(pull, 30 * 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const down = { items: [], error: "网络问题" };
  return (
    <section className="nv-card" aria-labelledby="nv-title">
      <div className="nv-head">
        <div>
          <h3 id="nv-title">Jensen Huang Tracker</h3>
          <div className="dim small">NVIDIA 官方新闻稿和 Jensen 的最新动态，每 30 分钟更新</div>
        </div>
        <span className="nv-tag">NVDA</span>
      </div>

      <div className="nv-grid">
        <Feed title="NVIDIA Newsroom" note="官方新闻稿" feed={failed ? down : d?.newsroom} fallback="https://nvidianews.nvidia.com/" />
        <Feed title="Jensen Huang 新闻" note="Google News，近 14 天" feed={failed ? down : d?.jensen} />
      </div>

      <nav className="nv-links" aria-label="NVIDIA 官方链接">
        {LINKS.map(([l, u]) => (
          <a key={u} href={u} target="_blank" rel="noreferrer">
            {l}
          </a>
        ))}
      </nav>
    </section>
  );
}
