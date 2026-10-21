<script setup lang="ts">
import type { PortfolioSummary } from '../api/types';
import { formatMoney, formatPercent, trendClass } from '../utils/format';

defineProps<{ summary: PortfolioSummary; isDemo: boolean }>();
</script>

<template>
  <section class="summary" aria-label="持仓汇总">
    <div class="summary__card">
      <p class="summary__label">总市值</p>
      <p class="summary__value mono">¥{{ formatMoney(summary.totalMarketValue) }}</p>
      <p class="summary__meta">
        成本 ¥{{ formatMoney(summary.totalCostValue) }}
        <span v-if="isDemo" class="summary__demo">演示数据</span>
      </p>
    </div>

    <div class="summary__card">
      <p class="summary__label">今日盈亏</p>
      <p class="summary__value mono" :class="trendClass(summary.dayPnl)">
        {{ summary.dayPnl >= 0 ? '+' : '-' }}¥{{ formatMoney(Math.abs(summary.dayPnl)) }}
      </p>
      <p class="summary__meta">按昨收价计算</p>
    </div>

    <div class="summary__card">
      <p class="summary__label">累计盈亏</p>
      <p class="summary__value mono" :class="trendClass(summary.totalPnl)">
        {{ summary.totalPnl >= 0 ? '+' : '-' }}¥{{ formatMoney(Math.abs(summary.totalPnl)) }}
      </p>
      <p class="summary__meta">相对持仓成本</p>
    </div>

    <div class="summary__card">
      <p class="summary__label">累计收益率</p>
      <p class="summary__value mono" :class="trendClass(summary.totalPnlPercent)">
        {{ formatPercent(summary.totalPnlPercent) }}
      </p>
      <p class="summary__meta">{{ summary.positions.length }} 只标的</p>
    </div>
  </section>
</template>

<style scoped>
.summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--gap);
}

.summary__card {
  padding: 1rem 1.1rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-l);
}

.summary__label {
  font-size: var(--fs-tiny);
  color: var(--text-2);
  margin-bottom: 0.35rem;
}

.summary__value {
  font-size: 1.375rem;
  font-weight: 650;
  letter-spacing: -0.01em;
  line-height: 1.25;
}

.summary__meta {
  margin-top: 0.3rem;
  font-size: var(--fs-tiny);
  color: var(--text-3);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.summary__demo {
  padding: 0 0.3rem;
  border-radius: 3px;
  background: var(--accent-soft);
  color: var(--accent);
}

@media (max-width: 1024px) {
  .summary {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 520px) {
  .summary {
    grid-template-columns: 1fr;
  }

  .summary__value {
    font-size: 1.25rem;
  }
}
</style>
