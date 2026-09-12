export type TimeframeType = '24H' | '1W' | '1M' | '1Y' | 'ALL';

export interface ChartDataPoint {
  timestamp: number;
  price: number;
}

export interface ComputedPoint extends ChartDataPoint {
  x: number;
  y: number;
}

/**
 * 根据现价与涨跌幅，生成指定时间周期的仿真历史走势点阵 (用于网络异常兜底或模拟)
 */
export function generateSimulatedHistory(
  currentPrice: number,
  timeframe: TimeframeType,
  change24hPercent: number = 3.5
): ChartDataPoint[] {
  const pointsCount = 30;
  const now = Date.now();
  let durationMs = 86400000; // 24h

  switch (timeframe) {
    case '24H':
      durationMs = 86400000;
      break;
    case '1W':
      durationMs = 86400000 * 7;
      break;
    case '1M':
      durationMs = 86400000 * 30;
      break;
    case '1Y':
      durationMs = 86400000 * 365;
      break;
    case 'ALL':
      durationMs = 86400000 * 365 * 2;
      break;
  }

  const startTime = now - durationMs;
  const stepMs = durationMs / (pointsCount - 1);
  const startPrice = currentPrice / (1 + (change24hPercent / 100));

  const list: ChartDataPoint[] = [];

  // 生成一条带有合理随机漫步波动的曲线
  for (let i = 0; i < pointsCount; i++) {
    const t = startTime + i * stepMs;
    const progress = i / (pointsCount - 1);
    // 基础线性增量
    const trend = startPrice + (currentPrice - startPrice) * progress;
    // 叠加微弱正弦波与微噪
    const wave = Math.sin(progress * Math.PI * 3) * (currentPrice * 0.02);
    const noise = (Math.sin(i * 99) * 0.5) * (currentPrice * 0.01);
    const price = i === pointsCount - 1 ? currentPrice : Math.max(1, trend + wave + noise);

    list.push({
      timestamp: Math.round(t),
      price: parseFloat(price.toFixed(2)),
    });
  }

  return list;
}

/**
 * 将走势数据点映射到 SVG 画布坐标系
 */
export function computeCoordinates(
  data: ChartDataPoint[],
  width: number,
  height: number,
  padding: { top: number; bottom: number; left: number; right: number } = {
    top: 10,
    bottom: 15,
    left: 10,
    right: 10,
  }
): {
  computedPoints: ComputedPoint[];
  linePath: string;
  areaPath: string;
  minPrice: number;
  maxPrice: number;
} {
  if (!data || data.length === 0) {
    return {
      computedPoints: [],
      linePath: '',
      areaPath: '',
      minPrice: 0,
      maxPrice: 0,
    };
  }

  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const stepX = innerWidth / (data.length - 1);

  const computedPoints: ComputedPoint[] = data.map((item, idx) => {
    const x = padding.left + idx * stepX;
    const norm = 1 - (item.price - minPrice) / range;
    const y = padding.top + norm * innerHeight;
    return {
      ...item,
      x,
      y,
    };
  });

  // 构造三阶贝塞尔平滑路径
  let linePath = `M ${computedPoints[0].x.toFixed(1)} ${computedPoints[0].y.toFixed(1)}`;

  for (let i = 0; i < computedPoints.length - 1; i++) {
    const p0 = computedPoints[i];
    const p1 = computedPoints[i + 1];
    const midX = (p0.x + p1.x) / 2;
    linePath += ` C ${midX.toFixed(1)} ${p0.y.toFixed(1)}, ${midX.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  const lastPoint = computedPoints[computedPoints.length - 1];
  const firstPoint = computedPoints[0];
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(1)} ${height} L ${firstPoint.x.toFixed(1)} ${height} Z`;

  return {
    computedPoints,
    linePath,
    areaPath,
    minPrice,
    maxPrice,
  };
}

/**
 * 根据手指触摸横坐标 X，查找最近的数据点
 */
export function findNearestPoint(
  points: ComputedPoint[],
  touchX: number
): ComputedPoint | null {
  if (!points || points.length === 0) return null;

  let closest = points[0];
  let minDiff = Math.abs(points[0].x - touchX);

  for (let i = 1; i < points.length; i++) {
    const diff = Math.abs(points[i].x - touchX);
    if (diff < minDiff) {
      minDiff = diff;
      closest = points[i];
    }
  }

  return closest;
}
