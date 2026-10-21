/** 行情与图表相关的共享类型。 */

/** 单只标的的实时行情快照 */
export interface Quote {
  /** 带市场前缀的代码，如 sh515880 */
  code: string;
  name: string;
  /** 现价 */
  price: number;
  /** 昨收 */
  prevClose: number;
  /** 今开 */
  open: number;
  high: number;
  low: number;
  /** 涨跌额 */
  change: number;
  /** 涨跌幅（百分比数值，如 1.15 表示 +1.15%） */
  changePercent: number;
  /** 成交额（元） */
  amount: number;
  /** 成交量（手） */
  volume: number;
  /** 行情时间戳（本地时间字符串，接口原始格式） */
  timestamp: string;
}

/** 日K 单根蜡烛 */
export interface Candle {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

/** 分时单个点 */
export interface MinutePoint {
  /** HHmm，如 0930 */
  time: string;
  price: number;
  /** 成交量（手） */
  volume: number;
  /** 成交额（元） */
  amount: number;
}

/** 分时序列 */
export interface MinuteSeries {
  date: string;
  points: MinutePoint[];
}

/** 数据来源，用于页面提示当前用的是哪一层数据 */
export type DataSource = 'live' | 'cache' | 'static' | 'error';

/** 带来源标记的数据包装 */
export interface Sourced<T> {
  data: T;
  source: DataSource;
  /** 数据获取时间（毫秒时间戳） */
  fetchedAt: number;
}

/** 持仓配置里的单条持仓 */
export interface Position {
  code: string;
  name: string;
  shares: number;
  costPrice: number;
  tags: string[];
}

/** 持仓配置文件 */
export interface HoldingsFile {
  currency: string;
  updatedAt: string;
  /** 是否为演示数据（页面会显示提示） */
  isDemo: boolean;
  positions: Position[];
}

/** 持仓合并实时行情后的计算结果 */
export interface PositionView extends Position {
  price: number;
  prevClose: number;
  /** 市值 */
  marketValue: number;
  /** 成本金额 */
  costValue: number;
  /** 累计盈亏金额 */
  pnl: number;
  /** 累计盈亏率（百分比数值） */
  pnlPercent: number;
  /** 今日盈亏金额 */
  dayPnl: number;
  /** 仓位占比（百分比数值） */
  weight: number;
}

/** 组合汇总 */
export interface PortfolioSummary {
  totalMarketValue: number;
  totalCostValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  dayPnl: number;
  positions: PositionView[];
}
