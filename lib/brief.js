// 每日简报：ASX 官方 upcoming floats（IPO 名单）+ Google News + Gemini 整理。
// 一份简报 = 1 次 Flash-Lite（读 ASX 名单）+ 1 次 Flash（写简报）。
import { generate } from "./gemini";
import { gatherNews } from "./rss";

const FLOATS_URL = "https://www.asx.com.au/listings/upcoming-floats-and-listings";

// 布里斯班时间（没有夏令时，固定 UTC+10）
export function bneNow(d = new Date()) {
  const t = new Date(d.getTime() + 10 * 3600e3);
  return { date: t.toISOString().slice(0, 10), hour: t.getUTCHours(), minute: t.getUTCMinutes() };
}

// 开盘前 / 盘中看 am 简报；下午 4:30 以后看收盘 pm 简报
export function currentSlot(d = new Date()) {
  const b = bneNow(d);
  const slot = b.hour * 60 + b.minute >= 16 * 60 + 30 ? "pm" : "am";
  return { date: b.date, slot, key: `${b.date}-${slot}` };
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|tr|h\d|td|th|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function extractJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  const s = clean.indexOf("{");
  const e = clean.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("AI 没有返回可读的结果");
  return JSON.parse(clean.slice(s, e + 1));
}

// 读 ASX 官方「Upcoming floats and listings」页面，用 Flash-Lite 抽成结构化名单
export async function getAsxFloats(key) {
  try {
    const r = await fetch(FLOATS_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SignalDeskPro/1.0)" },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 3600 },
    });
    if (!r.ok) return { floats: [], error: `ASX ${r.status}` };
    let text = htmlToText(await r.text());
    const start = text.search(/intending to list|upcoming floats/i);
    if (start > 0) text = text.slice(start);
    text = text.slice(0, 9000);
    const out = await generate(key, {
      lite: true,
      maxTokens: 2500,
      prompt: `下面是 ASX 官方「Upcoming floats and listings」页面的文字。把每家准备上市的公司抽出来。
只输出 JSON：{"floats":[{"name":"公司名","code":"ASX 代码","listingDate":"YYYY-MM-DD","raise":"募资金额（页面有才写，否则空字符串）","price":"发行价（有才写）","sector":"行业/业务（有才写）"}]}
页面没写的字段留空字符串，不要猜。

${text}`,
    });
    const floats = (extractJSON(out.text).floats || []).filter((f) => f.code || f.name);
    floats.sort((a, b) => (a.listingDate || "9").localeCompare(b.listingDate || "9"));
    return { floats };
  } catch (e) {
    return { floats: [], error: e.message };
  }
}

const IPO_QUERIES = [
  "ASX IPO when:7d",
  "ASX debut shares when:7d",
  "ASX float prospectus when:14d",
  "IPO priced when:3d",
];
const GEO_QUERIES = [
  "Iran war Strait of Hormuz oil when:2d",
  "Russia Ukraine war when:2d",
  "China Taiwan US tensions when:3d",
  "tariffs sanctions trade war when:3d",
  "election markets when:3d",
];
const CRYPTO_QUERIES = [
  "Hyperliquid HYPE when:2d",
  "bitcoin price when:1d",
  "crypto market ETF when:2d",
];
const MARKET_QUERIES = [
  "ASX evening wrap top gainers when:1d",
  "ASX most traded shares volume when:2d",
  "ASX 200 close when:1d",
  "ASX shares surge when:1d",
  "ASX shares tumble when:1d",
  "ASX trading halt capital raising when:1d",
  "Wall Street stocks close when:1d",
  "RBA OR \"Australian dollar\" when:2d",
  "commodities iron ore gold oil prices when:1d",
];

function block(items, offset) {
  return items
    .map((i, n) => {
      const d = i.date ? new Date(i.date).toISOString().slice(0, 16).replace("T", " ") : "?";
      return `[${n + 1 + offset}] ${d}Z · ${i.source || "?"} · ${i.title}`;
    })
    .join("\n");
}

