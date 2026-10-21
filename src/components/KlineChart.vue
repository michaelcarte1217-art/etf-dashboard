<script setup lang="ts">
import { computed, ref, type Ref } from 'vue';
import type { EChartsCoreOption } from 'echarts/core';
import type { Candle, Quote } from '../api/types';
import { CHART_THEME, TOOLTIP_BASE, useChart } from '../composables/useChart';
import { formatPercent, formatPrice } from '../utils/format';

const props = defineProps<{
  candles: Candle[];
  quote?: Quote;
  loading: boolean;
}>();

const el: Ref<HTMLElement | null> = ref(null);

/** 默认展示最近 120 根，避免首屏过密 */
const VISIBLE = 120;

const option = computed<EChartsCoreOption | null>(() => {
  const list = props.candles;
  if (list.length === 0) return null;

  const dates = list.map((c) => c.date);
  // ECharts 蜡烛图数据顺序固定为 [开, 收, 低, 高]
  const ohlc = list.map((c) => [c.open, c.close, c.low, c.high]);
  const volumes = list.map((c, i) => ({
    value: c.volume,
    itemStyle: { color: c.close >= c.open ? 'rgba(240,66,90,0.55)' : 'rgba(11,191,122,0.55)' },
    idx: i,
  }));

  const startPercent = Math.max(0, 100 - (VISIBLE / list.length) * 100);

  return {
    animation: false,
    grid: [
      { left: 8, right: 56, top: 12, height: 190, containLabel: true },
      { left: 8, right: 56, top: 216, height: 46, containLabel: true },
    ],
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: { type: 'cross', lineStyle: { color: CHART_THEME.axis } },
      formatter: (params: unknown) => {
        const arr = params as { dataIndex: number }[];
        const i = arr?.[0]?.dataIndex ?? 0;
        const c = list[i];
        if (!c) return '';
        const pct = c.open > 0 ? ((c.close - c.open) / c.open) * 100 : 0;
        const color = c.close >= c.open ? '#F0425A' : '#0BBF7A';
        return [
          `<div style="font-weight:600;margin-bottom:4px">${c.date}</div>`,
          `开 <b>${formatPrice(c.open)}</b>　收 <b style="color:${color}">${formatPrice(c.close)}</b>`,
          `高 ${formatPrice(c.high)}　低 ${formatPrice(c.low)}`,
          `涨跌 ${formatPercent(pct)}`,
          `量 ${(c.volume / 10000).toFixed(2)} 万手`,
        ].join('<br/>');
      },
    },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    xAxis: [
      {
        type: 'category',
        data: dates,
        boundaryGap: true,
        axisLine: { lineStyle: { color: CHART_THEME.axis } },
        axisLabel: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      {
        type: 'category',
        gridIndex: 1,
        data: dates,
        boundaryGap: true,
        axisLine: { lineStyle: { color: CHART_THEME.axis } },
        axisLabel: { color: CHART_THEME.text, fontSize: 10, hideOverlap: true },
        axisTick: { show: false },
      },
    ],
    yAxis: [
      {
        scale: true,
        position: 'right',
        splitLine: { lineStyle: { color: CHART_THEME.split } },
        axisLabel: {
          color: CHART_THEME.text,
          fontSize: 10,
          formatter: (v: number) => formatPrice(v),
        },
      },
      {
        gridIndex: 1,
        scale: true,
        position: 'right',
        splitNumber: 2,
        axisLine: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
      },
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
        start: startPercent,
        end: 100,
        minValueSpan: 20,
      },
    ],
    series: [
      {
        name: '日K',
        type: 'candlestick',
        data: ohlc,
        itemStyle: {
          color: '#F0425A',
          color0: '#0BBF7A',
          borderColor: '#F0425A',
          borderColor0: '#0BBF7A',
        },
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumes,
      },
    ],
  };
});

useChart(el, option);
</script>

<template>
  <div class="chart-box">
    <div
      ref="el"
      class="chart"
      role="img"
      :aria-label="`${quote?.name ?? ''} 日K 与成交量走势，共 ${candles.length} 根`"
    />
    <p v-if="loading" class="chart__empty">加载中…</p>
    <p v-else-if="candles.length === 0" class="chart__empty">日K数据暂不可用</p>
  </div>
</template>

<style scoped>
.chart-box {
  position: relative;
}

.chart {
  width: 100%;
  height: 300px;
}

.chart__empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: var(--fs-small);
  color: var(--text-3);
}
</style>
