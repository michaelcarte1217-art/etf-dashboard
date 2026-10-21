<script setup lang="ts">
import { computed, ref, type Ref } from 'vue';
import type { EChartsCoreOption } from 'echarts/core';
import type { Candle } from '../api/types';
import { CHART_THEME, TOOLTIP_BASE, useChart } from '../composables/useChart';
import { macd } from '../indicators/macd';

const props = defineProps<{
  candles: Candle[];
  fast: number;
  slow: number;
  signal: number;
  /** 与 K 线对齐的可见起点百分比 */
  startPercent?: number;
}>();

const el: Ref<HTMLElement | null> = ref(null);

const result = computed(() => macd(props.candles.map((c) => c.close), props.fast, props.slow, props.signal));

const option = computed<EChartsCoreOption | null>(() => {
  if (props.candles.length === 0) return null;
  const dates = props.candles.map((c) => c.date);
  const { dif, dea, macd: bars } = result.value;

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
        return [
          `<div style="font-weight:600;margin-bottom:4px">${dates[i]}</div>`,
          `DIF ${dif[i].toFixed(4)}`,
          `DEA ${dea[i].toFixed(4)}`,
          `MACD <b style="color:${bars[i] >= 0 ? '#F0425A' : '#0BBF7A'}">${bars[i].toFixed(4)}</b>`,
        ].join('<br/>');
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
      axisLabel: { color: CHART_THEME.text, fontSize: 10, formatter: (v: number) => v.toFixed(3) },
    },
    dataZoom: [
      {
        type: 'inside',
        start: props.startPercent ?? 0,
        end: 100,
        minValueSpan: 20,
      },
    ],
    series: [
      {
        name: 'MACD',
        type: 'bar',
        data: bars.map((v) => ({
          value: v,
          itemStyle: { color: v >= 0 ? 'rgba(240,66,90,0.7)' : 'rgba(11,191,122,0.7)' },
        })),
        barMaxWidth: 6,
      },
      {
        name: 'DIF',
        type: 'line',
        data: dif,
        showSymbol: false,
        lineStyle: { width: 1.3, color: '#4C8DFF' },
      },
      {
        name: 'DEA',
        type: 'line',
        data: dea,
        showSymbol: false,
        lineStyle: { width: 1.3, color: '#F0A742' },
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
      :aria-label="`MACD 指标（${fast}/${slow}/${signal}），DIF 蓝线、DEA 橙线、柱状红涨绿跌`"
    />
    <p v-if="candles.length === 0" class="chart__empty">日K数据不足，无法计算 MACD</p>
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
