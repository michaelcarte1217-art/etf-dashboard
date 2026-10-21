/** 数值格式化工具：行情数字统一入口，保证全站小数位与涨跌配色一致。 */

/** 价格：ETF 通常 3 位小数，指数 2 位；按数值大小自适应 */
export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return '--';
  if (value >= 1000) return value.toFixed(2);
  if (value >= 10) return value.toFixed(3);
  return value.toFixed(3);
}

/** 涨跌额：带正负号，3 位小数 */
export function formatChange(value: number): string {
  if (!Number.isFinite(value)) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(3)}`;
}

/** 百分比：带正负号，2 位小数 */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/** 金额：千分位，保留 2 位小数 */
export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return '--';
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 大额金额简写：过亿用「亿」，过万用「万」 */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return '--';
  if (Math.abs(value) >= 1e8) return `${(value / 1e8).toFixed(2)} 亿`;
  if (Math.abs(value) >= 1e4) return `${(value / 1e4).toFixed(2)} 万`;
  return value.toFixed(2);
}

/** 涨跌方向对应的 CSS 类：A 股惯例红涨绿跌 */
export function trendClass(value: number): string {
  if (!Number.isFinite(value) || value === 0) return 'flat';
  return value > 0 ? 'up' : 'down';
}

/** 涨跌方向对应的颜色值（供 ECharts 配置使用） */
export const TREND_COLORS = {
  up: '#F0425A',
  down: '#0BBF7A',
  flat: '#8A94A6',
} as const;

/** 把 HHmm 转成 HH:mm */
export function formatMinuteTime(raw: string): string {
  if (raw.length !== 4) return raw;
  return `${raw.slice(0, 2)}:${raw.slice(2)}`;
}

/** 时间戳转本地时分秒 */
export function formatClock(ms: number): string {
  if (!ms) return '--';
  return new Date(ms).toLocaleTimeString('zh-CN', { hour12: false });
}
