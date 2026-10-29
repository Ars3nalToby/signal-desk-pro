# Signal Desk Pro

个人交易**决策与纪律驾驶舱**：**决定 → 记录 → 复盘**，雷达只是辅助。合并自 Signal Desk Pro、Domino Desk（骨牌局）、Global Signal Deck。

核心问题不是"信息不够"，而是"跟得太快、没有规则、不知道自己真实的期望值"。所以打开网站默认先看复盘成绩单。

整套运行成本 **$0**：Vercel Hobby（免费）+ Gemini API 免费层 + 浏览器本地存储。

## 七个 tab

**驾驶舱（核心）**

| Tab | 做什么 | 耗 AI 额度？ |
|---|---|---|
| ① Decision Gate — 资金锁定、单笔最多亏 %（按止损距离自动算最多能买多少）、想法来源、三句 thesis、证伪、止损、60 秒冷静期 | 下单前先过这道门 | 不耗 |
| ② 复盘 Review — Hyperliquid 钱包自动同步（只读公开地址），算期望值 / 胜率 / 盈亏比 / 打平所需胜率 / 最大回撤，按想法来源（自己研究 / 跟 X / AI / 冲动…）拆开看，近 7 / 30 / 90 天 | 真实成绩单 | 不耗 |
| ③ Journal — ASX / US / Crypto 手动记录、R 倍数、复盘、备份 | 记录每一笔 | 不耗 |

**雷达（辅助）**

| Tab | 来源 | 耗 AI 额度？ |
|---|---|---|
| ④ 今日简报 — 政治/战争、ASX 热股与放量、IPO 雷达、热点、接下来要盯；每天约 6:30am / 4:45pm 自动生成 | 新增 | 每份 1 Flash + 1 Flash-Lite |
| ⑤ Morning Board — 行情、经济日历、新闻、catalyst 日历、快速链接 | Global Signal Deck | 不耗 |
| ⑥ Hot Scan — 全球热点，按二阶效应潜力排序 | Domino Desk | 1 次搜索 |
| ⑦ Research — 骨牌推演 / Leto Bao 五步 / Next Nvidia 五关 | 两者合并 | 骨牌 1 搜索；五步 3 搜索 + 3 推理；五关 1 搜索 |

### Hyperliquid 同步怎么算

- 服务器路由 `/api/hl` 调 Hyperliquid 公开 info API（`userFillsByTime` + `userFunding`），免费、不需要 key；只接受 0x 公开地址，**永远不要输入私钥 / 助记词**
- `lib/hl.js` 把成交按币种串成完整交易：仓位从 0 开到 0 平 = 一笔；反手（多翻空）结束旧的一笔、开始新的一笔；现货不算
- 每笔盈亏 = closedPnl − 手续费（含 builder fee）± 资金费
- API 只给最近 1 万条成交；在数据窗口开始前就有的仓位会标「开仓早于数据窗口」
- 浏览器里只存算好的交易和你的来源标记（不存原始成交）

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
