"use client";
// ② 复盘 Review — 真实成绩单。Hyperliquid 钱包自动同步 + 手动 Journal，一起算期望值，按「想法来源」拆开看。完全不耗 AI 额度。
import { useEffect, useState } from "react";
import { usePersist, load } from "../lib/store";
import { buildTrips, attachFunding, fmtDuration } from "../lib/hl";
import { summarize, bySource, verdict, SOURCES, SOURCE_LABEL, PERIODS, inPeriod } from "../lib/stats";
import { pnlOf } from "./Journal";
import { Err, Spinner } from "./ui";

const money = (x, d = 2) => (x == null ? "—" : `${x >= 0 ? "+" : "-"}$${Math.abs(x).toFixed(d)}`);
const pct = (x) => (x == null ? "—" : `${Math.round(x * 100)}%`);
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
const day = (ms) => new Date(ms).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

function Scorecard({ s }) {
  const tiles = [
    ["期望值 / 笔", money(s.expectancy), s.expectancy >= 0],
    ["胜率", pct(s.winRate), null],
    ["盈亏比", s.payoff != null ? s.payoff.toFixed(2) : "—", s.payoff != null ? s.payoff >= 1 : null],
    ["打平所需胜率", pct(s.breakevenWinRate), null],
    ["总盈亏", money(s.total, 0), s.total >= 0],
    ["最大回撤", s.maxDD ? `-$${s.maxDD.toFixed(0)}` : "—", null],
  ];
  return (
    <div className="stats six">
      {tiles.map(([l, v, good]) => (
        <div key={l}>
          <span className="label">{l}</span>
          <b className={`mono ${good == null ? "" : good ? "ok-text" : "warn-text"}`}>{v}</b>
        </div>
      ))}
    </div>
  );
}

function SourceTable({ rows }) {
  if (!rows.length) return null;
  const worst = rows.filter((r) => r.n >= 3).sort((a, b) => (a.expectancy ?? 0) - (b.expectancy ?? 0))[0];
  return (
    <div className="card">
      <div className="card-head">
        <h3>按想法来源拆开看</h3>
        <span className="dim">哪一种来源的交易真的在赚钱？</span>
      </div>
      <table className="ftable src-table">
        <thead>
          <tr>
            <td>来源</td>
            <td>笔数</td>
            <td>胜率</td>
            <td>盈亏比</td>
            <td>期望值 / 笔</td>
            <td>总盈亏</td>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.source} className={worst && r.source === worst.source && (r.expectancy ?? 0) < 0 ? "bad-row" : ""}>
              <td>{r.label}</td>
              <td className="mono">{r.n}</td>
              <td className="mono">{pct(r.winRate)}</td>
              <td className="mono">{r.payoff != null ? r.payoff.toFixed(2) : "—"}</td>
              <td className={`mono ${(r.expectancy ?? 0) >= 0 ? "ok-text" : "warn-text"}`}>{money(r.expectancy)}</td>
              <td className={`mono ${r.total >= 0 ? "ok-text" : "warn-text"}`}>{money(r.total, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {worst && (worst.expectancy ?? 0) < 0 && (
        <p className="small">
          <span className="label warn">注意</span>「{worst.label}」是目前亏得最多的来源（{worst.n} 笔，平均每笔 {money(worst.expectancy)}）。下次这类想法出现时，先在 Decision Gate 过一遍。
        </p>
      )}
    </div>
  );
}

function SyncCard({ addr, setAddr, onSynced, syncedAt, info }) {
  const [draft, setDraft] = useState(addr);
  const [days, setDays] = useState(365);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (addr && !draft) setDraft(addr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addr]);
  const valid = /^0x[0-9a-fA-F]{40}$/.test(draft.trim());

  async function sync() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/hl", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-app-pass": load("pass", "") },
        body: JSON.stringify({ user: draft.trim(), days }),
      });
      let j = {};
      try {
        j = await res.json();
      } catch {
        throw new Error(res.status === 504 ? "读取超时，请再试一次或选短一点的时间范围" : `服务器错误 ${res.status}`);
      }
      if (!res.ok) {
        if (j.auth) window.dispatchEvent(new Event("sdp-auth"));
        throw new Error(j.error || `错误 ${res.status}`);
      }
      setAddr(draft.trim().toLowerCase());
      onSynced(j);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>Hyperliquid 钱包同步</h3>
        <span className="dim">只读公开数据 · 只需要 0x 开头的公开地址</span>
      </div>
      <div className="row wrap">
        <input placeholder="0x…（公开钱包地址）" value={draft} onChange={(e) => setDraft(e.target.value)} style={{ flex: 1, minWidth: 260 }} />
        <select value={days} onChange={(e) => setDays(+e.target.value)}>
          <option value={30}>近 30 天</option>
          <option value={90}>近 90 天</option>
          <option value={365}>近 1 年</option>
          <option value={3650}>全部（最多最近 1 万笔成交）</option>
        </select>
        <button className="btn primary" disabled={!valid || busy} onClick={sync}>
          {syncedAt ? "重新同步" : "同步"}
        </button>
      </div>
      {busy && <Spinner text="正在读取成交记录和资金费…" />}
      <Err msg={err} />
      {syncedAt && !busy && (
        <div className="dim small">
          {short(addr)} · 上次同步 {new Date(syncedAt).toLocaleString("en-AU")} · {info}
        </div>
      )}
      <p className="dim small">
        🔒 永远不要在任何网站输入私钥或助记词。这里只读取链上公开的成交记录，不能下单、不能动你的钱。盈亏 = 实现盈亏 − 手续费 ± 资金费，只算永续合约（包括 trade[XYZ] 这类 HIP-3 市场），不算现货。
      </p>
    </div>
  );
}

