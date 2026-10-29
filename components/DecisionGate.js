"use client";
// ④ Decision Gate — 来自 Signal Desk Pro：资金锁定 + Leopold Gate（先写论文再下注）+ 冷静期。完全不耗 AI 额度。
import { useEffect, useState } from "react";
import { usePersist, uid } from "../lib/store";
import { SOURCES } from "../lib/stats";

const COOL_SECONDS = 60;

function Capital({ cap, setCap, openExposure }) {
  const [draft, setDraft] = useState(cap);
  useEffect(() => setDraft(cap), [cap]);
  const locked = cap.gameMoney > 0;
  const riskPct = cap.riskPct ?? 2;
  const left = Math.max(0, cap.gameMoney - openExposure);
  return (
    <div className="card">
      <div className="card-head">
        <h3>资金纪律 Capital Lock</h3>
        <span className="dim">游戏资金 = 亏光也不影响生活的钱。买合伙权 / 房子的钱不在这里。</span>
      </div>
      {locked && !draft.editing ? (
        <div className="cap-grid">
          <div>
            <span className="label">游戏资金</span>
            <b className="mono">${cap.gameMoney.toLocaleString()}</b>
          </div>
          <div>
            <span className="label">已开仓</span>
            <b className="mono">${openExposure.toLocaleString()}</b>
          </div>
          <div>
            <span className="label">可用</span>
            <b className="mono">${left.toLocaleString()}</b>
          </div>
          <div>
            <span className="label">单笔上限</span>
            <b className="mono">
              {cap.maxPct}% = ${Math.round((cap.gameMoney * cap.maxPct) / 100).toLocaleString()}
            </b>
          </div>
          <div>
            <span className="label">单笔最多亏</span>
            <b className="mono">
              {riskPct}% = ${Math.round((cap.gameMoney * riskPct) / 100).toLocaleString()}
            </b>
          </div>
          <div>
            <span className="label">同时最多持仓</span>
            <b className="mono">{cap.maxOpen}</b>
          </div>
          <button className="mini ghost" onClick={() => setDraft({ ...cap, editing: true })}>
            修改（会被记录）
          </button>
        </div>
      ) : (
        <div className="row wrap">
          <label>
            游戏资金 $
            <input type="number" min="0" value={draft.gameMoney || ""} onChange={(e) => setDraft({ ...draft, gameMoney: +e.target.value })} />
          </label>
          <label>
            单笔上限 %
            <input type="number" min="1" max="100" value={draft.maxPct} onChange={(e) => setDraft({ ...draft, maxPct: +e.target.value })} />
          </label>
          <label title="一笔交易打到止损时，最多亏掉游戏资金的百分之几。专业交易员常用 1–2%。">
            单笔最多亏 %
            <input type="number" min="0.25" max="10" step="0.25" value={draft.riskPct ?? 2} onChange={(e) => setDraft({ ...draft, riskPct: +e.target.value })} />
          </label>
          <label>
            最多持仓数
            <input type="number" min="1" max="20" value={draft.maxOpen} onChange={(e) => setDraft({ ...draft, maxOpen: +e.target.value })} />
          </label>
          <button
            className="btn primary"
            disabled={!(draft.gameMoney > 0)}
            onClick={() => {
              const log = [...(cap.log || [])];
              if (cap.gameMoney) log.push({ at: new Date().toISOString(), from: cap.gameMoney, to: draft.gameMoney });
              setCap({ gameMoney: draft.gameMoney, maxPct: draft.maxPct, riskPct: draft.riskPct ?? 2, maxOpen: draft.maxOpen, log });
            }}
          >
            锁定
          </button>
        </div>
      )}
      {cap.log?.length > 0 && (
        <div className="dim small">
          修改记录：{cap.log.slice(-3).map((l) => `${new Date(l.at).toLocaleDateString("en-AU")} $${l.from}→$${l.to}`).join(" · ")}
        </div>
      )}
    </div>
  );
}

const EMPTY = {
  ticker: "",
  market: "ASX",
  dir: "long",
  entry: "",
  size: "",
  t1: "",
  t2: "",
  t3: "",
  falsify: "",
  stop: "",
  target: "",
  timeExit: "",
  source: "",
  checks: {},
};

const CHECKS = [
  ["fomo", "我不是因为看到别人赚钱 / 怕错过才做这笔"],
  ["loss", "如果这笔亏到止损，我能平静接受"],
  ["thesis", "我能用上面三句话向别人解释为什么买，而不是'感觉会涨'"],
];

