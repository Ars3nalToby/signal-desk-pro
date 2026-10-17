// 免费新闻：Google News RSS（不耗 AI 额度）。服务器端抓取，避开浏览器跨域限制。
import { searchNews } from "../../../lib/rss";

export const dynamic = "force-dynamic";

const FEEDS = {
  asx: "ASX shares when:1d",
  macro: "RBA OR \"Australian economy\" OR \"interest rates\" when:1d",
  ai: "AI chips OR \"data centre\" OR Nvidia when:1d",
  commodities: "lithium OR uranium OR gold OR copper OR \"iron ore\" price when:1d",
  crypto: "bitcoin OR solana OR crypto market when:1d",
};

export async function GET(req) {
  const topic = new URL(req.url).searchParams.get("topic") || "asx";
  const items = await searchNews(FEEDS[topic] || FEEDS.asx, { max: 12 });
  return Response.json(
    { topic, items, error: items.length ? undefined : "暂时没抓到" },
    { headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=1200" } }
  );
}
