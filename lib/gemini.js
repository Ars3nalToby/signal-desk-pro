// 服务器端专用：调用 Gemini REST API。API key 只存在 Vercel 环境变量里，永远不会发到浏览器。
import { SEARCH_CHAIN, REASON_CHAIN } from "./models";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

let modelCache = { at: 0, names: null };

// 读取这把 key 实际能用的模型名（缓存 6 小时），把配置里的名字对应到真实名字
// 例如配置写 "gemini-3.8-flash"，实际可能叫 "gemini-3.8-flash-preview-09-2026"
async function availableModels(key) {
  if (modelCache.names && Date.now() - modelCache.at < 6 * 3600e3) return modelCache.names;
  const names = [];
  let pageToken = "";
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`${BASE}/models?pageSize=200&key=${key}${pageToken ? `&pageToken=${pageToken}` : ""}`);
    if (!r.ok) break;
    const j = await r.json();
    for (const m of j.models || []) {
      if ((m.supportedGenerationMethods || []).includes("generateContent")) {
        names.push(m.name.replace(/^models\//, ""));
      }
    }
    if (!j.nextPageToken) break;
    pageToken = j.nextPageToken;
  }
  modelCache = { at: Date.now(), names: names.length ? names : null };
  return modelCache.names;
}

const EXCLUDE = ["tts", "image", "live", "audio", "embedding", "transcribe", "robotics", "computer"];

function resolve(alias, names) {
  if (!names) return alias; // 列表读不到时直接用配置名
  if (names.includes(alias)) return alias;
  const wantsLite = alias.includes("lite");
  const cands = names.filter(
    (n) =>
      n.startsWith(alias + "-") &&
      (wantsLite || !n.includes("lite")) &&
      !EXCLUDE.some((x) => n.includes(x))
  );
  if (!cands.length) return null;
  // 优先正式版，其次 preview / latest
  cands.sort((a, b) => a.length - b.length);
  return cands[0];
}

export async function resolvedChains(key) {
  const names = await availableModels(key);
  const map = (chain) =>
    chain.map((alias) => ({ alias, model: resolve(alias, names) })).filter((x) => x.model);
  return { search: map(SEARCH_CHAIN), reason: map(REASON_CHAIN), listed: !!names };
}

async function callOnce(key, model, { system, prompt, search }) {
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (search) body.tools = [{ google_search: {} }];

  const r = await fetch(`${BASE}/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let msg = "";
    try {
      msg = (await r.json())?.error?.message || "";
    } catch {}
    const e = new Error(`Gemini ${r.status}: ${msg.slice(0, 200)}`);
    e.status = r.status;
    throw e;
  }
  const j = await r.json();
  const cand = j.candidates?.[0];
  const text = (cand?.content?.parts || []).map((p) => p.text || "").join("\n").trim();
  const sources = (cand?.groundingMetadata?.groundingChunks || [])
    .map((c) => c.web)
    .filter(Boolean)
    .map((w) => ({ title: w.title || w.uri, uri: w.uri }));
  if (!text) {
    const e = new Error(`Gemini 返回空内容（${cand?.finishReason || "unknown"}）`);
    e.status = 502;
    throw e;
  }
  return { text, sources };
}

// 按顺序尝试模型链：404（模型不存在）/ 429（额度用完）/ 5xx 就换下一个
export async function generate(key, { system, prompt, search, skip = [] }) {
  const chains = await resolvedChains(key);
  const chain = (search ? chains.search : chains.reason).filter((x) => !skip.includes(x.alias));
  const tried = [];
  for (const { alias, model } of chain) {
    try {
      const out = await callOnce(key, model, { system, prompt, search });
      return { ...out, model: alias, modelId: model, tried };
    } catch (e) {
      tried.push({ alias, status: e.status || 0, error: e.message });
      if ([400, 401, 403].includes(e.status) && /API key/i.test(e.message)) throw e; // key 本身有问题，不用再试
      continue;
    }
  }
  const allQuota = tried.length && tried.every((t) => t.status === 429);
  const e = new Error(
    allQuota
      ? search
        ? "今天的免费搜索额度已用完（2.5 Flash / Flash-Lite 各 20 次）。太平洋时间午夜重置，约布里斯班时间下午 5–6 点。"
        : "今天所有推理模型的免费额度都用完了，明天重置。"
      : "所有模型都调用失败：" + tried.map((t) => `${t.alias}(${t.status})`).join(", ")
  );
  e.status = allQuota ? 429 : 502;
  e.tried = tried;
  throw e;
}
