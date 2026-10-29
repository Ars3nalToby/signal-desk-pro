// Live Wire 的新闻源：各大媒体自己公开的免费 RSS 头条。想加 / 删媒体，只改这个文件。
// group：au 澳洲、world 全球、markets 财经、crypto、korea 韩国、zh 中文
// 如果某个源失效，页面会显示「暂时读不到」，不影响其他源。

const GN = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-AU&gl=AU&ceid=AU:en`;

// 「大头条」：Google News 的头条已经把各家媒体的同一件事聚在一起，排在前面的就是此刻全网最大的新闻
export const TOP_FEEDS = [
  { id: "gn-au", name: "Google News 澳洲头条", url: "https://news.google.com/rss?hl=en-AU&gl=AU&ceid=AU:en" },
  { id: "gn-world", name: "Google News 全球头条", url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-AU&gl=AU&ceid=AU:en" },
];

export const OUTLETS = [
  { id: "abc", name: "ABC News", group: "au", url: "https://www.abc.net.au/news/feed/10719986/rss.xml", home: "https://www.abc.net.au/news" },
  { id: "abc-biz", name: "ABC 财经", group: "markets", url: "https://www.abc.net.au/news/feed/104217374/rss.xml", home: "https://www.abc.net.au/news/business" },
  { id: "smh", name: "Sydney Morning Herald", group: "au", url: "https://www.smh.com.au/rss/feed.xml", home: "https://www.smh.com.au" },
  { id: "guardian-au", name: "Guardian Australia", group: "au", url: "https://www.theguardian.com/au/rss", home: "https://www.theguardian.com/au" },
  { id: "afr", name: "AFR", group: "markets", url: "https://www.afr.com/rss/feed.xml", home: "https://www.afr.com" },
  { id: "reuters", name: "Reuters", group: "world", url: GN("site:reuters.com when:1d"), home: "https://www.reuters.com" },
  { id: "bloomberg", name: "Bloomberg Markets", group: "markets", url: "https://feeds.bloomberg.com/markets/news.rss", home: "https://www.bloomberg.com/markets" },
  { id: "cnbc", name: "CNBC", group: "markets", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", home: "https://www.cnbc.com" },
  { id: "ft", name: "Financial Times", group: "markets", url: "https://www.ft.com/rss/home", home: "https://www.ft.com" },
  { id: "bbc", name: "BBC News", group: "world", url: "https://feeds.bbci.co.uk/news/world/rss.xml", home: "https://www.bbc.com/news" },
  { id: "nyt", name: "New York Times", group: "world", url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", home: "https://www.nytimes.com" },
  { id: "aljazeera", name: "Al Jazeera", group: "world", url: "https://www.aljazeera.com/xml/rss/all.xml", home: "https://www.aljazeera.com" },
  { id: "coindesk", name: "CoinDesk", group: "crypto", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", home: "https://www.coindesk.com" },
  { id: "theblock", name: "The Block", group: "crypto", url: "https://www.theblock.co/rss.xml", home: "https://www.theblock.co" },
  { id: "yonhap", name: "Yonhap 韩联社", group: "korea", url: "https://en.yna.co.kr/RSS/news.xml", home: "https://en.yna.co.kr" },
  { id: "bbc-zh", name: "BBC 中文", group: "zh", url: "https://feeds.bbci.co.uk/zhongwen/simp/rss.xml", home: "https://www.bbc.com/zhongwen/simp" },
];

export const GROUPS = [
  ["all", "全部"],
  ["au", "澳洲"],
  ["world", "全球"],
  ["markets", "财经"],
  ["crypto", "Crypto"],
  ["korea", "韩国"],
  ["zh", "中文"],
];
