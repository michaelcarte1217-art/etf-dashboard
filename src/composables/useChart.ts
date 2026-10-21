/**
 * ECharts 按需引入与实例封装。
 *
 * 只注册实际用到的图表与组件，避免整包引入（可省数百 KB）。
 */
import { init, use, type ECharts, type EChartsCoreOption } from 'echarts/core';
import { BarChart, CandlestickChart, LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';

use([
  BarChart,
  CandlestickChart,
  LineChart,
  DataZoomComponent,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
  CanvasRenderer,
]);

/** 深色主题下的通用文字与分割线颜色 */
export const CHART_THEME = {
  axis: 'rgba(148,163,184,0.35)',
  split: 'rgba(148,163,184,0.12)',
  text: '#8A94A6',
  tooltipBg: 'rgba(18,24,38,0.95)',
  tooltipBorder: 'rgba(148,163,184,0.25)',
} as const;

/** 统一的 tooltip 基础样式（不用 EChartsCoreOption 标注，便于各处展开复用） */
export const TOOLTIP_BASE = {
  backgroundColor: CHART_THEME.tooltipBg,
  borderColor: CHART_THEME.tooltipBorder,
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: '#E6EAF2', fontSize: 12 },
  extraCssText: 'border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.45);',
};

/**
 * 把一个 DOM 容器绑定为 ECharts 实例。
 * 自动处理：初始渲染、option 变化、容器尺寸变化、组件卸载。
 */
export function useChart(
  containerRef: Ref<HTMLElement | null>,
  optionRef: Ref<EChartsCoreOption | null>,
) {
  const chart = ref<ECharts | null>(null);
  let observer: ResizeObserver | null = null;

  const render = (): void => {
    if (!optionRef.value) return;
    if (!chart.value && containerRef.value) {
      chart.value = init(containerRef.value, undefined, { renderer: 'canvas' });
    }
    chart.value?.setOption(optionRef.value, { notMerge: true });
  };

  onMounted(() => {
    render();
    if (containerRef.value && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => chart.value?.resize());
      observer.observe(containerRef.value);
    }
  });

  watch(optionRef, render, { deep: false });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
    chart.value?.dispose();
    chart.value = null;
  });

  return { chart, render };
}
