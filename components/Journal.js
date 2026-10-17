"use client";
// ⑤ Journal & Review — ASX + US + Crypto 交易记录与复盘。完全不耗 AI 额度。
import { useRef, useState } from "react";
import { usePersist, uid, exportAll, importAll } from "../lib/store";

function pnlOf(t) {
  if (t.exit == null || !t.entry) return null;
  const sign = t.dir === "short" ? -1 : 1;
  return ((t.exit - t.entry) / t.entry) * t.size * sign;
}
function rOf(t) {
  const p = pnlOf(t);
  if (p == null || !t.stop) return null;
  const risk = Math.abs((t.entry - t.stop) / t.entry) * t.size;
  return risk ? p / risk : null;
}

function CloseForm({ t, onClose, onCancel }) {
  const [exit, setExit] = useState("");
  const [why, setWhy] = useState("target");
  const [lesson, setLesson] = useState("");
  const [thesisRight, setThesisRight] = useState("");
  return (
    <div className="close-form">
      <div className="row wrap">
        <label>
          出场价
          <input type="number" step="any" value={exit} onChange={(e) => setExit(e.target.value)} style={{ width: 110 }} />
        </label>
        <select value={why} onChange={(e) => setWhy(e.target.value)}>
          <option value="target">到达目标</option>
          <option value="stop">触发止损</option>
          <option value="time">时间止损</option>
          <option value="falsified">thesis 被证伪</option>
          <option value="emotion">情绪 / 提前跑了</option>
          <option value="other">其他</option>
        </select>
        <select value={thesisRight} onChange={(e) => setThesisRight(e.target.value)}>
          <option value="">thesis 对了吗？</option>
          <option value="yes">对</option>
          <option value="partly">部分对</option>
          <option value="no">错</option>
          <option value="unclear">还看不出</option>
        </select>
      </div>
      <textarea rows={2} placeholder="复盘一句话：学到什么？下次会怎么做？" value={lesson} onChange={(e) => setLesson(e.target.value)} />
      <div className="row">
        <button
          className="btn primary"
          disabled={!(+exit > 0) || lesson.trim().length < 5}
          onClick={() => onClose({ exit: +exit, exitReason: why, lesson, thesisRight, closedAt: new Date().toISOString() })}
        >
          平仓并记录复盘
        </button>
        <button className="btn" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}

function TradeCard({ t, onUpdate, onDelete }) {
  const [closing, setClosing] = useState(false);
  const [open, setOpen] = useState(false);
  const p = pnlOf(t);
  const r = rOf(t);
  return (
    <div className={`card trade ${t.status}`}>
      <div className="row" onClick={() => setOpen(!open)} style={{ cursor: "pointer" }}>
        <span className="ticker">{t.ticker}</span>
        <span className="tag">{t.market}</span>
        <span className="tag">{t.dir === "short" ? "SHORT" : "LONG"}</span>
        <span className="mono small">
          ${t.size} @ {t.entry}
        </span>
        <span style={{ flex: 1 }} />
        {p != null ? (
          <b className={`mono ${p >= 0 ? "ok-text" : "warn-text"}`}>
            {p >= 0 ? "+" : ""}${p.toFixed(0)} {r != null && `(${r >= 0 ? "+" : ""}${r.toFixed(1)}R)`}
          </b>
        ) : (
          <span className="tag tag-fresh">OPEN</span>
        )}
        <span className="dim small">{new Date(t.openedAt).toLocaleDateString("en-AU")}</span>
      </div>
      {open && (
        <div className="trade-detail">
          {t.researchTitle && <p className="dim small">研究：{t.researchTitle}</p>}
          {!t.quick && (
            <>
              <ol>
                <li>{t.t1}</li>
                <li>{t.t2}</li>
                <li>{t.t3}</li>
              </ol>
              <p>
                <span className="label warn">证伪</span> {t.falsify}
              </p>
              <p className="small">
                止损 {t.stop} · 目标 {t.target || "—"} · 时间止损：{t.timeExit}
              </p>
            </>
          )}
          {t.status === "closed" && (
            <p>
              <span className="label">复盘</span> 出场 {t.exit}
              {!t.quick && `（${t.exitReason}）· thesis：${t.thesisRight || "—"}`} · {t.lesson || "—"}
            </p>
          )}
          {t.notes?.map((n, i) => (
            <p key={i} className="small">
              <span className="dim">{new Date(n.at).toLocaleDateString("en-AU")}</span> {n.text}
            </p>
          ))}
          <NoteAdder onAdd={(text) => onUpdate({ notes: [...(t.notes || []), { at: new Date().toISOString(), text }] })} />
          <div className="row">
            {t.status === "open" && !closing && (
              <button className="btn" onClick={() => setClosing(true)}>
                平仓 / 复盘
              </button>
            )}
            <span style={{ flex: 1 }} />
            <button
              className="mini ghost"
              onClick={() => {
                if (confirm("确定删除这笔记录？")) onDelete();
              }}
            >
              删除
            </button>
          </div>
          {closing && (
            <CloseForm
              t={t}
              onCancel={() => setClosing(false)}
              onClose={(x) => {
                onUpdate({ ...x, status: "closed" });
                setClosing(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function NoteAdder({ onAdd }) {
  const [v, setV] = useState("");
  return (
    <div className="row">
      <input placeholder="加一条持仓笔记（新消息、季报、想法…）" value={v} onChange={(e) => setV(e.target.value)} style={{ flex: 1 }} />
      <button
        className="mini"
        disabled={!v.trim()}
        onClick={() => {
          onAdd(v.trim());
          setV("");
        }}
      >
        加
      </button>
    </div>
  );
}

function QuickCrypto({ onAdd }) {
  const [f, setF] = useState({ ticker: "", entry: "", exit: "", size: "", lesson: "" });
  const ok = f.ticker && +f.entry > 0 && +f.exit > 0 && +f.size > 0;
  return (
    <div className="card">
      <div className="card-head">
        <h3>快速记录 Crypto / 已完成交易</h3>
        <span className="dim">memecoin 节奏太快，不走 Decision Gate，但一样要记下来复盘</span>
      </div>
      <div className="row wrap">
        <input placeholder="币 / ticker" value={f.ticker} onChange={(e) => setF({ ...f, ticker: e.target.value })} style={{ width: 120 }} />
        <input type="number" step="any" placeholder="买入价" value={f.entry} onChange={(e) => setF({ ...f, entry: e.target.value })} style={{ width: 110 }} />
        <input type="number" step="any" placeholder="卖出价" value={f.exit} onChange={(e) => setF({ ...f, exit: e.target.value })} style={{ width: 110 }} />
        <input type="number" placeholder="金额 $" value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} style={{ width: 100 }} />
        <input placeholder="一句话复盘" value={f.lesson} onChange={(e) => setF({ ...f, lesson: e.target.value })} style={{ flex: 1 }} />
        <button
          className="btn"
          disabled={!ok}
          onClick={() => {
            const now = new Date().toISOString();
            onAdd({
              id: uid(),
              ticker: f.ticker.toUpperCase(),
              market: "Crypto",
              dir: "long",
              entry: +f.entry,
              exit: +f.exit,
              size: +f.size,
              lesson: f.lesson,
              status: "closed",
              quick: true,
              openedAt: now,
              closedAt: now,
              exitReason: "other",
            });
            setF({ ticker: "", entry: "", exit: "", size: "", lesson: "" });
          }}
        >
          记录
        </button>
      </div>
    </div>
  );
}

export default function Journal() {
  const [trades, setTrades] = usePersist("trades", []);
  const [filter, setFilter] = useState("all");
  const fileRef = useRef(null);

  const list = trades.filter((t) => filter === "all" || t.market === filter);
  const closed = list.filter((t) => t.status === "closed");
  const wins = closed.filter((t) => (pnlOf(t) || 0) > 0);
  const total = closed.reduce((a, t) => a + (pnlOf(t) || 0), 0);
  const rs = closed.map(rOf).filter((x) => x != null);
  const avgR = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null;
  const emotion = closed.filter((t) => t.exitReason === "emotion").length;
  const gateTrades = closed.filter((t) => !t.quick).length;

  const update = (id, patch) => setTrades(trades.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  function doExport() {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `signal-desk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }
  function doImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((txt) => {
      try {
        if (importAll(JSON.parse(txt))) location.reload();
      } catch {
        alert("备份文件读不到");
      }
    });
  }

  return (
    <div className="stack">
      <div className="stats">
        <div>
          <span className="label">已平仓</span>
          <b className="mono">{closed.length}</b>
        </div>
        <div>
          <span className="label">胜率</span>
          <b className="mono">{closed.length ? Math.round((wins.length / closed.length) * 100) + "%" : "—"}</b>
        </div>
        <div>
          <span className="label">总盈亏</span>
          <b className={`mono ${total >= 0 ? "ok-text" : "warn-text"}`}>
            {total >= 0 ? "+" : ""}${total.toFixed(0)}
          </b>
        </div>
        <div>
          <span className="label">平均 R</span>
          <b className="mono">{avgR != null ? avgR.toFixed(2) + "R" : "—"}</b>
        </div>
        <div>
          <span className="label">情绪离场</span>
          <b className="mono">{emotion}</b>
        </div>
      </div>
      <div className="progress-note">
        {gateTrades < 20
          ? `走过 Decision Gate 的已平仓交易：${gateTrades} / 20。满 20 笔再判断这套方法有没有 edge，之前不要改工具。`
          : `已经有 ${gateTrades} 笔样本，可以开始认真看：哪类研究的胜率高、哪种离场原因最常亏钱。`}
      </div>

      <div className="row">
        <div className="pills">
          {["all", "ASX", "US", "Crypto", "HK"].map((k) => (
            <button key={k} className={`pill ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>
              {k === "all" ? "全部" : k}
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <button className="mini" onClick={doExport}>
          导出备份
        </button>
        <button className="mini" onClick={() => fileRef.current?.click()}>
          导入备份
        </button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={doImport} />
      </div>

      {list.map((t) => (
        <TradeCard key={t.id} t={t} onUpdate={(p) => update(t.id, p)} onDelete={() => setTrades(trades.filter((x) => x.id !== t.id))} />
      ))}
      {!list.length && <div className="card dim">还没有记录。交易从 Decision Gate 进来，或者在下面快速记录 crypto。</div>}

      <QuickCrypto onAdd={(t) => setTrades([t, ...trades])} />
      <p className="dim small">所有记录只存在这个浏览器。换设备前、清浏览器前，记得先「导出备份」。</p>
    </div>
  );
}
