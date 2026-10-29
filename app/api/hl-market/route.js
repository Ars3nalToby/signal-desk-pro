// Hyperliquid 实时行情（公开数据，免费，不耗 AI 额度）：HYPE / BTC / ETH / SOL、24 小时涨跌、成交额、未平仓量、资金费率，
// 以及 trade[XYZ]（HIP-3，股票 / 指数 / 大宗商品永续）最活跃的市场。缓存 30 秒。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API = "https://api.hyperliquid.xyz/info";
const MAJORS = ["HYPE", "BTC", "ETH", "SOL"];

async function info(body) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Hyperliquid API ${r.status}`);
  return r.json();
}

// metaAndAssetCtxs 返回 [meta, ctxs]：meta.universe[i].name 对应 ctxs[i]
function rows(res) {
  const [meta, ctxs] = Array.isArray(res) ? res : [];
  if (!meta?.universe || !Array.isArray(ctxs)) return [];
  return meta.universe
    .map((u, i) => {
      const c = ctxs[i] || {};
      const px = +(c.markPx ?? c.midPx);
      const prev = +c.prevDayPx;
      return {
        name: u.name,
        px,
        change: prev > 0 && px > 0 ? (px - prev) / prev : null,
        volume: +c.dayNtlVlm || 0, // 24h 成交额（USD）
        oi: (+c.openInterest || 0) * (px || 0), // 未平仓量换成 USD
        funding: c.funding != null ? +c.funding : null, // 每小时资金费率
        delisted: !!u.isDelisted,
      };
    })
    .filter((r) => r.px > 0 && !r.delisted);
}

export async function GET() {
  try {
    const [main, xyz] = await Promise.allSettled([info({ type: "metaAndAssetCtxs" }), info({ type: "metaAndAssetCtxs", dex: "xyz" })]);
    if (main.status !== "fulfilled") throw main.reason;
    const perps = rows(main.value);
    const majors = MAJORS.map((n) => perps.find((p) => p.name === n)).filter(Boolean);
    const liquid = perps.filter((p) => p.volume > 5e6 && p.change != null);
    const movers = [...liquid].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 6);
    const totalVolume = perps.reduce((a, p) => a + p.volume, 0);
    const totalOi = perps.reduce((a, p) => a + p.oi, 0);

    let tradfi = [];
    if (xyz.status === "fulfilled") {
      tradfi = rows(xyz.value)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 8);
    }
    return Response.json(
      { majors, movers, tradfi, totalVolume, totalOi, tradfiError: xyz.status === "fulfilled" ? null : String(xyz.reason?.message || xyz.reason), at: Date.now() },
      { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (e) {
    return Response.json({ error: `Hyperliquid 行情暂时读不到：${e.message}` }, { status: 502 });
  }
}
