/**
 * 历史数据（日K / 分时）加载。
 *
 * 优先在线接口；失败时降级到仓库内预抓的静态 JSON，
 * 并对外暴露当前数据来源，供页面显示「实时 / 兜底」状态。
 */
import { ref, watch, type Ref } from 'vue';
import {
  fetchKline,
  fetchMinute,
  fetchStaticKline,
  fetchStaticMinute,
} from '../api/tencent';
import type { Candle, DataSource, MinuteSeries } from '../api/types';

/** 加载日K，返回数据与来源 */
export function useKline(code: Ref<string>, limit = 320) {
  const candles = ref<Candle[]>([]);
  const source = ref<DataSource>('live');
  const loading = ref(true);
  const errorMessage = ref('');

  const load = async (): Promise<void> => {
    if (!code.value) return;
    loading.value = true;
    errorMessage.value = '';
    try {
      candles.value = await fetchKline(code.value, limit);
      source.value = 'live';
    } catch (onlineError) {
      try {
        candles.value = await fetchStaticKline(code.value);
        source.value = 'static';
      } catch {
        source.value = 'error';
        candles.value = [];
        errorMessage.value =
          onlineError instanceof Error ? onlineError.message : '日K获取失败';
      }
    } finally {
      loading.value = false;
    }
  };

  watch(code, () => void load(), { immediate: true });

  return { candles, source, loading, errorMessage, reload: load };
}

/** 加载分时，返回数据与来源 */
export function useMinute(code: Ref<string>) {
  const series = ref<MinuteSeries | null>(null);
  const source = ref<DataSource>('live');
  const loading = ref(true);
  const errorMessage = ref('');

  const load = async (): Promise<void> => {
    if (!code.value) return;
    loading.value = true;
    errorMessage.value = '';
    try {
      series.value = await fetchMinute(code.value);
      source.value = 'live';
    } catch (onlineError) {
      try {
        series.value = await fetchStaticMinute(code.value);
        source.value = 'static';
      } catch {
        source.value = 'error';
        series.value = null;
        errorMessage.value =
          onlineError instanceof Error ? onlineError.message : '分时获取失败';
      }
    } finally {
      loading.value = false;
    }
  };

  watch(code, () => void load(), { immediate: true });

  return { series, source, loading, errorMessage, reload: load };
}
