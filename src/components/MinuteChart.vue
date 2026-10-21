<script setup lang="ts">
import { computed, ref, type Ref } from 'vue';
import type { EChartsCoreOption } from 'echarts/core';
import type { MinuteSeries, Quote } from '../api/types';
import { CHART_THEME, TOOLTIP_BASE, useChart } from '../composables/useChart';
import { formatMinuteTime, formatPercent, formatPrice } from '../utils/format';

const props = defineProps<{
  series: MinuteSeries | null;
  quote?: Quote;
  loading: boolean;
}>();

const el: Ref<HTMLElement | null> = ref(null);

/** 均价线：累计成交额 / 累计成交量（分时成交量单位为手，需 ×100 换算成股） */
const averageLine = computed<number[]>(() => {
  if (!props.series) return [];
  let cumAmount = 0;
  let cumVolume = 0;
  return props.series.points.map((p) => {
    cumAmount += p.amount;
    cumVolume += p.volume * 100;
    if (cumVolume <= 0) return p.price;
    return cumAmount / cumVolume;
  });
});

const option = computed<EChartsCoreOption | null>(() => {
  const points = props.series?.points ?? [];
  if (points.length === 0) return null;

  const prevClose = props.quote?.prevClose ?? points[0].price;
  const times = points.map((p) => formatMinuteTime(p.time));
  const prices = points.map((p) => p.price);
  const avg = averageLine.value;

  // 以昨收为中轴做对称区间，涨跌幅视觉上更直观
  const maxDeviation = Math.max(
    ...prices.map((v) => Math.abs(v - prevClose)),
    prevClose * 0.005,
  );
  const bound = maxDeviation * 1.15;

  return {
    animation: false,
    grid: { left: 8, right: 56, top: 12, bottom: 24, containLabel: true },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: { type: 'cross', lineStyle: { color: CHART_THEME.axis } },
      formatter: (params: unknown) => {
        const arr = params as { dataIndex: number }[];
        const i = arr?.[0]?.dataIndex ?? 0;
        const p = points[i];
        if (!p) return '';
        const pct = prevClose > 0 ? ((p.price - prevClose) / prevClose) * 100 : 0;
        return [
          `<div style="font-weight:600;margin-bottom:4px">${formatMinuteTime(p.time)}</div>`,
          `价格 <b>${formatPrice(p.price)}</b>`,
          `均价 ${formatPrice(avg[i] ?? p.price)}`,
          `涨跌 ${formatPercent(pct)}`,
        ].join('<br/>');
      },
    },
    xAxis: {
      type: 'category',
      data: times,
      boundaryGap: false,
      axisLine: { lineStyle: { color: CHART_THEME.axis } },
      axisLabel: {
        color: CHART_THEME.text,
        fontSize: 10,
        interval: (index: number) => index % 45 === 0,
      },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        min: Number((prevClose - bound).toFixed(3)),
        max: Number((prevClose + bound).toFixed(3)),
        position: 'right',
        splitLine: { lineStyle: { color: CHART_THEME.split } },
        axisLabel: {
          color: CHART_THEME.text,
          fontSize: 10,
          formatter: (v: number) => v.toFixed(3),
        },
      },
      {
        type: 'value',
        min: -100,
        max: 100,
        position: 'left',
        splitLine: { show: false },
        axisLabel: {
          color: CHART_THEME.text,
          fontSize: 10,
          formatter: (v: number) => `${v.toFixed(1)}%`,
        },
      },
    ],
    series: [
      {
        name: '价格',
        type: 'line',
        data: prices,
        showSymbol: false,
        lineStyle: { width: 1.6, color: '#4C8DFF' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(76,141,255,0.28)' },
              { offset: 1, color: 'rgba(76,141,255,0.02)' },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          label: { show: false },
          lineStyle: { color: CHART_THEME.axis, type: 'dashed', width: 1 },
          data: [{ yAxis: prevClose }],
        },
      },
      {
        name: '均价',
        type: 'line',
        data: avg,
        showSymbol: false,
        lineStyle: { width: 1.2, color: '#F0A742' },
      },
    ],
  };
});

useChart(el, option);
</script>

<template>
  <div class="chart-box">
    <div ref="el" class="chart" role="img" :aria-label="`${quote?.name ?? ''} 当日分时走势`" />
    <p v-if="!loading && !series" class="chart__empty">分时数据暂不可用</p>
    <p v-else-if="loading" class="chart__empty">加载中…</p>
  </div>
</template>

<style scoped>
.chart-box {
  position: relative;
}

.chart {
  width: 100%;
  height: 260px;
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
