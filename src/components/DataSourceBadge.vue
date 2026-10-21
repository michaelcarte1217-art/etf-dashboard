<script setup lang="ts">
import type { DataSource } from '../api/types';

const props = defineProps<{
  source: DataSource;
  /** 数据时间（毫秒时间戳），0 表示未知 */
  at?: number;
  /** 是否正在加载 */
  loading?: boolean;
}>();

const LABELS: Record<DataSource, string> = {
  live: '实时',
  cache: '缓存',
  static: '兜底',
  error: '异常',
};

const timeText = (): string => {
  if (!props.at) return '';
  return new Date(props.at).toLocaleTimeString('zh-CN', { hour12: false });
};
</script>

<template>
  <span class="badge" :class="`badge--${source}`" :title="`数据来源：${LABELS[source]}`">
    <span class="badge__dot" aria-hidden="true" />
    <span>{{ loading ? '加载中' : LABELS[source] }}</span>
    <span v-if="timeText() && !loading" class="badge__time mono">{{ timeText() }}</span>
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  border-radius: 99px;
  font-size: var(--fs-tiny);
  line-height: 1.6;
  border: 1px solid transparent;
  white-space: nowrap;
}

.badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 99px;
  background: currentColor;
}

.badge__time {
  color: var(--text-3);
  font-size: var(--fs-tiny);
}

.badge--live {
  color: var(--down);
  background: var(--down-soft);
  border-color: rgba(11, 191, 122, 0.25);
}

.badge--live .badge__dot {
  animation: pulse 2s ease-in-out infinite;
}

.badge--cache {
  color: var(--warn);
  background: rgba(240, 167, 66, 0.12);
  border-color: rgba(240, 167, 66, 0.25);
}

.badge--static {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: rgba(76, 141, 255, 0.25);
}

.badge--error {
  color: var(--up);
  background: var(--up-soft);
  border-color: rgba(240, 66, 90, 0.25);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
</style>