export default function DecisionGate({ handoff, onRecorded }) {
  const [cap, setCap] = usePersist("capital", { gameMoney: 0, maxPct: 20, riskPct: 2, maxOpen: 5, log: [] });
  const [trades, setTrades] = usePersist("trades", []);
  const [f, setF] = usePersist("gateDraft", EMPTY);
  const [coolUntil, setCoolUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!coolUntil) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [coolUntil]);

  useEffect(() => {
    if (handoff?.title) setF((p) => ({ ...p, researchTitle: handoff.title, researchConviction: handoff.research?.verdict?.data?.conviction }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoff]);

  const open = trades.filter((t) => t.status === "open");
  const exposure = open.reduce((a, t) => a + (+t.size || 0), 0);
  const maxSize = (cap.gameMoney * cap.maxPct) / 100;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const entry = +f.entry,
    stop = +f.stop,
    target = +f.target;
  const riskPct = entry && stop ? Math.abs((entry - stop) / entry) * 100 : 0;
  const rr = entry && stop && target ? Math.abs(target - entry) / Math.abs(entry - stop) : 0;
  const dollarRisk = (+f.size || 0) * (riskPct / 100);
  // 按风险算仓位：最多愿意亏的钱 ÷ 止损距离。止损越远，能买的越少。
  const riskBudget = (cap.gameMoney * (cap.riskPct ?? 2)) / 100;
  const sizeByRisk = riskPct > 0 ? riskBudget / (riskPct / 100) : null;
  const stopWrongSide = entry > 0 && stop > 0 && (f.dir === "short" ? stop <= entry : stop >= entry);

  const problems = [];
  if (!(cap.gameMoney > 0)) problems.push("先锁定游戏资金");
  if (!f.ticker.trim()) problems.push("填 ticker");
  if (!(+f.entry > 0)) problems.push("填进场价");
  if (!(+f.size > 0)) problems.push("填仓位金额");
  if (+f.size > maxSize) problems.push(`仓位超过单笔上限 $${Math.round(maxSize)}`);
  if (+f.size > cap.gameMoney - exposure) problems.push("可用游戏资金不够");
  if (open.length >= cap.maxOpen) problems.push(`已有 ${open.length} 个持仓，达到上限`);
  [f.t1, f.t2, f.t3].forEach((t, i) => {
    if ((t || "").trim().length < 15) problems.push(`Thesis 第 ${i + 1} 句太短（至少 15 字）`);
  });
  if ((f.falsify || "").trim().length < 10) problems.push("写清楚证伪条件");
  if (!(+f.stop > 0)) problems.push("填止损价");
  if (stopWrongSide) problems.push(f.dir === "short" ? "做空的止损要高于进场价" : "做多的止损要低于进场价");
  if (sizeByRisk != null && +f.size > sizeByRisk + 0.5) problems.push(`按风险，这笔最多买 $${Math.floor(sizeByRisk)}（止损太远就要买少一点）`);
  if (!f.source) problems.push("选这笔想法的来源");
  if (!f.timeExit.trim()) problems.push("填时间止损（多久没兑现就走）");
  if (CHECKS.some(([k]) => !f.checks?.[k])) problems.push("勾选三项自我检查");


  const cooling = coolUntil && now < coolUntil;
  const cooled = coolUntil && now >= coolUntil;

  function record() {
    const t = {
      ...f,
      id: uid(),
      status: "open",
      openedAt: new Date().toISOString(),
      entry: +f.entry,
      size: +f.size,
      stop: +f.stop,
      target: +f.target || null,
      ticker: f.ticker.trim().toUpperCase(),
    };
    delete t.checks;
    setTrades([t, ...trades]);
    setF(EMPTY);
    setCoolUntil(0);
    onRecorded();
  }

  return (
    <div className="stack">
      <Capital cap={cap} setCap={setCap} openExposure={exposure} />

      <div className="card">
        <div className="card-head">
          <h3>Leopold Gate · 先写论文再下注</h3>
          <span className="dim">写不出完整逻辑链，就不该买</span>
        </div>
        {f.researchTitle && (
          <div className="linked">
            关联研究：{f.researchTitle} {f.researchConviction != null && <b className="mono">· conviction {f.researchConviction}</b>}
            <button className="mini ghost" onClick={() => setF({ ...f, researchTitle: "", researchConviction: null })}>
              ✕
            </button>
          </div>
        )}

        <div className="row wrap">
          <input placeholder="Ticker" value={f.ticker} onChange={set("ticker")} style={{ width: 110 }} />
          <select value={f.market} onChange={set("market")}>
            <option>ASX</option>
            <option>US</option>
            <option>Crypto</option>
            <option>HK</option>
          </select>
          <select value={f.dir} onChange={set("dir")}>
            <option value="long">做多 Long</option>
            <option value="short">做空 Short</option>
          </select>
          <label>
            进场价
            <input type="number" step="any" value={f.entry} onChange={set("entry")} style={{ width: 110 }} />
          </label>
          <label>
            仓位 $
            <input type="number" value={f.size} onChange={set("size")} style={{ width: 110 }} />
          </label>
        </div>

        <div className="row wrap">
          <label style={{ flex: 1 }}>
            这个想法从哪里来？
            <select value={f.source} onChange={set("source")}>
              <option value="">选一个（老实选，复盘才有用）</option>
              {SOURCES.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>

        <h4 className="sec">三句 thesis（用自己的话）</h4>
        <input placeholder="1. 发生了什么变化？（事实，不是感觉）" value={f.t1} onChange={set("t1")} />
        <input placeholder="2. 为什么市场还没充分定价？" value={f.t2} onChange={set("t2")} />
        <input placeholder="3. 什么事件会让股价反映这个变化？大概什么时候？" value={f.t3} onChange={set("t3")} />

        <h4 className="sec">证伪与离场</h4>
        <textarea rows={2} placeholder="什么证据出现，代表我错了？（例如：下季订单没增长、产能提前上线…）" value={f.falsify} onChange={set("falsify")} />
        <div className="row wrap">
          <label>
            止损价
            <input type="number" step="any" value={f.stop} onChange={set("stop")} style={{ width: 110 }} />
          </label>
          <label>
            目标价（可选）
            <input type="number" step="any" value={f.target} onChange={set("target")} style={{ width: 110 }} />
          </label>
          <label style={{ flex: 1 }}>
            时间止损
            <input placeholder="如：3 个月内季报没兑现就走" value={f.timeExit} onChange={set("timeExit")} />
          </label>
        </div>

        {entry > 0 && stop > 0 && (
          <div className="risk-box">
            <span>
              止损距离 <b className="mono">{riskPct.toFixed(1)}%</b>
            </span>
            <span>
              最多亏 <b className="mono">${dollarRisk.toFixed(0)}</b>
            </span>
            {sizeByRisk != null && cap.gameMoney > 0 && (
              <span className={+f.size > sizeByRisk + 0.5 ? "warn-text" : "ok-text"}>
                按风险最多买 <b className="mono">${Math.floor(Math.min(sizeByRisk, maxSize)).toLocaleString()}</b>（单笔最多亏 ${Math.round(riskBudget)}）
              </span>
            )}
            {rr > 0 && (
              <span className={rr >= 2 ? "ok-text" : "warn-text"}>
                风险回报比 <b className="mono">1 : {rr.toFixed(1)}</b> {rr < 2 && "（低于 1:2，要想清楚）"}
              </span>
            )}
          </div>
        )}

        <h4 className="sec">自我检查</h4>
        {CHECKS.map(([k, l]) => (
          <label className="check" key={k}>
            <input type="checkbox" checked={!!f.checks?.[k]} onChange={(e) => setF({ ...f, checks: { ...f.checks, [k]: e.target.checked } })} />
            {l}
          </label>
        ))}

        {problems.length > 0 ? (
          <div className="problems">
            还差：
            {problems.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        ) : !coolUntil ? (
          <button className="btn primary wide" onClick={() => setCoolUntil(Date.now() + COOL_SECONDS * 1000)}>
            开始 {COOL_SECONDS} 秒冷静期
          </button>
        ) : cooling ? (
          <div className="cooling">
            冷静期… <b className="mono">{Math.ceil((coolUntil - now) / 1000)}s</b>
            <span className="dim">再读一次上面的三句话和证伪条件。</span>
          </div>
        ) : (
          cooled && (
            <div className="row">
              <button className="btn primary wide" onClick={record}>
                记录这笔交易 → Journal
              </button>
              <button className="btn" onClick={() => setCoolUntil(0)}>
                算了，不做
              </button>
            </div>
          )
        )}
      </div>
      <p className="dim small">这里只是记录和纪律工具，不会帮你下单。真实下单在你的券商 / 钱包里完成。</p>
    </div>
  );
}
