// ─────────────────────────────────────────────────────────────
// 模型配置（全部在 Gemini 免费层内）
// 数据来源：你 AI Studio「Default Gemini Project」的 Rate Limit 页面（2026-10-17）
//
// 规则：
// - 需要联网搜索的任务 → 只能用 Gemini 2.5 系列（Gemini 3+ 免费层 search grounding = 0）
// - 纯推理任务 → 优先最新 Flash（每天各 20 次，额度分开算），用完自动降到 Flash-Lite（每天 500 次）
// - 某个模型名不存在 / 额度用完（404 / 429）→ 自动试下一个
//
// Google 以后改额度或模型名，只需要改这个文件。
// ─────────────────────────────────────────────────────────────

export const SEARCH_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

export const REASON_CHAIN = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
];

// 每天免费次数（RPD）——用于界面上的额度仪表
export const DAILY_LIMITS = {
  "gemini-2.5-flash": 20,
  "gemini-2.5-flash-lite": 20,
  "gemini-3.8-flash": 20,
  "gemini-3.7-flash": 20,
  "gemini-3.6-flash": 20,
  "gemini-3-flash": 20,
  "gemini-3.5-flash-lite": 500,
  "gemini-3.1-flash-lite": 500,
};

// 搜索型调用每天合计上限（2.5 Flash 20 + 2.5 Flash-Lite 20）
export const SEARCH_DAILY_TOTAL = 40;

// Gemini 免费额度在美国太平洋时间午夜重置
export function quotaDay(d = new Date()) {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}
