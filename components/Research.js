"use client";
// ③ Research — 三合一：Chain Mapper（Domino Desk）→ 五步 pipeline（Signal Desk Pro）→ Next Nvidia 五关（Domino Desk）
import { useEffect, useRef, useState } from "react";
import { runTask } from "../lib/ai";
import { usePersist, uid } from "../lib/store";
import { Priced, Dir, Gates, Sources, Err, Spinner } from "./ui";

const MARKETS = [
  ["asx", "ASX"],
  ["us", "美股"],
  ["any", "不限"],
  ["hk", "港股"],
];

const STAGES = [
  { key: "signal", n: "01", zh: "信号定性", q: "这个反常是真的吗？", search: true },
  { key: "trend", n: "02", zh: "趋势还是噪音", q: "拉成曲线，是趋势还是噪音？", search: false },
  { key: "structural", n: "03", zh: "结构性需求", q: "是长期结构性需求吗？", search: true },
  { key: "valuechain", n: "04", zh: "产业链卡位", q: "谁卡在关键位置直接受益？", search: false },
  { key: "inst", n: "05", zh: "机构验证", q: "机构连续几个季度怎么做？", search: true },
  { key: "verdict", n: "06", zh: "结论", q: "分数、进出场框架、风险", search: false },
];

const EXAMPLES = [
  "药房里 GLP-1 减肥针长期缺货，病人排队登记",
  "DRAM / SSD 零售价连续几周上调，热门型号缺货",
  "电费明显变贵，新闻说数据中心在抢电网容量",
  "建筑工地电工排期排到三个月后",
];

function MarketPick({ v, set }) {
  return (
    <div className="pills">
      {MARKETS.map(([k, l]) => (
        <button key={k} className={`pill ${v === k ? "on" : ""}`} onClick={() => set(k)}>
          {l}
        </button>
      ))}
    </div>
  );
}

