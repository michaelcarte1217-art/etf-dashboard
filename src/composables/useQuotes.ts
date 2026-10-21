/**
 * 实时行情轮询。
 *
 * 三层降级：在线接口 → localStorage 缓存 → 报错态。
 * 轮询间隔不低于 10 秒，避免触发接口限流。
 */
import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { fetchQuotes } from '../api/tencent';
import type { DataSource, Quote } from '../api/types';

const POLL_INTERVAL_MS = 15_000;
const CACHE_PREFIX = 'etf-dashboard:quotes:';

interface QuoteCache {
  quotes: Quote[];
  savedAt: number;
}

function readCache(codes: string[]): QuoteCache | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + codes.join(','));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuoteCache;
    if (!Array.isArray(parsed.quotes) || parsed.quotes.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(codes: string[], quotes: Quote[]): void {
  try {
    localStorage.setItem(
      CACHE_PREFIX + codes.join(','),
      JSON.stringify({ quotes, savedAt: Date.now() } satisfies QuoteCache),
    );
  } catch {
    // 隐私模式下 localStorage 可能不可写，忽略即可
  }
}

export function useQuotes(codes: Ref<string[]>) {
  const quotes = ref<Quote[]>([]);
  const source = ref<DataSource>('live');
  const errorMessage = ref('');
  const updatedAt = ref(0);
  const loading = ref(true);

  let timer = 0;
  let inFlight = false;

  const load = async (): Promise<void> => {
    if (inFlight || codes.value.length === 0) return;
    inFlight = true;
    try {
      const result = await fetchQuotes(codes.value);
      quotes.value = result;
      source.value = 'live';
      errorMessage.value = '';
      updatedAt.value = Date.now();
      writeCache(codes.value, result);
    } catch (err) {
      const cached = readCache(codes.value);
      if (cached) {
        quotes.value = cached.quotes;
        source.value = 'cache';
        updatedAt.value = cached.savedAt;
        errorMessage.value = err instanceof Error ? err.message : '实时行情获取失败';
      } else {
        source.value = 'error';
        errorMessage.value = err instanceof Error ? err.message : '实时行情获取失败';
      }
    } finally {
      loading.value = false;
      inFlight = false;
    }
  };

  const manualRefresh = (): void => {
    void load();
  };

  onMounted(async () => {
    await load();
    timer = window.setInterval(() => void load(), POLL_INTERVAL_MS);
  });

  onBeforeUnmount(() => {
    if (timer) window.clearInterval(timer);
  });

  const quoteMap = computed<Record<string, Quote>>(() => {
    const map: Record<string, Quote> = {};
    for (const q of quotes.value) map[q.code] = q;
    return map;
  });

  return { quotes, quoteMap, source, errorMessage, updatedAt, loading, manualRefresh };
}
