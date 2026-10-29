"use client";
// 顶部的交易所时钟：ASX（布里斯班时间）、纽约、Hyperliquid（24/7）。用浏览器的时区数据算开收盘，自动处理夏令时。
import { useEffect, useState } from "react";

function partsIn(tz, d) {
  const f = new Intl.DateTimeFormat("en-AU", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { wd: p.weekday, h: +p.hour % 24, m: +p.minute };
}

const WEEKDAY = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// 返回 { open, label }，label 是「x 小时 y 分后开盘 / 收盘」
function session(tz, d, openMin, closeMin) {
  const { wd, h, m } = partsIn(tz, d);
  const now = h * 60 + m;
  const weekday = WEEKDAY.includes(wd);
  if (weekday && now >= openMin && now < closeMin) return { open: true, mins: closeMin - now };
  // 下一次开盘：今天稍后，或下一个工作日
  let mins = weekday && now < openMin ? openMin - now : null;
  if (mins == null) {
    const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    let i = order.indexOf(wd);
    let days = 0;
    do {
      i = (i + 1) % 7;
      days++;
    } while (!WEEKDAY.includes(order[i]));
    mins = days * 1440 - now + openMin;
  }
  return { open: false, mins };
}

const fmtIn = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h} 小时 ${m} 分` : `${m} 分钟`;
};

function Clock({ city, tz, d, s, note }) {
  const t = new Intl.DateTimeFormat("en-AU", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return (
    <div className={`clock ${s.open ? "is-open" : ""}`}>
      <div className="clock-top">
        <i className="lamp" aria-hidden />
        <span>{city}</span>
      </div>
      <div className="clock-time">{t}</div>
      <div className="clock-note">{note ?? (s.open ? `开盘中 · ${fmtIn(s.mins)}后收盘` : `${fmtIn(s.mins)}后开盘`)}</div>
    </div>
  );
}

export default function MarketClock() {
  const [d, setD] = useState(null);
  useEffect(() => {
    setD(new Date());
    const t = setInterval(() => setD(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  if (!d) return <div className="clocks" aria-hidden />;
  // ASX 交易时间按悉尼时间 10:00–16:00；纽约 9:30–16:00
  const asx = session("Australia/Sydney", d, 600, 960);
  const nyse = session("America/New_York", d, 570, 960);
  return (
    <div className="clocks" role="group" aria-label="交易所时间">
      <Clock city="ASX · 布里斯班" tz="Australia/Brisbane" d={d} s={asx} />
      <Clock city="纽约 NYSE" tz="America/New_York" d={d} s={nyse} />
      <Clock city="Hyperliquid" tz="Australia/Brisbane" d={d} s={{ open: true }} note="24/7 不休市" />
    </div>
  );
}
