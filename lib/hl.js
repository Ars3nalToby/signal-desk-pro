// Hyperliquid 成交记录 → 一笔一笔完整的交易（round trip）。纯计算，不碰网络，方便测试。
//
// 数据来自 Hyperliquid 公开 API（info 端点的 userFillsByTime / userFunding），只需要钱包的公开地址。
// 每条 fill 的字段：coin, px, sz, side("B"=买 / "A"=卖), time, startPosition, dir("Open Long"…), closedPnl, fee, tid…
// - closedPnl 是这条成交实现的盈亏，不含手续费
// - fee 是总手续费（已包含 builderFee）
// - HIP-3 市场的 coin 带前缀，例如 "xyz:TSLA"；现货是 "@107" 或 "PURR/USDC"，这里只算永续合约

const ROUND = 1e8;
const r8 = (x) => Math.round(x * ROUND) / ROUND;

export function isPerpFill(f) {
  const coin = String(f?.coin || "");
  return typeof f?.dir === "string" && /Long|Short/.test(f.dir) && !coin.startsWith("@") && !coin.includes("/");
}

function newTrip(coin, dir, at, partial) {
  return { coin, dir, openedAt: at, lastAt: at, fills: 0, pnl: 0, fees: 0, funding: 0, volume: 0, maxNotional: 0, partial };
}

function finish(t, extra = {}) {
  const net = t.pnl - t.fees + t.funding;
  return { ...t, ...extra, id: `${t.coin}|${t.openedAt}`, net };
}

// 把成交按币种串起来：仓位从 0 开到 0 平，算一笔交易。反手（多翻空）会结束旧的一笔、开始新的一笔。
export function buildTrips(fills = []) {
  const seen = new Set();
  const list = fills
    .filter(isPerpFill)
    .filter((f) => {
      const k = f.tid ?? `${f.hash}|${f.oid}|${f.time}|${f.sz}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.time - b.time || (a.tid || 0) - (b.tid || 0));

  const open = {};
  const closed = [];

  for (const f of list) {
    const sz = +f.sz || 0;
    const px = +f.px || 0;
    const start = r8(+f.startPosition || 0);
    const after = r8(start + (f.side === "B" ? sz : -sz));

    let t = open[f.coin];
    if (!t) {
      // 数据窗口开始时已经有仓位 → 标记为不完整（开仓那几笔不在数据里）
      const dir = start !== 0 ? (start > 0 ? "long" : "short") : after > 0 ? "long" : "short";
      t = open[f.coin] = newTrip(f.coin, dir, f.time, start !== 0);
    }
    t.fills += 1;
    t.pnl += +f.closedPnl || 0;
    t.fees += +f.fee || 0;
    t.volume += sz * px;
    t.maxNotional = Math.max(t.maxNotional, Math.abs(start) * px, Math.abs(after) * px);
    t.lastAt = f.time;

    const flipped = (start > 0 && after < 0) || (start < 0 && after > 0);
    if (after === 0 || flipped) {
      closed.push(finish(t, { closedAt: f.time }));
      delete open[f.coin];
      if (flipped) {
        const n = (open[f.coin] = newTrip(f.coin, after > 0 ? "long" : "short", f.time, false));
        n.maxNotional = Math.abs(after) * px;
      }
    }
  }

  const stillOpen = Object.values(open).map((t) => finish(t, { open: true }));
  return { closed, open: stillOpen };
}

// 资金费（funding）：持仓期间每小时收/付的费用，归到同一币种、时间落在这笔交易里的那一笔。
// userFunding 每条：{ time, delta: { coin, usdc } }，usdc 为正 = 收到，为负 = 付出。
export function attachFunding({ closed, open }, funding = []) {
  const all = [...closed, ...open];
  let unmatched = 0;
  for (const ev of funding) {
    const coin = ev?.delta?.coin;
    const usdc = +ev?.delta?.usdc || 0;
    if (!coin || !usdc) continue;
    const t = all.find((x) => x.coin === coin && ev.time >= x.openedAt && (x.open || ev.time <= x.closedAt));
    if (t) {
      t.funding += usdc;
      t.net = t.pnl - t.fees + t.funding;
    } else unmatched += usdc;
  }
  return { closed, open, unmatchedFunding: unmatched };
}

export function fmtDuration(ms) {
  if (!(ms >= 0)) return "—";
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} 分钟`;
  const h = m / 60;
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)} 小时`;
  return `${Math.round(h / 24)} 天`;
}
