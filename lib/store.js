"use client";
// 浏览器本地存储（localStorage）。只存在这台设备的这个浏览器里——记得定期用 Journal 里的「导出备份」。
import { useEffect, useState, useCallback } from "react";

const PREFIX = "sdp.v1.";

export function load(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {}
}

export function usePersist(key, initial) {
  const [value, setValue] = useState(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setValue(load(key, initial));
    setReady(true);
    // 其他组件改了同一个 key 时同步过来
    const onSync = (e) => {
      if (e.detail === key) setValue(load(key, initial));
    };
    window.addEventListener("sdp-store", onSync);
    return () => window.removeEventListener("sdp-store", onSync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (v) =>
      setValue((prev) => {
        const next = typeof v === "function" ? v(prev) : v;
        save(key, next);
        setTimeout(() => window.dispatchEvent(new CustomEvent("sdp-store", { detail: key })), 0);
        return next;
      }),
    [key]
  );
  return [value, set, ready];
}

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export function exportAll() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(PREFIX)) out[k] = localStorage.getItem(k);
    }
  } catch {}
  return out;
}

export function importAll(obj) {
  try {
    Object.entries(obj).forEach(([k, v]) => k.startsWith(PREFIX) && localStorage.setItem(k, v));
    return true;
  } catch {
    return false;
  }
}
