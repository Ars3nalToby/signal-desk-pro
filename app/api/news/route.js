// 免费新闻：Google News RSS（不耗 AI 额度）。服务器端抓取，避开浏览器跨域限制。
export const dynamic = "force-dynamic";

const FEEDS = {
  asx: "ASX shares when:1d",
  macro: "RBA OR \"Australian economy\" OR \"interest rates\" when:1d",
  ai: "AI chips OR \"data centre\" OR Nvidia when:1d",
  commodities: "lithium OR uranium OR gold OR copper OR \"iron ore\" price when:1d",
  crypto: "bitcoin OR solana OR crypto market when:1d",
};

function decode(s = "") {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parse(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) && items.length < 12) {
    const block = m[1];
    const get = (tag) => decode((block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1]);
    const title = get("title");
    const source = get("source");
    items.push({
      title: source && title.endsWith(` - ${source}`) ? title.slice(0, -(source.length + 3)) : title,
      link: get("link"),
      source,
      date: get("pubDate"),
    });
  }
  return items;
}

export async function GET(req) {
  const topic = new URL(req.url).searchParams.get("topic") || "asx";
  const q = FEEDS[topic] || FEEDS.asx;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-AU&gl=AU&ceid=AU:en`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 SignalDeskPro" }, next: { revalidate: 600 } });
    if (!r.ok) throw new Error(`RSS ${r.status}`);
    const items = parse(await r.text());
    return Response.json({ topic, items }, { headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=1200" } });
  } catch (e) {
    return Response.json({ topic, items: [], error: e.message });
  }
}