/* ───────── Chain Mapper ───────── */
function ChainResult({ r }) {
  const d = r.data;
  return (
    <div className="stack">
      <div className="card trigger">
        <span className="label">TRIGGER</span>
        <h4>{d.trigger}</h4>
        <div className="grid2 small">
          <div>
            <span className="label ok">已确认</span> {d.confirmed}
          </div>
          <div>
            <span className="label warn">未确认</span> {d.unconfirmed}
          </div>
        </div>
      </div>
      <div className="domino">
        {(d.orders || []).map((o) => (
          <div className="card order" key={o.order}>
            <div className="order-head">
              <span className="tile">{o.order}</span>
              <b>{o.label}</b>
            </div>
            {(o.effects || []).map((e, i) => (
              <div className="effect" key={i}>
                <div className="row">
                  <span className="ticker">{e.ticker}</span>
                  <span className="dim small">{e.name}</span>
                  <span style={{ flex: 1 }} />
                  <Dir v={e.dir} />
                </div>
                <div className="small">{e.mechanism}</div>
                <Priced v={e.priced} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="card">
        <p>
          <span className="label">最佳风险回报</span> {d.bestRiskReward}
        </p>
        <p>
          <span className="label warn">失效条件</span> {d.killSwitch}
        </p>
        <p>
          <span className="label">接下来盯</span> {d.watch}
        </p>
      </div>
      <Sources list={r.sources} model={r.model} />
    </div>
  );
}

function ChainMapper({ seed, onSave }) {
  const [headline, setHeadline] = useState(seed || "");
  const [market, setMarket] = useState("asx");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (seed) setHeadline(seed);
  }, [seed]);

  async function go() {
    setBusy(true);
    setErr("");
    setRes(null);
    try {
      const r = await runTask("chain", { headline, market });
      setRes(r);
      onSave({ type: "chain", title: headline, market, result: r });
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }
  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <h3>骨牌推演 Chain Mapper</h3>
          <span className="dim">新闻 → 一阶 / 二阶 / 三阶 → 具体 ticker + 定价程度</span>
        </div>
        <textarea rows={3} placeholder="贴一条新闻或事件，如：Anthropic 招标 1.4GW 澳洲数据中心容量…" value={headline} onChange={(e) => setHeadline(e.target.value)} />
        <div className="row">
          <MarketPick v={market} set={setMarket} />
          <span style={{ flex: 1 }} />
          <button className="btn primary" disabled={!headline.trim() || busy} onClick={go}>
            {busy ? "推演中…" : "推演 (1 次 AI)"}
          </button>
        </div>
        {busy && <Spinner text="抓最新新闻 → 推演一/二/三阶…" />}
        <Err msg={err} />
      </div>
      {res && <ChainResult r={res} />}
    </div>
  );
}

/* ───────── 五步 Pipeline ───────── */
function StageBody({ k, d }) {
  if (!d) return null;
  const P = ({ l, v, c }) =>
    v ? (
      <p>
        <span className={`label ${c || ""}`}>{l}</span> {Array.isArray(v) ? v.join("；") : v}
      </p>
    ) : null;
  switch (k) {
    case "signal":
      return (
        <>
          <P l="真实性" v={d.real} />
          <P l="证据" v={d.evidence} />
          <P l="核心商品" v={d.commodity} />
          <P l="范围" v={d.scope} />
        </>
      );
    case "trend":
      return (
        <>
          <P l="判断" v={d.verdict} />
          <P l="推理" v={d.reasoning} />
          <P l="要看的数据" v={d.dataToCheck} />
        </>
      );
    case "structural":
      return (
        <>
          <P l="需求驱动" v={d.demandDriver} />
          <P l="供给响应" v={d.supplyResponse} />
          <P l="持续时间" v={d.duration} />
          <P l="证伪条件" v={d.falsify} c="warn" />
        </>
      );
    case "valuechain":
      return (
        <>
          {(d.companies || []).map((c, i) => (
            <div className="effect" key={i}>
              <div className="row">
                <span className="ticker">{c.ticker}</span>
                <span className="dim small">{c.name}</span>
                <span style={{ flex: 1 }} />
                <Priced v={c.priced} />
              </div>
              <div className="small">{c.position}</div>
              <Gates g={c.gates} />
              <div className="small warn-text">⚠ {c.risk}</div>
            </div>
          ))}
          <P l="不要碰" v={d.avoid} c="warn" />
        </>
      );
    case "inst":
      return (
        <>
          {(d.findings || []).map((f, i) => (
            <p key={i}>
              <span className="ticker">{f.ticker}</span> <b>{f.trend}</b> — {f.detail}
            </p>
          ))}
          <P l="局限" v={d.caveat} c="warn" />
        </>
      );
    case "verdict":
      return (
        <>
          <div className="conviction">
            <span className="mono">CONVICTION</span>
            <b>{d.conviction}</b>
            <span>/100</span>
          </div>
          <P l="最弱一环" v={d.weakestLink} c="warn" />
          <P l="进场框架" v={d.entryFramework} />
          <P l="离场框架" v={d.exitFramework} />
          <P l="仓位" v={d.sizing} />
          <P l="风险" v={d.risks} c="warn" />
          <P l="下次复查" v={d.nextCheck} />
        </>
      );
    default:
      return <pre>{JSON.stringify(d, null, 2)}</pre>;
  }
}

function Pipeline({ onSave, onDecide }) {
  const [signal, setSignal] = useState("");
  const [market, setMarket] = useState("asx");
  const [results, setResults] = useState({});
  const [current, setCurrent] = useState(-1);
  const [err, setErr] = useState("");
  const [errAt, setErrAt] = useState(-1);
  const stopRef = useRef(false);
  const savedId = useRef(null);

  function compactCtx(res, upto) {
    const ctx = {};
    STAGES.slice(0, upto).forEach((s) => {
      if (res[s.key]?.data) ctx[s.key] = res[s.key].data;
    });
    return ctx;
  }

  async function run(from = 0) {
    stopRef.current = false;
    setErr("");
    setErrAt(-1);
    let res = from === 0 ? {} : { ...results };
    if (from === 0) {
      setResults({});
      savedId.current = uid();
    }
    for (let i = from; i < STAGES.length; i++) {
      if (stopRef.current) break;
      setCurrent(i);
      try {
        const r = await runTask(STAGES[i].key, { signal, market, ctx: compactCtx(res, i) });
        res = { ...res, [STAGES[i].key]: r };
        setResults(res);
        onSave({ id: savedId.current, type: "pipeline", title: signal, market, result: res });
      } catch (e) {
        setErr(e.message);
        setErrAt(i);
        break;
      }
    }
    setCurrent(-1);
  }

  const busy = current >= 0;
  const done = !!results.verdict;
  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <h3>Leto Bao 五步研究</h3>
          <span className="dim">生活反常 → 曲线 → 结构性 → 产业链卡位 → 机构验证 → 结论。每次完整跑：6 次 AI，其中 3 步会先抓最新新闻</span>
        </div>
        <textarea rows={3} placeholder="你在现实里看到的反常：涨价、缺货、排队、供应商说的话…" value={signal} onChange={(e) => setSignal(e.target.value)} />
        <div className="examples">
          {EXAMPLES.map((x) => (
            <button key={x} className="mini ghost" onClick={() => setSignal(x)}>
              {x}
            </button>
          ))}
        </div>
        <div className="row">
          <MarketPick v={market} set={setMarket} />
          <span style={{ flex: 1 }} />
          {busy ? (
            <button className="btn" onClick={() => (stopRef.current = true)}>
              停在这一步之后
            </button>
          ) : (
            <button className="btn primary" disabled={!signal.trim()} onClick={() => run(0)}>
              开始研究
            </button>
          )}
        </div>
      </div>

      <div className="pipeline">
        {STAGES.map((s, i) => {
          const r = results[s.key];
          const score = r?.data?.score ?? (s.key === "verdict" ? r?.data?.conviction : undefined);
          const state = r ? "done" : current === i ? "running" : errAt === i ? "error" : "idle";
          return (
            <div className={`card stage ${state}`} key={s.key}>
              <div className="stage-head">
                <span className="mono stage-n">{s.n}</span>
                <b>{s.zh}</b>
                <span className="dim small">{s.q}</span>
                <span style={{ flex: 1 }} />
                {s.search && <span className="tag">📰 新闻</span>}
                {score !== undefined && (
                  <span className={`score ${score >= 60 ? "hi" : score >= 40 ? "mid" : "lo"}`}>{score}</span>
                )}
              </div>
              {state === "running" && <Spinner text={s.search ? "抓新闻 → 分析中…" : "推理中…"} />}
              {r && (
                <>
                  <p className="summary">{r.data.summary || r.data.oneLiner}</p>
                  <StageBody k={s.key} d={r.data} />
                  <Sources list={r.sources} model={r.model} />
                </>
              )}
              {state === "error" && (
                <>
                  <Err msg={err} />
                  <button className="btn" onClick={() => run(i)}>
                    从这一步重试
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {done && (
        <div className="card cta">
          <span>研究完成。想进一步行动，先过 Decision Gate。</span>
          <button className="btn primary" onClick={() => onDecide({ title: signal, research: results })}>
            带去 Decision Gate →
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────── Next Nvidia 五关筛选 ───────── */
function NNScreen({ onSave }) {
  const [theme, setTheme] = useState("");
  const [market, setMarket] = useState("asx");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go() {
    setBusy(true);
    setErr("");
    setRes(null);
    try {
      const r = await runTask("nnscreen", { theme, market });
      setRes(r);
      onSave({ type: "nnscreen", title: theme, market, result: r });
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }
  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <h3>Next Nvidia 五关筛选</h3>
          <span className="dim">NVDA / SNDK 的共同模式：卡位、订单拐点、产能稀缺、经营杠杆、机构还没发现</span>
        </div>
        <div className="row">
          <input placeholder="主题，如：AI 数据中心电力设备、铀、国防、GLP-1 供应链…" value={theme} onChange={(e) => setTheme(e.target.value)} style={{ flex: 1 }} />
          <MarketPick v={market} set={setMarket} />
          <button className="btn primary" disabled={!theme.trim() || busy} onClick={go}>
            {busy ? "筛选中…" : "筛选 (1 次 AI)"}
          </button>
        </div>
        {busy && <Spinner text="抓新闻 → 找候选公司并逐关打分…" />}
        <Err msg={err} />
      </div>
      {res &&
        (res.data.candidates || []).map((c, i) => (
          <div className="card" key={i}>
            <div className="row">
              <span className="ticker">{c.ticker}</span>
              <span className="dim">{c.name}</span>
              <span style={{ flex: 1 }} />
              <Priced v={c.priced} />
            </div>
            <Gates g={c.gates} />
            <p>{c.verdict}</p>
            <p className="warn-text small">⚠ {c.risk}</p>
          </div>
        ))}
      {res?.data?.note && <p className="dim">{res.data.note}</p>}
      {res && <Sources list={res.sources} model={res.model} />}
    </div>
  );
}

/* ───────── 历史记录 ───────── */
function History({ list, setList, onOpen }) {
  if (!list.length) return null;
  const label = { chain: "骨牌", pipeline: "五步", nnscreen: "五关" };
  return (
    <div className="card">
      <div className="card-head">
        <h3>研究记录</h3>
        <span className="dim">只存在这台设备</span>
      </div>
      <ul className="hist">
        {list.slice(0, 30).map((h) => (
          <li key={h.id}>
            <span className="tag">{label[h.type]}</span>
            <button className="linkish" onClick={() => onOpen(h)}>
              {h.title.slice(0, 70)}
            </button>
            <span className="dim small">{new Date(h.at).toLocaleDateString("en-AU")}</span>
            <button className="mini ghost" onClick={() => setList(list.filter((x) => x.id !== h.id))}>
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HistoryView({ h, onBack, onDecide }) {
  return (
    <div className="stack">
      <button className="btn" onClick={onBack}>
        ← 返回
      </button>
      <h3>{h.title}</h3>
      {h.type === "chain" && <ChainResult r={h.result} />}
      {h.type === "pipeline" &&
        STAGES.filter((s) => h.result[s.key]).map((s) => (
          <div className="card stage done" key={s.key}>
            <div className="stage-head">
              <span className="mono stage-n">{s.n}</span>
              <b>{s.zh}</b>
            </div>
            <p className="summary">{h.result[s.key].data.summary || h.result[s.key].data.oneLiner}</p>
            <StageBody k={s.key} d={h.result[s.key].data} />
          </div>
        ))}
      {h.type === "nnscreen" &&
        (h.result.data.candidates || []).map((c, i) => (
          <div className="card" key={i}>
            <span className="ticker">{c.ticker}</span> <span className="dim">{c.name}</span>
            <Gates g={c.gates} />
            <p>{c.verdict}</p>
          </div>
        ))}
      <button className="btn primary" onClick={() => onDecide({ title: h.title, research: h.result })}>
        带去 Decision Gate →
      </button>
    </div>
  );
}

export default function Research({ seed, onDecide }) {
  const [mode, setMode] = useState("chain");
  const [hist, setHist] = usePersist("research", []);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    if (seed) {
      setMode("chain");
      setViewing(null);
    }
  }, [seed]);

  function save(item) {
    const id = item.id || uid();
    setHist((prev) => [{ ...item, id, at: new Date().toISOString() }, ...prev.filter((x) => x.id !== id)].slice(0, 60));
  }

  if (viewing) return <HistoryView h={viewing} onBack={() => setViewing(null)} onDecide={onDecide} />;

  return (
    <div className="stack">
      <div className="subtabs">
        {[
          ["chain", "① 骨牌推演"],
          ["pipeline", "② 五步研究"],
          ["nn", "③ 五关筛选"],
        ].map(([k, l]) => (
          <button key={k} className={`subtab ${mode === k ? "on" : ""}`} onClick={() => setMode(k)}>
            {l}
          </button>
        ))}
      </div>
      <div style={{ display: mode === "chain" ? "block" : "none" }}>
        <ChainMapper seed={seed?.text} onSave={save} />
      </div>
      <div style={{ display: mode === "pipeline" ? "block" : "none" }}>
        <Pipeline onSave={save} onDecide={onDecide} />
      </div>
      <div style={{ display: mode === "nn" ? "block" : "none" }}>
        <NNScreen onSave={save} />
      </div>
      <History list={hist} setList={setHist} onOpen={setViewing} />
    </div>
  );
}
