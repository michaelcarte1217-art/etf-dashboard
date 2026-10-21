/**
 * 腾讯行情接口客户端。
 *
 * 三个接口均已实测开放 CORS（Access-Control-Allow-Origin: *），浏览器可直接 fetch：
 *   1. 实时行情  https://qt.gtimg.cn/q=sh515880,sz159732        —— GBK 编码，需 TextDecoder('gbk')
 *   2. 日K       https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=<code>,day,,,<n>,qfq
 *   3. 分时      https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=<code>
 *
 * 已知陷阱：
 *   - 日K 前复权时，**指数返回键 day，ETF 返回键 qfqday**，必须两者兼容。
 *   - 实时接口是 JS 赋值文本 `v_sh515880="1~名称~代码~现价~...";`，不是 JSON。
 */
import type { Candle, MinutePoint, MinuteSeries, Quote } from './types';

const QT_BASE = 'https://qt.gtimg.cn/q=';
const IFZQ_BASE = 'https://web.ifzq.gtimg.cn/appstock/app';

/** 单次请求超时（毫秒） */
const TIMEOUT_MS = 8000;

/** 带超时的 fetch，避免接口卡住导致页面一直转圈 */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, cache: 'no-store' });
  } finally {
    window.clearTimeout(timer);
  }
}

/** 解析实时行情原始文本为 Quote 数组 */
function parseQuoteText(text: string): Quote[] {
  const quotes: Quote[] = [];
  for (const chunk of text.split(';')) {
    const matched = chunk.match(/v_(\w+)="([^"]+)"/);
    if (!matched) continue;
    const code = matched[1];
    const f = matched[2].split('~');
    if (f.length < 38) continue;

    const price = Number(f[3]);
    if (!Number.isFinite(price) || price <= 0) continue;

    quotes.push({
      code,
      name: f[1],
      price,
      prevClose: Number(f[4]),
      open: Number(f[5]),
      change: Number(f[31]),
      changePercent: Number(f[32]),
      high: Number(f[33]),
      low: Number(f[34]),
      amount: Number(f[37]) * 10000, // 接口单位为万元
      volume: Number(f[36]) || 0,
      timestamp: f[30] || '',
    });
  }
  return quotes;
}

/**
 * 拉取实时行情。
 * 实时接口返回 GBK 编码，必须按二进制读取后用 gbk 解码，否则中文名称乱码。
 */
export async function fetchQuotes(codes: string[]): Promise<Quote[]> {
  const res = await fetchWithTimeout(QT_BASE + codes.join(','));
  if (!res.ok) throw new Error(`实时行情请求失败：HTTP ${res.status}`);
  const buffer = await res.arrayBuffer();
  const text = new TextDecoder('gbk').decode(buffer);
  const quotes = parseQuoteText(text);
  if (quotes.length === 0) throw new Error('实时行情解析结果为空');
  return quotes;
}

/** 拉取日K（前复权）。key 兼容 day / qfqday。 */
export async function fetchKline(code: string, limit = 320): Promise<Candle[]> {
  const url = `${IFZQ_BASE}/fqkline/get?param=${code},day,,,${limit},qfq`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`日K请求失败：HTTP ${res.status}`);

  const json = await res.json();
  const node = json?.data?.[code];
  if (!node) throw new Error('日K数据结构异常');

  const rows: unknown[] | undefined = node.qfqday ?? node.day;
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('日K数据为空');

  const candles: Candle[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 6) continue;
    const [date, open, close, high, low, volume] = row as string[];
    const candle: Candle = {
      date,
      open: Number(open),
      close: Number(close),
      high: Number(high),
      low: Number(low),
      volume: Number(volume),
    };
    if (Number.isFinite(candle.close)) candles.push(candle);
  }
  if (candles.length === 0) throw new Error('日K解析结果为空');
  return candles;
}

/** 拉取当日分时。接口返回点格式："0930 0.516 434956 22443729.20" */
export async function fetchMinute(code: string): Promise<MinuteSeries> {
  const res = await fetchWithTimeout(`${IFZQ_BASE}/minute/query?code=${code}`);
  if (!res.ok) throw new Error(`分时请求失败：HTTP ${res.status}`);

  const json = await res.json();
  const node = json?.data?.[code]?.data;
  if (!node?.data || !Array.isArray(node.data)) throw new Error('分时数据结构异常');

  const points: MinutePoint[] = [];
  for (const line of node.data as string[]) {
    const parts = String(line).trim().split(/\s+/);
    if (parts.length < 3) continue;
    const price = Number(parts[1]);
    if (!Number.isFinite(price) || price <= 0) continue;
    points.push({
      time: parts[0],
      price,
      volume: Number(parts[2]) || 0,
      amount: Number(parts[3] ?? 0) || 0,
    });
  }

  if (points.length === 0) throw new Error('分时解析结果为空');
  return { date: node.date ?? '', points };
}

/** 读取仓库内预抓的静态兜底 JSON（同源，无 CORS 问题） */
export async function fetchStaticKline(code: string): Promise<Candle[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/klines/${code}.json`, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`兜底日K读取失败：HTTP ${res.status}`);
  const json = await res.json();
  const rows = json?.klines ?? json;
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('兜底日K数据为空');
  return rows as Candle[];
}

/** 读取仓库内预抓的分时兜底 JSON */
export async function fetchStaticMinute(code: string): Promise<MinuteSeries> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/klines/${code}-minute.json`, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`兜底分时读取失败：HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json?.points) || json.points.length === 0) throw new Error('兜底分时数据为空');
  return { date: json.date ?? '', points: json.points };
}
