// Jensen Huang Tracker：NVIDIA 官方 Newsroom 新闻稿 RSS + Google News「Jensen Huang」。
// 免费、不耗 AI 额度。服务器端抓取，缓存 30 分钟；任何一个源失败都只影响它自己那一栏。
import { parseRss, searchNews } from "../../../lib/rss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const CACHE = 1800; // 30 分钟

// 官方地址：NVIDIA 自己的 RSS 页面（nvidia.com/about-nvidia/rss）和 nvidia.com/llms.txt 都列出 releases.xml。
// rss.xml 是同一个 Newsroom 的另一个公开 feed，只在 releases.xml 读不到时作为备用。
const NEWSROOM_FEEDS = ["https://nvidianews.nvidia.com/releases.xml", "https://nvidianews.nvidia.com/rss.xml"];

const toItem = (i, fallbackSource) => {
  const t = Date.parse(i.date);
  return { title: i.title, link: i.link, source: i.source || fallbackSource, at: Number.isFinite(t) ? t : null };
};

async function newsroom() {
  let lastErr = "";
  for (const url of NEWSROOM_FEEDS) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SignalDesk/1.0; +rss)", Accept: "application/rss+xml, application/xml, text/xml, */*" },
        next: { revalidate: CACHE },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) {
        lastErr = `HTTP ${r.status}`;
        continue;
      }
      const items = parseRss(await r.text(), 8).map((i) => toItem(i, "NVIDIA Newsroom"));
      items.sort((a, b) => (b.at || 0) - (a.at || 0));
      if (items.length) return { items, error: null };
      lastErr = "没有内容";
    } catch (e) {
      lastErr = e.name === "TimeoutError" ? "超时" : e.message;
    }
  }
  return { items: [], error: lastErr || "读不到" };
}

async function jensen() {
  // 用和每日简报相同的 Google News 抓取函数；加引号只要完整名字，去掉 NVIDIA 自己的新闻稿避免和上一栏重复
  const items = await searchNews('"Jensen Huang" when:14d', { max: 8, region: "US", revalidate: CACHE });
  const list = items.filter((i) => !/nvidianews\.nvidia\.com/.test(i.link)).map((i) => toItem(i, ""));
  list.sort((a, b) => (b.at || 0) - (a.at || 0));
  return { items: list, error: list.length ? null : "暂时没有抓到" };
}

export async function GET() {
  const [nr, jh] = await Promise.all([newsroom(), jensen()]);
  return Response.json(
    { newsroom: nr, jensen: jh, at: Date.now() },
    { headers: { "Cache-Control": `s-maxage=${CACHE}, stale-while-revalidate=${CACHE * 2}` } }
  );
}
