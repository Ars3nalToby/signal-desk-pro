// Hyperliquid 公开数据代理：只读，只需要钱包的公开地址。不耗 AI 额度，不需要任何 key。
// 服务器端抓取，避开浏览器跨域问题。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const API = "https://api.hyperliquid.xyz/info";
// 官方文档：按时间范围查询的接口每次只返回约 500 条（userFillsByTime 写的是最多 2000 条），
// 要拿更多就「用最后一条的时间戳当下一次的 startTime」往后翻页。成交总共只能拿到最近 10000 条。
// 所以只要这一页 ≥ 500 条就继续翻，宁可多问一次，也不要漏掉。
const MIN_PAGE = 500;

async function info(body) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Hyperliquid API ${r.status}`);
  return r.json();
}

// 从 startTime 往后一页一页拿，直到拿完或到上限
async function paged(type, user, startTime, maxPages, extra = {}) {
  const out = [];
  const seen = new Set();
  let t = startTime;
  let truncated = false;
  for (let i = 0; i < maxPages; i++) {
    const batch = await info({ type, user, startTime: t, ...extra });
    if (!Array.isArray(batch) || !batch.length) break;
    let maxTime = t;
    for (const x of batch) {
      const k = x.tid ?? x.hash + "|" + x.time + "|" + (x.delta?.coin || x.coin || "");
      if (!seen.has(k)) {
        seen.add(k);
        out.push(x);
      }
      if (x.time > maxTime) maxTime = x.time;
    }
    if (batch.length < MIN_PAGE) break;
    t = maxTime > t ? maxTime : t + 1;
    if (i === maxPages - 1) truncated = true;
  }
  return { list: out, truncated };
}

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch {}
  const user = String(body.user || "").trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(user)) {
    return Response.json({ error: "地址格式不对：应该是 0x 开头、42 个字符的公开钱包地址。千万不要输入私钥或助记词。" }, { status: 400 });
  }
  const days = Math.min(Math.max(+body.days || 365, 1), 3650);
  const startTime = Date.now() - days * 86400000;

  try {
    const [fills, funding] = await Promise.all([
      paged("userFillsByTime", user, startTime, 25, { aggregateByTime: true }),
      paged("userFunding", user, startTime, 20),
    ]);
    return Response.json(
      { fills: fills.list, funding: funding.list, truncated: fills.truncated || funding.truncated, days, fetchedAt: Date.now() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return Response.json({ error: `读取 Hyperliquid 数据失败：${e.message}。稍后再试。` }, { status: 502 });
  }
}
