<script setup lang="ts">
import { computed, ref, type Ref } from 'vue';
import type { EChartsCoreOption } from 'echarts/core';
import type { Candle } from '../api/types';
import { CHART_THEME, TOOLTIP_BASE, useChart } from '../composables/useChart';
import { boll } from '../indicators/boll';
import { formatPrice } from '../utils/format';

const props = defineProps<{
  candles: Candle[];
  period: number;
  multiplier: number;
  startPercent?: number;
}>();

const el: Ref<HTMLElement | null> = ref(null);

const result = computed(() => boll(props.candles.map((c) => c.close), props.period, props.multiplier));

const option = computed<EChartsCoreOption | null>(() => {
  if (props.candles.length === 0) return null;
  const dates = props.candles.map((c) => c.date);
  const closes = props.candles.map((c) => c.close);
  const { upper, middle, lower } = result.value;

  return {
    animation: false,
    grid: { left: 8, right: 56, top: 16, bottom: 22, containLabel: true },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: { type: 'cross', lineStyle: { color: CHART_THEME.axis } },
      formatter: (params: unknown) => {
        const arr = params as { dataIndex: number }[];
        const i = arr?.[0]?.dataIndex ?? 0;
        if (i >= dates.length) return '';
        const u = upper[i];
        const m = middle[i];
        const l = lower[i];
        const lines = [
          `<div style="font-weight:600;margin-bottom:4px">${dates[i]}</div>`,
          `收盘 <b>${formatPrice(closes[i])}</b>`,
        ];
        if (u !== null && m !== null && l !== null) {
          lines.push(`上轨 ${formatPrice(u)}`, `中轨 ${formatPrice(m)}`, `下轨 ${formatPrice(l)}`);
        }
        return lines.join('<br/>');
      },
    },
    legend: { show: false },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: CHART_THEME.axis } },
      axisLabel: { color: CHART_THEME.text, fontSize: 10, hideOverlap: true },
      axisTick: { show: false },
    },
    yAxis: {
      scale: true,
      position: 'right',
      splitNumber: 3,
      splitLine: { lineStyle: { color: CHART_THEME.split } },
      axisLabel: { color: CHART_THEME.text, fontSize: 10, formatter: (v: number) => formatPrice(v) },
    },
    dataZoom: [
      { type: 'inside', start: props.startPercent ?? 0, end: 100, minValueSpan: 20 },
    ],
    series: [
      {
        name: '收盘',
        type: 'line',
        data: closes,
        showSymbol: false,
        lineStyle: { width: 1.4, color: '#E6EAF2' },
      },
      {
        name: '上轨',
        type: 'line',
        data: upper,
        showSymbol: false,
        lineStyle: { width: 1, color: 'rgba(240,66,90,0.75)', type: 'dashed' },
      },
      {
        name: '中轨',
        type: 'line',
        data: middle,
        showSymbol: false,
        lineStyle: { width: 1.2, color: '#F0A742' },
      },
      {
        name: '下轨',
        type: 'line',
        data: lower,
        showSymbol: false,
        lineStyle: { width: 1, color: 'rgba(11,191,122,0.75)', type: 'dashed' },
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
      :aria-label="`布林带（${period} 日，${multiplier} 倍标准差），白线收盘价、橙线中轨、红绿虚线上下轨`"
    />
    <p v-if="candles.length === 0" class="chart__empty">日K数据不足，无法计算布林带</p>
  </div>
</template>

<style scoped>
.chart-box {
  position: relative;
}

.chart {
  width: 100%;
  height: 170px;
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
