// Google News RSS：免费、不耗 AI 额度。新闻 tab 和 AI 研究的"最新事实"都从这里来。

function decode(s = "") {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function parseRss(xml, max = 12) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) && items.length < max) {
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

// 过滤掉权证 / 报价页这类噪音
const NOISE = /(CITIWARRANTS|INSTAL MINI|stock price, news, quote and history|share price and news)/i;

export async function searchNews(query, { max = 10, region = "AU" } = {}) {
  const ceid = region === "US" ? "US:en" : "AU:en";
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-${region}&gl=${region}&ceid=${ceid}`;
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 SignalDeskPro" },
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return [];
    return parseRss(await r.text(), max + 6)
      .filter((i) => !NOISE.test(i.title))
      .slice(0, max);
  } catch {
    return [];
  }
}

// 多个搜索词一起抓，去重，按时间排序
export async function gatherNews(queries, perQuery = 8) {
  const lists = await Promise.all(queries.map((q) => searchNews(q, { max: perQuery })));
  const seen = new Set();
  const all = [];
  lists.flat().forEach((i) => {
    const k = i.title.toLowerCase().slice(0, 60);
    if (!seen.has(k)) {
      seen.add(k);
      all.push(i);
    }
  });
  all.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  return all.slice(0, 30);
}

export function newsBlock(items) {
  if (!items.length) return "（这次没有抓到相关新闻。只能根据已有知识推理，必须明确标注哪些是旧知识、可能已过时。）";
  return items
    .map((i, n) => {
      const d = i.date ? new Date(i.date).toISOString().slice(0, 10) : "?";
      return `[${n + 1}] ${d} · ${i.source || "?"} · ${i.title}`;
    })
    .join("\n");
}
