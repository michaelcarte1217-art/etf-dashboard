# ETF 数据看板

一个独立完成的「数据抓取 + 可视化」作品：前端直连公开行情接口，实时展示 ETF 行情、持仓盈亏、分时 / 日K，以及 MACD 与布林带两种技术指标。Vue 3 + TypeScript + ECharts，**零后端进程**。

> 持仓为**演示数据**，仅供学习交流，不构成任何投资建议。

## 在线 Demo

- WorkBuddy 托管平台：见仓库发布记录 / 作品集官网「作品」卡片（上线后回填链接）
- GitHub Pages：`https://<用户名>.github.io/etf-dashboard/`（待仓库创建后启用）

## 功能特性

- **实时行情**：直连腾讯行情公开接口，15 秒轮询，可手动刷新
- **持仓盈亏**：市值 / 浮动盈亏 / 盈亏率 / 仓位占比一键汇总，点击表格行切换图表标的
- **分时图**：昨收中轴对称区间 + 均价线，仅交易时段有数据
- **日K图**：前复权日K + 成交量副图，滚轮缩放，默认展示最近 120 根
- **技术指标**：
  - MACD（12/26/9，可一键切换 10/20/7），柱状图与K线窗口对齐
  - 布林带（20 日 · 2 倍总体标准差）
- **三层数据降级**：在线实时 → localStorage 缓存 → 仓库静态 JSON 快照 → 明确错误态，接口挂了页面也不白屏
- **数据来源标识**：每个图表与顶栏都标注当前数据来自「实时 / 缓存 / 静态」及更新时间
- **A股配色惯例**：红涨绿跌，数字等宽对齐（`tabular-nums`）

## 技术栈

| 名称 | 用途 | 一句话理由 |
| --- | --- | --- |
| Vue 3 | 视图框架 | Composition API + `<script setup>`，逻辑内聚 |
| TypeScript | 类型系统 | strict 模式，指标算法纯函数、类型完备 |
| Vite 6 | 构建工具 | 冷启动快、产物体积小 |
| ECharts 5.6 | 图表库 | 按需引入（core + 4 类图表 + 6 个组件），独立 chunk 可长期缓存 |
| 手写 CSS | 样式方案 | 设计令牌驱动，深色金融主题，零 UI 框架 |
| Python 标准库 | 数据工具 | 纯 `urllib` 抓兜底数据，无第三方依赖 |

## 本地运行

要求 Node.js >= 20（开发与 CI 使用 Node 22）。

```bash
npm install
npm run dev      # 开发预览
npm run build    # 类型检查 + 构建 + 生成 404.html
npm run preview  # 预览构建产物
```

> 本机使用 managed Node 时请使用对应路径的 `node` / `npm`，例如：
> `/c/Users/<用户名>/.workbuddy/binaries/node/versions/22.22.2-6/npm run dev`

## 目录结构

```text
etf-dashboard/
├── index.html                        # 入口 HTML（SEO / OG meta / favicon）
├── public/
│   ├── favicon.svg                   # 品牌图标（涨跌双K）
│   ├── .nojekyll                     # GitHub Pages 跳过 Jekyll 处理
│   └── data/klines/                  # 静态兜底数据（日K + 分时快照）
├── scripts/
│   ├── fetch_klines.py               # 抓取兜底数据（纯标准库，无需装包）
│   ├── validate_holdings.py          # 校验 holdings.json 合法性
│   └── postbuild.mjs                 # 复制 index.html 为 404.html
├── src/
│   ├── api/                          # 腾讯三接口客户端（实时 / 日K / 分时）
│   ├── indicators/                   # MACD / BOLL 纯函数实现
│   ├── composables/                  # useQuotes / useKline / useMinute / useChart
│   ├── stores/                       # 持仓盈亏计算
│   ├── components/                   # 汇总卡、行情表、走马灯、四张图表
│   ├── utils/format.ts               # 价格 / 涨跌 / 金额格式化与涨跌色
│   ├── data/holdings.json            # 演示持仓（isDemo: true）
│   └── assets/styles/                # 设计令牌 + reset
├── .github/workflows/
│   ├── deploy.yml                    # 推送 main → GitHub Pages + 同步 Gitee 备份
│   └── refresh-data.yml              # 工作日收盘后定时刷新兜底数据
└── package.json
```

