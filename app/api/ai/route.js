import { generate } from "../../../lib/gemini";
import { PERSONA, TASKS } from "../../../lib/prompts";

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

  const prompt = task.build(body.payload || {});
  let lastErr;
  // 最多试两轮：JSON 解析失败时换下一个模型再来一次
  const skip = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const out = await generate(key, { system: PERSONA, prompt, search: task.search, skip });
      try {
        const data = extractJSON(out.text);
        return Response.json({ data, model: out.model, search: task.search, sources: out.sources.slice(0, 8) });
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
