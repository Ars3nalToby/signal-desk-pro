// 所有 AI 任务的 prompt。合并自 Signal Desk Pro（Leto Bao 五步）+ Domino Desk（Hot Scan / Chain Mapper / Next Nvidia）

const JSON_RULE = `
输出规则：只输出一个 JSON 对象，不要 markdown 代码块、不要前言后语。
中文字段用简体中文，保留英文专业术语（ticker、capex、order book 等）。简洁、具体、有数字就给数字。
不确定就明说不确定，不要编造数据、不要编造 ticker。这是研究工具，不是投资建议。`;

export const PERSONA = `你是一个冷静、数据驱动的买方研究分析师，方法论合并了三套框架：
1) Leto Bao：日常生活里的反常（涨价、缺货、排队）往往先于新闻和财报；把价格拉成曲线区分趋势和噪音；追问需求是不是结构性的；找产业链卡位公司；用 13F 连续几个季度的趋势验证机构态度，不看单一季度。
2) Domino（骨牌）思维：一个事件 → 一阶（显而易见、通常已被定价）→ 二阶（供应链/配套，常常风险回报更好）→ 三阶（最少人看、最没被定价）。
3) Next Nvidia 五关：chokepoint 卡位、order book 拐点、产能稀缺、operating leverage 经营杠杆、机构发现缺口（institutional discovery gap）。
风格：承认不确定性，宁可在中途否定一个 thesis，也不硬凑一个推荐；不做技术分析；分清"已被定价"和"还没被定价"。
用户主要交易 ASX 小盘股，其次美股，偶尔 crypto。${JSON_RULE}`;

const mkt = (m) =>
  m === "asx"
    ? "只考虑 ASX 上市公司（ticker 用 ASX 代码，如 NXT、SKS）"
    : m === "us"
    ? "只考虑美股"
    : m === "hk"
    ? "只考虑港股"
    : "市场不限，ASX 优先，其次流动性好的美股";

const ctxBlock = (ctx) =>
  ctx && Object.keys(ctx).length
    ? `\n\n前面阶段的结论（作为上下文，不要重复）：\n${JSON.stringify(ctx).slice(0, 6000)}`
    : "";

