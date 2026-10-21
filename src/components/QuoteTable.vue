<script setup lang="ts">
import type { PortfolioSummary } from '../api/types';
import { formatChange, formatPercent, formatPrice, trendClass } from '../utils/format';

const props = defineProps<{
  summary: PortfolioSummary;
  /** 当前选中的标的代码（用于图表联动） */
  selected: string;
}>();

const emit = defineEmits<{ select: [code: string] }>();

const percentOf = (price: number, prevClose: number): number =>
  prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
</script>

<template>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th scope="col">标的</th>
          <th scope="col" class="num">现价</th>
          <th scope="col" class="num">涨跌幅</th>
          <th scope="col" class="num">持仓</th>
          <th scope="col" class="num">成本</th>
          <th scope="col" class="num">市值</th>
          <th scope="col" class="num">盈亏</th>
          <th scope="col" class="num">仓位</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="p in props.summary.positions"
          :key="p.code"
          class="table__row"
          :class="{ 'table__row--active': p.code === props.selected }"
          tabindex="0"
          role="button"
          :aria-pressed="p.code === props.selected"
          @click="emit('select', p.code)"
          @keydown.enter="emit('select', p.code)"
          @keydown.space.prevent="emit('select', p.code)"
        >
          <td>
            <span class="table__name">{{ p.name }}</span>
            <span class="table__code mono">{{ p.code }}</span>
          </td>
          <td class="num mono">{{ formatPrice(p.price) }}</td>
          <td class="num mono" :class="trendClass(percentOf(p.price, p.prevClose))">
            {{ formatPercent(percentOf(p.price, p.prevClose)) }}
          </td>
          <td class="num mono">{{ p.shares.toLocaleString('zh-CN') }}</td>
          <td class="num mono">{{ formatPrice(p.costPrice) }}</td>
          <td class="num mono">¥{{ p.marketValue.toLocaleString('zh-CN', { maximumFractionDigits: 0 }) }}</td>
          <td class="num mono" :class="trendClass(p.pnl)">
            {{ formatChange(p.pnl) }}
            <span class="table__pct">{{ formatPercent(p.pnlPercent) }}</span>
          </td>
          <td class="num mono">{{ p.weight.toFixed(1) }}%</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-small);
}

.table th {
  padding: 0 0.6rem 0.6rem;
  text-align: left;
  font-weight: 500;
  font-size: var(--fs-tiny);
  color: var(--text-2);
  white-space: nowrap;
  border-bottom: 1px solid var(--line);
}

.table td {
  padding: 0.7rem 0.6rem;
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
}

.table tbody tr:last-child td {
  border-bottom: none;
}

/* 数值列右对齐；用双类选择器提升特异性，
   否则会被 .table th 的 text-align: left 覆盖导致表头与数据错位 */
.table th.num,
.table td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.table__row {
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out);
}

.table__row:hover {
  background: var(--surface-2);
}

.table__row--active {
  background: var(--accent-soft);
  box-shadow: inset 2px 0 0 var(--accent);
}

.table__name {
  display: block;
  color: var(--text);
  font-weight: 600;
}

.table__code {
  display: block;
  font-size: var(--fs-tiny);
  color: var(--text-3);
  line-height: 1.5;
}

.table__pct {
  display: block;
  font-size: var(--fs-tiny);
  opacity: 0.85;
}
</style>
