// ─────────────────────────────────────────────────────────────
// 模型配置（全部在 Gemini 免费层内）
//
// 2026-10-18 更新：
// Google 官方 changelog（2026-09-18）：Gemini 2.5 Flash / 2.5 Flash-Lite 只对"以前用过的项目"开放，
// 新项目调用会 404。官方建议的替代是 gemini-3.8-flash 和 gemini-3.5-flash-lite。
// 而免费层的 Google Search grounding 对 Gemini 3 及更新模型 = 0 次。
// → 所以"联网"改成：服务器先抓 Google News RSS（免费、不限次数），再把最新新闻喂给模型分析。
//
// 规则：
// - 主力分析：最新 Flash（3.8 → 3.7 → 3.6 → 3，每个每天 20 次，额度分开算）
// - 用完自动降到 Flash-Lite（3.5 / 3.1，每个每天 500 次）
// - 小任务（生成新闻搜索词）直接用 Flash-Lite，不占 Flash 额度
// - 某个模型不存在 / 额度用完（404 / 429）→ 自动试下一个
//
// Google 以后改额度或模型名，只需要改这个文件。
// ─────────────────────────────────────────────────────────────

export const MAIN_CHAIN = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

export const LITE_CHAIN = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"];

// 每天免费次数（RPD）——用于界面上的额度仪表（来自你的 AI Studio Rate Limit 页面）
export const DAILY_LIMITS = {
  "gemini-3.8-flash": 20,
  "gemini-3.7-flash": 20,
  "gemini-3.6-flash": 20,
  "gemini-3-flash": 20,
  "gemini-3.5-flash-lite": 500,
  "gemini-3.1-flash-lite": 500,
};

export const FLASH_KEYS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3-flash"];
export const LITE_KEYS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

// Gemini 免费额度在美国太平洋时间午夜重置
export function quotaDay(d = new Date()) {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}