function TripRow({ t, tag, setTag }) {
  return (
    <div className="trip">
      <span className="ticker">{t.coin}</span>
      <span className={`tag ${t.dir === "long" ? "tag-bull" : "tag-bear"}`}>{t.dir === "long" ? "LONG" : "SHORT"}</span>
      <span className="dim small">
        {day(t.openedAt)} · 持有 {fmtDuration((t.closedAt || t.lastAt) - t.openedAt)} · 最大仓位 ${Math.round(t.maxNotional).toLocaleString()}
        {t.partial && " · 开仓早于数据窗口"}
      </span>
      <span style={{ flex: 1 }} />
      <select className={`tag-select ${tag ? "" : "untagged"}`} value={tag || ""} onChange={(e) => setTag(e.target.value)}>
        <option value="">想法来源？</option>
        {SOURCES.map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
      <b className={`mono ${t.net >= 0 ? "ok-text" : "warn-text"}`} title={`实现 ${money(t.pnl)} · 手续费 -$${t.fees.toFixed(2)} · 资金费 ${money(t.funding)}`}>
        {money(t.net)}
      </b>
    </div>
  );
}

export default function Review() {
  const [addr, setAddr] = usePersist("hlAddress", "");
  // 只存算好的交易（体积小），不存原始成交，避免撑爆浏览器存储
  const [hlData, setHlData] = usePersist("hlTrips", null); // { closed, open, unmatchedFunding, fetchedAt, truncated, nFills }
  const [tags, setTags] = usePersist("hlTags", {});
  const [trades] = usePersist("trades", []);
  const [period, setPeriod] = useState("30");
  const [dataset, setDataset] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const hl = hlData || { closed: [], open: [], unmatchedFunding: 0 };
  const onSynced = (j) => {
    const r = attachFunding(buildTrips(j.fills || []), j.funding || []);
    setHlData({ ...r, fetchedAt: j.fetchedAt, truncated: j.truncated, nFills: (j.fills || []).length });
  };

  const hlItems = hl.closed.map((t) => ({ kind: "hl", id: t.id, net: t.net, at: t.closedAt, source: tags[t.id] || "", t }));
  const manual = trades
    .filter((t) => t.status === "closed" && pnlOf(t) != null)
    .map((t) => ({ kind: "manual", id: t.id, net: pnlOf(t), at: new Date(t.closedAt || t.openedAt).getTime(), source: t.source || "" }));

  const pool = (dataset === "hl" ? hlItems : dataset === "manual" ? manual : [...hlItems, ...manual]).filter((i) => inPeriod(i.at, period));
  const s = summarize(pool);
  const lines = verdict(s);
  const rows = bySource(pool);
  const untagged = hlItems.filter((i) => !i.source && inPeriod(i.at, period)).length;
  const fees = hl.closed.filter((t) => inPeriod(t.closedAt, period)).reduce((a, t) => a + t.fees, 0);

  const recent = [...hl.closed].sort((a, b) => b.closedAt - a.closedAt).filter((t) => inPeriod(t.closedAt, period));
  const shown = showAll ? recent : recent.slice(0, 25);

  const info = hlData
    ? `${hlData.nFills || 0} 条成交 → ${hl.closed.length} 笔完整交易${hl.open.length ? `，${hl.open.length} 个持仓中` : ""}${hlData.truncated ? "（记录太多，只拿到一部分）" : ""}`
    : "";

  return (
    <div className="stack">
      <SyncCard addr={addr} setAddr={setAddr} onSynced={onSynced} syncedAt={hlData?.fetchedAt} info={info} />

      <div className="row wrap">
        <div className="pills">
          {PERIODS.map(([k, l]) => (
            <button key={k} className={`pill ${period === k ? "on" : ""}`} onClick={() => setPeriod(k)}>
              {l}
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <div className="pills">
          {[
            ["all", "全部"],
            ["hl", "Hyperliquid"],
            ["manual", "手动 Journal"],
          ].map(([k, l]) => (
            <button key={k} className={`pill ${dataset === k ? "on" : ""}`} onClick={() => setDataset(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {s.n === 0 ? (
        <div className="card dim">
          这个时间段还没有已平仓的交易。{!hlData && "先在上面填入你的 Hyperliquid 公开地址并同步，"}手动交易在 Decision Gate / Journal 里记录。
        </div>
      ) : (
        <>
          <Scorecard s={s} />
          <div className="card verdict">
            <div className="card-head">
              <h3>这段时间的成绩单说了什么</h3>
              <span className="dim">
                {s.n} 笔 · 赢 {s.wins} / 亏 {s.losses}
                {dataset !== "manual" && fees > 0 && ` · Hyperliquid 手续费共 $${fees.toFixed(2)}`}
              </span>
            </div>
            {lines.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
          {untagged > 0 && dataset !== "manual" && (
            <div className="progress-note">还有 {untagged} 笔 Hyperliquid 交易没标「想法来源」。标完之后，下面那张表才能告诉你哪一类想法在亏钱。</div>
          )}
          <SourceTable rows={rows} />
        </>
      )}

      {recent.length > 0 && dataset !== "manual" && (
        <div className="card">
          <div className="card-head">
            <h3>Hyperliquid 每笔交易</h3>
            <span className="dim">给每一笔标上想法来源；鼠标停在盈亏上可以看拆分</span>
          </div>
          {shown.map((t) => (
            <TripRow key={t.id} t={t} tag={tags[t.id]} setTag={(v) => setTags((p) => ({ ...p, [t.id]: v }))} />
          ))}
          {recent.length > 25 && (
            <button className="mini ghost" onClick={() => setShowAll(!showAll)}>
              {showAll ? "收起" : `显示全部 ${recent.length} 笔`}
            </button>
          )}
        </div>
      )}

      {hl.open.length > 0 && (
        <div className="card">
          <div className="card-head">
            <h3>持仓中（还没算进成绩单）</h3>
          </div>
          {hl.open.map((t) => (
            <div className="trip" key={t.id}>
              <span className="ticker">{t.coin}</span>
              <span className={`tag ${t.dir === "long" ? "tag-bull" : "tag-bear"}`}>{t.dir === "long" ? "LONG" : "SHORT"}</span>
              <span className="dim small">
                {day(t.openedAt)} 开 · 已付手续费 ${t.fees.toFixed(2)} · 资金费 {money(t.funding)}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="dim small">只统计已平仓的交易。数据只存在这个浏览器，换设备在新设备重新同步一次即可；来源标记可以用 Journal 的「导出备份」带走。</p>
    </div>
  );
}