## 数据说明

### 数据来源

| 数据 | 接口 | 说明 |
| --- | --- | --- |
| 实时快照 | `qt.gtimg.cn/q=<代码>` | GBK 编码，需带市场前缀（`sh` / `sz`） |
| 日K（前复权） | `web.ifzq.gtimg.cn/appstock/app/fqkline/get` | 指数返回 `day` 键、ETF 返回 `qfqday` 键，已兼容 |
| 分时 | `web.ifzq.gtimg.cn/appstock/app/minute/query` | 仅交易时段返回数据 |

三个接口均为公开只读接口，CORS 全开，无需鉴权。前端单次请求带 8 秒超时，失败即按降级策略处理。

### 三层降级策略

```text
实时接口 ──成功──▶ 展示实时数据（标注「实时」+ 时间）
   │失败
   ▼
localStorage 缓存 ──命中──▶ 展示缓存（标注「缓存」）
   │未命中
   ▼
仓库静态 JSON ──存在──▶ 展示快照（标注「静态」）
   │不存在
   ▼
错误态提示（接口暂不可用，稍后重试）
```

### 刷新兜底数据

```bash
python scripts/fetch_klines.py          # 抓取最新日K与分时到 public/data/klines/
python scripts/validate_holdings.py     # 校验持仓文件
```

- 抓取范围在 `scripts/fetch_klines.py` 顶部的 `CODES` 中维护（持仓 + 上证指数），增删标的后同步修改即可
- 脚本仅用 Python 标准库；本机若注入了 `http_proxy` 假代理，脚本已显式 bypass
- GitHub Actions 已配置工作日 15:30（北京时间）自动刷新并提交，无需手动

### 换成真实持仓

编辑 `src/data/holdings.json`：

```json
{
  "currency": "CNY",
  "updatedAt": "2026-10-20",
  "isDemo": false,
  "positions": [
    { "code": "sh515880", "name": "通信ETF", "shares": 20000, "costPrice": 0.56, "tags": ["通信"] }
  ]
}
```

字段约束：`code` 必须带 `sh` / `sz` 前缀且不重复；`shares`、`costPrice` 必须为正数；`tags` 为字符串数组。修改后跑 `python scripts/validate_holdings.py` 校验。把 `isDemo` 改为 `false` 后，页脚与汇总卡的「演示数据」提示会自动消失。

## 指标算法

| 指标 | 参数 | 实现要点 |
| --- | --- | --- |
| MACD | 快/慢/信号 = 12/26/9（可切 10/20/7） | EMA 差值；柱 = (DIF − DEA) × 2 |
| 布林带 | 20 日 · 2 倍标准差 | 中轨 = 20 日 SMA；标准差用**总体标准差** |

两个指标均为纯函数（输入收盘价数组，输出等长序列），样本不足时返回 `null` 而不抛错，便于单测与 SSR 渲染。

## 部署

`main` 分支推送触发 GitHub Actions：`npm run build` → 发布 GitHub Pages → 同步 `dist` 到 Gitee 仓库备份。

- `vite.config.ts` 使用 `base: './'` 相对路径，同一份产物部署在根路径或子路径均可访问
- Gitee Pages 静态托管已于 2026 年停服，Gitee 侧只做代码托管与产物备份
- 部署前需在 GitHub Secrets 配置 `GITEE_USERNAME` / `GITEE_TOKEN` / `GITEE_REPO`（Gitee 同步步骤已设 `continue-on-error`，未配置也不影响 Pages 发布）

## 免责声明

本项目数据来自公开行情接口，仅用于前端技术学习与演示。行情数据可能存在延迟或误差，本项目**不构成任何投资建议**，据此操作风险自担。

## License

[MIT](./LICENSE) · Copyright (c) 2026 李宏洋
