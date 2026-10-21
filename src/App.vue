<script setup lang="ts">
import { computed, ref } from 'vue';
import holdingsFile from './data/holdings.json';
import type { HoldingsFile } from './api/types';
import { useQuotes } from './composables/useQuotes';
import { useKline, useMinute } from './composables/useKline';
import { usePortfolio } from './stores/portfolio';
import DataSourceBadge from './components/DataSourceBadge.vue';
import PnlSummary from './components/PnlSummary.vue';
import QuoteTable from './components/QuoteTable.vue';
import QuoteTicker from './components/QuoteTicker.vue';
import MinuteChart from './components/MinuteChart.vue';
import KlineChart from './components/KlineChart.vue';
import MacdChart from './components/MacdChart.vue';
import BollChart from './components/BollChart.vue';
import { formatPercent, formatPrice, trendClass } from './utils/format';

const holdings = holdingsFile as HoldingsFile;

/** 轮询的标的：持仓 + 大盘指数 */
const INDEX_CODE = 'sh000001';
const trackedCodes = ref<string[]>([
  INDEX_CODE,
  ...holdings.positions.map((p) => p.code),
]);

const { quoteMap, source, errorMessage, updatedAt, loading, manualRefresh } =
  useQuotes(trackedCodes);

const { summary } = usePortfolio(holdings, quoteMap);

/** 当前图表联动的标的，默认第一只持仓 */
const selectedCode = ref(holdings.positions[0]?.code ?? INDEX_CODE);
const selectedQuote = computed(() => quoteMap.value[selectedCode.value]);
const selectedName = computed(() => selectedQuote.value?.name ?? selectedCode.value);

const codeRef = computed(() => selectedCode.value);
const { candles, source: klineSource, loading: klineLoading } = useKline(codeRef, 320);
const { series: minuteSeries, source: minuteSource, loading: minuteLoading } = useMinute(codeRef);

/** MACD 参数：默认 12/26/9，可切到 10/20/7 */
type MacdPreset = '12/26/9' | '10/20/7';
const macdPreset = ref<MacdPreset>('12/26/9');
const macdParams = computed(() => {
  const [fast, slow, signal] = macdPreset.value.split('/').map(Number);
  return { fast, slow, signal };
});

/** 图表只显示最近 120 根，指标图与之对齐 */
const VISIBLE = 120;
const startPercent = computed(() =>
  candles.value.length > VISIBLE
    ? Math.max(0, 100 - (VISIBLE / candles.value.length) * 100)
    : 0,
);

const indexQuote = computed(() => quoteMap.value[INDEX_CODE]);

const dataHint = computed(() => {
  if (source.value === 'error') return errorMessage.value || '行情接口暂不可用，请稍后重试';
  if (source.value === 'cache') return '实时接口不可用，当前展示本地缓存数据';
  return '';
});
</script>

