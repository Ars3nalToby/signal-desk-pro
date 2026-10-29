// 复盘统计：胜率、盈亏比、期望值、按「想法来源」拆分。纯计算。

export const SOURCES = [
  ["self", "自己研究"],
  ["research", "Research tab"],
  ["x", "跟 X / KOL"],
  ["friend", "朋友 / 群里"],
  ["ai", "AI 建议"],
  ["impulse", "冲动 / 没理由"],
];
export const SOURCE_LABEL = Object.fromEntries([...SOURCES, ["", "未标记"]]);

// items: [{ net: 盈亏（含费用）, at: 平仓时间, source }]
export function summarize(items = []) {
  const n = items.length;
  const wins = items.filter((i) => i.net > 0);
  const losses = items.filter((i) => i.net < 0);
  const sumWin = wins.reduce((a, i) => a + i.net, 0);
  const sumLoss = Math.abs(losses.reduce((a, i) => a + i.net, 0));
  const total = items.reduce((a, i) => a + i.net, 0);
  const avgWin = wins.length ? sumWin / wins.length : 0;
  const avgLoss = losses.length ? sumLoss / losses.length : 0;
  const payoff = avgLoss ? avgWin / avgLoss : null; // 盈亏比：平均赚 ÷ 平均亏
  const winRate = n ? wins.length / n : null;

  // 按时间顺序算最大回撤（资金曲线从最高点跌了多少）
  let eq = 0,
    peak = 0,
    maxDD = 0;
  [...items]
    .sort((a, b) => (a.at || 0) - (b.at || 0))
    .forEach((i) => {
      eq += i.net;
      peak = Math.max(peak, eq);
      maxDD = Math.max(maxDD, peak - eq);
    });

  return {
    n,
    wins: wins.length,
    losses: losses.length,
    winRate,
    avgWin,
    avgLoss,
    payoff,
    expectancy: n ? total / n : null, // 平均每笔赚/亏多少
    profitFactor: sumLoss ? sumWin / sumLoss : null,
    total,
    maxDD,
    worst: losses.length ? Math.min(...losses.map((i) => i.net)) : 0,
    best: wins.length ? Math.max(...wins.map((i) => i.net)) : 0,
    breakevenWinRate: payoff ? 1 / (1 + payoff) : null, // 按现在的盈亏比，胜率要多少才打平
  };
}

export function bySource(items = []) {
  const groups = {};
  items.forEach((i) => (groups[i.source || ""] ||= []).push(i));
  return Object.entries(groups)
    .map(([source, list]) => ({ source, label: SOURCE_LABEL[source] || source, ...summarize(list) }))
    .sort((a, b) => b.n - a.n);
}

// 用白话把数字翻译出来
export function verdict(s) {
  if (!s || s.n === 0) return [];
  const out = [];
  if (s.n < 10) out.push(`只有 ${s.n} 笔，样本太少，下面的结论只能当参考。至少 20–30 笔才比较可信。`);
  const money = (x) => `${x >= 0 ? "+" : "-"}$${Math.abs(x).toFixed(2)}`;
  if (s.expectancy != null)
    out.push(
      s.expectancy >= 0
        ? `平均每笔 ${money(s.expectancy)}：目前这种做法长期是赚钱的方向。`
        : `平均每笔 ${money(s.expectancy)}：照这样继续做下去，次数越多亏越多。`
    );
  if (s.payoff != null && s.winRate != null) {
    const be = s.breakevenWinRate;
    const gap = s.winRate - be;
    out.push(
      `盈亏比 ${s.payoff.toFixed(2)}（平均赚 $${s.avgWin.toFixed(2)} ÷ 平均亏 $${s.avgLoss.toFixed(2)}）。按这个比例，胜率要 ${(be * 100).toFixed(0)}% 才能打平；你现在是 ${(s.winRate * 100).toFixed(0)}%${
        gap >= 0 ? "，在打平线之上。" : "，在打平线之下。"
      }`
    );
    if (s.payoff < 1 && s.winRate >= 0.5) out.push("典型模式：赚一点就跑、亏了死扛。改进方向通常不是找更准的信号，而是让亏损更小、让利润跑久一点。");
    if (s.payoff >= 1.5 && s.winRate < be) out.push("赔率不错，但胜率太低：可能进场太随意，筛选条件可以更严格。");
  }
  if (s.maxDD > 0) out.push(`期间最大回撤 $${s.maxDD.toFixed(2)}，最大单笔亏损 ${money(s.worst)}。`);
  return out;
}

export const PERIODS = [
  ["7", "近 7 天"],
  ["30", "近 30 天"],
  ["90", "近 90 天"],
  ["all", "全部"],
];
export function inPeriod(at, period) {
  if (period === "all") return true;
  return at >= Date.now() - +period * 86400000;
}
