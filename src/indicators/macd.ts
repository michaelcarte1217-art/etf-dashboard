/**
 * MACD 指标（指数移动平均差值）。
 *
 * 纯函数实现，不依赖任何图表库，便于单元测试。
 * 默认参数 12/26/9（业界标准），看板 UI 可切换为 10/20/7。
 */

/** 计算 EMA 序列，首值以第一个收盘价作为种子（与主流行情软件一致） */
export function ema(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = new Array(values.length);
  out[0] = values[0];
  for (let i = 1; i < values.length; i += 1) {
    out[i] = values[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

export interface MacdResult {
  /** 快线 DIF */
  dif: number[];
  /** 慢线 DEA */
  dea: number[];
  /** 柱状图 MACD（(DIF - DEA) × 2，国内软件惯例） */
  macd: number[];
}

/** 计算 MACD */
export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): MacdResult {
  if (closes.length === 0) return { dif: [], dea: [], macd: [] };

  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const dif = emaFast.map((v, i) => v - emaSlow[i]);
  const dea = ema(dif, signal);
  const bar = dif.map((v, i) => (v - dea[i]) * 2);

  return { dif, dea, macd: bar };
}
