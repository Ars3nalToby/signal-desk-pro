import { generate } from "../../../lib/gemini";
import { PERSONA, TASKS } from "../../../lib/prompts";
import { gatherNews, newsBlock } from "../../../lib/rss";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel 免费版最多 60 秒
export const dynamic = "force-dynamic";

function extractJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  const s = clean.indexOf("{");
  const e = clean.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("AI 没有返回可读的结果，请重试");
  return JSON.parse(clean.slice(s, e + 1));
}

const HOTSCAN_QUERIES = [
  "stock market when:2d",
  "ASX when:2d",
  "commodities prices when:2d",
  "AI chips data centre when:2d",
  "central bank interest rates when:2d",
  "China economy when:2d",
];

// 用 Flash-Lite（每天 500 次）把用户的中文描述变成 2–4 个英文新闻搜索词
async function buildQueries(key, task, payload) {
  if (task === "hotscan") {
    return payload.focus ? [`${payload.focus} when:2d`, ...HOTSCAN_QUERIES.slice(0, 4)] : HOTSCAN_QUERIES;
  }
  const subject = payload.headline || payload.signal || payload.theme || "";
  const companies = (payload.ctx?.valuechain?.companies || []).map((c) => `${c.ticker} ${c.name}`).join(", ");
  const hint =
    task === "inst"
      ? `重点找这些公司的机构持仓/大股东变动/基金增减持新闻：${companies || "（上一步没给公司）"}`
      : task === "nnscreen"
      ? "重点找这个主题下的上市公司、订单、产能、合约新闻"
      : "重点找能确认事实、数字、价格趋势和供需变化的新闻";
  const prompt = `把下面这个主题变成 3 个 Google News 英文搜索词（简短，2–6 个词，可以带公司名或 ticker）。${hint}
主题：「${subject}」${payload.market === "asx" ? "（偏澳洲市场）" : ""}
只输出 JSON：{"queries":["...","...","..."]}`;
  try {
    const out = await generate(key, { prompt, lite: true, maxTokens: 300 });
    const q = extractJSON(out.text).queries;
    if (Array.isArray(q) && q.length) return q.slice(0, 4).map((x) => `${x} when:30d`);
  } catch {}
  return [subject.slice(0, 80)];
}

export async function POST(req) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json(
      { error: "还没设置 GEMINI_API_KEY。去 Vercel → Project → Settings → Environment Variables 加上。" },
      { status: 500 }
    );
  }

  // 可选密码锁：在 Vercel 设置 APP_PASSWORD 后，别人打开网址也用不了你的额度
  const pass = process.env.APP_PASSWORD;
  if (pass && req.headers.get("x-app-pass") !== pass) {
    return Response.json({ error: "密码不对", auth: true }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const task = TASKS[body.task];
  if (!task) return Response.json({ error: "unknown task" }, { status: 400 });
  const payload = body.payload || {};

  let prompt = task.build(payload);
  let news = [];
  if (task.search) {
    const queries = await buildQueries(key, body.task, payload);
    news = await gatherNews(queries);
    prompt += `\n\n━━ 最新新闻标题（服务器刚从 Google News 抓取，今天是 ${new Date().toISOString().slice(0, 10)}）━━
${newsBlock(news)}
━━━━
规则：最新事实只能来自上面的新闻标题；标题里没有的数字/事件，要标注为"未确认"或"来自旧知识"。不要编造新闻。`;
  }

  let lastErr;
  const skip = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const out = await generate(key, { system: PERSONA, prompt, skip });
      try {
        const data = extractJSON(out.text);
        const sources = news.slice(0, 8).map((n) => ({ title: `${n.source ? n.source + "：" : ""}${n.title}`, uri: n.link }));
        return Response.json({ data, model: out.model, search: task.search, newsCount: news.length, sources });
      } catch (e) {
        lastErr = e;
        skip.push(out.model);
      }
    } catch (e) {
      return Response.json({ error: e.message }, { status: e.status || 500 });
    }
  }
  return Response.json({ error: lastErr?.message || "解析失败" }, { status: 502 });
}
