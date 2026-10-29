// Live Wire：同时抓各大媒体的 RSS 头条（免费，不耗 AI 额度）。服务器端抓，避开浏览器跨域；每个源缓存 2 分钟。
import { parseRss } from "../../../lib/rss";
import { TOP_FEEDS, OUTLETS } from "../../../lib/wire";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

async function pull(feed, max) {
  try {
    const r = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SignalDesk/1.0; +rss)", Accept: "application/rss+xml, application/xml, text/xml, */*" },
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(7000),
    });
    if (!r.ok) return { ...feed, items: [], error: `HTTP ${r.status}` };
    const items = parseRss(await r.text(), max).map((i) => {
      const t = Date.parse(i.date);
      return { title: i.title, link: i.link, source: i.source || "", at: Number.isFinite(t) ? t : null };
    });
    return { ...feed, items, error: items.length ? null : "没有内容" };
  } catch (e) {
    return { ...feed, items: [], error: e.name === "TimeoutError" ? "超时" : e.message };
  }
}

export async function GET() {
  const [top, outlets] = await Promise.all([Promise.all(TOP_FEEDS.map((f) => pull(f, 12))), Promise.all(OUTLETS.map((f) => pull(f, 10)))]);
  const strip = ({ url, ...rest }) => rest;
  return Response.json(
    { top: top.map(strip), outlets: outlets.map(strip), at: Date.now() },
    { headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=300" } }
  );
}
