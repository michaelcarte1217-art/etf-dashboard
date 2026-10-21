/** 持仓与实时行情合并，算市值、盈亏、仓位占比。 */
import { computed, type Ref } from 'vue';
import type { HoldingsFile, PortfolioSummary, PositionView, Quote } from '../api/types';

export function usePortfolio(holdings: HoldingsFile, quoteMap: Ref<Record<string, Quote>>) {
  const summary = computed<PortfolioSummary>(() => {
    const positions: PositionView[] = holdings.positions.map((p) => {
      const quote = quoteMap.value[p.code];
      // 行情未到时用成本价占位，避免首屏出现 0 值抖动
      const price = quote?.price ?? p.costPrice;
      const prevClose = quote?.prevClose ?? p.costPrice;

      const marketValue = price * p.shares;
      const costValue = p.costPrice * p.shares;
      const pnl = marketValue - costValue;
      const pnlPercent = costValue > 0 ? (pnl / costValue) * 100 : 0;
      const dayPnl = (price - prevClose) * p.shares;

      return {
        ...p,
        price,
        prevClose,
        marketValue,
        costValue,
        pnl,
        pnlPercent,
        dayPnl,
        weight: 0,
      };
    });

    const totalMarketValue = positions.reduce((s, p) => s + p.marketValue, 0);
    const totalCostValue = positions.reduce((s, p) => s + p.costValue, 0);
    const dayPnl = positions.reduce((s, p) => s + p.dayPnl, 0);
    const totalPnl = totalMarketValue - totalCostValue;

    for (const p of positions) {
      p.weight = totalMarketValue > 0 ? (p.marketValue / totalMarketValue) * 100 : 0;
    }

    return {
      positions,
      totalMarketValue,
      totalCostValue,
      totalPnl,
      totalPnlPercent: totalCostValue > 0 ? (totalPnl / totalCostValue) * 100 : 0,
      dayPnl,
    };
  });

  return { summary };
}
