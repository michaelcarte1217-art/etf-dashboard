/**
 * 布林带指标（Bollinger Bands）。
 *
 * 中轨 = N 日简单移动平均，上下轨 = 中轨 ± k × 标准差（总体标准差）。
 * 样本不足 N 的位置填空（NaN），由图表侧跳过，避免画出假的平线。
 */

export interface BollResult {
  /** 上轨 */
  upper: (number | null)[];
  /** 中轨（MA） */
  middle: (number | null)[];
  /** 下轨 */
  lower: (number | null)[];
}

/** 计算布林带，默认 20 日、2 倍标准差 */
export function boll(closes: number[], period = 20, multiplier = 2): BollResult {
  const n = closes.length;
  const upper: (number | null)[] = new Array(n).fill(null);
  const middle: (number | null)[] = new Array(n).fill(null);
  const lower: (number | null)[] = new Array(n).fill(null);

  if (n < period) return { upper, middle, lower };

  for (let i = period - 1; i < n; i += 1) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j += 1) sum += closes[j];
    const ma = sum / period;

    let variance = 0;
    for (let j = i - period + 1; j <= i; j += 1) {
      const diff = closes[j] - ma;
      variance += diff * diff;
    }
    const sd = Math.sqrt(variance / period);

    middle[i] = ma;
    upper[i] = ma + multiplier * sd;
    lower[i] = ma - multiplier * sd;
  }

  return { upper, middle, lower };
}
