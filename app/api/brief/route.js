// 每日简报接口。
// - Vercel 定时任务每天两次（开盘前 / 收盘后）自动调用，提前生成并缓存
// - 你打开网站时直接读缓存，秒开；如果还没生成，就当场生成（约 20–40 秒）
// - ?refresh=1 强制重新生成
import { unstable_cache } from "next/cache";
import { buildBrief, currentSlot } from "../../../lib/brief";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function cachedBrief(key, slot) {
  return unstable_cache(() => buildBrief(key, slot), ["daily-brief-v2", slot.key], {
    revalidate: 60 * 60 * 6,
    tags: ["daily-brief"],
  })();
}

export async function GET(req) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: "还没设置 GEMINI_API_KEY" }, { status: 500 });

  const url = new URL(req.url);
  const isCron =
    (process.env.CRON_SECRET && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`) ||
    /vercel-cron/i.test(req.headers.get("user-agent") || "");
  const pass = process.env.APP_PASSWORD;
  if (!isCron && pass && req.headers.get("x-app-pass") !== pass) {
    return Response.json({ error: "密码不对", auth: true }, { status: 401 });
  }

  const slot = currentSlot();
  try {
    if (isCron) {
      await cachedBrief(key, slot); // 只预先生成，不回传内容
      return Response.json({ ok: true, warmed: slot.key });
    }
    const brief = url.searchParams.get("refresh") ? await buildBrief(key, slot) : await cachedBrief(key, slot);
    return Response.json(brief);
  } catch (e) {
    return Response.json({ error: e.message, slot: slot.key }, { status: e.status || 500 });
  }
}