export async function buildBrief(key, slot = currentSlot()) {
  const [floatsRes, ipoNews, geoNews, mktNews, cryptoNews] = await Promise.all([
    getAsxFloats(key),
    gatherNews(IPO_QUERIES, 8, 12),
    gatherNews(GEO_QUERIES, 6, 14),
    gatherNews(MARKET_QUERIES, 8, 28),
    gatherNews(CRYPTO_QUERIES, 6, 10),
  ]);
  const news = [...ipoNews, ...geoNews, ...mktNews, ...cryptoNews];
  const today = slot.date;
  const floatsList = floatsRes.floats.length
    ? floatsRes.floats
        .map((f) => `- ${f.code || "?"} · ${f.name} · 上市日 ${f.listingDate || "?"}${f.raise ? ` · 募资 ${f.raise}` : ""}${f.price ? ` · 发行价 ${f.price}` : ""}${f.sector ? ` · ${f.sector}` : ""}`)
        .join("\n")
    : "（这次没读到 ASX 官方名单）";

  const prompt = `今天是 ${today}（布里斯班时间），这是${slot.slot === "am" ? "开盘前 / 早盘" : "收盘后"}简报。
你在为一个主要交易 ASX 小盘股的散户写每日简报。他想像顶级交易员一样做功课，最关心：① 政治和战争对市场的影响 ② ASX 最热、成交量最大的股票和原因 ③ ASX IPO ④ 可能有二阶效应的热点。

━━ ASX 官方 upcoming floats 名单（权威来源，代码和日期以这里为准）━━
${floatsList}

━━ IPO 相关新闻 ━━
${block(ipoNews, 0) || "（无）"}

━━ 政治 / 战争 / 地缘新闻 ━━
${block(geoNews, ipoNews.length) || "（无）"}

━━ 市场新闻 ━━
${block(mktNews, ipoNews.length + geoNews.length) || "（无）"}

━━ Crypto / Hyperliquid 新闻 ━━
${block(cryptoNews, ipoNews.length + geoNews.length + mktNews.length) || "（无）"}

规则：
- 事实只能来自上面的名单和新闻标题。标题里没有的数字不要写。每条结论用 src 标出依据的新闻编号。
- IPO：先列「未来 14 天内上市」的（来自 ASX 名单），再列「最近刚上市 / 新闻里提到」的。名单之外的公司要写清楚是新闻报道。
- 地缘：最多 4 条，只挑真正会影响价格的（油、金、国防、汇率、关税），写清楚传导到哪些资产。
- 异动：只挑新闻里明确说了涨跌原因的 ASX 公司，最多 8 家。
- 成交量：新闻里提到放量 / 最多成交 / 交易量异常的 ASX 股票，最多 6 家；没有就给空数组。
- 热点：最多 4 个，按「二阶效应潜力」排，不按热度。
- Crypto：最多 3 条，优先 Hyperliquid / HYPE，其次 BTC 和整体市场；只写新闻里有的事实，没有就给空数组。
- 用简体中文，保留英文 ticker 和术语。简洁，不要废话，不是投资建议。

只输出 JSON：
{"headline":"一句话总结今天最重要的事",
"mood":"risk-on|risk-off|mixed",
"marketWrap":"市场概况 2-4 句（ASX 200、美股、商品、汇率，只用新闻里有的数字）",
"ipos":[{"code":"","name":"","date":"YYYY-MM-DD 或空","status":"upcoming|this-week|debuted|overseas","detail":"一句话：做什么、募资多少（有才写）","watch":"值得注意的点（例如：同行估值、市场情绪、首日表现）","src":[编号]}],
"geo":[{"title":"","what":"发生了什么","impact":"对哪些资产 / 板块的影响和方向","asxAngle":"ASX 哪类公司受影响","risk":"high|medium|low","src":[编号]}],
"volume":[{"ticker":"","name":"","note":"成交量情况和原因","src":[编号]}],
"movers":[{"ticker":"","name":"","dir":"up|down","reason":"原因一句话","src":[编号]}],
"hot":[{"title":"","why":"二阶效应在哪","asxAngle":"ASX 哪类公司可能受影响","priced":"fresh|partly|crowded","src":[编号]}],
"crypto":[{"asset":"HYPE / BTC / 市场","what":"发生了什么（一句话）","why":"为什么重要","src":[编号]}],
"watchNext":[{"what":"接下来要盯的事件","when":"YYYY-MM-DD 或 本周 / 未知"}]}`;

  const out = await generate(key, { prompt, maxTokens: 6000 });
  const data = extractJSON(out.text);
  return {
    key: slot.key,
    date: slot.date,
    slot: slot.slot,
    generatedAt: new Date().toISOString(),
    model: out.model,
    floats: floatsRes.floats,
    floatsError: floatsRes.error || null,
    news: news.map((n) => ({ title: n.title, source: n.source, link: n.link, date: n.date })),
    ...data,
  };
}
