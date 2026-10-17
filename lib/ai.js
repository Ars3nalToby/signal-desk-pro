"use client";
import { load, save } from "./store";
import { quotaDay } from "./models";

// 记录每个模型今天用了几次（按 Gemini 的太平洋时间日期重置）
export function getUsage() {
  const u = load("usage", { day: "", counts: {} });
  if (u.day !== quotaDay()) return { day: quotaDay(), counts: {} };
  return u;
}

function bump(model) {
  const u = getUsage();
  u.counts[model] = (u.counts[model] || 0) + 1;
  save("usage", u);
  window.dispatchEvent(new Event("sdp-usage"));
}

export async function runTask(task, payload) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-app-pass": load("pass", "") },
    body: JSON.stringify({ task, payload }),
  });
  let j = {};
  try {
    j = await res.json();
  } catch {
    throw new Error(res.status === 504 ? "请求超时（超过 60 秒），请重试" : `服务器错误 ${res.status}`);
  }
  if (!res.ok) {
    if (j.auth) window.dispatchEvent(new Event("sdp-auth"));
    throw new Error(j.error || `错误 ${res.status}`);
  }
  if (j.model) bump(j.model);
  return j; // { data, model, search, sources }
}
