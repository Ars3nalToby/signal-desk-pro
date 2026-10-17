# Signal Desk Pro

个人交易研究台：**发现 → 研究 → 决定 → 复盘**。合并自 Signal Desk Pro、Domino Desk（骨牌局）、Global Signal Deck。

整套运行成本 **$0**：Vercel Hobby（免费）+ Gemini API 免费层 + 浏览器本地存储。

## 六个 tab

| Tab | 来源 | 耗 AI 额度？ |
|---|---|---|
| ⓪ 今日简报 — IPO 雷达（ASX 官方 upcoming floats）、ASX 异动、热点、接下来要盯；每天约 6:30am / 4:45pm 自动生成 | 新增 | 每份 1 Flash + 1 Flash-Lite |
| ① Morning Board — 行情、经济日历、新闻、catalyst 日历、快速链接 | Global Signal Deck | 不耗 |
| ② Hot Scan — 全球热点，按二阶效应潜力排序 | Domino Desk | 1 次搜索 |
| ③ Research — 骨牌推演 / Leto Bao 五步 / Next Nvidia 五关 | 两者合并 | 骨牌 1 搜索；五步 3 搜索 + 3 推理；五关 1 搜索 |
| ④ Decision Gate — 资金锁定、三句 thesis、证伪、止损、60 秒冷静期 | Signal Desk Pro | 不耗 |
| ⑤ Journal — ASX / US / Crypto 记录、胜率、R 倍数、复盘、备份 | Signal Desk Pro + 新增 crypto | 不耗 |

## 模型分配（`lib/models.js`）

- 最新事实：服务器先抓 Google News RSS（免费、不限次），再交给模型分析。（Gemini 2.5 已不对新项目开放；免费层 Gemini 3+ 没有 Google Search grounding）
- 分析：Gemini 3.8 Flash → 3.7 → 3.6 → 3 Flash → 3.5 Flash-Lite → 3.1 Flash-Lite；生成新闻搜索词用 Flash-Lite
- 额度用完（429）或模型名不存在（404）会自动换下一个
- 每天约可跑 13 次 Flash 级别的完整五步研究，之后自动降到 Flash-Lite；额度在太平洋时间午夜重置（布里斯班约下午 5–6 点）

Google 改额度或模型名时，只改 `lib/models.js`。

## 部署到 Vercel

1. 把这个文件夹推到 GitHub 新 repo（例如 `signal-desk-pro`）
2. Vercel → Add New Project → 选这个 repo → Framework 自动识别为 Next.js
3. Environment Variables 加：
   - `GEMINI_API_KEY` = 你在 AI Studio「Default Gemini Project」（Free tier）建的 key
   - `APP_PASSWORD` = 自己定一个密码（建议设置，防止别人用你的额度）
4. Deploy
5. 打开 `你的网址/api/models?p=你的密码`，确认模型都对应上了

## 本地测试（可选）

```bash
cp .env.example .env.local   # 填入 key
npm install
npm run dev                  # http://localhost:3000
```

## 注意

- 交易记录只存在当前浏览器。换设备或清浏览器前，在 Journal 用「导出备份」。
- 不要把 ai-builder-project（Tier 1，付费）的 key 放进来。
- 研究框架，不是投资建议。AI 会出错，数字要自己核对原始来源。

## 定时任务

`vercel.json` 里两个每日定时任务（Vercel 免费版每个任务每天最多一次，时间误差一小时内）：
- UTC 20:30 → 布里斯班约 6:30am，开盘前简报
- UTC 06:45 → 布里斯班约 4:45pm，收盘后简报