<template>
  <div class="page">
    <header class="topbar">
      <div class="container topbar__inner">
        <div class="topbar__brand">
          <h1 class="topbar__title">ETF 数据看板</h1>
          <span class="topbar__sub">实时行情 · 持仓盈亏 · 技术指标</span>
        </div>

        <QuoteTicker
          v-if="indexQuote"
          :quotes="[indexQuote]"
          :loading="loading"
          class="topbar__ticker"
        />

        <div class="topbar__actions">
          <DataSourceBadge :source="source" :at="updatedAt" :loading="loading" />
          <button class="refresh" type="button" @click="manualRefresh" aria-label="刷新行情">
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            刷新
          </button>
        </div>
      </div>
    </header>

    <main class="container page__main">
      <p v-if="dataHint" class="hint" :class="{ 'hint--error': source === 'error' }">
        {{ dataHint }}
      </p>

      <PnlSummary :summary="summary" :is-demo="holdings.isDemo" />

      <section class="panel">
        <div class="panel__head">
          <h2 class="panel__title">持仓明细</h2>
          <span class="panel__aside">点击一行可切换下方图表标的</span>
        </div>
        <div class="panel__body">
          <QuoteTable
            :summary="summary"
            :selected="selectedCode"
            @select="(code: string) => (selectedCode = code)"
          />
        </div>
      </section>

      <div class="grid-2">
        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">{{ selectedName }} · 分时</h2>
            <div class="panel__aside">
              <span v-if="selectedQuote" class="mono" :class="trendClass(selectedQuote.change)">
                {{ formatPrice(selectedQuote.price) }}
                {{ formatPercent(selectedQuote.changePercent) }}
              </span>
              <DataSourceBadge :source="minuteSource" :loading="minuteLoading" />
            </div>
          </div>
          <div class="panel__body">
            <MinuteChart
              :series="minuteSeries"
              :quote="selectedQuote"
              :loading="minuteLoading"
            />
          </div>
        </section>

        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">{{ selectedName }} · 日K</h2>
            <div class="panel__aside">
              <span>前复权 · 可滚轮缩放</span>
              <DataSourceBadge :source="klineSource" :loading="klineLoading" />
            </div>
          </div>
          <div class="panel__body">
            <KlineChart :candles="candles" :quote="selectedQuote" :loading="klineLoading" />
          </div>
        </section>
      </div>

      <div class="grid-2">
        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">MACD</h2>
            <div class="panel__aside">
              <div class="switch" role="group" aria-label="MACD 参数">
                <button
                  v-for="preset in (['12/26/9', '10/20/7'] as MacdPreset[])"
                  :key="preset"
                  type="button"
                  class="switch__btn"
                  :class="{ 'switch__btn--on': macdPreset === preset }"
                  :aria-pressed="macdPreset === preset"
                  @click="macdPreset = preset"
                >
                  {{ preset }}
                </button>
              </div>
            </div>
          </div>
          <div class="panel__body">
            <MacdChart
              :candles="candles"
              :fast="macdParams.fast"
              :slow="macdParams.slow"
              :signal="macdParams.signal"
              :start-percent="startPercent"
            />
          </div>
        </section>

        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">布林带</h2>
            <div class="panel__aside">20 日 · 2 倍标准差</div>
          </div>
          <div class="panel__body">
            <BollChart :candles="candles" :period="20" :multiplier="2" :start-percent="startPercent" />
          </div>
        </section>
      </div>

      <footer class="footer">
        <p>数据来源：腾讯行情公开接口（实时 / 日K / 分时）。</p>
        <p>持仓为{{ holdings.isDemo ? '演示' : '个人' }}数据，仅供学习交流，<strong>不构成任何投资建议</strong>。</p>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 顶栏 */
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(11, 15, 22, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}

.topbar__inner {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  min-height: 60px;
  padding-block: 0.6rem;
}

.topbar__brand {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  flex: none;
}

.topbar__title {
  font-size: var(--fs-h2);
  letter-spacing: -0.01em;
}

.topbar__sub {
  font-size: var(--fs-tiny);
  color: var(--text-3);
}

.topbar__ticker {
  margin-left: auto;
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: none;
}

.refresh {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.65rem;
  border-radius: 99px;
  border: 1px solid var(--line-strong);
  font-size: var(--fs-tiny);
  color: var(--text-2);
  transition:
    color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}

.refresh:hover {
  color: var(--text);
  border-color: var(--accent);
}

/* 主体 */
.page__main {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  padding-block: 1.25rem 2.5rem;
  flex: 1;
}

.hint {
  padding: 0.55rem 0.85rem;
  border-radius: var(--radius-m);
  font-size: var(--fs-small);
  color: var(--warn);
  background: rgba(240, 167, 66, 0.1);
  border: 1px solid rgba(240, 167, 66, 0.22);
}

.hint--error {
  color: var(--up);
  background: var(--up-soft);
  border-color: rgba(240, 66, 90, 0.22);
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--gap);
}

/* 参数切换 */
.switch {
  display: inline-flex;
  padding: 2px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 99px;
}

.switch__btn {
  padding: 0.15rem 0.5rem;
  border-radius: 99px;
  font-size: var(--fs-tiny);
  color: var(--text-2);
  font-family: var(--font-mono);
  transition:
    background-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.switch__btn--on {
  background: var(--accent);
  color: #fff;
}

/* 页脚 */
.footer {
  margin-top: 0.5rem;
  padding-top: 1.1rem;
  border-top: 1px solid var(--line);
  font-size: var(--fs-tiny);
  color: var(--text-3);
  line-height: 1.9;
}

.footer strong {
  color: var(--text-2);
  font-weight: 600;
}

@media (max-width: 1024px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .topbar__inner {
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .topbar__ticker {
    margin-left: 0;
    order: 3;
    width: 100%;
  }

  .topbar__actions {
    margin-left: auto;
  }

  .topbar__sub {
    display: none;
  }
}
</style>
