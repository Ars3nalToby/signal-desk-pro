"use client";
// ① Morning Board — 来自 Global Signal Deck。完全不耗 AI 额度。
import { useEffect, useRef, useState } from "react";
import { usePersist, uid } from "../lib/store";

function TVWidget({ src, config, height }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.type = "text/javascript";
    s.innerHTML = JSON.stringify(config);
    el.appendChild(s);
    return () => {
      el.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  return <div className="tradingview-widget-container" ref={ref} style={{ minHeight: height || 60 }} />;
}

const TAPE = [
  { proName: "PEPPERSTONE:AUS200", title: "ASX 200 (CFD)" },
  { proName: "FX:AUDUSD", title: "AUD/USD" },
  { proName: "OANDA:XAUUSD", title: "Gold" },
  { proName: "PEPPERSTONE:US500", title: "S&P 500" },
  { proName: "PEPPERSTONE:NAS100", title: "Nasdaq 100" },
  { proName: "TVC:USOIL", title: "WTI Oil" },
  { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
  { proName: "COINBASE:SOLUSD", title: "Solana" },
];

const TOPICS = [
  ["asx", "ASX"],
  ["macro", "宏观/利率"],
  ["ai", "AI/芯片"],
  ["commodities", "大宗商品"],
  ["crypto", "Crypto"],
];

const LINKS = [
  ["ASX 公告", "https://www.asx.com.au/markets/trade-our-cash-market/announcements"],
  ["Market Index", "https://www.marketindex.com.au/"],
  ["HotCopper", "https://hotcopper.com.au/"],
  ["RBA", "https://www.rba.gov.au/media-releases/"],
  ["WhaleWisdom 13F", "https://whalewisdom.com/"],
  ["OpenInsider", "http://openinsider.com/"],
  ["X: ASX", "https://x.com/search?q=%24ASX%20OR%20%23ASX&f=live"],
  ["DEX Screener", "https://dexscreener.com/solana"],
];

function NewsBox() {
  const [topic, setTopic] = useState("asx");
  const [items, setItems] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    setItems(null);
    setErr("");
    fetch(`/api/news?topic=${topic}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setItems(j.items || []);
        if (j.error) setErr(j.error);
      })
      .catch((e) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [topic]);
  return (
    <div className="card">
      <div className="card-head">
        <h3>新闻 Headlines</h3>
        <div className="pills">
          {TOPICS.map(([k, l]) => (
            <button key={k} className={`pill ${topic === k ? "on" : ""}`} onClick={() => setTopic(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {!items && !err && <div className="dim">载入中…</div>}
      {err && <div className="dim">新闻源暂时读不到（{err}）</div>}
      <ul className="news">
        {items?.map((n, i) => (
          <li key={i}>
            <a href={n.link} target="_blank" rel="noreferrer">
              {n.title}
            </a>
            <span className="dim">
              {n.source} · {n.date ? new Date(n.date).toLocaleString("en-AU", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function gcalLink(c) {
  const d = c.date.replace(/-/g, "");
  const next = new Date(c.date + "T00:00:00");
  next.setDate(next.getDate() + 1);
  const d2 = next.toISOString().slice(0, 10).replace(/-/g, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `📈 ${c.title}`,
    dates: `${d}/${d2}`,
    details: `${c.note || ""}\n\n来自 Signal Desk Pro`,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

function Catalysts() {
  const [list, setList] = usePersist("catalysts", []);
  const [f, setF] = useState({ title: "", date: "", note: "" });
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = [...list].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="card">
      <div className="card-head">
        <h3>Catalyst 日历</h3>
        <span className="dim">财报、FID、季度报告、RBA 会议…</span>
      </div>
      <div className="row wrap">
        <input placeholder="事件，如 NXT 季报 / RBA 利率决议" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} style={{ flex: 2 }} />
        <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <input placeholder="备注（可选）" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} style={{ flex: 1 }} />
        <button
          className="btn"
          disabled={!f.title || !f.date}
          onClick={() => {
            setList([...list, { ...f, id: uid() }]);
            setF({ title: "", date: "", note: "" });
          }}
        >
          加入
        </button>
      </div>
      <ul className="cat-list">
        {upcoming.map((c) => (
          <li key={c.id} className={c.date < today ? "past" : ""}>
            <span className="mono">{c.date}</span>
            <span>{c.title}</span>
            <a className="mini" href={gcalLink(c)} target="_blank" rel="noreferrer">
              + Google Calendar
            </a>
            <button className="mini ghost" onClick={() => setList(list.filter((x) => x.id !== c.id))}>
              删除
            </button>
          </li>
        ))}
        {!upcoming.length && <li className="dim">还没有 catalyst。</li>}
      </ul>
    </div>
  );
}

export default function MorningBoard() {
  return (
    <div className="stack">
      <div className="card tight">
        <TVWidget
          src="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js"
          config={{ symbols: TAPE, showSymbolLogo: true, isTransparent: true, displayMode: "adaptive", colorTheme: "dark", locale: "en" }}
          height={46}
        />
      </div>
      <div className="grid2">
        <NewsBox />
        <div className="card">
          <div className="card-head">
            <h3>经济日历 Economic Calendar</h3>
            <span className="dim">AU / US / CN</span>
          </div>
          <TVWidget
            src="https://s3.tradingview.com/external-embedding/embed-widget-events.js"
            config={{ colorTheme: "dark", isTransparent: true, width: "100%", height: 460, locale: "en", importanceFilter: "0,1", countryFilter: "au,us,cn" }}
            height={460}
          />
        </div>
      </div>
      <Catalysts />
      <div className="card">
        <div className="card-head">
          <h3>快速链接</h3>
          <span className="dim">X 的 API 要付费，所以这里用链接直接跳转</span>
        </div>
        <div className="links">
          {LINKS.map(([l, u]) => (
            <a key={u} href={u} target="_blank" rel="noreferrer" className="link-btn">
              {l} ↗
            </a>
          ))}
        </div>
      </div>
      <p className="dim small">行情来自 TradingView 免费组件，可能有延迟；ASX 200 用 CFD 报价近似。如果组件空白，通常是广告拦截插件挡住了 TradingView。</p>
    </div>
  );
}