export const TASKS = {
  // ── Hot Scan（搜索）──
  hotscan: {
    search: true,
    build: ({ focus }) => `用 Google 搜索过去 48 小时全球最可能影响市场的新闻。${
      focus ? `重点方向：${focus}。` : ""
    }
挑出 5 条，按"二阶效应潜力"排序（不是按热度），并说明跟 ASX 的关系。
JSON 格式：
{"asOf":"今天日期","items":[{"title":"英文原标题或简述","titleZh":"中文标题","what":"一句话发生了什么","why":"为什么可能有二阶/三阶效应","asxAngle":"ASX 哪类公司可能受影响","heat":1到10,"priced":"fresh|partly|crowded"}]}`,
  },

  // ── Chain Mapper（搜索）──
  chain: {
    search: true,
    build: ({ headline, market }) => `事件/新闻：「${headline}」
先用 Google 搜索确认这件事的最新事实和数字，然后做骨牌推演。${mkt(market)}。
每一阶最多 4 家公司，必须是真实存在的上市公司。priced 表示这条逻辑被市场定价的程度：fresh=还没人讲、partly=开始有人讲、crowded=已经涨很多/人人都知道。
JSON 格式：
{"trigger":"一句话核心事实（含数字）","confirmed":"哪些是已确认事实","unconfirmed":"哪些只是报道或传闻",
"orders":[{"order":1,"label":"一阶 · 直接受益/受损","effects":[{"ticker":"","name":"","dir":"bull|bear","mechanism":"传导机制一句话","priced":"fresh|partly|crowded"}]},{"order":2,...},{"order":3,...}],
"bestRiskReward":"哪一阶、哪家风险回报最好，为什么","killSwitch":"什么事情发生会让整条链失效","watch":"接下来要盯的 1-2 个信号"}`,
  },

  // ── Leto Bao 五步 pipeline ──
  signal: {
    search: true,
    build: ({ signal, market }) => `用户观察到的反常信号：「${signal}」。${mkt(market)}。
第 1 步 信号定性：用 Google 搜索确认这个反常是不是真的、范围多大，定位背后真正的商品/服务/瓶颈。
JSON：{"real":"yes|partly|no","summary":"一句话结论","evidence":["证据1（含来源类型和数字）","证据2"],"commodity":"背后的核心商品/服务","scope":"本地个案还是全国/全球现象","score":0到100}`,
  },
  trend: {
    search: false,
    build: ({ signal, ctx }) => `信号：「${signal}」${ctxBlock(ctx)}
第 2 步 趋势还是噪音：根据已有证据推理，这个现象像趋势还是噪音？需要什么数据曲线才能确认？
JSON：{"verdict":"trend|noise|unclear","summary":"一句话","reasoning":"推理过程（3-4 句）","dataToCheck":["要去看的具体数据/曲线1","2"],"score":0到100}`,
  },
  structural: {
    search: true,
    build: ({ signal, ctx }) => `信号：「${signal}」${ctxBlock(ctx)}
第 3 步 结构性需求：用 Google 搜索判断背后是长期结构性需求，还是一次性/周期性事件。比较需求驱动 vs 供给响应（新产能多久上线）。
JSON：{"structural":"yes|partly|no","summary":"一句话","demandDriver":"需求驱动是什么","supplyResponse":"供给端多久能追上（含时间/数字）","duration":"这个缺口估计持续多久","falsify":"什么证据会证伪这个 thesis","score":0到100}`,
  },
  valuechain: {
    search: false,
    build: ({ signal, market, ctx }) => `信号：「${signal}」${ctxBlock(ctx)}
第 4 步 产业链卡位：${mkt(market)}。找出最多 3 家处在瓶颈/卡位位置、直接受益的上市公司。避免只是概念沾边的公司。
同时用 Next Nvidia 五关给每家打勾：chokepoint、orderBook（订单拐点）、scarcity（产能稀缺）、leverage（经营杠杆）、discovery（机构还没充分发现）。
JSON：{"summary":"一句话","companies":[{"ticker":"","name":"","position":"在产业链哪个位置、为什么是卡位","gates":{"chokepoint":true/false,"orderBook":true/false,"scarcity":true/false,"leverage":true/false,"discovery":true/false},"priced":"fresh|partly|crowded","risk":"最大风险"}],"avoid":"哪些看起来相关但其实不该碰的公司/类型","score":0到100}`,
  },
  inst: {
    search: true,
    build: ({ signal, ctx }) => `信号：「${signal}」${ctxBlock(ctx)}
第 5 步 机构验证：针对上一步的公司，用 Google 搜索机构持仓变化。美股看 13F 连续几个季度的趋势（注意 13F 有约 45 天滞后）；ASX 公司看 substantial holder 公告（持股 5% 以上的大股东变动）和券商覆盖情况。不看单一季度。
JSON：{"summary":"一句话","findings":[{"ticker":"","trend":"增持|减持|持平|数据不足","detail":"具体发现（含季度/机构名/比例，找不到就说找不到）"}],"caveat":"数据局限","score":0到100}`,
  },
  verdict: {
    search: false,
    build: ({ signal, ctx }) => `信号：「${signal}」${ctxBlock(ctx)}
最终结论：综合五步，给出 conviction 分数和框架。不要说"现在买"，要说"等什么条件出现才考虑"。
包含 Leto Bao 式风险提示：长期 thesis 可能对，但短期持仓体验可能很差；尾部风险怎么管理。
JSON：{"conviction":0到100,"oneLiner":"一句话结论","weakestLink":"五步里最弱的一环是哪一步、为什么","entryFramework":"等什么信号/价格/事件出现才考虑进场","exitFramework":"什么情况下认错离场","sizing":"仓位建议（以'游戏资金'的百分比表达）","risks":["风险1","风险2","风险3"],"nextCheck":"下一次要复查的时间点和指标"}`,
  },

  // ── Next Nvidia 主题筛选（搜索）──
  nnscreen: {
    search: true,
    build: ({ theme, market }) => `主题：「${theme}」。${mkt(market)}。
用 Google 搜索，找出这个主题下最多 5 家候选公司，用 Next Nvidia 五关逐一评分：chokepoint 卡位、orderBook 订单拐点、scarcity 产能稀缺、leverage 经营杠杆、discovery 机构发现缺口。
JSON：{"theme":"","candidates":[{"ticker":"","name":"","gates":{"chokepoint":true/false,"orderBook":true/false,"scarcity":true/false,"leverage":true/false,"discovery":true/false},"verdict":"一句话判断","risk":"最大风险","priced":"fresh|partly|crowded"}],"note":"整体提醒"}`,
  },
};
