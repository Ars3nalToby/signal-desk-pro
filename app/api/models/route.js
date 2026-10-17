// 诊断用：打开 /api/models 可以看到这把 key 实际对应到哪些模型
import { resolvedChains } from "../../../lib/gemini";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ ok: false, error: "GEMINI_API_KEY 未设置" });
  const pass = process.env.APP_PASSWORD;
  const url = new URL(req.url);
  if (pass && url.searchParams.get("p") !== pass && req.headers.get("x-app-pass") !== pass) {
    return Response.json({ ok: false, error: "需要密码：/api/models?p=你的密码" }, { status: 401 });
  }
  try {
    const c = await resolvedChains(key);
    return Response.json({ ok: true, ...c });
  } catch (e) {
    return Response.json({ ok: false, error: e.message });
  }
}
