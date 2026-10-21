<script setup lang="ts">
import type { Quote } from '../api/types';
import { formatChange, formatPercent, formatPrice, trendClass } from '../utils/format';

defineProps<{ quotes: Quote[]; loading: boolean }>();
</script>

<template>
  <div class="ticker" role="list" aria-label="实时行情条">
    <div v-if="loading && quotes.length === 0" class="ticker__placeholder">行情加载中…</div>
    <div v-for="q in quotes" :key="q.code" class="ticker__item" role="listitem">
      <span class="ticker__name">{{ q.name }}</span>
      <span class="ticker__price mono">{{ formatPrice(q.price) }}</span>
      <span class="ticker__change mono" :class="trendClass(q.change)">
        {{ formatChange(q.change) }}
        <span class="ticker__pct">{{ formatPercent(q.changePercent) }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.ticker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ticker__placeholder {
  font-size: var(--fs-small);
  color: var(--text-2);
}

.ticker__item {
  display: inline-flex;
  align-items: baseline;
  gap: 0.45rem;
  padding: 0.4rem 0.75rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 99px;
  font-size: var(--fs-small);
}

.ticker__name {
  color: var(--text-2);
  font-size: var(--fs-tiny);
}

.ticker__price {
  font-weight: 650;
}

.ticker__change {
  font-size: var(--fs-tiny);
}

.ticker__pct {
  margin-left: 0.2rem;
}
</style>
